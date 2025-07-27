# SafeShipper API Integration Guide

**Complete guide for integrating with the SafeShipper dangerous goods transportation platform**

This comprehensive guide provides everything developers need to successfully integrate with the SafeShipper API, including authentication, best practices, code examples, and industry-specific patterns for dangerous goods logistics.

---

## 🚀 **Quick Start Integration**

### **1. Authentication Setup**

#### **Obtain API Credentials**
```bash
# 1. Register your application with SafeShipper
# 2. Receive your API credentials
CLIENT_ID="your_client_id"
CLIENT_SECRET="your_client_secret"
API_BASE_URL="https://api.safeshipper.com/api/v1"
```

#### **Authentication Flow**
```python
import requests
import json
from datetime import datetime, timedelta

class SafeShipperClient:
    def __init__(self, client_id, client_secret, base_url):
        self.client_id = client_id
        self.client_secret = client_secret
        self.base_url = base_url
        self.access_token = None
        self.token_expires = None
    
    def authenticate(self):
        """Obtain JWT access token"""
        auth_url = f"{self.base_url}/auth/token/"
        
        response = requests.post(auth_url, data={
            'grant_type': 'client_credentials',
            'client_id': self.client_id,
            'client_secret': self.client_secret
        })
        
        if response.status_code == 200:
            token_data = response.json()
            self.access_token = token_data['access_token']
            self.token_expires = datetime.now() + timedelta(
                seconds=token_data['expires_in']
            )
            return True
        
        raise Exception(f"Authentication failed: {response.text}")
    
    def get_headers(self):
        """Get authenticated request headers"""
        if not self.access_token or datetime.now() >= self.token_expires:
            self.authenticate()
        
        return {
            'Authorization': f'Bearer {self.access_token}',
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        }

# Initialize client
client = SafeShipperClient(
    client_id=CLIENT_ID,
    client_secret=CLIENT_SECRET,
    base_url=API_BASE_URL
)
```

### **2. Basic API Operations**

#### **Dangerous Goods Lookup**
```python
def get_dangerous_good_info(client, un_number):
    """Get dangerous goods information by UN number"""
    
    url = f"{client.base_url}/dangerous-goods/"
    response = requests.get(
        url,
        headers=client.get_headers(),
        params={'search': un_number}
    )
    
    if response.status_code == 200:
        results = response.json()['results']
        if results:
            return results[0]  # Return first match
    
    return None

# Example usage
dg_info = get_dangerous_good_info(client, "UN1203")
print(f"Dangerous Good: {dg_info['proper_shipping_name']}")
print(f"Hazard Class: {dg_info['hazard_class']}")
```

#### **Compatibility Checking**
```python
def check_dangerous_goods_compatibility(client, un_numbers):
    """Check compatibility between multiple dangerous goods"""
    
    url = f"{client.base_url}/dangerous-goods/check-compatibility/"
    
    response = requests.post(
        url,
        headers=client.get_headers(),
        json={'un_numbers': un_numbers}
    )
    
    if response.status_code == 200:
        return response.json()
    
    raise Exception(f"Compatibility check failed: {response.text}")

# Example usage
compatibility = check_dangerous_goods_compatibility(
    client, 
    ["UN1203", "UN1090", "UN1381"]
)

if not compatibility['is_compatible']:
    print("Incompatible dangerous goods detected:")
    for conflict in compatibility['conflicts']:
        print(f"- {conflict['un_number_1']} incompatible with {conflict['un_number_2']}")
        print(f"  Reason: {conflict['reason']}")
```

---

## 🏢 **Enterprise Integration Patterns**

### **ERP System Integration**

