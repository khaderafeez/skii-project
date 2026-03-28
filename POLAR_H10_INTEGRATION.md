# Polar H10 Bluetooth Integration Guide

## Overview

This project now integrates real-time heart rate (HR) and heart rate variability (HRV) data from the Polar H10 sensor via Bluetooth on Raspberry Pi. The backend runs a Python WebSocket server that streams live readings to the React frontend.

## Architecture

```
Polar H10 (Bluetooth) 
    ↓
Python WebSocket Server (Pi:8765)
    ↓
React Frontend (Pi:5173)
    ↓
UI displays: HR, HRV (RMSSD), Connection Status
```

## Components

### Backend (`/backend/polar_server.py`)
- **Purpose**: Connects to Polar H10 via Bluetooth, calculates HRV metrics, broadcasts data via WebSocket
- **Data Updates**: Every 2 seconds
- **WebSocket Server**: Runs on `ws://localhost:8765`
- **Metrics Calculated**:
  - Heart Rate (HR): Real-time bpm
  - RMSSD (HRV): Root Mean Square of Successive Differences in milliseconds
  - RR Intervals: Individual beat-to-beat intervals

### Frontend Hook (`/src/hooks/usePolarData.ts`)
- **Purpose**: React hook for WebSocket client with auto-reconnect
- **Returns**:
  ```typescript
  {
    heartRate: number,        // Current HR in bpm
    hrv: number,             // Current RMSSD in ms
    rr_intervals: number[],  // Last 20 RR intervals
    isConnected: boolean,    // Bluetooth connection status
    error: string | null     // Error message if any
  }
  ```
- **Features**:
  - Auto-reconnect on disconnection
  - Connection timeout handling
  - Exponential backoff for retries
  - Max 10 reconnection attempts

### UI Components
- **LiveMonitoringScreen** (`/src/pages/LiveMonitoringScreen.tsx`): Displays real-time HR/HRV during active session
- **SessionStartScreen** (`/src/pages/SessionStartScreen.tsx`): Shows baseline measurement before session start

## Setup Instructions

### Prerequisites
- Raspberry Pi 3B+ (or similar ARM-based Linux system)
- Polar H10 chest strap sensor
- Python 3.7+
- Node.js (for frontend development)

### Step 1: Initial Pi Setup

```bash
cd backend/
chmod +x setup.sh
./setup.sh
```

This will:
- Update system packages
- Install Python 3, pip, and Bluetooth libraries
- Create Python virtual environment
- Install all Python dependencies

### Step 2: Pair Polar H10 Device

1. Enable Bluetooth on Pi:
```bash
sudo bluetoothctl
```

2. Inside bluetoothctl:
```
scan on
# Wait for "Polar H10" to appear, note its MAC address
pair <MAC_ADDRESS>
trust <MAC_ADDRESS>
connect <MAC_ADDRESS>
quit
```

3. Verify pairing:
```bash
bluetoothctl devices
```

### Step 3: Test Backend Manually

```bash
cd backend/
source venv/bin/activate
python3 polar_server.py
```

Expected output:
```
[2024-01-15 10:30:45] INFO: Polar H10 WebSocket Server v1.0
[2024-01-15 10:30:45] INFO: 🔍 Scanning for Polar H10...
[2024-01-15 10:30:48] INFO: ✅ Found device: Polar H10 (XX:XX:XX:XX:XX:XX)
[2024-01-15 10:30:50] INFO: 📡 Connected!
[2024-01-15 10:30:52] INFO: ❤️ HR: 72 bpm | RR count: 8 | HRV (RMSSD): 42.15 ms
```

### Step 4: Test Frontend

In a separate terminal:

```bash
# Install dependencies if not done
npm install

# Start development server
npm run dev
```

Frontend should automatically connect to `ws://localhost:8765` and display live HR/HRV data.

### Step 5: Setup Auto-Start on Boot

To automatically start the backend when Pi boots:

```bash
cd backend/
chmod +x setup_systemd.sh
./setup_systemd.sh
```

Then answer "y" when prompted to start the service immediately.

Verify it's running:
```bash
sudo systemctl status polar-hrv-monitor.service
```

View logs:
```bash
journalctl -u polar-hrv-monitor.service -f
```

## Data Format

### WebSocket Message: Heart Data
```json
{
  "type": "heart_data",
  "hr": 72,
  "rr_intervals": [825, 830, 828, 832, ...],
  "rmssd": 25.5,
  "connected": true,
  "timestamp": 1704787200000
}
```

