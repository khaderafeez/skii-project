# Deployment Checklist: Polar H10 HRV Monitor

Use this checklist to verify the integration is working before final deployment.

## Pre-Deployment Verification

### Code Changes
- [ ] `src/hooks/usePolarData.ts` created
- [ ] `src/pages/LiveMonitoringScreen.tsx` updated with real data
- [ ] `src/pages/SessionStartScreen.tsx` updated with real data
- [ ] `backend/polar_server.py` created and tested
- [ ] `backend/requirements.txt` has all dependencies
- [ ] No console errors in browser DevTools (F12)
- [ ] No Python errors in backend logs

### File Structure
```
backend/
├── polar_server.py              ✅
├── requirements.txt             ✅
├── setup.sh                     ✅
├── setup_systemd.sh             ✅
├── polar-hrv-monitor.service   ✅
└── test_websocket.py           ✅

src/
├── hooks/
│   └── usePolarData.ts         ✅
├── pages/
│   ├── LiveMonitoringScreen.tsx ✅
│   └── SessionStartScreen.tsx   ✅
└── components/
    ├── BluetoothStatus.tsx      (unchanged)
    └── ... (other components)

Documentation/
├── POLAR_H10_INTEGRATION.md    ✅
├── QUICK_START_PI.md           ✅
├── ARCHITECTURE.md             ✅
├── IMPLEMENTATION_SUMMARY.md   ✅
└── DEPLOYMENT_CHECKLIST.md     ✅
```

## Hardware Setup

### Polar H10 Device
- [ ] Device powered on
- [ ] Battery level checked (sufficient power)
- [ ] Firmware up-to-date
- [ ] Electrode pads clean and moist
- [ ] Strap worn correctly (across chest)

### Raspberry Pi
- [ ] Pi powered on and SSH accessible
- [ ] Bluetooth enabled: `sudo systemctl status bluetooth`
- [ ] Sufficient disk space: `df -h` (>500MB free)
- [ ] CPU temperature normal: `vcgencmd measure_temp`
- [ ] WiFi/Network connection stable
- [ ] System clock correct: `date`

## Software Installation

### Backend Setup (One-time)

```bash
cd backend
chmod +x setup.sh
./setup.sh
```

- [ ] Script runs without errors
- [ ] Python 3.7+ installed: `python3 --version`
- [ ] Virtual environment created: `ls -la venv/`
- [ ] Dependencies installed: `venv/bin/pip list`

### Bluetooth Pairing (One-time)

```bash
sudo bluetoothctl
# Inside bluetoothctl:
scan on
# Note Polar H10 MAC address
pair <MAC>
trust <MAC>
connect <MAC>
quit
```

- [ ] Device appears in scan results
- [ ] Pairing succeeds
- [ ] Device trusted
- [ ] Device in: `bluetoothctl devices`

### Frontend Setup

```bash
npm install
npm run build
```

- [ ] No dependency errors
- [ ] Build completes successfully
- [ ] `dist/` folder created

## Testing

### Test 1: Backend Connectivity

```bash
cd backend
source venv/bin/activate
python3 polar_server.py
```

**Expected Output:**
```
[...] INFO: Polar H10 WebSocket Server v1.0
[...] INFO: 🔍 Scanning for Polar H10...
[...] INFO: ✅ Found device: Polar H10 (XX:XX:XX:XX:XX:XX)
[...] INFO: ✅ Connected!
[...] INFO: 📡 Starting WebSocket server on ws://localhost:8765
[...] INFO: ✅ WebSocket server started
[...] INFO: ❤️ HR: 72 bpm | RR count: 8 | HRV (RMSSD): 42.15 ms
```

**Checklist:**
- [ ] Scanning completes within 10s
- [ ] Device found and connected
- [ ] WebSocket server starts
- [ ] Data broadcasting shows HR and RMSSD
- [ ] No Bluetooth errors
- [ ] No Python exceptions
- [ ] Process runs continuously

### Test 2: WebSocket Client

In another terminal:
```bash
cd backend
source venv/bin/activate
python3 test_websocket.py
```

**Expected Output:**
```
Attempting to connect to ws://localhost:8765...
✅ Connected!

Listening for messages (Ctrl+C to stop)...

❤️ HR: 72 bpm | HRV: 25.5 ms | Connected: True
❤️ HR: 73 bpm | HRV: 26.1 ms | Connected: True
```

**Checklist:**
- [ ] Test client connects successfully
- [ ] Messages arrive every 2 seconds
- [ ] HR values are realistic (40-150 bpm)
- [ ] HRV values are positive
- [ ] Connection status shows True
- [ ] No parsing errors

### Test 3: Frontend Connection

```bash
npm run dev
```

**In Browser (F12 → Console):**
```
[v0] Attempting WebSocket connection to ws://localhost:8765
[v0] WebSocket connected
[v0] Received message type: heart_data
```

**Checklist:**
- [ ] Frontend starts without errors
- [ ] No CORS errors in console
- [ ] WebSocket connects successfully
- [ ] Console shows received messages
- [ ] No red errors in DevTools
- [ ] No warnings about missing dependencies

### Test 4: UI Display

