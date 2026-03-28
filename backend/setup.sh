#!/bin/bash
# Raspberry Pi Setup Script for Polar H10 HRV Monitor
# Run this once on fresh Raspberry Pi installation

set -e  # Exit on error

echo "=========================================="
echo "Polar H10 HRV Monitor - Backend Setup"
echo "=========================================="

# Check if running on Raspberry Pi
if ! grep -q "arm" /proc/cpuinfo; then
    echo "WARNING: This script is designed for ARM-based systems (Raspberry Pi)"
    read -p "Continue anyway? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

# Update system packages
echo "Updating system packages..."
sudo apt-get update
sudo apt-get upgrade -y

# Install Python dependencies
echo "Installing Python 3 and pip..."
sudo apt-get install -y python3 python3-pip python3-venv

# Install Bluetooth support
echo "Installing Bluetooth libraries..."
sudo apt-get install -y bluetooth bluez libbluetooth-dev

# Navigate to backend directory
BACKEND_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$BACKEND_DIR"

# Create Python virtual environment
echo "Creating Python virtual environment..."
python3 -m venv venv
source venv/bin/activate

# Upgrade pip
echo "Upgrading pip..."
pip install --upgrade pip setuptools wheel

# Install Python dependencies
echo "Installing Python dependencies..."
pip install -r requirements.txt

echo ""
echo "=========================================="
echo "Setup Complete!"
echo "=========================================="
echo ""
echo "Next steps:"
echo "1. Pair your Polar H10 device:"
echo "   - Run: sudo bluetoothctl"
echo "   - In bluetoothctl: scan on"
echo "   - Wait for 'Polar H10' to appear"
echo "   - Run: pair <MAC_ADDRESS>"
echo "   - Run: trust <MAC_ADDRESS>"
echo "   - Run: quit"
echo ""
echo "2. Test the backend:"
echo "   - Run: source venv/bin/activate"
echo "   - Run: python3 polar_server.py"
echo ""
echo "3. Frontend should connect automatically at ws://localhost:8765"
echo ""
echo "To start on Pi boot, run: setup_systemd.sh"
