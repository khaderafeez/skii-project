# Quick Commands Reference

## Fresh Install (First Time)

```bash
# 1. Go to project directory
cd ~/new_hrv/backend

# 2. Remove old venv if it exists
rm -rf venv

# 3. Create and activate virtual environment
python3 -m venv venv
source venv/bin/activate

# 4. Install dependencies (FIXED - uses bleak 3.0.1 for Python 3.13)
pip install -r requirements.txt

# 5. Pair Polar H10 device
bluetoothctl
# [bluetoothctl]# scan on
# [bluetoothctl]# pair F4:FF:FF:XX:XX:XX
# [bluetoothctl]# trust F4:FF:FF:XX:XX:XX
# [bluetoothctl]# quit
```

## Run the System

### Terminal 1 - Backend (on Pi)
```bash
cd ~/new_hrv/backend
source venv/bin/activate
python3 polar_server.py
# Wait for: "✅ WebSocket server started"
# Watch for: "❤️  HR: XX bpm | RR count: XX | HRV (RMSSD): XX.XX ms"
```

### Terminal 2 - Frontend (on Pi or Desktop)
```bash
cd ~/new_hrv
npm run dev
# Open http://localhost:5173/
```

## Stop Everything
```bash
# Terminal 1: Press CTRL+C
# Terminal 2: Press CTRL+C
```

## Troubleshooting Quick Fixes

### Port Already in Use
```bash
# Kill process on port 8765
lsof -i :8765
kill -9 <PID>

# Or for port 5173
lsof -i :5173
kill -9 <PID>
```

### Reinstall Dependencies
```bash
cd ~/new_hrv/backend
source venv/bin/activate
pip install -r requirements.txt --upgrade --force-reinstall
```

### Check Bluetooth Connection
```bash
bluetoothctl
[bluetoothctl]# paired-devices
[bluetoothctl]# info F4:FF:FF:XX:XX:XX
[bluetoothctl]# quit
```

### View Logs (if using systemd)
```bash
sudo systemctl status polar-hrv-monitor
sudo journalctl -u polar-hrv-monitor -f  # Follow logs
```

### Stop Systemd Service
```bash
sudo systemctl stop polar-hrv-monitor
sudo systemctl start polar-hrv-monitor
```

## Useful Ports

- **8765** = Backend WebSocket Server (Polar H10 data)
- **5173** = Frontend React App
- **Bluetooth** = Polar H10 Device (no port, uses BLE)

## File Locations

- Backend code: `~/new_hrv/backend/polar_server.py`
- Frontend code: `~/new_hrv/src/`
- Hook: `~/new_hrv/src/hooks/usePolarData.ts`
- Requirements: `~/new_hrv/backend/requirements.txt`
- Config: `~/new_hrv/backend/polar-hrv-monitor.service` (systemd)

## Status Indicators

### What You Should See in Backend Terminal
```
✅ Found device: Polar H10
✅ Connected to Polar H10!
✅ WebSocket server started
❤️  HR: 72 bpm | RR count: 8 | HRV (RMSSD): 45.32 ms
```

### What You Should See in Frontend
```
Bluetooth Status: CONNECTED
Heart Rate: 72 bpm (updating every 2 seconds)
HRV: 45.32 ms (updating every 2 seconds)
```

## Common Issues & Solutions

| Issue | Solution |
|-------|----------|
| `bleak==0.21.1` not found | Already fixed - using 3.0.1 |
| Device not found | Pair with `bluetoothctl` first |
| WebSocket fails to start | Kill port 8765: `lsof -i :8765` |
| No HR data showing | Check Bluetooth battery, re-pair device |
| Permission denied error | Run with `sudo` or add to bluetooth group |
| Frontend won't connect | Check if backend running on port 8765 |

---

**Need detailed help?** Read `INSTALL_ON_PI.md` for full installation guide.
