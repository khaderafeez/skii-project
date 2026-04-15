import asyncio
import json
import time
import numpy as np
import websockets
from bleak import BleakScanner
from polar_python import PolarDevice
from polar_python.models import HRData

clients = set()
EPOCH_DURATION_SEC = 30.0

async def ws_handler(websocket):
    clients.add(websocket)
    try:
        await websocket.wait_closed()
    finally:
        clients.remove(websocket)

async def broadcast(message):
    if clients:
        await asyncio.gather(*[client.send(message) for client in clients], return_exceptions=True)

def process_hrv_epoch(rr_list):
    """
    Executes a vectorized signal processing pipeline on an epoch of RR intervals.
    Pipeline: Hard Boundary Filter -> IQR Outlier Rejection -> Neighbor Interpolation.
    """
    if len(rr_list) < 5:
        return None
        
    initial_count = len(rr_list)
    rr_array = np.array(rr_list, dtype=np.float64)
    
    # --- STEP 1: Range Filter (Hard Boundaries) ---
    # Discard non-physiological intervals (e.g., >200 BPM or <24 BPM)
    range_mask = (rr_array >= 300) & (rr_array <= 2500)
    filtered_rr = rr_array[range_mask]
    range_removed_count = initial_count - len(filtered_rr)
    
    if len(filtered_rr) < 5:
        return None
        
    # --- STEP 2: IQR Filter (Statistical Outliers) ---
    # Identify ectopic beats or transient noise based on local distribution
    q1, q3 = np.percentile(filtered_rr, [25, 75])
    iqr = q3 - q1
    lower_bound = q1 - (1.5 * iqr)
    upper_bound = q3 + (1.5 * iqr)
    
    before_iqr_count = len(filtered_rr)
    filtered_rr = filtered_rr[(filtered_rr >= lower_bound) & (filtered_rr <= upper_bound)]
    iqr_removed_count = before_iqr_count - len(filtered_rr)
    
    if len(filtered_rr) < 5:
        return None
        
    # --- STEP 3: Artifact Detection & Correction ---
    # Vectorized point-to-point interpolation against a 25% neighbor-average threshold
    left = filtered_rr[:-2]
    right = filtered_rr[2:]
    center = filtered_rr[1:-1]
    
    avg = (left + right) / 2.0
    deviation = np.abs(center - avg)
    threshold = 0.25 * avg
    
    correction_mask = deviation > threshold
    corrected_count = np.sum(correction_mask)
    
    # Apply interpolation
    center[correction_mask] = avg[correction_mask]
    
    # Reconstruct array (retaining original boundaries)
    corrected_rr = np.concatenate(([filtered_rr[0]], center, [filtered_rr[-1]]))
    
    # --- Metric Derivation ---
    diff = np.diff(corrected_rr)
    rmssd = np.sqrt(np.mean(diff ** 2))
    sdnn = np.std(corrected_rr)
    nn50 = np.sum(np.abs(diff) > 50)
    pnn50 = (nn50 / len(diff)) * 100 if len(diff) > 0 else 0.0

    avg_rr = np.mean(corrected_rr)
    hr_array = 60000 / corrected_rr
    sd_hr = np.std(hr_array)
    if np.isnan(sd_hr) or np.isinf(sd_hr):
        sd_hr = 0.0
    
    total_modified = range_removed_count + iqr_removed_count + corrected_count
    artifacts_pct = (total_modified / initial_count) * 100
    
    # Convert NumPy float64 types to native Python floats for JSON serialization
    return {
        "rmssd": round(float(rmssd), 1),
        "sdnn": round(float(sdnn), 1),
        "pnn50": round(float(pnn50), 1),
        "avgRR": int(avg_rr),         
        "sdHr": round(float(sd_hr), 1),
        "artifactPct": round(float(artifacts_pct), 1)
    }