#### **SAP Integration Example**
```python
class SAPSafeShipperIntegration:
    """
    Integration between SAP ERP and SafeShipper for dangerous goods shipments
    """
    
    def __init__(self, sap_client, safeshipper_client):
        self.sap = sap_client
        self.safeshipper = safeshipper_client
    
    def sync_shipment_from_sap(self, sap_delivery_id):
        """Sync shipment data from SAP to SafeShipper"""
        
        # 1. Get shipment data from SAP
        sap_delivery = self.sap.get_delivery(sap_delivery_id)
        
        # 2. Transform SAP data to SafeShipper format
        shipment_data = self.transform_sap_delivery(sap_delivery)
        
        # 3. Validate dangerous goods compatibility
        if shipment_data.get('has_dangerous_goods'):
            un_numbers = [item['un_number'] for item in shipment_data['consignment_items']]
            compatibility = check_dangerous_goods_compatibility(
                self.safeshipper, 
                un_numbers
            )
            
            if not compatibility['is_compatible']:
                raise ValueError(
                    f"Dangerous goods incompatibility detected: {compatibility['conflicts']}"
                )
        
        # 4. Create shipment in SafeShipper
        response = requests.post(
            f"{self.safeshipper.base_url}/shipments/",
            headers=self.safeshipper.get_headers(),
            json=shipment_data
        )
        
        if response.status_code == 201:
            shipment = response.json()
            
            # 5. Update SAP with SafeShipper shipment ID
            self.sap.update_delivery(sap_delivery_id, {
                'safeshipper_id': shipment['id'],
                'compliance_status': 'VALIDATED'
            })
            
            return shipment
        
        raise Exception(f"Shipment creation failed: {response.text}")
    
    def transform_sap_delivery(self, sap_delivery):
        """Transform SAP delivery data to SafeShipper format"""
        return {
            'shipment_number': sap_delivery['delivery_number'],
            'origin': self.map_sap_location(sap_delivery['ship_from']),
            'destination': self.map_sap_location(sap_delivery['ship_to']),
            'scheduled_pickup': sap_delivery['pickup_date'],
            'scheduled_delivery': sap_delivery['delivery_date'],
            'consignment_items': [
                {
                    'dangerous_good': self.get_dangerous_good_id(item['material_number']),
                    'quantity': item['quantity'],
                    'unit': item['unit_of_measure'],
                    'net_weight_kg': item['net_weight'],
                    'gross_weight_kg': item['gross_weight']
                }
                for item in sap_delivery['items']
                if self.is_dangerous_good(item['material_number'])
            ],
            'has_dangerous_goods': any(
                self.is_dangerous_good(item['material_number']) 
                for item in sap_delivery['items']
            )
        }
```

#### **Oracle ERP Integration**
```python
class OracleSafeShipperIntegration:
    """Oracle ERP integration with SafeShipper"""
    
    def __init__(self, oracle_client, safeshipper_client):
        self.oracle = oracle_client
        self.safeshipper = safeshipper_client
    
    def create_shipment_manifest(self, oracle_order_id):
        """Create shipping manifest from Oracle order"""
        
        # Get order data from Oracle
        order = self.oracle.get_sales_order(oracle_order_id)
        
        # Check for dangerous goods
        dangerous_items = []
        for line in order['order_lines']:
            dg_info = self.get_dangerous_good_by_item(line['item_number'])
            if dg_info:
                dangerous_items.append({
                    'item': line,
                    'dangerous_good': dg_info
                })
        
        if dangerous_items:
            # Create dangerous goods manifest
            manifest_data = {
                'manifest_type': 'DANGEROUS_GOODS',
                'order_reference': oracle_order_id,
                'shipper': order['shipper_details'],
                'consignee': order['consignee_details'],
                'dangerous_goods_items': [
                    {
                        'un_number': item['dangerous_good']['un_number'],
                        'proper_shipping_name': item['dangerous_good']['proper_shipping_name'],
                        'hazard_class': item['dangerous_good']['hazard_class'],
                        'quantity': item['item']['quantity'],
                        'packaging_type': item['item']['packaging'],
                        'net_weight_kg': item['item']['net_weight']
                    }
                    for item in dangerous_items
                ]
            }
            
            # Submit to SafeShipper
            response = requests.post(
                f"{self.safeshipper.base_url}/manifests/",
                headers=self.safeshipper.get_headers(),
                json=manifest_data
            )
            
            return response.json()
```

### **Warehouse Management System (WMS) Integration**

#### **Real-Time Inventory Updates**
```python
class WMSSafeShipperIntegration:
    """Integration with Warehouse Management Systems"""
    
    def __init__(self, wms_client, safeshipper_client):
        self.wms = wms_client
        self.safeshipper = safeshipper_client
    
    def sync_dangerous_goods_inventory(self):
        """Sync dangerous goods inventory with safety requirements"""
        
        # Get current dangerous goods inventory
        inventory = self.wms.get_dangerous_goods_inventory()
        
        for item in inventory:
            # Get safety requirements from SafeShipper
            dg_info = get_dangerous_good_info(
                self.safeshipper, 
                item['un_number']
            )
            
            if dg_info:
                # Check storage compatibility
                storage_requirements = self.get_storage_requirements(dg_info)
                
                # Validate current storage location
                if not self.validate_storage_location(item, storage_requirements):
                    self.report_storage_violation(item, storage_requirements)
                
                # Update inventory with safety data
                self.wms.update_item_safety_data(item['id'], {
                    'hazard_class': dg_info['hazard_class'],
                    'storage_requirements': storage_requirements,
                    'segregation_requirements': dg_info.get('segregation_codes', []),
                    'emergency_procedures': self.get_emergency_procedures(dg_info)
                })
    
    def get_emergency_procedures(self, dangerous_good):
        """Get emergency procedures for dangerous good"""
        
        response = requests.get(
            f"{self.safeshipper.base_url}/emergency-procedures/api/procedures/",
            headers=self.safeshipper.get_headers(),
            params={
                'hazard_class': dangerous_good['hazard_class'],
                'applicable_un_numbers': dangerous_good['un_number']
            }
        )
        
        if response.status_code == 200:
            return response.json()['results']
        
        return []
```

---

