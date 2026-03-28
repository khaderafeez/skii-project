#!/bin/bash
# Setup systemd service for auto-starting Polar H10 backend on Pi boot

set -e

echo "Setting up systemd service for auto-start..."

# Copy service file to systemd directory
sudo cp polar-hrv-monitor.service /etc/systemd/system/

# Reload systemd daemon
sudo systemctl daemon-reload

# Enable service (start on boot)
sudo systemctl enable polar-hrv-monitor.service

# Optional: Start service immediately
read -p "Start service now? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    sudo systemctl start polar-hrv-monitor.service
    echo "Service started!"
    echo ""
    echo "Check status with: sudo systemctl status polar-hrv-monitor.service"
    echo "View logs with: journalctl -u polar-hrv-monitor.service -f"
fi

echo ""
echo "Setup complete!"
echo "The Polar H10 backend will now start automatically on Pi boot."
