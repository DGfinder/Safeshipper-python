# load_tests/locustfile.py
"""
Comprehensive Locust load testing for SafeShipper dangerous goods transportation platform.
Simulates realistic user patterns for dangerous goods operations.
"""

import json
import random
import time
from typing import Dict, List, Any
from locust import HttpUser, task, between, events
from locust.contrib.fasthttp import FastHttpUser
from faker import Faker

fake = Faker()


class SafeShipperAPIUser(HttpUser):
    """
    SafeShipper user simulation for load testing dangerous goods operations.
    """
    
    wait_time = between(2, 8)  # Realistic user think time
    
    def on_start(self):
        """Initialize user session with authentication."""
        self.authenticate()
        self.user_profile = self.get_user_profile()
        self.dangerous_goods_cache = {}
        self.shipment_ids = []
    
    def authenticate(self):
        """Authenticate user and get token."""
        # Create test user credentials
        test_users = [
            {"username": "admin_user", "password": "test_password"},
            {"username": "dispatcher_user", "password": "test_password"},
            {"username": "driver_user", "password": "test_password"},
            {"username": "compliance_user", "password": "test_password"},
        ]
        
        user_creds = random.choice(test_users)
        
        with self.client.post(
            "/api/v1/auth/login/",
            json=user_creds,
            catch_response=True
        ) as response:
            if response.status_code == 200:
                token = response.json().get("access_token")
                self.client.headers.update({"Authorization": f"Bearer {token}"})
                response.success()
            else:
                response.failure(f"Authentication failed: {response.status_code}")
    
    def get_user_profile(self):
        """Get user profile information."""
        with self.client.get("/api/v1/auth/profile/", catch_response=True) as response:
            if response.status_code == 200:
                response.success()
                return response.json()
            else:
                response.failure(f"Profile fetch failed: {response.status_code}")
                return {}
    
    @task(10)
    def search_dangerous_goods(self):
        """Test dangerous goods search functionality - most common operation."""
        search_terms = [
            "gasoline", "diesel", "acetone", "lithium", "paint", 
            "UN1203", "UN1993", "UN3480", "class 3", "flammable"
        ]
        
        search_term = random.choice(search_terms)
        
        with self.client.get(
            f"/api/v1/dangerous-goods/search/?q={search_term}",
            catch_response=True,
            name="/api/v1/dangerous-goods/search/"
        ) as response:
            if response.status_code == 200:
                results = response.json()
                if results.get('results'):
                    # Cache some results for later use
                    self.dangerous_goods_cache[search_term] = results['results'][:5]
                response.success()
            else:
                response.failure(f"DG search failed: {response.status_code}")
    
    @task(8)
    def get_dangerous_good_details(self):
        """Test dangerous goods detail retrieval."""
        # Use common UN numbers for testing
        un_numbers = ["UN1203", "UN1993", "UN3480", "UN1230", "UN1170"]
        un_number = random.choice(un_numbers)
        
        with self.client.get(
            f"/api/v1/dangerous-goods/{un_number}/",
            catch_response=True,
            name="/api/v1/dangerous-goods/[un_number]/"
        ) as response:
            if response.status_code == 200:
                response.success()
            elif response.status_code == 404:
                response.success()  # Expected for some test UN numbers
            else:
                response.failure(f"DG details failed: {response.status_code}")
    
    @task(6)
    def create_shipment(self):
        """Test shipment creation with dangerous goods."""
        shipment_data = self.generate_shipment_data()
        
        with self.client.post(
            "/api/v1/shipments/",
            json=shipment_data,
            catch_response=True
        ) as response:
            if response.status_code == 201:
                shipment = response.json()
                self.shipment_ids.append(shipment['id'])
                response.success()
            else:
                response.failure(f"Shipment creation failed: {response.status_code}")
    
    @task(5)
    def list_shipments(self):
        """Test shipment listing with filters."""
        filters = [
            "",  # No filter
            "?status=pending",
            "?status=in_transit",
            "?hazard_class=3",
            "?created_at__gte=2024-01-01",
        ]
        
        filter_param = random.choice(filters)
        
        with self.client.get(
            f"/api/v1/shipments/{filter_param}",
            catch_response=True,
            name="/api/v1/shipments/ (filtered)"
        ) as response:
            if response.status_code == 200:
                response.success()
            else:
                response.failure(f"Shipment list failed: {response.status_code}")
    
    @task(4)
    def get_shipment_details(self):
        """Test shipment detail retrieval."""
        if self.shipment_ids:
            shipment_id = random.choice(self.shipment_ids)
            
            with self.client.get(
                f"/api/v1/shipments/{shipment_id}/",
                catch_response=True,
                name="/api/v1/shipments/[id]/"
            ) as response:
                if response.status_code == 200:
                    response.success()
                else:
                    response.failure(f"Shipment details failed: {response.status_code}")
    
    @task(3)
    def check_system_health(self):
        """Test system health check endpoint."""
        with self.client.get(
            "/api/v1/system/health/",
            catch_response=True
        ) as response:
            if response.status_code in [200, 503]:  # 503 is also acceptable (degraded)
                response.success()
            else:
                response.failure(f"Health check failed: {response.status_code}")
    
    @task(3)
    def generate_pdf_report(self):
        """Test PDF report generation."""
        if self.shipment_ids:
            shipment_id = random.choice(self.shipment_ids)
            
            with self.client.get(
                f"/api/v1/shipments/{shipment_id}/generate-pdf/",
                catch_response=True,
                name="/api/v1/shipments/[id]/generate-pdf/"
            ) as response:
                if response.status_code == 200:
                    response.success()
                else:
                    response.failure(f"PDF generation failed: {response.status_code}")
    
    @task(2)
    def emergency_procedures_lookup(self):
        """Test emergency procedures quick reference."""
        hazard_classes = ["3", "4.1", "4.2", "4.3", "5.1", "5.2", "6.1", "8", "9"]
        hazard_class = random.choice(hazard_classes)
        
        with self.client.get(
            f"/api/v1/emergency-procedures/quick-reference/?hazard_class={hazard_class}",
            catch_response=True,
            name="/api/v1/emergency-procedures/quick-reference/"
        ) as response:
            if response.status_code == 200:
                response.success()
            else:
                response.failure(f"Emergency procedures failed: {response.status_code}")
    
    @task(2)
    def check_driver_qualifications(self):
        """Test driver qualification validation."""
        with self.client.get(
            "/api/v1/drivers/qualifications/",
            catch_response=True
        ) as response:
            if response.status_code == 200:
                response.success()
            else:
                response.failure(f"Driver qualifications failed: {response.status_code}")
    
    @task(1)
    def vehicle_compatibility_check(self):
        """Test vehicle-to-dangerous goods compatibility."""
        un_numbers = ["UN1203", "UN1993", "UN3480"]
        vehicle_types = ["tanker", "van", "flatbed"]
        
        params = {
            "un_numbers": random.choice(un_numbers),
            "vehicle_type": random.choice(vehicle_types)
        }
        
        with self.client.get(
            "/api/v1/fleet/compatibility-check/",
            params=params,
            catch_response=True
        ) as response:
            if response.status_code == 200:
                response.success()
            else:
                response.failure(f"Vehicle compatibility failed: {response.status_code}")
    
    def generate_shipment_data(self) -> Dict[str, Any]:
        """Generate realistic shipment data for testing."""
        return {
            "origin_address": {
                "street": fake.street_address(),
                "city": fake.city(),
                "state": fake.state_abbr(),
                "postal_code": fake.postcode(),
                "country": "US"
            },
            "destination_address": {
                "street": fake.street_address(),
                "city": fake.city(),
                "state": fake.state_abbr(),
                "postal_code": fake.postcode(),
                "country": "US"
            },
            "dangerous_goods": [
                {
                    "un_number": random.choice(["UN1203", "UN1993", "UN3480", "UN1230"]),
                    "quantity": random.randint(1, 1000),
                    "unit": random.choice(["L", "KG", "items"]),
                    "packaging_group": random.choice(["I", "II", "III"])
                }
            ],
            "scheduled_pickup": fake.future_datetime(end_date="+7d").isoformat(),
            "priority": random.choice(["normal", "high", "urgent"]),
            "special_instructions": fake.text(max_nb_chars=200)
        }


