#!/bin/bash
# SafeShipper IoT Gateway Installation Script

set -e

echo "Installing SafeShipper IoT Gateway..."

# Update system
sudo apt update
sudo apt upgrade -y

# Install system dependencies
sudo apt install -y python3-pip python3-venv git

# Enable I2C and SPI
sudo raspi-config nonint do_i2c 0
sudo raspi-config nonint do_spi 0

# Create application directory
sudo mkdir -p /opt/safeshipper
sudo chown $USER:$USER /opt/safeshipper

# Copy application files
cp safeshipper_gateway.py /opt/safeshipper/
cp requirements.txt /opt/safeshipper/

# Create virtual environment
cd /opt/safeshipper
python3 -m venv venv
source venv/bin/activate

# Install Python dependencies
pip install -r requirements.txt

# Create configuration directory
sudo mkdir -p /etc/safeshipper

# Create log directory
sudo mkdir -p /var/log
sudo touch /var/log/safeshipper-gateway.log
sudo chown $USER:$USER /var/log/safeshipper-gateway.log

# Create systemd service
sudo tee /etc/systemd/system/safeshipper-gateway.service > /dev/null <<EOF
[Unit]
Description=SafeShipper IoT Gateway
After=network.target
Wants=network.target

[Service]
Type=simple
User=$USER
WorkingDirectory=/opt/safeshipper
Environment=PATH=/opt/safeshipper/venv/bin
ExecStart=/opt/safeshipper/venv/bin/python /opt/safeshipper/safeshipper_gateway.py
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF

# Enable and start service
sudo systemctl daemon-reload
sudo systemctl enable safeshipper-gateway.service

echo "Installation complete!"
echo "Configure the gateway by editing /etc/safeshipper/gateway.conf"
echo "Start the service with: sudo systemctl start safeshipper-gateway"
echo "Check logs with: sudo journalctl -u safeshipper-gateway -f"