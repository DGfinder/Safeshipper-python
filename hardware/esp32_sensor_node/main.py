"""
ESP32 Sensor Node for SafeShipper IoT Integration
Collects sensor data and sends to SafeShipper API
"""

import urequests
import ujson
import time
import machine
import network
import gc
from machine import Pin, I2C, ADC, Timer
import esp32
import hashlib
import ubinascii

# Configuration
WIFI_SSID = "YOUR_WIFI_SSID"
WIFI_PASSWORD = "YOUR_WIFI_PASSWORD"
API_ENDPOINT = "https://api.safeshipper.com/api/v1/iot"
DEVICE_ID = "ESP32_SENSOR_001"
API_KEY = "your_device_api_key_here"

# Sensor pins
TEMP_SENSOR_PIN = 34
HUMIDITY_SENSOR_PIN = 35
SHOCK_SENSOR_PIN = 33
GPS_TX_PIN = 17
GPS_RX_PIN = 16
LED_PIN = 2

# Global variables
wifi_connected = False
led = Pin(LED_PIN, Pin.OUT)
temp_adc = ADC(Pin(TEMP_SENSOR_PIN))
humidity_adc = ADC(Pin(HUMIDITY_SENSOR_PIN))
shock_sensor = Pin(SHOCK_SENSOR_PIN, Pin.IN, Pin.PULL_UP)

# Data buffer for batch sending
sensor_data_buffer = []
MAX_BUFFER_SIZE = 10

class WiFiManager:
    def __init__(self):
        self.wlan = network.WLAN(network.STA_IF)
        
    def connect(self):
        global wifi_connected
        
        if not self.wlan.isconnected():
            print('Connecting to WiFi...')
            self.wlan.active(True)
            self.wlan.connect(WIFI_SSID, WIFI_PASSWORD)
            
            timeout = 20
            while not self.wlan.isconnected() and timeout > 0:
                time.sleep(1)
                timeout -= 1
                
            if self.wlan.isconnected():
                wifi_connected = True
                print(f'WiFi connected: {self.wlan.ifconfig()}')
                return True
            else:
                wifi_connected = False
                print('WiFi connection failed')
                return False
        else:
            wifi_connected = True
            return True
    
    def is_connected(self):
        return self.wlan.isconnected()

class SensorManager:
    def __init__(self):
        self.temp_adc.atten(ADC.ATTN_11DB)
        self.humidity_adc.atten(ADC.ATTN_11DB)
        self.last_shock_time = 0
        self.shock_count = 0
        
    def read_temperature(self):
        """Read temperature from analog sensor (e.g., LM35)"""
        try:
            raw_value = temp_adc.read()
            # Convert to temperature (adjust formula based on your sensor)
            voltage = raw_value * 3.3 / 4095
            temperature = voltage * 100  # LM35: 10mV/°C
            return temperature
        except Exception as e:
            print(f"Temperature read error: {e}")
            return None
    
    def read_humidity(self):
        """Read humidity from analog sensor"""
        try:
            raw_value = humidity_adc.read()
            # Convert to humidity percentage (adjust based on your sensor)
            humidity = (raw_value / 4095) * 100
            return humidity
        except Exception as e:
            print(f"Humidity read error: {e}")
            return None
    
    def read_shock(self):
        """Detect shock/vibration events"""
        try:
            current_state = shock_sensor.value()
            current_time = time.ticks_ms()
            
            # Detect transition (shock event)
            if current_state == 0 and (current_time - self.last_shock_time) > 1000:
                self.shock_count += 1
                self.last_shock_time = current_time
                return True
            return False
        except Exception as e:
            print(f"Shock read error: {e}")
            return False
    
    def get_location(self):
        """Get GPS location (simplified - would need GPS module)"""
        # Placeholder for GPS reading
        # In real implementation, you'd read from GPS module
        return {
            "lat": 40.7128,
            "lng": -74.0060,
            "alt": 10.0
        }