class HighVolumeAPIUser(FastHttpUser):
    """
    High-volume user for stress testing with FastHttpUser for better performance.
    """
    
    wait_time = between(0.5, 2)  # Faster operations for stress testing
    
    def on_start(self):
        """Quick authentication for high-volume testing."""
        self.client.post(
            "/api/v1/auth/login/",
            json={"username": "stress_test_user", "password": "test_password"}
        )
    
    @task(20)
    def rapid_dg_search(self):
        """Rapid dangerous goods searches."""
        search_terms = ["UN1203", "gasoline", "class 3", "flammable"]
        term = random.choice(search_terms)
        
        self.client.get(f"/api/v1/dangerous-goods/search/?q={term}")
    
    @task(10)
    def health_check_spam(self):
        """Rapid health checks to test monitoring under load."""
        self.client.get("/api/v1/system/health/")
    
    @task(5)
    def cache_stress_test(self):
        """Test cache performance under high load."""
        un_number = random.choice(["UN1203", "UN1993", "UN3480"])
        self.client.get(f"/api/v1/dangerous-goods/{un_number}/")


class DatabaseStressUser(HttpUser):
    """
    User pattern specifically designed to stress-test database operations.
    """
    
    wait_time = between(1, 3)
    
    def on_start(self):
        self.authenticate()
    
    def authenticate(self):
        response = self.client.post(
            "/api/v1/auth/login/",
            json={"username": "db_stress_user", "password": "test_password"}
        )
        if response.status_code == 200:
            token = response.json().get("access_token")
            self.client.headers.update({"Authorization": f"Bearer {token}"})
    
    @task(15)
    def complex_shipment_queries(self):
        """Complex queries to stress the database."""
        complex_filters = [
            "?dangerous_goods__hazard_class=3&status=in_transit&created_at__gte=2024-01-01",
            "?origin_city=Los Angeles&destination_state=NY&priority=urgent",
            "?dangerous_goods__un_number__in=UN1203,UN1993&vehicle_type=tanker",
        ]
        
        filter_param = random.choice(complex_filters)
        self.client.get(f"/api/v1/shipments/{filter_param}")
    
    @task(10)
    def audit_log_queries(self):
        """Query audit logs to test logging performance."""
        self.client.get("/api/v1/audit/logs/?limit=50")
    
    @task(8)
    def training_record_queries(self):
        """Query training records for compliance reporting."""
        self.client.get("/api/v1/training/records/?status=active&expiring_soon=true")
    
    @task(5)
    def incident_report_queries(self):
        """Query incident reports for safety analysis."""
        self.client.get("/api/v1/incidents/?severity=high&status=open")


