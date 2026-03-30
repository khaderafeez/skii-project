import asyncio
import json
import numpy as np
import websockets
from bleak import BleakScanner
from polar_python import PolarDevice
from polar_python.models import HRData

# Global state
clients = set()
rr_buffer = []
MAX_RR_BUFFER = 100 # Keep last 100 beats for HRV math

# WebSocket connection handler
async def ws_handler(websocket):
    clients.add(websocket)
    try:
        await websocket.wait_closed()
    finally:
        clients.remove(websocket)

# Broadcast JSON data to all connected React clients
async def broadcast(message):
    if clients:
        # Create tasks for all sends and run them concurrently
        await asyncio.gather(*[client.send(message) for client in clients], return_exceptions=True)

def calculate_metrics(rr_intervals):
    if len(rr_intervals) < 2:
        return None
    
    rr_array = np.array(rr_intervals)
    diff = np.diff(rr_array)
    
    # RMSSD (Root Mean Square of Successive Differences)
    rmssd = np.sqrt(np.mean(diff ** 2))
    
    # SDNN (Standard Deviation of NN intervals)
    sdnn = np.std(rr_array)
    
    # pNN50 (Percentage of successive intervals differing by > 50ms)
    nn50 = np.sum(np.abs(diff) > 50)
    pnn50 = (nn50 / len(diff)) * 100
    
    # Avg RR
    avg_rr = np.mean(rr_array)
    
    # SD HR (Standard deviation of Heart Rate)
    # Convert RR (ms) to HR (bpm) for each interval to find SD
    hr_array = 60000 / rr_array
    sd_hr = np.std(hr_array)

    # Simple Artifact % (RR intervals outside physiologically normal range 300ms - 2000ms)
    artifacts = np.sum((rr_array < 300) | (rr_array > 2000))
    artifact_pct = (artifacts / len(rr_array)) * 100

    return {
        "rmssd": round(rmssd, 1),
        "sdnn": round(sdnn, 1),
        "pnn50": round(pnn50, 1),
        "avgRR": int(avg_rr),
        "sdHr": round(sd_hr, 1),
        "artifactPct": round(artifact_pct, 1)
    }

async def polar_loop():
    print("🔍 Scanning for Polar H10...")
    device = await BleakScanner.find_device_by_filter(
        lambda d, a: d.name and "Polar H10" in d.name,
        timeout=10
    )
    if not device:
        print("❌ Device not found")
        await broadcast(json.dumps({"status": "DISCONNECTED"}))
        return

    print(f"✅ Found device: {device.name}")
    await broadcast(json.dumps({"status": "CONNECTED"}))

    async with PolarDevice(device) as polar_device:
        print("📡 Connected! Streaming HR + HRV...")
        
        def hr_callback(data: HRData):
            global rr_buffer
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
                    "rrIntervals": rr, # Send the latest raw intervals for the waveform
                }
                
                if metrics:
                    payload.update(metrics)
                
                # Add a print statement to show what's being sent
                print(f"-> Broadcasting: {json.dumps(payload)}")

                # Broadcast to React frontend
                asyncio.create_task(broadcast(json.dumps(payload)))
                
            except Exception as e:
                print("⚠️ Error in callback:", e)

        await polar_device.start_hr_stream(hr_callback=hr_callback)
        
        # Keep connection alive
        while True:
            await asyncio.sleep(1)

async def main():
    # Start the WebSocket server on port 8765
    print("🌐 Starting WebSocket Server on ws://localhost:8765")
    async with websockets.serve(ws_handler, "localhost", 8765):
        # Run the Polar BLE loop concurrently
        await polar_loop()

if __name__ == "__main__":
    asyncio.run(main())
