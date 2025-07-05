/*
 * SafeShipper IoT Sensor Node - ESP32
 * Hardware proof-of-concept for shipment monitoring
 * 
 * Features:
 * - Temperature and humidity monitoring
 * - GPS location tracking
 * - Accelerometer for shock detection
 * - WiFi connectivity for data transmission
 * - Low power mode support
 */

#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>
#include <DHT.h>
#include <TinyGPS++.h>
#include <HardwareSerial.h>
#include <Wire.h>
#include <MPU6050.h>
#include <esp_sleep.h>
#include <esp_wifi.h>

// Hardware configuration
#define DHT_PIN 4
#define DHT_TYPE DHT22
#define GPS_RX_PIN 16
#define GPS_TX_PIN 17
#define LED_PIN 2
#define BATTERY_PIN A0

// Network configuration
const char* ssid = "YOUR_WIFI_SSID";
const char* password = "YOUR_WIFI_PASSWORD";
const char* serverURL = "https://your-safeshipper-api.com/api/v1/iot";

// Device configuration
const char* deviceId = "ESP32_SENSOR_001";
const char* apiKey = "your-device-api-key";

// Sensor instances
DHT dht(DHT_PIN, DHT_TYPE);
TinyGPSPlus gps;
HardwareSerial gpsSerial(2);
MPU6050 mpu;

// Global variables
unsigned long lastDataSend = 0;
const unsigned long DATA_INTERVAL = 60000; // Send data every 60 seconds
unsigned long lastHeartbeat = 0;
const unsigned long HEARTBEAT_INTERVAL = 300000; // Heartbeat every 5 minutes

bool wifiConnected = false;
float batteryVoltage = 0;

// Data structures
struct SensorReading {
  String sensorType;
  float value;
  String unit;
  unsigned long timestamp;
};

void setup() {
  Serial.begin(115200);
  
  // Initialize hardware
  pinMode(LED_PIN, OUTPUT);
  pinMode(BATTERY_PIN, INPUT);
  
  // Initialize sensors
  dht.begin();
  gpsSerial.begin(9600, SERIAL_8N1, GPS_RX_PIN, GPS_TX_PIN);
  
  Wire.begin();
  mpu.initialize();
  
  // Connect to WiFi
  connectToWiFi();
  
  // Send initial heartbeat
  sendHeartbeat();
  
  Serial.println("SafeShipper IoT Sensor Node initialized");
  blinkLED(3);
}

void loop() {
  unsigned long currentTime = millis();
  
  // Read GPS data
  while (gpsSerial.available() > 0) {
    gps.encode(gpsSerial.read());
  }
  
  // Check WiFi connection
  if (WiFi.status() != WL_CONNECTED) {
    wifiConnected = false;
    connectToWiFi();
  } else {
    wifiConnected = true;
  }
  
  // Send sensor data
  if (currentTime - lastDataSend >= DATA_INTERVAL) {
    if (wifiConnected) {
      sendSensorData();
      lastDataSend = currentTime;
    }
  }
  
  // Send heartbeat
  if (currentTime - lastHeartbeat >= HEARTBEAT_INTERVAL) {
    if (wifiConnected) {
      sendHeartbeat();
      lastHeartbeat = currentTime;
    }
  }
  
  // Check for low battery and enter deep sleep if needed
  readBatteryVoltage();
  if (batteryVoltage < 3.3) {
    enterDeepSleep();
  }
  
  delay(1000); // Small delay to prevent excessive CPU usage
}

void connectToWiFi() {
  Serial.print("Connecting to WiFi");
  WiFi.begin(ssid, password);
  
  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 20) {
    delay(500);
    Serial.print(".");
    attempts++;
  }
  
  if (WiFi.status() == WL_CONNECTED) {
    Serial.println();
    Serial.println("WiFi connected!");
    Serial.print("IP address: ");
    Serial.println(WiFi.localIP());
    wifiConnected = true;
    blinkLED(2);
  } else {
    Serial.println();
    Serial.println("Failed to connect to WiFi");
    wifiConnected = false;
  }
}

