# Step-by-Step Installation on Raspberry Pi 3B+

## ✅ Prerequisites Checked
- Python 3.13.5 ✓
- Bluetooth libraries ✓
- pip and venv ✓

## Issue Fixed
The original `requirements.txt` specified `bleak==0.21.1` which doesn't support Python 3.13. Updated to `bleak==3.0.1` (compatible with Python 3.13.5 and available on piwheels).

## Installation Steps

### Step 1: Reset and Start Fresh
```bash
cd ~/new_hrv/backend
rm -rf venv  # Remove old venv
pip3 install --upgrade pip setuptools wheel
```

### Step 2: Create Virtual Environment
```bash
python3 -m venv venv
source venv/bin/activate
```

### Step 3: Install Dependencies
```bash
pip install -r requirements.txt
```

This will install:
- `bleak==3.0.1` - Bluetooth Low Energy (BLE) library
- `polar-python==0.2.0` - Polar device SDK
- `websockets==12.0` - WebSocket server
- `numpy>=1.24.3` - Numerical computing

**Expected Output:**
```
Successfully installed bleak-3.0.1 polar-python-0.2.0 websockets-12.0 numpy-1.26.x
```

### Step 4: Pair Your Polar H10 Device
```bash
bluetoothctl
[bluetoothctl]# scan on
# Wait for your Polar H10 to appear (MAC address like F4:FF:FF:XX:XX:XX)
[bluetoothctl]# pair F4:FF:FF:XX:XX:XX  # Replace with your device's MAC
[bluetoothctl]# trust F4:FF:FF:XX:XX:XX
[bluetoothctl]# quit
```

### Step 5: Test the Backend (Terminal 1)
```bash
cd ~/new_hrv/backend
source venv/bin/activate
python3 polar_server.py
```

**Expected Output:**
```
[2026-03-28 14:30:45,123] INFO: ============================================================
[2026-03-28 14:30:45,124] INFO: Polar H10 WebSocket Server v1.0
[2026-03-28 14:30:45,125] INFO: ============================================================
[2026-03-28 14:30:45,126] INFO: 🔍 Scanning for Polar H10...
[2026-03-28 14:30:50,456] INFO: ✅ Found device: Polar H10 (F4:FF:FF:XX:XX:XX)
[2026-03-28 14:30:51,789] INFO: 📡 Connecting...
[2026-03-28 14:30:52,234] INFO: ✅ Connected to Polar H10!
[2026-03-28 14:30:52,235] INFO: 🚀 Starting WebSocket server on ws://localhost:8765
[2026-03-28 14:30:52,236] INFO: ✅ WebSocket server started
[2026-03-28 14:30:55,123] INFO: ❤️  HR: 72 bpm | RR count: 8 | HRV (RMSSD): 45.32 ms
```

### Step 6: Start the React Frontend (Terminal 2)
```bash
cd ~/new_hrv
npm run dev
```

**Expected Output:**
```
  VITE v5.x.x  ready in 345 ms

  ➜  Local:   http://localhost:5173/
  ➜  press h to show help
```

### Step 7: Access the UI
Open your browser and go to: **http://localhost:5173/**

You should see:
- ✅ Bluetooth Status: CONNECTED
- ❤️ Heart Rate: Live reading from Polar H10
- 🧠 HRV (RMSSD): Live HRV calculation

## Troubleshooting

### Backend won't find Polar H10
```bash
# Check if device is paired
bluetoothctl
[bluetoothctl]# paired-devices
# Should show: Device F4:FF:FF:XX:XX:XX Polar H10

# If not found, pair it first
[bluetoothctl]# scan on
```

### "Address already in use" error
WebSocket port 8765 is already in use. Kill existing process:
```bash
lsof -i :8765
kill -9 <PID>
```

### Bluetooth permission error
```bash
# Add user to bluetooth group
sudo usermod -a -G bluetooth $USER
# Log out and log back in
```

### Dependencies won't install
```bash
# Clear pip cache and retry
pip cache purge
pip install -r requirements.txt --no-cache-dir
```

### CTRL+C to stop services
```bash
# Frontend
Press CTRL+C in frontend terminal

# Backend  
Press CTRL+C in backend terminal

# Kill any stuck processes
pkill -f polar_server.py
pkill -f "vite --port"
```

## Next Steps

### Option 1: Run Manually Every Time
Just repeat Steps 5 & 6 whenever you want to use the system.

### Option 2: Auto-Start on Pi Boot (Optional)
```bash
cd backend
chmod +x setup_systemd.sh
sudo ./setup_systemd.sh
# Backend will now auto-start on every Pi reboot
sudo systemctl status polar-hrv-monitor
```

### Option 3: Run Frontend on Desktop/Laptop
Your backend runs on Pi, but you can run the React frontend on a different machine:
1. Edit `src/hooks/usePolarData.ts` line 25
2. Change `ws://localhost:8765` to `ws://YOUR_PI_IP:8765`
3. Run `npm run dev` on your desktop
4. Open `http://localhost:5173/` on any device

---

## Quick Reference

| Component | Port | Status Check |
|-----------|------|--------------|
| **Backend (Polar + WebSocket)** | 8765 | `curl -i -N -H "Connection: Upgrade" -H "Upgrade: websocket" http://localhost:8765` |
| **Frontend (React)** | 5173 | Open http://localhost:5173/ |
| **Bluetooth Device** | N/A | `bluetoothctl paired-devices` |

---

**Everything is now ready!** Your Polar H10 real-time HRV monitoring system is set up on Raspberry Pi 3B+.
