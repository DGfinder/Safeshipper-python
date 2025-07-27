#!/usr/bin/env python3
"""
SafeShipper IoT Gateway - Raspberry Pi
Advanced sensor node with multiple interfaces and edge processing
"""

import json
import time
import logging
import threading
import queue
import requests
import signal
import sys
import os
from datetime import datetime, timedelta
from dataclasses import dataclass, asdict
from typing import List, Dict, Any, Optional
import configparser

# Hardware libraries (install with pip)
try:
    import RPi.GPIO as GPIO
    import board
    import busio
    import adafruit_dht
    import adafruit_gps
    import adafruit_bme280
    import serial
    HAS_HARDWARE = True
except ImportError:
    print("Warning: Hardware libraries not available. Running in simulation mode.")
    HAS_HARDWARE = False

# Configuration
CONFIG_FILE = '/etc/safeshipper/gateway.conf'
DEFAULT_CONFIG = {
    'api': {
        'endpoint': 'https://api.safeshipper.com/api/v1/iot',
        'device_id': 'RPI_GATEWAY_001',
        'api_key': 'your_api_key_here'
    },
    'sensors': {
        'dht22_pin': '18',
        'gps_uart': '/dev/ttyUSB0',
        'i2c_bus': '1',
        'shock_pin': '24',
        'led_pin': '25'
    },
    'operation': {
        'data_collection_interval': '30',
        'heartbeat_interval': '300',
        'max_buffer_size': '100',
        'batch_size': '10'
    }
}

@dataclass
class SensorReading:
    sensor_type: str
    value: float
    unit: str
    timestamp: float
    additional_data: Dict[str, Any] = None
    quality_score: float = 1.0

class ConfigManager:
    def __init__(self, config_file: str = CONFIG_FILE):
        self.config_file = config_file
        self.config = configparser.ConfigParser()
        self.load_config()
    
    def load_config(self):
        """Load configuration from file or create default"""
        if os.path.exists(self.config_file):
            self.config.read(self.config_file)
        else:
            # Create default config
            for section, options in DEFAULT_CONFIG.items():
                self.config.add_section(section)
                for key, value in options.items():
                    self.config.set(section, key, value)
            self.save_config()
    
    def save_config(self):
        """Save configuration to file"""
        os.makedirs(os.path.dirname(self.config_file), exist_ok=True)
        with open(self.config_file, 'w') as f:
            self.config.write(f)
    
    def get(self, section: str, key: str, fallback: str = None):
        """Get configuration value"""
        return self.config.get(section, key, fallback=fallback)
    
    def getint(self, section: str, key: str, fallback: int = None):
        """Get integer configuration value"""
        return self.config.getint(section, key, fallback=fallback)

