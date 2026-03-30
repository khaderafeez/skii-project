import asyncio
import json
import time
import numpy as np
import websockets
from bleak import BleakScanner
from polar_python import PolarDevice
from polar_python.models import HRData

# Global state
clients = set()
rr_buffer = []
MAX_RR_BUFFER = 100 
last_data_time = time.time() # Heartbeat monitor

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
    
    if np.isnan(sd_hr) or np.isinf(sd_hr):
        sd_hr = 0.0

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
    global last_data_time, rr_buffer
    
    while True:
        try:
            print("🔍 Scanning for Polar H10...")
            device = await BleakScanner.find_device_by_filter(
                lambda d, a: d.name and "Polar H10" in d.name,
                timeout=5
            )
            
            if not device:
                print("❌ Device not found. Retrying in 2s...")
                await broadcast(json.dumps({"status": "DISCONNECTED"}))
                await asyncio.sleep(2)
                continue

            print(f"✅ Found device: {device.name}")
            await broadcast(json.dumps({"status": "CONNECTED"}))

            async with PolarDevice(device) as polar_device:
                print("📡 Connected! Streaming HR + HRV...")
                last_data_time = time.time()
                rr_buffer.clear()
                
                def hr_callback(data: HRData):
                    global rr_buffer, last_data_time
                    last_data_time = time.time() # 💓 Update heartbeat
                    
                    try:
                        hr = data.heartrate
                        rr = data.rr_intervals
                        
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
                    except Exception as e:
                        print("⚠️ Error in callback:", e)

                # Run the stream as a background task so it doesn't block our watchdog
                stream_task = asyncio.create_task(polar_device.start_hr_stream(hr_callback=hr_callback))
                
                # Concurrent Health Monitor
                while True:
                    await asyncio.sleep(1)
                    
                    # If 4 seconds pass without a heartbeat, kill the stuck stream
                    if time.time() - last_data_time > 4.0:
                        print("⚠️ Watchdog Timeout! Sensor dropped. Forcing disconnect...")
                        rr_buffer.clear()
                        await broadcast(json.dumps({"status": "DISCONNECTED"}))
                        stream_task.cancel() # Force kill the blocked Bleak process
                        break 
                        
                    # If the stream crashes on its own, break to restart
                    if stream_task.done():
                        break

        except asyncio.CancelledError:
            print("🛑 Stream forcefully cancelled by watchdog.")
        except Exception as e:
            print(f"🔌 BLE Connection Lost: {e}")
            rr_buffer.clear()
            await broadcast(json.dumps({"status": "DISCONNECTED"}))
            await asyncio.sleep(2)

async def main():
    print("🌐 Starting WebSocket Server on ws://localhost:8765")
    async with websockets.serve(ws_handler, "localhost", 8765):
        await polar_loop()

if __name__ == "__main__":
    asyncio.run(main())