class APIClient:
    def __init__(self):
        self.headers = {
            'Content-Type': 'application/json',
            'X-Device-ID': DEVICE_ID,
            'X-API-Key': API_KEY
        }
    
    def send_heartbeat(self, battery_level=None, signal_strength=None):
        """Send device heartbeat"""
        try:
            data = {
                'timestamp': time.time()
            }
            
            if battery_level is not None:
                data['battery_level'] = battery_level
            
            if signal_strength is not None:
                data['signal_strength'] = signal_strength
            
            response = urequests.post(
                f"{API_ENDPOINT}/heartbeat/",
                headers=self.headers,
                data=ujson.dumps(data)
            )
            
            if response.status_code == 200:
                result = response.json()
                response.close()
                return result
            else:
                print(f"Heartbeat failed: {response.status_code}")
                response.close()
                return None
                
        except Exception as e:
            print(f"Heartbeat error: {e}")
            return None
    
    def send_sensor_data(self, sensor_readings):
        """Send bulk sensor data"""
        try:
            response = urequests.post(
                f"{API_ENDPOINT}/ingest/sensor-data/",
                headers=self.headers,
                data=ujson.dumps(sensor_readings)
            )
            
            if response.status_code == 200:
                result = response.json()
                print(f"Data sent: {result['processed']} readings")
                response.close()
                return True
            else:
                print(f"Data send failed: {response.status_code}")
                response.close()
                return False
                
        except Exception as e:
            print(f"Data send error: {e}")
            return False
    
    def send_command_response(self, command_id, status, response_data=None):
        """Send command response"""
        try:
            data = {
                'command_id': command_id,
                'status': status,
                'response_data': response_data or {}
            }
            
            response = urequests.post(
                f"{API_ENDPOINT}/command-response/",
                headers=self.headers,
                data=ujson.dumps(data)
            )
            
            response.close()
            return response.status_code == 200
            
        except Exception as e:
            print(f"Command response error: {e}")
            return False

def create_sensor_reading(sensor_type, value, unit, additional_data=None):
    """Create a sensor reading dictionary"""
    return {
        'sensor_type': sensor_type,
        'value': value,
        'unit': unit,
        'additional_data': additional_data or {},
        'timestamp': time.time(),
        'quality_score': 1.0
    }

def collect_sensor_data():
    """Collect data from all sensors"""
    global sensor_data_buffer
    
    sensor_manager = SensorManager()
    readings = []
    
    # Temperature reading
    temp = sensor_manager.read_temperature()
    if temp is not None:
        readings.append(create_sensor_reading('temperature', temp, '°C'))
    
    # Humidity reading
    humidity = sensor_manager.read_humidity()
    if humidity is not None:
        readings.append(create_sensor_reading('humidity', humidity, '%'))
    
    # Shock detection
    if sensor_manager.read_shock():
        readings.append(create_sensor_reading('shock', 1, 'event', {
            'shock_count': sensor_manager.shock_count
        }))
    
    # Location reading (every 10th reading to save power)
    if len(sensor_data_buffer) % 10 == 0:
        location = sensor_manager.get_location()
        readings.append(create_sensor_reading('location', 1, 'coordinates', location))
    
    # Add to buffer
    sensor_data_buffer.extend(readings)
    
    # Blink LED to indicate data collection
    led.on()
    time.sleep(0.1)
    led.off()
    
    print(f"Collected {len(readings)} readings. Buffer size: {len(sensor_data_buffer)}")

def send_buffered_data():
    """Send buffered sensor data to API"""
    global sensor_data_buffer
    
    if not sensor_data_buffer:
        return
    
    api_client = APIClient()
    
    if api_client.send_sensor_data(sensor_data_buffer):
        print(f"Sent {len(sensor_data_buffer)} readings")
        sensor_data_buffer = []  # Clear buffer
    else:
        print("Failed to send data, keeping in buffer")
        
        # If buffer gets too large, remove oldest entries
        if len(sensor_data_buffer) > MAX_BUFFER_SIZE * 2:
            sensor_data_buffer = sensor_data_buffer[-MAX_BUFFER_SIZE:]
            print("Buffer trimmed")