class SensorManager:
    def __init__(self, config: ConfigManager):
        self.config = config
        self.logger = logging.getLogger(__name__)
        self.sensors_initialized = False
        
        if HAS_HARDWARE:
            self.init_hardware()
    
    def init_hardware(self):
        """Initialize hardware sensors"""
        try:
            # GPIO setup
            GPIO.setmode(GPIO.BCM)
            GPIO.setwarnings(False)
            
            # DHT22 Temperature/Humidity sensor
            dht_pin = self.config.getint('sensors', 'dht22_pin', 18)
            self.dht22 = adafruit_dht.DHT22(getattr(board, f'D{dht_pin}'))
            
            # I2C setup for BME280 (pressure sensor)
            i2c_bus = self.config.getint('sensors', 'i2c_bus', 1)
            i2c = busio.I2C(board.SCL, board.SDA)
            self.bme280 = adafruit_bme280.Adafruit_BME280_I2C(i2c)
            
            # GPS setup
            gps_uart = self.config.get('sensors', 'gps_uart', '/dev/ttyUSB0')
            if os.path.exists(gps_uart):
                uart = serial.Serial(gps_uart, baudrate=9600, timeout=10)
                self.gps = adafruit_gps.GPS(uart, debug=False)
                self.gps.send_command(b'PMTK314,0,1,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0')
                self.gps.send_command(b'PMTK220,1000')
            else:
                self.gps = None
                self.logger.warning(f"GPS device not found at {gps_uart}")
            
            # Shock sensor (digital input)
            shock_pin = self.config.getint('sensors', 'shock_pin', 24)
            GPIO.setup(shock_pin, GPIO.IN, pull_up_down=GPIO.PUD_UP)
            self.shock_pin = shock_pin
            
            # LED indicator
            led_pin = self.config.getint('sensors', 'led_pin', 25)
            GPIO.setup(led_pin, GPIO.OUT)
            self.led_pin = led_pin
            
            self.sensors_initialized = True
            self.logger.info("Hardware sensors initialized successfully")
            
        except Exception as e:
            self.logger.error(f"Failed to initialize hardware: {e}")
            self.sensors_initialized = False
    
    def read_temperature_humidity(self) -> List[SensorReading]:
        """Read temperature and humidity from DHT22"""
        readings = []
        
        if not HAS_HARDWARE or not self.sensors_initialized:
            # Simulation mode
            import random
            temp = 20 + random.uniform(-5, 15)
            humidity = 50 + random.uniform(-20, 30)
        else:
            try:
                temp = self.dht22.temperature
                humidity = self.dht22.humidity
                
                if temp is None or humidity is None:
                    return readings
                    
            except Exception as e:
                self.logger.error(f"DHT22 read error: {e}")
                return readings
        
        timestamp = time.time()
        
        readings.append(SensorReading(
            sensor_type='temperature',
            value=temp,
            unit='°C',
            timestamp=timestamp
        ))
        
        readings.append(SensorReading(
            sensor_type='humidity',
            value=humidity,
            unit='%',
            timestamp=timestamp
        ))
        
        return readings
    
    def read_pressure(self) -> Optional[SensorReading]:
        """Read atmospheric pressure from BME280"""
        if not HAS_HARDWARE or not self.sensors_initialized:
            # Simulation mode
            import random
            pressure = 1013.25 + random.uniform(-50, 50)
        else:
            try:
                pressure = self.bme280.pressure
            except Exception as e:
                self.logger.error(f"BME280 read error: {e}")
                return None
        
        return SensorReading(
            sensor_type='pressure',
            value=pressure,
            unit='hPa',
            timestamp=time.time()
        )
    
    def read_location(self) -> Optional[SensorReading]:
        """Read GPS location"""
        if not HAS_HARDWARE or not self.sensors_initialized or not self.gps:
            # Simulation mode - static location
            location_data = {
                'lat': 40.7128,
                'lng': -74.0060,
                'alt': 10.0,
                'satellites': 8
            }
        else:
            try:
                self.gps.update()
                
                if not self.gps.has_fix:
                    return None
                
                location_data = {
                    'lat': self.gps.latitude,
                    'lng': self.gps.longitude,
                    'alt': self.gps.altitude_m if self.gps.altitude_m else 0,
                    'satellites': self.gps.satellites,
                    'speed': self.gps.speed_knots if self.gps.speed_knots else 0
                }
                
            except Exception as e:
                self.logger.error(f"GPS read error: {e}")
                return None
        
        return SensorReading(
            sensor_type='location',
            value=1,  # Presence indicator
            unit='coordinates',
            timestamp=time.time(),
            additional_data=location_data
        )
    
    def read_shock(self) -> Optional[SensorReading]:
        """Detect shock/vibration events"""
        if not HAS_HARDWARE or not self.sensors_initialized:
            # Simulation mode - occasional random shock
            import random
            if random.random() < 0.05:  # 5% chance
                shock_detected = True
            else:
                shock_detected = False
        else:
            try:
                # Read digital pin (LOW = shock detected)
                shock_detected = not GPIO.input(self.shock_pin)
            except Exception as e:
                self.logger.error(f"Shock sensor read error: {e}")
                return None
        
        if shock_detected:
            return SensorReading(
                sensor_type='shock',
                value=1,
                unit='event',
                timestamp=time.time(),
                additional_data={'intensity': 'medium'}
            )
        
        return None
    
    def indicate_activity(self):
        """Flash LED to indicate activity"""
        if HAS_HARDWARE and self.sensors_initialized:
            try:
                GPIO.output(self.led_pin, GPIO.HIGH)
                time.sleep(0.1)
                GPIO.output(self.led_pin, GPIO.LOW)
            except:
                pass
    
    def cleanup(self):
        """Cleanup GPIO resources"""
        if HAS_HARDWARE:
            GPIO.cleanup()