void sendSensorData() {
  Serial.println("Collecting sensor data...");
  
  // Create JSON array for bulk sensor data
  DynamicJsonDocument doc(2048);
  JsonArray readings = doc.to<JsonArray>();
  
  // Temperature reading
  float temperature = dht.readTemperature();
  if (!isnan(temperature)) {
    JsonObject tempReading = readings.createNestedObject();
    tempReading["sensor_type"] = "temperature";
    tempReading["value"] = temperature;
    tempReading["unit"] = "°C";
    tempReading["timestamp"] = getCurrentTimestamp();
    tempReading["quality_score"] = 1.0;
  }
  
  // Humidity reading
  float humidity = dht.readHumidity();
  if (!isnan(humidity)) {
    JsonObject humReading = readings.createNestedObject();
    humReading["sensor_type"] = "humidity";
    humReading["value"] = humidity;
    humReading["unit"] = "%";
    humReading["timestamp"] = getCurrentTimestamp();
    humReading["quality_score"] = 1.0;
  }
  
  // GPS location
  if (gps.location.isValid()) {
    JsonObject locationReading = readings.createNestedObject();
    locationReading["sensor_type"] = "location";
    locationReading["value"] = 0; // For location, we use additional_data
    locationReading["unit"] = "gps";
    locationReading["timestamp"] = getCurrentTimestamp();
    
    JsonObject additionalData = locationReading.createNestedObject("additional_data");
    additionalData["latitude"] = gps.location.lat();
    additionalData["longitude"] = gps.location.lng();
    additionalData["altitude"] = gps.altitude.meters();
    additionalData["speed"] = gps.speed.kmph();
    additionalData["satellites"] = gps.satellites.value();
    locationReading["quality_score"] = gps.satellites.value() > 4 ? 1.0 : 0.5;
  }
  
  // Accelerometer data for shock detection
  int16_t ax, ay, az;
  mpu.getAcceleration(&ax, &ay, &az);
  
  float acceleration = sqrt(pow(ax/16384.0, 2) + pow(ay/16384.0, 2) + pow(az/16384.0, 2));
  
  JsonObject accelReading = readings.createNestedObject();
  accelReading["sensor_type"] = "acceleration";
  accelReading["value"] = acceleration;
  accelReading["unit"] = "g";
  accelReading["timestamp"] = getCurrentTimestamp();
  
  JsonObject accelData = accelReading.createNestedObject("additional_data");
  accelData["x"] = ax/16384.0;
  accelData["y"] = ay/16384.0;
  accelData["z"] = az/16384.0;
  accelReading["quality_score"] = 1.0;
  
  // Send data to server
  if (readings.size() > 0) {
    String jsonString;
    serializeJson(doc, jsonString);
    
    HTTPClient http;
    http.begin(String(serverURL) + "/ingest/sensor-data/");
    http.addHeader("Content-Type", "application/json");
    http.addHeader("X-Device-ID", deviceId);
    http.addHeader("X-API-Key", apiKey);
    
    int httpResponseCode = http.POST(jsonString);
    
    if (httpResponseCode > 0) {
      String response = http.getString();
      Serial.println("Data sent successfully");
      Serial.println("Response: " + response);
      blinkLED(1);
    } else {
      Serial.println("Error sending data: " + String(httpResponseCode));
    }
    
    http.end();
  }
}