## 📱 **Mobile Application Integration**

### **Driver Mobile App Integration**

#### **Real-Time Location Updates**
```python
class DriverMobileIntegration:
    """Integration patterns for driver mobile applications"""
    
    def __init__(self, safeshipper_client):
        self.client = safeshipper_client
    
    def update_shipment_location(self, shipment_id, latitude, longitude, accuracy=None):
        """Update shipment location from mobile device"""
        
        location_data = {
            'shipment_id': shipment_id,
            'latitude': latitude,
            'longitude': longitude,
            'timestamp': datetime.now().isoformat(),
            'accuracy_meters': accuracy,
            'source': 'MOBILE_APP'
        }
        
        response = requests.post(
            f"{self.client.base_url}/tracking/location-updates/",
            headers=self.client.get_headers(),
            json=location_data
        )
        
        return response.status_code == 201
    
    def report_emergency_incident(self, location, incident_type, description):
        """Report emergency incident from mobile device"""
        
        incident_data = {
            'emergency_type': incident_type,  # SPILL, FIRE, EXPOSURE, TRANSPORT_ACCIDENT
            'description': description,
            'location': f"GPS: {location['latitude']}, {location['longitude']}",
            'coordinates': location,
            'severity_level': 'HIGH',  # Default to high for mobile reports
            'immediate_actions_taken': 'Driver reported via mobile app',
            'reported_via': 'MOBILE_APP'
        }
        
        response = requests.post(
            f"{self.client.base_url}/emergency-procedures/api/incidents/",
            headers=self.client.get_headers(),
            json=incident_data
        )
        
        if response.status_code == 201:
            incident = response.json()
            
            # Get quick reference for incident type
            quick_ref = self.get_emergency_quick_reference(incident_type)
            
            return {
                'incident_id': incident['id'],
                'incident_number': incident['incident_number'],
                'quick_reference': quick_ref
            }
        
        raise Exception(f"Failed to report incident: {response.text}")
    
    def get_emergency_quick_reference(self, hazard_class):
        """Get emergency quick reference for mobile display"""
        
        response = requests.get(
            f"{self.client.base_url}/emergency-procedures/api/procedures/quick-reference/",
            headers=self.client.get_headers(),
            params={'hazard_class': hazard_class}
        )
        
        if response.status_code == 200:
            return response.json()
        
        return None

# Example mobile app usage
mobile_client = DriverMobileIntegration(client)

# Update location
mobile_client.update_shipment_location(
    shipment_id="12345",
    latitude=-37.8136,
    longitude=144.9631,
    accuracy=5.0
)

# Report emergency
incident = mobile_client.report_emergency_incident(
    location={'latitude': -37.8136, 'longitude': 144.9631},
    incident_type='SPILL',
    description='Chemical spill on loading dock'
)
```

### **Customer Mobile Integration**

#### **Shipment Tracking**
```javascript
// React Native / JavaScript example
class CustomerTrackingIntegration {
    constructor(apiKey, baseUrl) {
        this.apiKey = apiKey;
        this.baseUrl = baseUrl;
    }
    
    async trackShipment(trackingNumber) {
        try {
            const response = await fetch(
                `${this.baseUrl}/tracking/${trackingNumber}/`,
                {
                    headers: {
                        'Authorization': `Bearer ${this.apiKey}`,
                        'Content-Type': 'application/json'
                    }
                }
            );
            
            if (response.ok) {
                const trackingData = await response.json();
                return {
                    shipment: trackingData.shipment,
                    currentLocation: trackingData.current_location,
                    estimatedDelivery: trackingData.estimated_delivery,
                    status: trackingData.status,
                    milestones: trackingData.milestones,
                    dangerousGoods: trackingData.dangerous_goods_summary
                };
            }
            
            throw new Error(`Tracking failed: ${response.statusText}`);
            
        } catch (error) {
            console.error('Shipment tracking error:', error);
            throw error;
        }
    }
    
    async getShipmentDocuments(shipmentId) {
        const response = await fetch(
            `${this.baseUrl}/shipments/${shipmentId}/documents/`,
            {
                headers: {
                    'Authorization': `Bearer ${this.apiKey}`,
                    'Content-Type': 'application/json'
                }
            }
        );
        
        if (response.ok) {
            return await response.json();
        }
        
        throw new Error(`Failed to get documents: ${response.statusText}`);
    }
}

// Usage in React Native component
const trackingClient = new CustomerTrackingIntegration(API_KEY, BASE_URL);

const TrackingScreen = () => {
    const [trackingData, setTrackingData] = useState(null);
    
    const handleTrackShipment = async (trackingNumber) => {
        try {
            const data = await trackingClient.trackShipment(trackingNumber);
            setTrackingData(data);
        } catch (error) {
            Alert.alert('Error', 'Failed to track shipment');
        }
    };
    
    return (
        <View>
            {trackingData && (
                <View>
                    <Text>Status: {trackingData.status}</Text>
                    <Text>ETA: {trackingData.estimatedDelivery}</Text>
                    {trackingData.dangerousGoods.has_dangerous_goods && (
                        <Text style={{color: 'orange'}}>
                            Contains Dangerous Goods: Class {trackingData.dangerousGoods.highest_hazard_class}
                        </Text>
                    )}
                </View>
            )}
        </View>
    );
};
```