async def polar_loop():
    loop = asyncio.get_running_loop()
    
    while True:
        try:
            print("-" * 40, flush=True)
            print("[INFO] Scanning for Polar H10...", flush=True)
            device = await BleakScanner.find_device_by_filter(
                lambda d, a: d.name and "Polar H10" in d.name,
                timeout=5
            )
            
            if not device:
                print("[WARN] Device not found. Retrying in 2s...", flush=True)
                await broadcast(json.dumps({"type": "STATUS", "status": "DISCONNECTED"}))
                await asyncio.sleep(2)
                continue

            print(f"[INFO] Found device: {device.name}", flush=True)

            async with PolarDevice(device) as polar_device:
                print("[INFO] BLE Connected. Waiting for data...", flush=True)
                
                # State initialization
                epoch_buffer = []
                epoch_start_time = time.time()
                tracker = {
                    "last_msg": time.time(),
                    "last_rr": time.time() + 5.0, 
                    "contact_lost_notified": False
                }
                
                def hr_callback(data: HRData):
                    tracker["last_msg"] = time.time()
                    
                    hr = data.heartrate
                    rr = data.rr_intervals
                    
                    if rr and len(rr) > 0:
                        tracker["last_rr"] = time.time()
                        if tracker["contact_lost_notified"]:
                            print("\n[INFO] Skin contact restored. Resuming stream.", flush=True)
                            tracker["contact_lost_notified"] = False
                    
                    # Block transmission of decaying HR packets if contact is lost
                    if time.time() - tracker["last_rr"] > 4.0:
                        return
                        
                    if rr:
                        epoch_buffer.extend(rr)
                    
                    # Broadcast live telemetry instantly for waveform rendering
                    payload = {
                        "type": "LIVE_TELEMETRY",
                        "status": "STREAMING",
                        "heartRate": hr,
                        "rrIntervals": rr,
                    }
                    loop.call_soon_threadsafe(
                        lambda p: asyncio.create_task(broadcast(json.dumps(p))), 
                        payload
                    )

                await polar_device.start_hr_stream(hr_callback=hr_callback)
                
                while True:
                    await asyncio.sleep(1)
                    now = time.time()
                    
                    # Process HRV metrics exactly at the 150-second interval
                    if now - epoch_start_time >= EPOCH_DURATION_SEC:
                        if epoch_buffer:
                            print(f"[INFO] Processing 150s Epoch ({len(epoch_buffer)} intervals)...", flush=True)
                            metrics = process_hrv_epoch(epoch_buffer)
                            
                            if metrics:
                                metric_payload = {
                                    "type": "HRV_EPOCH",
                                    "data": metrics
                                }
                                asyncio.create_task(broadcast(json.dumps(metric_payload)))
                            
                            epoch_buffer.clear()
                        epoch_start_time = now
                    
                    # Connection fault detection
                    if now - tracker["last_msg"] > 6.0:
                        print("\n[ERROR] Sensor completely stopped transmitting.", flush=True)
                        await broadcast(json.dumps({"type": "STATUS", "status": "DISCONNECTED"}))
                        break
                        
                    if now - tracker["last_rr"] > 4.0 and not tracker["contact_lost_notified"]:
                        print("\n[WARN] No electrical pulse detected for 4s. UI disconnected.", flush=True)
                        tracker["contact_lost_notified"] = True
                        await broadcast(json.dumps({"type": "STATUS", "status": "DISCONNECTED"}))

        except asyncio.CancelledError:
            print("\n[INFO] Application shutdown requested.", flush=True)
            raise 
        except Exception as e:
            print(f"\n[ERROR] BLE Connection Exception: {e}", flush=True)
            await broadcast(json.dumps({"type": "STATUS", "status": "DISCONNECTED"}))
            await asyncio.sleep(2)

async def main():
    print("[INFO] Starting WebSocket Server on ws://localhost:8765", flush=True)
    async with websockets.serve(ws_handler, "localhost", 8765):
        await polar_loop()

if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("\n[INFO] Server shut down by user.", flush=True)