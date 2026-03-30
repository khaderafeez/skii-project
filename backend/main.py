import asyncio
import json
import time
import numpy as np
import websockets
from bleak import BleakScanner
from polar_python import PolarDevice
from polar_python.models import HRData

clients = set()
rr_buffer = []
MAX_RR_BUFFER = 100 

async def ws_handler(websocket):
    clients.add(websocket)
    try:
        await websocket.wait_closed()
    finally:
        clients.remove(websocket)

async def broadcast(message):
    if clients:
        await asyncio.gather(*[client.send(message) for client in clients], return_exceptions=True)

def calculate_metrics(rr_intervals):
    if len(rr_intervals) < 2:
        return None
    
    rr_array = np.array(rr_intervals)
    valid_rr = rr_array[rr_array > 0]
    if len(valid_rr) < 2:
        return None
        
    diff = np.diff(valid_rr)
    rmssd = np.sqrt(np.mean(diff ** 2))
    sdnn = np.std(valid_rr)
    nn50 = np.sum(np.abs(diff) > 50)
    pnn50 = (nn50 / len(diff)) * 100 if len(diff) > 0 else 0.0
    avg_rr = np.mean(valid_rr)
    hr_array = 60000 / valid_rr
    sd_hr = np.std(hr_array)
    
    # Prevent JSON parsing errors on the frontend
    if np.isnan(sd_hr) or np.isinf(sd_hr):
        sd_hr = 0.0

    # Flag intervals outside the standard 300ms - 2000ms physiological range
    artifacts = np.sum((rr_array < 300) | (rr_array > 2000))
    artifact_pct = (artifacts / len(rr_array)) * 100 if len(rr_array) > 0 else 0.0

    return {
        "rmssd": round(rmssd, 1),
        "sdnn": round(sdnn, 1),
        "pnn50": round(pnn50, 1),
        "avgRR": int(avg_rr),
        "sdHr": round(sd_hr, 1),
        "artifactPct": round(artifact_pct, 1)
    }

async def polar_loop():
    loop = asyncio.get_running_loop()
    global rr_buffer
    
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
                await broadcast(json.dumps({"status": "DISCONNECTED"}))
                await asyncio.sleep(2)
                continue

            print(f"[INFO] Found device: {device.name}", flush=True)

            async with PolarDevice(device) as polar_device:
                print("[INFO] BLE Connected. Waiting for data...", flush=True)
                rr_buffer.clear()
                
                tracker = {
                    "last_msg": time.time(),
                    "last_rr": time.time() + 5.0, # 5s grace period for initial attachment
                    "contact_lost_notified": False
                }
                
                def hr_callback(data: HRData):
                    global rr_buffer
                    tracker["last_msg"] = time.time()
                    
                    hr = data.heartrate
                    rr = data.rr_intervals
                    
                    # RR intervals indicate active skin contact
                    if rr and len(rr) > 0:
                        tracker["last_rr"] = time.time()
                        if tracker["contact_lost_notified"]:
                            print("\n[INFO] Skin contact restored. Resuming stream.", flush=True)
                            tracker["contact_lost_notified"] = False
                    
                    # Block transmission of decaying HR packets if contact is lost (>4s)
                    if time.time() - tracker["last_rr"] > 4.0:
                        return
                        
                    if rr:
                        rr_buffer.extend(rr)
                    if len(rr_buffer) > MAX_RR_BUFFER:
                        rr_buffer = rr_buffer[-MAX_RR_BUFFER:]
                    
                    metrics = calculate_metrics(rr_buffer)
                    payload = {
                        "status": "STREAMING",
                        "heartRate": hr,
                        "rrIntervals": rr,
                    }
                    if metrics:
                        payload.update(metrics)
                    
                    loop.call_soon_threadsafe(
                        lambda p: asyncio.create_task(broadcast(json.dumps(p))), 
                        payload
                    )

                await polar_device.start_hr_stream(hr_callback=hr_callback)
                
                while True:
                    await asyncio.sleep(1)
                    now = time.time()
                    
                    # Disconnect if hardware stops transmitting entirely
                    if now - tracker["last_msg"] > 6.0:
                        print("\n[ERROR] Sensor completely stopped transmitting.", flush=True)
                        await broadcast(json.dumps({"status": "DISCONNECTED"}))
                        break
                        
                    # Notify frontend if skin contact is lost without breaking BLE connection
                    if now - tracker["last_rr"] > 4.0:
                        if not tracker["contact_lost_notified"]:
                            print("\n[WARN] No electrical pulse detected for 4s. UI disconnected.", flush=True)
                            tracker["contact_lost_notified"] = True
                            
                        await broadcast(json.dumps({"status": "DISCONNECTED"}))

        except asyncio.CancelledError:
            print("\n[INFO] Application shutdown requested.", flush=True)
            raise 
        except Exception as e:
            print(f"\n[ERROR] BLE Connection Exception: {e}", flush=True)
            rr_buffer.clear()
            await broadcast(json.dumps({"status": "DISCONNECTED"}))
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