---

## 🔄 **Real-Time Integration Patterns**

### **WebSocket Integration**

#### **Real-Time Tracking Updates**
```python
import websocket
import json
import threading

class SafeShipperWebSocketClient:
    """WebSocket client for real-time SafeShipper updates"""
    
    def __init__(self, access_token, base_ws_url):
        self.access_token = access_token
        self.base_ws_url = base_ws_url
        self.ws = None
        self.subscriptions = {}
    
    def connect(self):
        """Connect to SafeShipper WebSocket"""
        ws_url = f"{self.base_ws_url}/ws/tracking/?token={self.access_token}"
        
        self.ws = websocket.WebSocketApp(
            ws_url,
            on_message=self.on_message,
            on_error=self.on_error,
            on_close=self.on_close,
            on_open=self.on_open
        )
        
        # Start WebSocket in separate thread
        ws_thread = threading.Thread(target=self.ws.run_forever)
        ws_thread.daemon = True
        ws_thread.start()
    
    def on_open(self, ws):
        print("Connected to SafeShipper WebSocket")
    
    def on_message(self, ws, message):
        try:
            data = json.loads(message)
            message_type = data.get('type')
            
            # Route message to appropriate handler
            if message_type == 'shipment_update':
                self.handle_shipment_update(data['payload'])
            elif message_type == 'emergency_alert':
                self.handle_emergency_alert(data['payload'])
            elif message_type == 'tracking_update':
                self.handle_tracking_update(data['payload'])
                
        except json.JSONDecodeError:
            print(f"Invalid JSON received: {message}")
    
    def subscribe_to_shipment(self, shipment_id, callback):
        """Subscribe to updates for specific shipment"""
        subscription_msg = {
            'type': 'subscribe',
            'channel': 'shipment_updates',
            'shipment_id': shipment_id
        }
        
        self.ws.send(json.dumps(subscription_msg))
        self.subscriptions[shipment_id] = callback
    
    def handle_shipment_update(self, payload):
        """Handle shipment status updates"""
        shipment_id = payload['shipment_id']
        
        if shipment_id in self.subscriptions:
            callback = self.subscriptions[shipment_id]
            callback(payload)
    
    def handle_emergency_alert(self, payload):
        """Handle emergency alerts"""
        print(f"EMERGENCY ALERT: {payload['message']}")
        
        # Implement emergency notification logic
        self.send_emergency_notification(payload)
    
    def send_emergency_notification(self, emergency_data):
        """Send emergency notification to relevant personnel"""
        # Implementation depends on your notification system
        pass

# Usage example
ws_client = SafeShipperWebSocketClient(
    access_token=client.access_token,
    base_ws_url="wss://api.safeshipper.com"
)

ws_client.connect()

# Subscribe to shipment updates
def on_shipment_update(update_data):
    print(f"Shipment {update_data['shipment_id']} status: {update_data['status']}")
    if update_data.get('dangerous_goods_alert'):
        print(f"DG Alert: {update_data['dangerous_goods_alert']}")

ws_client.subscribe_to_shipment("shipment_123", on_shipment_update)
```

### **Webhook Integration**

#### **Webhook Endpoint Setup**
```python
from flask import Flask, request, jsonify
import hmac
import hashlib

app = Flask(__name__)

class SafeShipperWebhookHandler:
    """Handler for SafeShipper webhook events"""
    
    def __init__(self, webhook_secret):
        self.webhook_secret = webhook_secret
    
    def verify_signature(self, payload, signature):
        """Verify webhook signature for security"""
        expected_signature = hmac.new(
            self.webhook_secret.encode(),
            payload.encode(),
            hashlib.sha256
        ).hexdigest()
        
        return hmac.compare_digest(f"sha256={expected_signature}", signature)
    
    def handle_shipment_delivered(self, event_data):
        """Handle shipment delivery webhook"""
        shipment = event_data['shipment']
        
        # Update internal systems
        self.update_internal_shipment_status(shipment['id'], 'DELIVERED')
        
        # Send customer notification
        self.send_delivery_notification(shipment)
        
        # Update inventory if dangerous goods
        if shipment.get('has_dangerous_goods'):
            self.update_dangerous_goods_inventory(shipment)
    
    def handle_emergency_incident(self, event_data):
        """Handle emergency incident webhook"""
        incident = event_data['incident']
        
        # Trigger emergency response
        self.trigger_emergency_response(incident)
        
        # Notify relevant personnel
        self.notify_emergency_contacts(incident)
    
    def handle_compliance_violation(self, event_data):
        """Handle compliance violation webhook"""
        violation = event_data['violation']
        
        # Log compliance issue
        self.log_compliance_violation(violation)
        
        # Trigger corrective action workflow
        self.trigger_corrective_action(violation)

webhook_handler = SafeShipperWebhookHandler(WEBHOOK_SECRET)

@app.route('/webhooks/safeshipper', methods=['POST'])
def handle_webhook():
    # Verify signature
    signature = request.headers.get('X-SafeShipper-Signature')
    if not webhook_handler.verify_signature(request.data.decode(), signature):
        return jsonify({'error': 'Invalid signature'}), 401
    
    event_data = request.json
    event_type = event_data['event_type']
    
    # Route event to appropriate handler
    if event_type == 'shipment.delivered':
        webhook_handler.handle_shipment_delivered(event_data)
    elif event_type == 'emergency.incident_reported':
        webhook_handler.handle_emergency_incident(event_data)
    elif event_type == 'compliance.violation_detected':
        webhook_handler.handle_compliance_violation(event_data)
    
    return jsonify({'status': 'processed'}), 200

if __name__ == '__main__':
    app.run(debug=True)
```

