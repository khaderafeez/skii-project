# Quick Start: Running on Raspberry Pi

## TL;DR - Get Running in 5 Steps

### 1. SSH into your Pi
```bash
ssh pi@<PI_IP_ADDRESS>
```

### 2. Clone/navigate to project and setup backend
```bash
cd skii-project/backend
chmod +x setup.sh
./setup.sh
```

### 3. Pair Polar H10
```bash
sudo bluetoothctl
# Inside bluetoothctl:
scan on
# Wait for "Polar H10" to appear
pair <MAC_ADDRESS>
trust <MAC_ADDRESS>
quit
```

### 4. Start the backend (test run)
```bash
source venv/bin/activate
python3 polar_server.py
```
Should see: "✅ WebSocket server started"

### 5. In another terminal, start frontend
```bash
cd ..
npm install
npm run dev
```

Open browser to `http://<PI_IP>:5173` and you should see real HR/HRV data!

## Auto-Start on Boot (Optional)

```bash
cd backend
chmod +x setup_systemd.sh
./setup_systemd.sh
```
Answer "y" to start immediately. Now backend runs automatically when Pi boots.

## Check If It's Working

**Backend Running:**
```bash
sudo systemctl status polar-hrv-monitor.service
```

**See Backend Logs:**
```bash
journalctl -u polar-hrv-monitor.service -f
```

**Frontend Logs (browser DevTools):**
- Press F12 in browser
- Go to Console tab
- Look for "[v0] Received message type: heart_data"

## Common Issues & Fixes

| Issue | Fix |
|-------|-----|
| "Device not found" | Make sure Polar H10 is on, run `bluetoothctl devices` to verify it's paired |
| WebSocket connection fails | Check backend is running: `ps aux \| grep polar_server` |
| Data not updating | Check browser console for errors, ensure both backend and frontend are running |
| Bluetooth keeps dropping | Move closer to Pi, check for WiFi interference, restart Bluetooth: `sudo systemctl restart bluetooth` |

## File Locations

| Component | Location |
|-----------|----------|
| Backend Python Server | `/home/pi/skii-project/backend/polar_server.py` |
| Frontend (React) | `/home/pi/skii-project/src/` |
| Config/Systemd | `/etc/systemd/system/polar-hrv-monitor.service` |
| Backend Logs | `journalctl -u polar-hrv-monitor.service` |

## Next Steps

For detailed setup and troubleshooting, see: [POLAR_H10_INTEGRATION.md](POLAR_H10_INTEGRATION.md)
