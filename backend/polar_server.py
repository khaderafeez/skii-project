#!/usr/bin/env python3
"""
Polar H10 Bluetooth WebSocket Server
Runs on Raspberry Pi to stream real-time HR + HRV data to React frontend
"""

import asyncio
import json
import logging
from datetime import datetime
from typing import Set
import numpy as np

try:
    from bleak import BleakScanner
    from polar_python import PolarDevice
    from polar_python.models import HRData
except ImportError:
    print("ERROR: Required packages not installed. Run: pip install -r requirements.txt")
    exit(1)

try:
    import websockets
    from websockets.server import WebSocketServerProtocol
except ImportError:
    print("ERROR: websockets package not installed. Run: pip install -r requirements.txt")
    exit(1)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='[%(asctime)s] %(levelname)s: %(message)s'
)
logger = logging.getLogger(__name__)

# Global state
connected_clients: Set[WebSocketServerProtocol] = set()
polar_device = None
is_bluetooth_connected = False
rr_buffer = []
current_heart_rate = 0
current_rmssd = 0.0


def calculate_rmssd(rr_intervals: list) -> float:
    """Calculate RMSSD (Root Mean Square of Successive Differences) - HRV metric"""
    if len(rr_intervals) < 2:
        return 0.0
    
    rr_array = np.array(rr_intervals, dtype=float)
    diff = np.diff(rr_array)
    rmssd = np.sqrt(np.mean(diff ** 2))
    return round(float(rmssd), 2)


async def broadcast_data(hr: int, rr_intervals: list, rmssd: float, connected: bool):
    """Broadcast HR + HRV data to all connected WebSocket clients"""
    message = json.dumps({
        "type": "heart_data",
        "hr": hr,
        "rr_intervals": rr_intervals,
        "rmssd": rmssd,
        "connected": connected,
        "timestamp": int(datetime.now().timestamp() * 1000)
    })
    
    if connected_clients:
        # Send to all connected clients
        await asyncio.gather(
            *[client.send(message) for client in connected_clients],
            return_exceptions=True
        )


async def broadcast_status(connected: bool, reason: str = ""):
    """Broadcast connection status to all clients"""
    message = json.dumps({
        "type": "connection_status",
        "connected": connected,
        "reason": reason,
        "timestamp": int(datetime.now().timestamp() * 1000)
    })
    
    if connected_clients:
        await asyncio.gather(
            *[client.send(message) for client in connected_clients],
            return_exceptions=True
        )


async def connect_to_polar() -> bool:
    """Scan for and connect to Polar H10 device"""
    global polar_device, is_bluetooth_connected
    
    try:
        logger.info("🔍 Scanning for Polar H10...")
        device = await BleakScanner.find_device_by_filter(
            lambda d, a: d.name and "Polar H10" in d.name,
            timeout=10
        )
        
        if not device:
            logger.error("❌ Polar H10 device not found")
            is_bluetooth_connected = False
            await broadcast_status(False, "Device not found")
            return False
        
        logger.info(f"✅ Found device: {device.name} ({device.address})")
        polar_device = PolarDevice(device)
        
        logger.info("📡 Connecting...")
        async with polar_device as pd:
            # Connection successful
            is_bluetooth_connected = True
            logger.info("✅ Connected to Polar H10!")
            await broadcast_status(True)
            
            # Start streaming
            await start_streaming(pd)
            
    except Exception as e:
        logger.error(f"❌ Connection error: {e}")
        is_bluetooth_connected = False
        await broadcast_status(False, f"Connection failed: {str(e)}")
        return False