def handle_commands(commands):
    """Handle commands received from server"""
    api_client = APIClient()
    
    for command in commands:
        command_id = command['id']
        command_type = command['command_type']
        command_data = command['command_data']
        
        print(f"Executing command: {command_type}")
        
        try:
            if command_type == 'ping':
                # Simple ping response
                api_client.send_command_response(command_id, 'executed', {
                    'pong': True,
                    'timestamp': time.time()
                })
                
            elif command_type == 'reboot':
                # Reboot device
                api_client.send_command_response(command_id, 'acknowledged')
                time.sleep(1)
                machine.reset()
                
            elif command_type == 'set_reporting_interval':
                # Change reporting interval
                global REPORTING_INTERVAL
                new_interval = command_data.get('interval', 60)
                REPORTING_INTERVAL = new_interval
                api_client.send_command_response(command_id, 'executed', {
                    'new_interval': new_interval
                })
                
            elif command_type == 'get_status':
                # Return device status
                status_data = {
                    'uptime': time.ticks_ms(),
                    'free_memory': gc.mem_free(),
                    'wifi_connected': wifi_connected,
                    'buffer_size': len(sensor_data_buffer)
                }
                api_client.send_command_response(command_id, 'executed', status_data)
                
            else:
                api_client.send_command_response(command_id, 'failed', {
                    'error': f'Unknown command: {command_type}'
                })
                
        except Exception as e:
            api_client.send_command_response(command_id, 'failed', {
                'error': str(e)
            })

def main_loop():
    """Main application loop"""
    wifi_manager = WiFiManager()
    api_client = APIClient()
    
    last_heartbeat = 0
    last_data_send = 0
    data_collection_interval = 30  # seconds
    heartbeat_interval = 300  # 5 minutes
    
    print("SafeShipper IoT Sensor Node Starting...")
    
    while True:
        try:
            current_time = time.time()
            
            # Ensure WiFi connection
            if not wifi_manager.is_connected():
                print("WiFi disconnected, reconnecting...")
                wifi_manager.connect()
                continue
            
            # Collect sensor data
            if current_time - last_data_send >= data_collection_interval:
                collect_sensor_data()
                last_data_send = current_time
                
                # Send data if buffer is full
                if len(sensor_data_buffer) >= MAX_BUFFER_SIZE:
                    send_buffered_data()
            
            # Send heartbeat and check for commands
            if current_time - last_heartbeat >= heartbeat_interval:
                # Get battery level (if available)
                battery_level = None
                try:
                    # Read internal battery level (ESP32 specific)
                    battery_level = int((esp32.hall_sensor() + 100) / 2)
                    battery_level = max(0, min(100, battery_level))
                except:
                    pass
                
                # Send heartbeat
                heartbeat_response = api_client.send_heartbeat(
                    battery_level=battery_level
                )
                
                if heartbeat_response and 'commands' in heartbeat_response:
                    commands = heartbeat_response['commands']
                    if commands:
                        handle_commands(commands)
                
                last_heartbeat = current_time
            
            # Small delay to prevent excessive CPU usage
            time.sleep(1)
            
            # Garbage collection
            gc.collect()
            
        except Exception as e:
            print(f"Main loop error: {e}")
            time.sleep(5)  # Wait before retrying

def main():
    """Entry point"""
    wifi_manager = WiFiManager()
    
    # Initial WiFi connection
    if wifi_manager.connect():
        print("Device initialized successfully")
        main_loop()
    else:
        print("Failed to connect to WiFi. Check credentials.")
        # Flash LED to indicate error
        for _ in range(10):
            led.on()
            time.sleep(0.2)
            led.off()
            time.sleep(0.2)

if __name__ == "__main__":
    main()