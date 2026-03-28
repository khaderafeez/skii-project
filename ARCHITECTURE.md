# System Architecture: Polar H10 HRV Monitor

## High-Level Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    RASPBERRY PI 3B+                         │
│                                                             │
│  ┌──────────────────┐          ┌──────────────────────┐   │
│  │  Polar H10       │          │   Python Backend     │   │
│  │  (Bluetooth)     │ Bluetooth │  (WebSocket Server)  │   │
│  │                  │◄────────►│  Port: 8765          │   │
│  │ - HR Data        │          │                      │   │
│  │ - RR Intervals   │          │ Calculates RMSSD     │   │
│  └──────────────────┘          │ Handles reconnect    │   │
│                                │ Broadcasts data      │   │
│                                └──────────────────────┘   │
│                                         ▲                   │
│                                         │                   │
│                        WebSocket (localhost:8765)           │
│                                         │                   │
│                                         ▼                   │
│  ┌──────────────────────────────────────────────────────┐  │
│  │     React Frontend (Vite Dev Server)                 │  │
│  │     Port: 5173                                       │  │
│  │                                                      │  │
│  │  ┌────────────────────────────────────────────────┐ │  │
│  │  │ usePolarData Hook                              │ │  │
│  │  │ - WebSocket client                             │ │  │
│  │  │ - Auto-reconnect logic                         │ │  │
│  │  │ - State management                             │ │  │
│  │  └────────────────────────────────────────────────┘ │  │
│  │                        │                             │  │
│  │                        ▼                             │  │
│  │  ┌────────────────────────────────────────────────┐ │  │
│  │  │ UI Components                                  │ │  │
│  │  │ - LiveMonitoringScreen (HR, HRV display)      │ │  │
│  │  │ - SessionStartScreen (Baseline measurement)   │ │  │
│  │  │ - VitalCard (Data visualization)              │ │  │
│  │  │ - BluetoothStatus (Connection indicator)      │ │  │
│  │  └────────────────────────────────────────────────┘ │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                             │
└─────────────────────────────────────────────────────────────┘
                              │
                              │ HTTP (Browser)
                              ▼
                    ┌──────────────────┐
                    │  Browser Window  │
                    │  (http://IP:5173)│
                    │                  │
                    │ Displays:        │
                    │ - Real HR (bpm)  │
                    │ - Real HRV (ms)  │
                    │ - Connection OK  │
                    └──────────────────┘
```

## Component Interactions

### 1. Data Collection Path

```
Polar H10 Sensor
    │ Bluetooth (BLE)
    ▼
Python Backend (polar_server.py)
    │
    ├─→ Connect via Bleak library
    │
    ├─→ Register HR callback
    │
    ├─→ Receive: HR + RR intervals
    │
    ├─→ Calculate RMSSD from RR buffer
    │
    ├─→ Create JSON message
    │
    └─→ Broadcast via WebSocket
        (every 2 seconds)
```

### 2. Real-time Streaming Loop

```
Backend Loop (every 2 seconds):
┌─────────────────────────────────┐
│ 1. Read latest HR from callback │
│ 2. Read RR interval buffer      │
│ 3. Calculate RMSSD              │
│ 4. Create JSON message:         │
│    {                            │
│      type: "heart_data",        │
│      hr: 72,                    │
│      rmssd: 25.5,               │
│      connected: true            │
│    }                            │
│ 5. Send to all WebSocket clients│
└─────────────────────────────────┘
         ▼ (WebSocket)
React usePolarData Hook
         ▼
Update Component State
         ▼
Re-render UI with new values
```

### 3. Connection & Reconnection Flow

```
Start Backend
    │
    ▼
Scan for Polar H10 (10s timeout)
    │
    ├─→ Found? ─→ Yes ─→ Connect ─→ Start streaming
    │                          │
    │                          ▼
    │                    ✅ Connection OK
    │
    └─→ Not Found? ─→ Retry after 30s (up to 5 times)

Streaming Loop
    │
    ├─→ Bluetooth connection alive? ─→ Yes ─→ Continue broadcast
    │                                  
    │                                  No
    │                                   │
    └─→ Connection Lost ─→ Retry every 5s ─→ Max 5 attempts
                                │
                                ▼
                        Reset counter, retry every 30s
```

### 4. Frontend Connection Lifecycle

```
Component Mount (useEffect)
    │
    ▼
usePolarData hook called
    │
    ▼
WebSocket connect to ws://localhost:8765
    │
    ├─→ Connection timeout (5s) ─→ Close + Schedule reconnect
    │
    ├─→ Error ─→ Schedule reconnect
    │
    ├─→ Closed ─────────┐
    │                   │
    └─→ Success ────┐   │
                    │   │
                    ▼   ▼
              Reconnect Backoff (3s delay)
                    │
                    ├─→ Attempt 1-10
                    │
                    └─→ Max attempts exceeded ─→ Show error
    
While Connected:
    Listen for messages
         │
         ├─→ type: "heart_data" ─→ Update HR, HRV, RR state
         │
         └─→ type: "connection_status" ─→ Update isConnected flag
```

## Data Structures

### Backend State

```python
connected_clients: Set[WebSocket] = set()
is_bluetooth_connected: bool = False
rr_buffer: list[int] = []              # Last 50 RR intervals
current_heart_rate: int = 0             # Latest HR in bpm
current_rmssd: float = 0.0              # Latest RMSSD in ms
```

### WebSocket Message Format

```typescript
// Heart Data Message (from backend every 2s)
{
  type: "heart_data",
  hr: number,                    // Heart rate in bpm
  rr_intervals: number[],        // Last ~20 RR intervals (ms)
  rmssd: number,                 // HRV metric (ms)
  connected: boolean,            // Bluetooth connection status
  timestamp: number              // Unix timestamp (ms)
}

// Connection Status Message
{
  type: "connection_status",
  connected: boolean,
  reason?: string,               // Error message if disconnected
  timestamp: number
}
```

### React Hook Return Value

```typescript
{
  heartRate: number,             // 0 if not available
  hrv: number,                   // 0 if not available
  rr_intervals: number[],        // [] if not available
  isConnected: boolean,          // false if backend disconnected
  error: string | null           // null if no error
}
```

## Performance Characteristics

### Backend (Python)

```
CPU Usage:         5-10% on Pi 3B+
Memory:            50-80 MB
Data Rate:         ~2 KB every 2s = ~1 KB/s
Bluetooth Range:   ~10m line-of-sight
Latency:           2-3 seconds (WebSocket broadcast delay)
Reconnect Time:    5-15 seconds (with backoff)
```

### Frontend (React)

```
Component Renders:  Once every 2 seconds (data update)
Memory:            ~20-30 MB for React + Vite
WebSocket Overhead: Minimal (heartbeat messages only)
CPU Usage:         <1% (idle) → 2-5% (active)
Supported Browsers: Chrome, Firefox, Safari, Edge (all modern)
```

## Error Handling Strategy

```
Bluetooth Connection Error
    │
    └─→ Log error
    └─→ Broadcast connection_status: false
    └─→ Attempt reconnect every 5s
    └─→ After 5 failures, backoff to 60s
    └─→ Max 10 total reconnection attempts

WebSocket Client Error
    │
    ├─→ Connection refused? ─→ Backend not running
    │                         (User sees: "Connection timeout")
    │
    ├─→ Connection timeout? ─→ Network issue
    │                        (Retry with backoff)
    │
    └─→ Message parse error? ─→ Log and ignore bad messages
                              (Keep connection alive)

Device Data Error
    │
    └─→ RR intervals too few? ─→ Return RMSSD = 0
    └─→ Invalid calculation? ─→ Log error, skip that broadcast
```

## Deployment Architecture

### Development (Laptop)

```
Laptop with Pi on same network:
- Backend runs on Pi (192.168.1.100:8765)
- Frontend runs on Laptop (localhost:5173)
- Modify usePolarData.ts WS_URL to: "ws://192.168.1.100:8765"
- Test and debug easily
```

### Production (Pi Standalone)

```
All-in-one on Pi:
┌──────────────────────────────────┐
│ Raspberry Pi 3B+                 │
│                                  │
│ systemd service                  │
│ └─→ python3 polar_server.py      │
│     (ws://localhost:8765)        │
│                                  │
│ npm run build                    │
│ └─→ Vite (production build)      │
│     (http://localhost:5173)      │
│                                  │
│ Auto-start on boot via systemd   │
└──────────────────────────────────┘
     ↓
Access from any device on network:
http://PI_IP_ADDRESS:5173
```

## Scalability Considerations

### Current Limitations

- Single-device connection (one Polar H10)
- In-memory only (no persistence)
- All data discarded after session
- No user management

### Future Scaling

```
Phase 2: Data Persistence
├─→ SQLite database on Pi
├─→ Store all HR/HRV readings
├─→ Export to CSV/JSON
└─→ Historical data analysis

Phase 3: Multi-user Support
├─→ User authentication
├─→ Per-user data isolation
├─→ Cloud sync (optional)
└─→ Mobile app companion

Phase 4: Advanced Analytics
├─→ Advanced HRV metrics
├─→ Stress detection
├─→ Recovery recommendations
└─→ Trends over time
```

## Security Considerations

### Current (Development)

- WebSocket on localhost only (no external access)
- No authentication (safe for local use)
- No data encryption (development environment)

### For Production Deployment

```
If exposed to network:
├─→ Add authentication/token validation
├─→ Use WSS (WebSocket Secure)
├─→ Implement rate limiting
├─→ Add CORS restrictions
└─→ Use HTTPS for frontend
```

## Monitoring & Debugging

### Backend Health Checks

```bash
# Check service status
sudo systemctl status polar-hrv-monitor.service

# View real-time logs
journalctl -u polar-hrv-monitor.service -f

# Check WebSocket port
sudo lsof -i :8765

# Verify Bluetooth connection
bluetoothctl devices
```

### Frontend Debugging

```javascript
// Browser console will show:
[v0] Attempting WebSocket connection to ws://localhost:8765
[v0] WebSocket connected
[v0] Received message type: heart_data
[v0] HR: 72 bpm | HRV: 25.5 ms
```

### Performance Profiling

```bash
# Monitor Pi resources during session
top -p $(pgrep -f polar_server.py)

# WebSocket message rate
tcpdump -i lo -n 'tcp port 8765'
```