Navigate to `http://localhost:5173`:

**LiveMonitoringScreen:**
- [ ] Heart Rate card shows number (not "--")
- [ ] HRV card shows number (not "--")
- [ ] BluetoothStatus shows "Connected"
- [ ] Data updates every 2 seconds
- [ ] HR is in realistic range (40-150 bpm)
- [ ] HRV is positive number

**SessionStartScreen:**
- [ ] Heart Rate shows real data (not mock)
- [ ] "MEASURING" status shown during countdown
- [ ] HR updates live during countdown
- [ ] Connection status displays correctly

### Test 5: Connection Recovery

**Scenario:** Disconnect Polar H10 during streaming

**Expected Behavior:**
- [ ] Frontend shows connection lost within 5s
- [ ] Backend retries every 5s
- [ ] HR data stops updating
- [ ] Error message appears (if configured)
- [ ] Reconnect automatically when device repaired

**Test Steps:**
1. Start backend and frontend
2. Wear/activate Polar H10
3. Verify data flowing
4. Turn off Polar H10
5. Watch for disconnect in UI and backend logs
6. Turn on Polar H10
7. Verify automatic reconnection within 15s

- [ ] Disconnection detected
- [ ] Reconnection attempted
- [ ] Data resumes flowing
- [ ] UI updates accordingly

## Production Deployment

### Systemd Service Setup

```bash
cd backend
chmod +x setup_systemd.sh
./setup_systemd.sh
```

**Answer "y" when asked to start service**

- [ ] Service file copied to `/etc/systemd/system/`
- [ ] Systemd daemon reloaded
- [ ] Service enabled (starts on boot)
- [ ] Service started immediately

### Verify Service Running

```bash
sudo systemctl status polar-hrv-monitor.service
```

**Expected Status:**
- [ ] Status shows "active (running)"
- [ ] No error messages
- [ ] Service shows in `systemctl list-units`

### View Service Logs

```bash
journalctl -u polar-hrv-monitor.service -f
```

- [ ] Backend initializes and connects
- [ ] No error messages in first 30s
- [ ] Data messages appear every 2s
- [ ] No memory leaks (logs remain consistent)

### Test Auto-start

1. Reboot Pi: `sudo reboot`
2. Wait 30 seconds for boot to complete
3. SSH back in and check:

```bash
sudo systemctl status polar-hrv-monitor.service
```

- [ ] Service running after reboot
- [ ] No manual intervention needed
- [ ] Backend found Polar H10 automatically
- [ ] Logs show successful startup

## Performance Validation

### Backend Resource Usage

```bash
top -p $(pgrep -f polar_server.py)
```

Check during active streaming:
- [ ] CPU: 5-10% max
- [ ] Memory: <100 MB
- [ ] No runaway processes

### Frontend Performance

Open DevTools (F12):
- [ ] Tab shows "FPS" around 60 (or green)
- [ ] No "long tasks" in Performance tab
- [ ] Memory stable (no leaks)
- [ ] Network tab shows WebSocket messages every 2s

### Network Quality

```bash
sudo nethogs  # Show bandwidth per process
```

- [ ] Polar H10 connection stable
- [ ] WebSocket data rate ~1 KB/s
- [ ] No excessive retransmissions
- [ ] Latency <50ms local

## Security Checklist

### Development Environment
- [ ] WebSocket only on localhost (not exposed)
- [ ] No sensitive credentials in code
- [ ] No hardcoded passwords
- [ ] Debug logging can be disabled
- [ ] No data persisted by default

### Production Considerations (Future)
- [ ] Add authentication if exposed to network
- [ ] Use WSS (WebSocket Secure) if over internet
- [ ] Implement rate limiting on API
- [ ] Sanitize all user inputs
- [ ] Add HTTPS certificate
- [ ] Regular security audits

## Documentation Verification

- [ ] QUICK_START_PI.md is clear and complete
- [ ] POLAR_H10_INTEGRATION.md covers all setup steps
- [ ] ARCHITECTURE.md explains system design
- [ ] README or main docs link to integration guide
- [ ] Troubleshooting section covers common issues
- [ ] Code comments are present and helpful

## Final Checks

- [ ] No console errors (browser)
- [ ] No Python exceptions (backend)
- [ ] No missing dependencies
- [ ] All files in correct locations
- [ ] Documentation complete
- [ ] Performance acceptable
- [ ] Ready for commit

## Sign-Off

**Tested by:** ___________________  
**Date:** ___________________  
**Notes:** ________________________________________________

## Rollback Plan (If Needed)

If issues arise:

1. **Backend Issues:**
   ```bash
   sudo systemctl stop polar-hrv-monitor.service
   cd backend && python3 polar_server.py  # Test manually
   ```

2. **Frontend Issues:**
   ```bash
   npm run dev  # Use dev server for debugging
   ```

3. **Bluetooth Issues:**
   ```bash
   sudo systemctl restart bluetooth
   sudo bluetoothctl  # Repair device
   ```

4. **Complete Rollback:**
   ```bash
   git checkout HEAD -- .
   git clean -fd
   ```

---

**Ready to Deploy! 🚀**

Once all items are checked, you're safe to commit and deploy to production.
