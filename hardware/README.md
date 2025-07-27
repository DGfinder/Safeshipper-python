# SafeShipper IoT Hardware Integration

This directory contains hardware proof-of-concept implementations for IoT sensor nodes and gateways that integrate with the SafeShipper platform.

## Overview

The SafeShipper IoT system consists of:

1. **ESP32 Sensor Nodes** - Lightweight, battery-powered sensors for shipment tracking
2. **Raspberry Pi Gateways** - Advanced processing nodes with multiple sensor interfaces
3. **Cloud API Integration** - High-performance data ingestion and device management

## Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│  ESP32 Sensors  │───▶│ Raspberry Pi    │───▶│ SafeShipper API │
│                 │    │ Gateway         │    │                 │
│ • Temperature   │    │                 │    │ • Data Storage  │
│ • Humidity      │    │ • GPS           │    │ • Alerts        │
│ • Shock         │    │ • Pressure      │    │ • Commands      │
│ • GPS (opt)     │    │ • Aggregation   │    │ • Dashboard     │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## ESP32 Sensor Node

### Hardware Requirements

- ESP32 Development Board (ESP-WROOM-32)
- DHT22 Temperature/Humidity Sensor
- SW-420 Vibration/Shock Sensor
- Optional: NEO-6M GPS Module
- Optional: 18650 Battery + Charging Circuit

### Pin Configuration

```
ESP32 Pin | Component
----------|----------
GPIO34    | DHT22 Data
GPIO33    | Shock Sensor
GPIO17    | GPS TX (optional)
GPIO16    | GPS RX (optional)
GPIO2     | Status LED
3.3V      | Sensor Power
GND       | Common Ground
```

### Installation

1. Install MicroPython on ESP32
2. Upload `boot.py` and `main.py` to the device
3. Configure WiFi credentials and API settings in `main.py`
4. Connect sensors according to pin configuration

### Features

- **Low Power Operation**: Deep sleep between readings
- **Batch Data Transmission**: Reduces network overhead
- **Automatic Reconnection**: Handles WiFi disconnections
- **Remote Commands**: Supports ping, reboot, configuration updates
- **Status Monitoring**: Battery level, signal strength, uptime

## Raspberry Pi Gateway

### Hardware Requirements

- Raspberry Pi 4B (recommended) or 3B+
- DHT22 Temperature/Humidity Sensor
- BME280 Pressure Sensor (I2C)
- NEO-6M GPS Module (UART)
- SW-420 Vibration Sensor
- MicroSD Card (32GB+)
- USB GPS Dongle (alternative to module)

### Pin Configuration

```
GPIO Pin | Component
---------|----------
GPIO18   | DHT22 Data
GPIO24   | Shock Sensor
GPIO25   | Status LED
GPIO2    | I2C SDA (BME280)
GPIO3    | I2C SCL (BME280)
UART     | GPS Module
```

### Installation

1. Flash Raspberry Pi OS to SD card
2. Enable SSH, I2C, and SPI interfaces
3. Run the installation script:
   ```bash
   chmod +x install.sh
   ./install.sh
   ```
4. Configure the gateway:
   ```bash
   sudo nano /etc/safeshipper/gateway.conf
   ```
5. Start the service:
   ```bash
   sudo systemctl start safeshipper-gateway
   ```

### Features

- **Multi-sensor Support**: Temperature, humidity, pressure, GPS, shock
- **Edge Processing**: Local data validation and aggregation
- **Robust Communication**: Automatic retry and error handling
- **Remote Management**: Configuration updates and diagnostics
- **Systemd Integration**: Automatic startup and recovery

## API Integration

### Authentication

All devices authenticate using:
- **Device ID**: Unique identifier for each device
- **API Key**: Secret key for secure communication

### Endpoints

1. **Data Ingestion**: `POST /api/v1/iot/ingest/sensor-data/`
2. **Heartbeat**: `POST /api/v1/iot/heartbeat/`
3. **Command Response**: `POST /api/v1/iot/command-response/`

### Data Format

```json
{
  "sensor_type": "temperature",
  "value": 25.4,
  "unit": "°C",
  "timestamp": "2024-01-15T10:30:00Z",
  "quality_score": 0.95,
  "additional_data": {}
}
```

## Sensor Types

| Type | Unit | Description |
|------|------|-------------|
| temperature | °C | Ambient temperature |
| humidity | % | Relative humidity |
| pressure | hPa | Atmospheric pressure |
| location | coordinates | GPS coordinates |
| shock | event | Vibration/impact detection |
| acceleration | m/s² | Accelerometer data |
| battery | % | Device battery level |

## Alert Thresholds

Configure device-specific thresholds in the device configuration:

```json
{
  "thresholds": {
    "temperature": {
      "high_warning": 30.0,
      "high_critical": 35.0,
      "low_warning": 5.0,
      "low_critical": 0.0
    },
    "humidity": {
      "high_warning": 80.0,
      "high_critical": 90.0
    }
  }
}
```

## Power Management

### ESP32 Power Optimization

- Use deep sleep between readings
- Disable WiFi when not transmitting
- Optimize sensor reading frequency
- Use external RTC for wake-up

### Battery Life Estimation

| Reading Interval | Estimated Battery Life |
|------------------|------------------------|
| 1 minute | 2-3 days |
| 5 minutes | 1-2 weeks |
| 15 minutes | 1-2 months |
| 1 hour | 3-6 months |

## Troubleshooting

### Common Issues

1. **WiFi Connection Failed**
   - Check credentials in configuration
   - Verify network connectivity
   - Check signal strength

2. **Sensor Read Errors**
   - Verify wiring connections
   - Check power supply voltage
   - Test sensors individually

3. **API Authentication Failed**
   - Verify Device ID and API Key
   - Check API endpoint URL
   - Review server logs

### Diagnostic Commands

```bash
# Check gateway service status
sudo systemctl status safeshipper-gateway

# View live logs
sudo journalctl -u safeshipper-gateway -f

# Test sensor readings
python3 /opt/safeshipper/test_sensors.py

# Check network connectivity
ping api.safeshipper.com
```

## Development

### Adding New Sensors

1. Define sensor type in backend models
2. Implement reading function in hardware code
3. Add threshold configuration
4. Update dashboard visualization

### Custom Commands

Add new command handlers in the device code:

```python
elif command_type == 'custom_command':
    # Handle custom command
    result = execute_custom_logic(command_data)
    api_client.send_command_response(command_id, 'executed', result)
```

## Security

- **Encrypted Communication**: All API calls use HTTPS
- **Device Authentication**: API keys for device identification
- **Secure Storage**: Sensitive data encrypted at rest
- **Network Security**: VPN recommended for production deployments

## Monitoring

The IoT monitoring dashboard provides:

- Real-time device status
- Sensor data visualization
- Alert management
- Command execution
- Performance metrics

Access the dashboard at: `/iot-monitoring`

## Support

For technical support:

1. Check the troubleshooting section
2. Review system logs
3. Contact the development team
4. Submit issues on the project repository

## License

This hardware integration is part of the SafeShipper platform and is subject to the project's license terms.