---

## 🧪 **Testing Integration**

### **API Testing Framework**

#### **Integration Test Suite**
```python
import unittest
import requests
from unittest.mock import patch, MagicMock

class SafeShipperIntegrationTests(unittest.TestCase):
    """Comprehensive integration tests for SafeShipper API"""
    
    def setUp(self):
        self.client = SafeShipperClient(
            client_id="test_client",
            client_secret="test_secret",
            base_url="https://api-test.safeshipper.com/api/v1"
        )
        self.client.authenticate()
    
    def test_dangerous_goods_compatibility_check(self):
        """Test dangerous goods compatibility checking"""
        
        # Test compatible dangerous goods
        compatible_uns = ["UN1203", "UN1090"]  # Both Class 3
        result = check_dangerous_goods_compatibility(self.client, compatible_uns)
        
        self.assertTrue(result['is_compatible'])
        self.assertEqual(len(result['conflicts']), 0)
        
        # Test incompatible dangerous goods
        incompatible_uns = ["UN1203", "UN1381"]  # Class 3 vs Class 4.2
        result = check_dangerous_goods_compatibility(self.client, incompatible_uns)
        
        self.assertFalse(result['is_compatible'])
        self.assertGreater(len(result['conflicts']), 0)
    
    def test_emergency_incident_reporting(self):
        """Test emergency incident reporting flow"""
        
        # Create test incident
        incident_data = {
            'emergency_type': 'SPILL',
            'description': 'Test chemical spill',
            'location': 'Test Location',
            'coordinates': {'lat': -37.8136, 'lng': 144.9631},
            'severity_level': 'HIGH'
        }
        
        response = requests.post(
            f"{self.client.base_url}/emergency-procedures/api/incidents/",
            headers=self.client.get_headers(),
            json=incident_data
        )
        
        self.assertEqual(response.status_code, 201)
        
        incident = response.json()
        self.assertEqual(incident['emergency_type'], 'SPILL')
        self.assertEqual(incident['status'], 'REPORTED')
    
    def test_file_upload_processing(self):
        """Test file upload and processing"""
        
        # Create test manifest file
        test_file_content = b"Test manifest content"
        
        files = {
            'file': ('test_manifest.pdf', test_file_content, 'application/pdf')
        }
        
        data = {
            'document_type': 'DG_MANIFEST',
            'description': 'Test manifest upload'
        }
        
        response = requests.post(
            f"{self.client.base_url}/documents/api/files/upload/",
            headers={
                'Authorization': f'Bearer {self.client.access_token}'
                # Don't set Content-Type for multipart
            },
            files=files,
            data=data
        )
        
        self.assertEqual(response.status_code, 201)
        
        document = response.json()
        self.assertEqual(document['document_type'], 'DG_MANIFEST')
        self.assertEqual(document['upload_status'], 'COMPLETED')
    
    def test_search_functionality(self):
        """Test unified search functionality"""
        
        response = requests.get(
            f"{self.client.base_url}/search/api/",
            headers=self.client.get_headers(),
            params={
                'q': 'lithium battery',
                'type': 'dangerous_goods',
                'limit': 10
            }
        )
        
        self.assertEqual(response.status_code, 200)
        
        search_results = response.json()
        self.assertIn('results', search_results)
        self.assertIn('dangerous_goods', search_results['results'])
    
    @patch('requests.post')
    def test_erp_integration_error_handling(self, mock_post):
        """Test ERP integration error handling"""
        
        # Mock ERP service failure
        mock_post.side_effect = requests.exceptions.ConnectionError("ERP service unavailable")
        
        integration = SAPSafeShipperIntegration(
            sap_client=MagicMock(),
            safeshipper_client=self.client
        )
        
        with self.assertRaises(Exception):
            integration.sync_shipment_from_sap("delivery_123")
    
    def test_rate_limiting(self):
        """Test API rate limiting behavior"""
        
        # Make rapid requests to trigger rate limiting
        responses = []
        for i in range(105):  # Exceed typical rate limit
            response = requests.get(
                f"{self.client.base_url}/dangerous-goods/",
                headers=self.client.get_headers()
            )
            responses.append(response.status_code)
        
        # Should eventually receive 429 (Too Many Requests)
        self.assertIn(429, responses)

if __name__ == '__main__':
    unittest.main()
```