class APIClient:
    def __init__(self, config: ConfigManager):
        self.config = config
        self.logger = logging.getLogger(__name__)
        self.session = requests.Session()
        
        # Set headers
        self.session.headers.update({
            'Content-Type': 'application/json',
            'X-Device-ID': config.get('api', 'device_id'),
            'X-API-Key': config.get('api', 'api_key')
        })
        
        self.base_url = config.get('api', 'endpoint')
    
    def send_heartbeat(self, status_data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Send device heartbeat and get commands"""
        try:
            response = self.session.post(
                f"{self.base_url}/heartbeat/",
                json=status_data,
                timeout=30
            )
            
            if response.status_code == 200:
                return response.json()
            else:
                self.logger.error(f"Heartbeat failed: {response.status_code}")
                return None
                
        except Exception as e:
            self.logger.error(f"Heartbeat error: {e}")
            return None
    
    def send_sensor_data(self, readings: List[SensorReading]) -> bool:
        """Send bulk sensor data"""
        try:
            # Convert readings to dictionaries
            data = [asdict(reading) for reading in readings]
            
            response = self.session.post(
                f"{self.base_url}/ingest/sensor-data/",
                json=data,
                timeout=30
            )
            
            if response.status_code == 200:
                result = response.json()
                self.logger.info(f"Sent {result.get('processed', 0)} readings")
                return True
            else:
                self.logger.error(f"Data send failed: {response.status_code}")
                return False
                
        except Exception as e:
            self.logger.error(f"Data send error: {e}")
            return False
    
    def send_command_response(self, command_id: str, status: str, response_data: Dict = None) -> bool:
        """Send command response"""
        try:
            data = {
                'command_id': command_id,
                'status': status,
                'response_data': response_data or {}
            }
            
            response = self.session.post(
                f"{self.base_url}/command-response/",
                json=data,
                timeout=10
            )
            
            return response.status_code == 200
            
        except Exception as e:
            self.logger.error(f"Command response error: {e}")
            return False

class SafeShipperGateway:
    def __init__(self):
        self.setup_logging()
        self.config = ConfigManager()
        self.sensor_manager = SensorManager(self.config)
        self.api_client = APIClient(self.config)
        
        # Threading
        self.data_queue = queue.Queue()
        self.running = True
        self.threads = []
        
        # Statistics
        self.stats = {
            'readings_collected': 0,
            'readings_sent': 0,
            'last_heartbeat': 0,
            'start_time': time.time()
        }
        
        # Setup signal handlers
        signal.signal(signal.SIGINT, self.signal_handler)
        signal.signal(signal.SIGTERM, self.signal_handler)
    
    def setup_logging(self):
        """Setup logging configuration"""
        logging.basicConfig(
            level=logging.INFO,
            format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
            handlers=[
                logging.FileHandler('/var/log/safeshipper-gateway.log'),
                logging.StreamHandler(sys.stdout)
            ]
        )
        self.logger = logging.getLogger(__name__)
    
    def signal_handler(self, signum, frame):
        """Handle shutdown signals"""
        self.logger.info(f"Received signal {signum}, shutting down...")
        self.running = False
    
    def data_collection_thread(self):
        """Thread for collecting sensor data"""
        collection_interval = self.config.getint('operation', 'data_collection_interval', 30)
        location_interval_count = 0
        
        while self.running:
            try:
                readings = []
                
                # Temperature and humidity
                temp_humidity = self.sensor_manager.read_temperature_humidity()
                readings.extend(temp_humidity)
                
                # Pressure
                pressure = self.sensor_manager.read_pressure()
                if pressure:
                    readings.append(pressure)
                
                # Shock detection
                shock = self.sensor_manager.read_shock()
                if shock:
                    readings.append(shock)
                
                # Location (less frequent to save power)
                location_interval_count += 1
                if location_interval_count >= 10:  # Every 10th cycle
                    location = self.sensor_manager.read_location()
                    if location:
                        readings.append(location)
                    location_interval_count = 0
                
                # Add to queue
                if readings:
                    for reading in readings:
                        self.data_queue.put(reading)
                    
                    self.stats['readings_collected'] += len(readings)
                    self.sensor_manager.indicate_activity()
                    self.logger.debug(f"Collected {len(readings)} readings")
                
                time.sleep(collection_interval)
                
            except Exception as e:
                self.logger.error(f"Data collection error: {e}")
                time.sleep(5)
    
    def data_transmission_thread(self):
        """Thread for sending data to API"""
        batch_size = self.config.getint('operation', 'batch_size', 10)
        batch = []
        
        while self.running:
            try:
                # Collect batch
                while len(batch) < batch_size and self.running:
                    try:
                        reading = self.data_queue.get(timeout=1)
                        batch.append(reading)
                    except queue.Empty:
                        if batch:  # Send partial batch if we have data
                            break
                        continue
                
                if batch:
                    if self.api_client.send_sensor_data(batch):
                        self.stats['readings_sent'] += len(batch)
                        self.logger.info(f"Sent batch of {len(batch)} readings")
                    else:
                        # Put data back in queue for retry
                        for reading in batch:
                            self.data_queue.put(reading)
                        time.sleep(30)  # Wait before retry
                    
                    batch = []
                
            except Exception as e:
                self.logger.error(f"Data transmission error: {e}")
                time.sleep(5)
    
    def heartbeat_thread(self):
        """Thread for sending heartbeats and handling commands"""
        heartbeat_interval = self.config.getint('operation', 'heartbeat_interval', 300)
        
        while self.running:
            try:
                # Prepare status data
                uptime = time.time() - self.stats['start_time']
                status_data = {
                    'timestamp': time.time(),
                    'uptime': uptime,
                    'readings_collected': self.stats['readings_collected'],
                    'readings_sent': self.stats['readings_sent'],
                    'queue_size': self.data_queue.qsize(),
                    'sensors_status': 'operational' if self.sensor_manager.sensors_initialized else 'error'
                }
                
                # Send heartbeat
                response = self.api_client.send_heartbeat(status_data)
                
                if response:
                    self.stats['last_heartbeat'] = time.time()
                    
                    # Handle commands
                    commands = response.get('commands', [])
                    for command in commands:
                        self.handle_command(command)
                
                time.sleep(heartbeat_interval)
                
            except Exception as e:
                self.logger.error(f"Heartbeat error: {e}")
                time.sleep(60)
    
    def handle_command(self, command: Dict[str, Any]):
        """Handle commands from server"""
        command_id = command['id']
        command_type = command['command_type']
        command_data = command['command_data']
        
        self.logger.info(f"Executing command: {command_type}")
        
        try:
            if command_type == 'ping':
                self.api_client.send_command_response(command_id, 'executed', {
                    'pong': True,
                    'timestamp': time.time()
                })
                
            elif command_type == 'get_status':
                status = {
                    'uptime': time.time() - self.stats['start_time'],
                    'readings_collected': self.stats['readings_collected'],
                    'readings_sent': self.stats['readings_sent'],
                    'queue_size': self.data_queue.qsize(),
                    'threads_active': len([t for t in self.threads if t.is_alive()])
                }
                self.api_client.send_command_response(command_id, 'executed', status)
                
            elif command_type == 'restart':
                self.api_client.send_command_response(command_id, 'acknowledged')
                self.logger.info("Restart command received, shutting down...")
                self.running = False
                
            else:
                self.api_client.send_command_response(command_id, 'failed', {
                    'error': f'Unknown command: {command_type}'
                })
                
        except Exception as e:
            self.api_client.send_command_response(command_id, 'failed', {
                'error': str(e)
            })
    
    def start(self):
        """Start the gateway"""
        self.logger.info("Starting SafeShipper IoT Gateway...")
        
        # Start threads
        threads_config = [
            ('data_collection', self.data_collection_thread),
            ('data_transmission', self.data_transmission_thread),
            ('heartbeat', self.heartbeat_thread)
        ]
        
        for name, target in threads_config:
            thread = threading.Thread(target=target, name=name, daemon=True)
            thread.start()
            self.threads.append(thread)
            self.logger.info(f"Started {name} thread")
        
        # Main loop
        try:
            while self.running:
                time.sleep(1)
        except KeyboardInterrupt:
            self.logger.info("Keyboard interrupt received")
        
        self.shutdown()
    
    def shutdown(self):
        """Shutdown the gateway"""
        self.logger.info("Shutting down gateway...")
        
        self.running = False
        
        # Wait for threads to finish
        for thread in self.threads:
            thread.join(timeout=5)
        
        # Cleanup
        self.sensor_manager.cleanup()
        
        self.logger.info("Gateway shutdown complete")

def main():
    """Entry point"""
    gateway = SafeShipperGateway()
    gateway.start()

if __name__ == "__main__":
    main()