### WebSocket Message: Connection Status
```json
{
  "type": "connection_status",
  "connected": false,
  "reason": "Bluetooth disconnected",
  "timestamp": 1704787200000
}
```

## Troubleshooting

### Issue: "Device not found"
**Solution**: 
- Ensure Polar H10 is powered on and in pairing mode
- Manually pair device using bluetoothctl
- Check Bluetooth is enabled: `bluetoothctl show`

### Issue: WebSocket connection fails from React
**Solution**:
- Ensure backend is running: `sudo systemctl status polar-hrv-monitor.service`
- Check firewall allows localhost:8765
- Verify no port conflicts: `sudo lsof -i :8765`

### Issue: High HR/HRV readings or fluctuating values
**Solution**:
- Ensure chest strap is worn correctly
- Check electrode pads for sweat/moisture
- Keep device within Bluetooth range (10m line-of-sight)
- Reduce interference from WiFi/USB devices

### Issue: Backend crashes frequently
**Solution**:
- Check logs: `journalctl -u polar-hrv-monitor.service -n 50`
- Ensure Pi has adequate power (2.5A+ recommended)
- Check for Bluetooth conflicts: `sudo hciconfig`
- Restart Bluetooth: `sudo systemctl restart bluetooth`

## File Structure

```
skii-project/
├── backend/
│   ├── polar_server.py           # Main WebSocket server
│   ├── requirements.txt           # Python dependencies
│   ├── setup.sh                   # Initial setup script
│   ├── setup_systemd.sh          # Systemd service setup
│   ├── polar-hrv-monitor.service # Systemd service file
│   └── venv/                      # Python virtual environment (created by setup.sh)
├── src/
│   ├── hooks/
│   │   └── usePolarData.ts       # React WebSocket hook
│   ├── pages/
│   │   ├── LiveMonitoringScreen.tsx  # Integrated with usePolarData
│   │   └── SessionStartScreen.tsx    # Integrated with usePolarData
│   └── ... (other components unchanged)
└── POLAR_H10_INTEGRATION.md      # This file
```

## Performance Characteristics

- **Data Latency**: 2-3 seconds (WebSocket broadcasts every 2s)
- **CPU Usage**: ~5-10% on Pi 3B+ when streaming
- **Memory Usage**: ~50-80MB for Python backend
- **Bluetooth Range**: ~10m line-of-sight
- **Battery Life (H10)**: 50-60 hours typical use

## Future Enhancements

- [ ] Data persistence (SQLite database)
- [ ] Advanced HRV metrics (SDNN, PNN50, etc.)
- [ ] Export to CSV/PDF
- [ ] Real-time analysis and suggestions
- [ ] Multiple user support
- [ ] Mobile companion app

## Development Notes

### Adding New Metrics
To add new HRV metrics in the backend:

1. Add calculation function in `polar_server.py`:
```python
def calculate_sdnn(rr_intervals: list) -> float:
    """Calculate SDNN - standard deviation of all RR intervals"""
    return np.std(rr_intervals)
```

2. Update `broadcast_data()` to include new metric:
```python
"sdnn": calculate_sdnn(rr_buffer)
```

3. Update TypeScript interface in `usePolarData.ts`:
```typescript
interface PolarData {
  // ... existing
  sdnn: number;
}
```

4. Update React components to display new metric

### Testing Without Hardware
For development without Polar H10:

1. Create a mock WebSocket server in Python:
```python
# backend/mock_server.py
import websockets
import json
import asyncio
import random

async def mock_handler(websocket, path):
    while True:
        msg = json.dumps({
            "type": "heart_data",
            "hr": random.randint(60, 100),
            "rmssd": random.randint(20, 50),
            "connected": True
        })
        await websocket.send(msg)
        await asyncio.sleep(2)

# Run with: python3 mock_server.py
```

2. Update `usePolarData.ts` WS_URL to use mock server

## Support & Resources

- **Polar H10 Docs**: https://www.polar.com/us-en/products/sport-watches/polar-h10-heart-rate-sensor
- **Bleak Library**: https://bleak.readthedocs.io/
- **polar_python**: https://github.com/jagaleksi/polar-python
- **WebSockets**: https://websockets.readthedocs.io/

## License

This integration code is part of the skii-project and follows the same license.