### **Performance Testing**

#### **Load Testing Example**
```python
import asyncio
import aiohttp
import time
from concurrent.futures import ThreadPoolExecutor

class SafeShipperLoadTester:
    """Load testing for SafeShipper API endpoints"""
    
    def __init__(self, base_url, access_token):
        self.base_url = base_url
        self.access_token = access_token
    
    async def load_test_search_endpoint(self, concurrent_requests=50, total_requests=1000):
        """Load test the search endpoint"""
        
        async with aiohttp.ClientSession() as session:
            headers = {
                'Authorization': f'Bearer {self.access_token}',
                'Content-Type': 'application/json'
            }
            
            semaphore = asyncio.Semaphore(concurrent_requests)
            
            async def make_request():
                async with semaphore:
                    try:
                        async with session.get(
                            f"{self.base_url}/search/api/",
                            headers=headers,
                            params={'q': 'dangerous goods', 'limit': 10}
                        ) as response:
                            return response.status, await response.text()
                    except Exception as e:
                        return 500, str(e)
            
            # Execute load test
            start_time = time.time()
            tasks = [make_request() for _ in range(total_requests)]
            results = await asyncio.gather(*tasks)
            end_time = time.time()
            
            # Analyze results
            success_count = sum(1 for status, _ in results if status == 200)
            error_count = total_requests - success_count
            avg_response_time = (end_time - start_time) / total_requests
            
            print(f"Load Test Results:")
            print(f"Total Requests: {total_requests}")
            print(f"Successful: {success_count}")
            print(f"Failed: {error_count}")
            print(f"Success Rate: {(success_count/total_requests)*100:.2f}%")
            print(f"Average Response Time: {avg_response_time:.3f}s")
            
            return {
                'success_rate': success_count / total_requests,
                'avg_response_time': avg_response_time,
                'total_requests': total_requests
            }

# Run load test
async def run_load_test():
    tester = SafeShipperLoadTester(
        base_url="https://api-test.safeshipper.com/api/v1",
        access_token="your_test_token"
    )
    
    results = await tester.load_test_search_endpoint(
        concurrent_requests=20,
        total_requests=500
    )
    
    return results

# Execute load test
if __name__ == "__main__":
    results = asyncio.run(run_load_test())
```

---

## 🛡️ **Security Best Practices**

### **API Security Implementation**

#### **Request Signing**
```python
import hmac
import hashlib
import time
import base64

class SecureAPIClient:
    """Secure API client with request signing"""
    
    def __init__(self, api_key, secret_key):
        self.api_key = api_key
        self.secret_key = secret_key
    
    def sign_request(self, method, url, body=None):
        """Sign API request for additional security"""
        
        timestamp = str(int(time.time()))
        
        # Create string to sign
        string_to_sign = f"{method}\n{url}\n{timestamp}"
        if body:
            string_to_sign += f"\n{body}"
        
        # Generate signature
        signature = hmac.new(
            self.secret_key.encode(),
            string_to_sign.encode(),
            hashlib.sha256
        ).digest()
        
        signature_b64 = base64.b64encode(signature).decode()
        
        return {
            'X-API-Key': self.api_key,
            'X-Timestamp': timestamp,
            'X-Signature': signature_b64
        }
    
    def make_secure_request(self, method, url, json_data=None):
        """Make secure API request with signature"""
        
        body = json.dumps(json_data) if json_data else None
        auth_headers = self.sign_request(method, url, body)
        
        headers = {
            'Content-Type': 'application/json',
            **auth_headers
        }
        
        response = requests.request(
            method=method,
            url=url,
            headers=headers,
            data=body
        )
        
        return response

# Usage
secure_client = SecureAPIClient(API_KEY, SECRET_KEY)
response = secure_client.make_secure_request(
    'POST',
    'https://api.safeshipper.com/api/v1/dangerous-goods/check-compatibility/',
    {'un_numbers': ['UN1203', 'UN1090']}
)
```