async def start_streaming(polar_device_instance):
    """Stream HR + RR data from Polar H10"""
    global rr_buffer, current_heart_rate, current_rmssd, is_bluetooth_connected
    
    def hr_callback(data: HRData):
        """Callback for each HR data packet"""
        global rr_buffer, current_heart_rate, current_rmssd
        
        try:
            current_heart_rate = data.heartrate
            rr = data.rr_intervals
            
            if rr:
                rr_buffer.extend(rr)
                # Keep only last 50 RR intervals for calculation
                if len(rr_buffer) > 50:
                    rr_buffer = rr_buffer[-50:]
            
            current_rmssd = calculate_rmssd(rr_buffer)
            
            logger.info(
                f"❤️  HR: {current_heart_rate} bpm | "
                f"RR count: {len(rr_buffer)} | "
                f"HRV (RMSSD): {current_rmssd} ms"
            )
            
        except Exception as e:
            logger.error(f"⚠️  Error in HR callback: {e}")
    
    try:
        await polar_device_instance.start_hr_stream(hr_callback=hr_callback)
        
        # Stream indefinitely, broadcasting every 2 seconds
        while is_bluetooth_connected:
            await broadcast_data(
                current_heart_rate,
                list(rr_buffer[-20:]) if rr_buffer else [],  # Send last 20 RR intervals
                current_rmssd,
                True
            )
            await asyncio.sleep(2)
            
    except Exception as e:
        logger.error(f"❌ Streaming error: {e}")
        is_bluetooth_connected = False
        await broadcast_status(False, "Streaming stopped")


async def handle_websocket_client(websocket: WebSocketServerProtocol, path: str):
    """Handle new WebSocket client connection"""
    client_id = f"{websocket.remote_address[0]}:{websocket.remote_address[1]}"
    
    connected_clients.add(websocket)
    logger.info(f"✅ Client connected: {client_id} (total: {len(connected_clients)})")
    
    # Send current status to new client
    await broadcast_status(is_bluetooth_connected)
    
    try:
        # Keep connection alive and listen for any messages
        async for message in websocket:
            # Echo-like behavior - client can send keep-alive pings
            logger.debug(f"Message from {client_id}: {message}")
            
    except websockets.exceptions.ConnectionClosed:
        logger.info(f"❌ Client disconnected: {client_id}")
    except Exception as e:
        logger.error(f"❌ Error handling client {client_id}: {e}")
    finally:
        connected_clients.discard(websocket)
        logger.info(f"Client removed: {client_id} (total: {len(connected_clients)})")


async def reconnect_loop():
    """Attempt to reconnect to Polar H10 if disconnected"""
    global is_bluetooth_connected
    
    reconnect_attempts = 0
    max_attempts = 5
    
    while True:
        if not is_bluetooth_connected:
            reconnect_attempts += 1
            logger.warning(
                f"🔄 Reconnection attempt {reconnect_attempts}/{max_attempts}..."
            )
            
            if reconnect_attempts > max_attempts:
                logger.error("❌ Max reconnection attempts reached. Waiting 60s...")
                await asyncio.sleep(60)
                reconnect_attempts = 0
            
            await connect_to_polar()
            await asyncio.sleep(5)
        else:
            # Reset attempts when connected
            reconnect_attempts = 0
            await asyncio.sleep(30)  # Check connection status every 30s


async def main():
    """Main async server"""
    logger.info("=" * 60)
    logger.info("Polar H10 WebSocket Server v1.0")
    logger.info("=" * 60)
    
    # Start Bluetooth connection
    connect_task = asyncio.create_task(connect_to_polar())
    
    # Start reconnection monitor
    reconnect_task = asyncio.create_task(reconnect_loop())
    
    # Start WebSocket server
    logger.info("🚀 Starting WebSocket server on ws://localhost:8765")
    
    async with websockets.serve(handle_websocket_client, "localhost", 8765):
        logger.info("✅ WebSocket server started")
        
        # Keep server running
        try:
            await asyncio.gather(connect_task, reconnect_task)
        except KeyboardInterrupt:
            logger.info("\n🛑 Server shutdown requested")
            is_bluetooth_connected = False


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        logger.info("✋ Server stopped by user")
    except Exception as e:
        logger.error(f"❌ Fatal error: {e}")
        exit(1)