@events.test_start.add_listener
def on_test_start(environment, **kwargs):
    """Setup test environment and data."""
    print("SafeShipper Load Test Starting...")
    print(f"Target host: {environment.host}")


@events.test_stop.add_listener
def on_test_stop(environment, **kwargs):
    """Cleanup and report test results."""
    print("SafeShipper Load Test Completed")
    print(f"Total requests: {environment.stats.total.num_requests}")
    print(f"Total failures: {environment.stats.total.num_failures}")
    print(f"Average response time: {environment.stats.total.avg_response_time}ms")
    print(f"95th percentile: {environment.stats.total.get_response_time_percentile(0.95)}ms")


# Custom task sets for different user types
class ComplianceOfficerTasks(HttpUser):
    """Task set for compliance officer user patterns."""
    
    wait_time = between(5, 15)  # Compliance officers work more slowly but thoroughly
    
    @task(5)
    def review_audit_logs(self):
        """Review audit logs for compliance."""
        self.client.get("/api/v1/audit/logs/?date_range=last_30_days")
    
    @task(4)
    def check_training_compliance(self):
        """Check training compliance status."""
        self.client.get("/api/v1/training/compliance-report/")
    
    @task(3)
    def review_incident_reports(self):
        """Review incident reports for patterns."""
        self.client.get("/api/v1/incidents/?status=closed&date_range=last_quarter")
    
    @task(2)
    def generate_compliance_reports(self):
        """Generate compliance reports."""
        self.client.post("/api/v1/reports/compliance/", json={
            "report_type": "quarterly_safety",
            "date_range": "Q1_2024"
        })


class DriverMobileTasks(HttpUser):
    """Task set simulating mobile driver usage patterns."""
    
    wait_time = between(1, 5)  # Drivers need quick responses
    
    @task(8)
    def update_shipment_status(self):
        """Update shipment status from mobile."""
        status_updates = ["picked_up", "in_transit", "delivered"]
        self.client.patch("/api/v1/shipments/1/", json={
            "status": random.choice(status_updates),
            "location": {
                "latitude": fake.latitude(),
                "longitude": fake.longitude()
            }
        })
    
    @task(6)
    def capture_pod(self):
        """Simulate proof of delivery capture."""
        self.client.post("/api/v1/shipments/1/proof-of-delivery/", json={
            "signature_data": "base64_signature_data",
            "photos": ["base64_photo_1", "base64_photo_2"],
            "delivery_notes": fake.sentence()
        })
    
    @task(4)
    def emergency_contact_lookup(self):
        """Look up emergency contact information."""
        self.client.get("/api/v1/emergency-procedures/contacts/?location=current")
    
    @task(2)
    def report_incident(self):
        """Report incident from mobile."""
        self.client.post("/api/v1/incidents/", json={
            "type": "spill",
            "severity": "medium",
            "description": fake.paragraph(),
            "location": {
                "latitude": fake.latitude(),
                "longitude": fake.longitude()
            }
        })


if __name__ == "__main__":
    # This allows running the locustfile directly for testing
    import sys
    import os
    
    # Add the current directory to the path
    sys.path.insert(0, os.path.dirname(__file__))
    
    # Import locust and run
    from locust.main import main
    
    # Default settings for direct execution
    sys.argv = [
        "locust",
        "--host=http://localhost:8000",
        "--users=10",
        "--spawn-rate=2",
        "--run-time=60s",
        "--html=load_test_report.html"
    ]
    
    main()