#### **Data Encryption**
```python
from cryptography.fernet import Fernet
import base64

class EncryptedDataHandler:
    """Handle encrypted data transmission"""
    
    def __init__(self, encryption_key):
        self.cipher = Fernet(encryption_key)
    
    def encrypt_sensitive_data(self, data):
        """Encrypt sensitive data before transmission"""
        
        sensitive_fields = ['emergency_contacts', 'driver_details', 'customer_info']
        
        for field in sensitive_fields:
            if field in data and data[field]:
                encrypted_data = self.cipher.encrypt(
                    json.dumps(data[field]).encode()
                )
                data[field] = base64.b64encode(encrypted_data).decode()
        
        return data
    
    def decrypt_sensitive_data(self, data):
        """Decrypt sensitive data after receiving"""
        
        sensitive_fields = ['emergency_contacts', 'driver_details', 'customer_info']
        
        for field in sensitive_fields:
            if field in data and data[field]:
                encrypted_data = base64.b64decode(data[field])
                decrypted_data = self.cipher.decrypt(encrypted_data)
                data[field] = json.loads(decrypted_data.decode())
        
        return data

# Generate encryption key
encryption_key = Fernet.generate_key()
crypto_handler = EncryptedDataHandler(encryption_key)

# Encrypt before sending
shipment_data = {
    'shipment_number': 'SH001',
    'emergency_contacts': [
        {'name': 'John Doe', 'phone': '+61412345678'}
    ]
}

encrypted_data = crypto_handler.encrypt_sensitive_data(shipment_data)
```

---

## 📊 **Monitoring & Analytics Integration**

### **API Usage Analytics**

#### **Custom Analytics Implementation**
```python
import logging
import json
from datetime import datetime

class SafeShipperAnalytics:
    """Custom analytics for SafeShipper API usage"""
    
    def __init__(self, client):
        self.client = client
        self.logger = self.setup_logger()
    
    def setup_logger(self):
        """Setup structured logging for analytics"""
        
        logger = logging.getLogger('safeshipper_analytics')
        handler = logging.FileHandler('safeshipper_api_usage.log')
        
        formatter = logging.Formatter(
            '%(asctime)s | %(levelname)s | %(message)s'
        )
        handler.setFormatter(formatter)
        logger.addHandler(handler)
        logger.setLevel(logging.INFO)
        
        return logger
    
    def log_api_call(self, endpoint, method, response_time, status_code, payload_size=0):
        """Log API call for analytics"""
        
        analytics_data = {
            'timestamp': datetime.now().isoformat(),
            'endpoint': endpoint,
            'method': method,
            'response_time_ms': response_time * 1000,
            'status_code': status_code,
            'payload_size_bytes': payload_size,
            'user_agent': 'SafeShipper-Integration-Client/1.0'
        }
        
        self.logger.info(json.dumps(analytics_data))
    
    def track_dangerous_goods_operations(self, operation_type, un_numbers, result):
        """Track dangerous goods specific operations"""
        
        dg_analytics = {
            'timestamp': datetime.now().isoformat(),
            'operation_type': operation_type,  # 'compatibility_check', 'lookup', 'classification'
            'un_numbers': un_numbers,
            'result': result,
            'compliance_status': result.get('is_compatible', True)
        }
        
        self.logger.info(f"DG_OPERATION | {json.dumps(dg_analytics)}")
    
    def track_emergency_incidents(self, incident_type, response_time_minutes, resolution_status):
        """Track emergency incident handling"""
        
        emergency_analytics = {
            'timestamp': datetime.now().isoformat(),
            'incident_type': incident_type,
            'response_time_minutes': response_time_minutes,
            'resolution_status': resolution_status,
            'severity_level': 'HIGH'  # Default for API-reported incidents
        }
        
        self.logger.info(f"EMERGENCY | {json.dumps(emergency_analytics)}")

# Usage with API calls
analytics = SafeShipperAnalytics(client)

def tracked_api_call(client, endpoint, method='GET', **kwargs):
    """Make API call with analytics tracking"""
    
    start_time = time.time()
    
    if method == 'GET':
        response = requests.get(endpoint, **kwargs)
    elif method == 'POST':
        response = requests.post(endpoint, **kwargs)
    
    response_time = time.time() - start_time
    
    # Log analytics
    analytics.log_api_call(
        endpoint=endpoint,
        method=method,
        response_time=response_time,
        status_code=response.status_code,
        payload_size=len(response.content)
    )
    
    return response
```

---

## 🚀 **Production Deployment**

### **Environment Configuration**