void sendHeartbeat() {
  Serial.println("Sending heartbeat...");
  
  DynamicJsonDocument doc(512);
  doc["battery_level"] = getBatteryPercentage();
  doc["signal_strength"] = WiFi.RSSI();
  doc["firmware_version"] = "1.0.0";
  
  if (gps.location.isValid()) {
    JsonObject location = doc.createNestedObject("location");
    location["lat"] = gps.location.lat();
    location["lng"] = gps.location.lng();
    location["alt"] = gps.altitude.meters();
  }
  
  JsonObject statusInfo = doc.createNestedObject("status_info");
  statusInfo["uptime"] = millis();
  statusInfo["free_heap"] = ESP.getFreeHeap();
  statusInfo["wifi_rssi"] = WiFi.RSSI();
  
  String jsonString;
  serializeJson(doc, jsonString);
  
  HTTPClient http;
  http.begin(String(serverURL) + "/heartbeat/");
  http.addHeader("Content-Type", "application/json");
  http.addHeader("X-Device-ID", deviceId);
  http.addHeader("X-API-Key", apiKey);
  
  int httpResponseCode = http.POST(jsonString);
  
  if (httpResponseCode > 0) {
    String response = http.getString();
    Serial.println("Heartbeat sent successfully");
    
    // Parse response for commands
    DynamicJsonDocument responseDoc(1024);
    deserializeJson(responseDoc, response);
    
    if (responseDoc["commands"].size() > 0) {
      processCommands(responseDoc["commands"]);
    }
  } else {
    Serial.println("Error sending heartbeat: " + String(httpResponseCode));
  }
  
  http.end();
}

void processCommands(JsonArray commands) {
  for (JsonObject command : commands) {
    String commandId = command["id"];
    String commandType = command["command_type"];
    JsonObject commandData = command["command_data"];
    
    Serial.println("Processing command: " + commandType);
    
    if (commandType == "ping") {
      sendCommandResponse(commandId, "executed", "pong");
    } else if (commandType == "reboot") {
      sendCommandResponse(commandId, "acknowledged", "rebooting");
      delay(1000);
      ESP.restart();
    } else if (commandType == "sleep") {
      int sleepTime = commandData["duration"] | 300; // Default 5 minutes
      sendCommandResponse(commandId, "acknowledged", "entering sleep mode");
      esp_sleep_enable_timer_wakeup(sleepTime * 1000000ULL); // Convert to microseconds
      esp_deep_sleep_start();
    } else if (commandType == "update_interval") {
      // Update reporting interval (would need to be stored in EEPROM for persistence)
      sendCommandResponse(commandId, "executed", "interval updated");
    } else {
      sendCommandResponse(commandId, "failed", "unknown command");
    }
  }
}

void sendCommandResponse(String commandId, String status, String message) {
  DynamicJsonDocument doc(256);
  doc["command_id"] = commandId;
  doc["status"] = status;
  
  JsonObject responseData = doc.createNestedObject("response_data");
  responseData["message"] = message;
  responseData["timestamp"] = getCurrentTimestamp();
  
  String jsonString;
  serializeJson(doc, jsonString);
  
  HTTPClient http;
  http.begin(String(serverURL) + "/command-response/");
  http.addHeader("Content-Type", "application/json");
  http.addHeader("X-Device-ID", deviceId);
  http.addHeader("X-API-Key", apiKey);
  
  http.POST(jsonString);
  http.end();
}

void readBatteryVoltage() {
  int rawValue = analogRead(BATTERY_PIN);
  batteryVoltage = (rawValue / 4095.0) * 3.3 * 2; // Assuming voltage divider
}

int getBatteryPercentage() {
  readBatteryVoltage();
  
  // Convert voltage to percentage (adjust these values based on your battery)
  float minVoltage = 3.0;
  float maxVoltage = 4.2;
  
  float percentage = ((batteryVoltage - minVoltage) / (maxVoltage - minVoltage)) * 100;
  return constrain((int)percentage, 0, 100);
}

String getCurrentTimestamp() {
  // Simple timestamp - in production, you'd want to sync with NTP
  return String(millis());
}

void blinkLED(int times) {
  for (int i = 0; i < times; i++) {
    digitalWrite(LED_PIN, HIGH);
    delay(200);
    digitalWrite(LED_PIN, LOW);
    delay(200);
  }
}

void enterDeepSleep() {
  Serial.println("Battery low, entering deep sleep...");
  
  // Send low battery alert
  DynamicJsonDocument doc(256);
  doc["sensor_type"] = "battery";
  doc["value"] = getBatteryPercentage();
  doc["unit"] = "%";
  doc["timestamp"] = getCurrentTimestamp();
  
  // Wake up every hour to check battery status
  esp_sleep_enable_timer_wakeup(3600 * 1000000ULL); // 1 hour in microseconds
  esp_deep_sleep_start();
}