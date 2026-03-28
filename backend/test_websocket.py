#!/usr/bin/env python3
"""
Simple WebSocket client for testing the Polar H10 backend
Run this in a separate terminal to verify backend is working
"""

import asyncio
import json
import sys

try:
    import websockets
except ImportError:
    print("ERROR: websockets package not installed. Run: pip install websockets")
    sys.exit(1)


async def test_websocket():
    """Connect to WebSocket server and print messages"""
    uri = "ws://localhost:8765"
    
    print(f"Attempting to connect to {uri}...")
    
    try:
        async with websockets.connect(uri) as websocket:
            print("✅ Connected!")
            print("\nListening for messages (Ctrl+C to stop)...\n")
            
            try:
                async for message in websocket:
                    data = json.loads(message)
                    
                    if data.get("type") == "heart_data":
                        print(
                            f"❤️  HR: {data.get('hr')} bpm | "
                            f"HRV: {data.get('rmssd')} ms | "
                            f"Connected: {data.get('connected')}"
                        )
                    elif data.get("type") == "connection_status":
                        status = "Connected" if data.get('connected') else "Disconnected"
                        reason = data.get('reason', '')
                        print(f"📡 Status: {status} {f'({reason})' if reason else ''}")
                    
            except KeyboardInterrupt:
                print("\n\nClosing connection...")
                
    except ConnectionRefusedError:
        print("❌ Connection refused!")
        print("\nMake sure the backend is running:")
        print("  cd backend && source venv/bin/activate && python3 polar_server.py")
    except Exception as e:
        print(f"❌ Error: {e}")
        sys.exit(1)


if __name__ == "__main__":
    asyncio.run(test_websocket())