#### **Production Settings**
```python
# production_config.py
import os

class ProductionConfig:
    """Production configuration for SafeShipper integration"""
    
    # API Configuration
    SAFESHIPPER_API_URL = os.getenv('SAFESHIPPER_API_URL', 'https://api.safeshipper.com/api/v1')
    SAFESHIPPER_CLIENT_ID = os.getenv('SAFESHIPPER_CLIENT_ID')
    SAFESHIPPER_CLIENT_SECRET = os.getenv('SAFESHIPPER_CLIENT_SECRET')
    
    # Security Configuration
    API_RATE_LIMIT = int(os.getenv('API_RATE_LIMIT', '100'))  # Requests per minute
    REQUEST_TIMEOUT = int(os.getenv('REQUEST_TIMEOUT', '30'))  # Seconds
    MAX_RETRIES = int(os.getenv('MAX_RETRIES', '3'))
    
    # Monitoring Configuration
    ENABLE_ANALYTICS = os.getenv('ENABLE_ANALYTICS', 'true').lower() == 'true'
    LOG_LEVEL = os.getenv('LOG_LEVEL', 'INFO')
    
    # Integration Configuration
    WEBHOOK_SECRET = os.getenv('WEBHOOK_SECRET')
    ENCRYPTION_KEY = os.getenv('ENCRYPTION_KEY')
    
    # Database Configuration (for caching/logging)
    DATABASE_URL = os.getenv('DATABASE_URL')
    REDIS_URL = os.getenv('REDIS_URL')

# Usage
config = ProductionConfig()

# Validate required configuration
required_vars = [
    'SAFESHIPPER_CLIENT_ID',
    'SAFESHIPPER_CLIENT_SECRET',
    'WEBHOOK_SECRET'
]

for var in required_vars:
    if not getattr(config, var):
        raise ValueError(f"Required environment variable {var} not set")
```

#### **Docker Configuration**
```dockerfile
# Dockerfile for SafeShipper integration service
FROM python:3.11-slim

# Install system dependencies
RUN apt-get update && apt-get install -y \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Copy requirements and install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Create non-root user
RUN useradd --create-home --shell /bin/bash integration
USER integration

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8080/health || exit 1

# Run application
EXPOSE 8080
CMD ["python", "app.py"]
```

### **Kubernetes Deployment**

#### **Deployment Configuration**
```yaml
# safeshipper-integration-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: safeshipper-integration
  labels:
    app: safeshipper-integration
spec:
  replicas: 3
  selector:
    matchLabels:
      app: safeshipper-integration
  template:
    metadata:
      labels:
        app: safeshipper-integration
    spec:
      containers:
      - name: integration-service
        image: your-registry/safeshipper-integration:latest
        ports:
        - containerPort: 8080
        env:
        - name: SAFESHIPPER_API_URL
          value: "https://api.safeshipper.com/api/v1"
        - name: SAFESHIPPER_CLIENT_ID
          valueFrom:
            secretKeyRef:
              name: safeshipper-secrets
              key: client-id
        - name: SAFESHIPPER_CLIENT_SECRET
          valueFrom:
            secretKeyRef:
              name: safeshipper-secrets
              key: client-secret
        - name: WEBHOOK_SECRET
          valueFrom:
            secretKeyRef:
              name: safeshipper-secrets
              key: webhook-secret
        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
          limits:
            memory: "512Mi"
            cpu: "500m"
        livenessProbe:
          httpGet:
            path: /health
            port: 8080
          initialDelaySeconds: 30
          periodSeconds: 30
        readinessProbe:
          httpGet:
            path: /ready
            port: 8080
          initialDelaySeconds: 5
          periodSeconds: 10
---
apiVersion: v1
kind: Service
metadata:
  name: safeshipper-integration-service
spec:
  selector:
    app: safeshipper-integration
  ports:
  - protocol: TCP
    port: 80
    targetPort: 8080
  type: ClusterIP
---
apiVersion: v1
kind: Secret
metadata:
  name: safeshipper-secrets
type: Opaque
data:
  client-id: <base64-encoded-client-id>
  client-secret: <base64-encoded-client-secret>
  webhook-secret: <base64-encoded-webhook-secret>
```

---

## 📋 **Integration Checklist**

### **Pre-Integration Verification**

- [ ] **API Credentials Obtained**: Client ID and secret from SafeShipper
- [ ] **Test Environment Access**: Confirmed access to test API endpoints
- [ ] **Rate Limits Understood**: API rate limits documented and implemented
- [ ] **Error Handling**: Comprehensive error handling implemented
- [ ] **Security Measures**: Request signing and data encryption implemented
- [ ] **Monitoring Setup**: Logging and analytics configured

### **Integration Testing**

- [ ] **Authentication Flow**: Token generation and refresh tested
- [ ] **Core API Operations**: CRUD operations on main resources tested
- [ ] **Dangerous Goods Operations**: Compatibility checking tested
- [ ] **Emergency Systems**: Incident reporting and response tested
- [ ] **File Upload**: Document upload and processing tested
- [ ] **Search Functionality**: Unified search tested
- [ ] **Real-time Features**: WebSocket connections tested
- [ ] **Webhook Processing**: Webhook reception and processing tested

### **Production Readiness**

- [ ] **Performance Testing**: Load testing completed
- [ ] **Security Audit**: Security review completed
- [ ] **Monitoring Configured**: Production monitoring setup
- [ ] **Documentation**: Integration documentation complete
- [ ] **Disaster Recovery**: Backup and recovery procedures tested
- [ ] **Compliance Check**: Industry compliance requirements verified

---

**This comprehensive integration guide provides everything needed to successfully integrate with the SafeShipper dangerous goods transportation platform. Following these patterns ensures secure, reliable, and compliant integration for enterprise dangerous goods logistics operations.**