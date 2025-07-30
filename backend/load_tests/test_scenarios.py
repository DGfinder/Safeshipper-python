# load_tests/test_scenarios.py
"""
Specific test scenarios for SafeShipper dangerous goods operations.
Each scenario represents a real-world business workflow.
"""

from locust import HttpUser, task, between, SequentialTaskSet
from faker import Faker
import random
import json
from typing import Dict, Any, List

fake = Faker()


class DangerousGoodsResearchWorkflow(SequentialTaskSet):
    """
    Sequential workflow for researching dangerous goods information.
    Simulates compliance officer or safety manager researching DG requirements.
    """
    
    def on_start(self):
        """Initialize research session."""
        self.research_topics = [
            "UN1203", "gasoline", "class 3 flammable",
            "lithium batteries", "UN3480", "paint",
            "acetone", "diesel fuel", "corrosive materials"
        ]
        self.current_topic = None
        self.research_results = []
    
    @task
    def search_dangerous_good(self):
        """Search for dangerous goods information."""
        self.current_topic = random.choice(self.research_topics)
        
        with self.client.get(
            f"/api/v1/dangerous-goods/search/?q={self.current_topic}",
            catch_response=True,
            name="DG Research: Search"
        ) as response:
            if response.status_code == 200:
                results = response.json().get('results', [])
                self.research_results = results[:5]  # Keep top 5 results
                response.success()
            else:
                response.failure(f"Search failed: {response.status_code}")
    
    @task  
    def examine_details(self):
        """Examine detailed information for found dangerous goods."""
        if self.research_results:
            for dg in self.research_results[:3]:  # Examine top 3
                un_number = dg.get('un_number')
                if un_number:
                    with self.client.get(
                        f"/api/v1/dangerous-goods/{un_number}/",
                        catch_response=True,
                        name="DG Research: Details"
                    ) as response:
                        if response.status_code == 200:
                            response.success()
                        else:
                            response.failure(f"Details failed: {response.status_code}")
    
    @task
    def check_emergency_procedures(self):
        """Check emergency procedures for the dangerous goods."""
        if self.research_results:
            dg = random.choice(self.research_results)
            hazard_class = dg.get('hazard_class', '3')
            
            with self.client.get(
                f"/api/v1/emergency-procedures/quick-reference/?hazard_class={hazard_class}",
                catch_response=True,
                name="DG Research: Emergency Procedures"
            ) as response:
                if response.status_code == 200:
                    response.success()
                else:
                    response.failure(f"Emergency procedures failed: {response.status_code}")
    
    @task
    def check_compatibility(self):
        """Check vehicle compatibility for the dangerous goods."""
        if self.research_results:
            dg = random.choice(self.research_results)
            un_number = dg.get('un_number')
            
            with self.client.get(
                f"/api/v1/fleet/compatibility-check/?un_numbers={un_number}&vehicle_type=van",
                catch_response=True,
                name="DG Research: Compatibility"
            ) as response:
                if response.status_code == 200:
                    response.success()
                else:
                    response.failure(f"Compatibility check failed: {response.status_code}")


class ShipmentLifecycleWorkflow(SequentialTaskSet):
    """
    Complete shipment lifecycle from creation to delivery.
    Simulates dispatcher/logistics coordinator workflow.
    """
    
    def on_start(self):
        """Initialize shipment workflow."""
        self.shipment_id = None
        self.tracking_events = []
    
    @task
    def create_shipment(self):
        """Create a new dangerous goods shipment."""
        shipment_data = {
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
                    "un_number": random.choice(["UN1203", "UN1993", "UN3480"]),
                    "quantity": random.randint(1, 500),
                    "unit": random.choice(["L", "KG"]),
                    "packaging_group": random.choice(["I", "II", "III"])
                }
            ],
            "scheduled_pickup": fake.future_datetime(end_date="+7d").isoformat(),
            "priority": random.choice(["normal", "high"]),
            "special_instructions": fake.sentence()
        }
        
        with self.client.post(
            "/api/v1/shipments/",
            json=shipment_data,
            catch_response=True,
            name="Shipment Lifecycle: Create"
        ) as response:
            if response.status_code == 201:
                shipment = response.json()
                self.shipment_id = shipment['id']
                response.success()
            else:
                response.failure(f"Shipment creation failed: {response.status_code}")
    
    @task
    def assign_driver(self):
        """Assign a qualified driver to the shipment."""
        if self.shipment_id:
            # First get qualified drivers
            with self.client.get(
                "/api/v1/drivers/qualifications/?status=active",
                catch_response=True,
                name="Shipment Lifecycle: Get Drivers"
            ) as response:
                if response.status_code == 200:
                    drivers = response.json().get('results', [])
                    if drivers:
                        driver_id = random.choice(drivers)['id']
                        
                        # Assign driver
                        with self.client.patch(
                            f"/api/v1/shipments/{self.shipment_id}/",
                            json={"assigned_driver": driver_id},
                            catch_response=True,
                            name="Shipment Lifecycle: Assign Driver"
                        ) as assign_response:
                            if assign_response.status_code == 200:
                                assign_response.success()
                            else:
                                assign_response.failure("Driver assignment failed")
                    response.success()
    
    @task
    def track_shipment(self):
        """Monitor shipment progress."""
        if self.shipment_id:
            with self.client.get(
                f"/api/v1/shipments/{self.shipment_id}/tracking/",
                catch_response=True,
                name="Shipment Lifecycle: Track"
            ) as response:
                if response.status_code == 200:
                    self.tracking_events = response.json().get('events', [])
                    response.success()
                else:
                    response.failure(f"Tracking failed: {response.status_code}")
    
    @task
    def update_status(self):
        """Update shipment status."""
        if self.shipment_id:
            statuses = ["confirmed", "in_transit", "out_for_delivery"]
            status = random.choice(statuses)
            
            with self.client.patch(
                f"/api/v1/shipments/{self.shipment_id}/",
                json={
                    "status": status,
                    "notes": f"Status updated to {status} - {fake.sentence()}"
                },
                catch_response=True,
                name="Shipment Lifecycle: Update Status"
            ) as response:
                if response.status_code == 200:
                    response.success()
                else:
                    response.failure(f"Status update failed: {response.status_code}")
    
    @task
    def generate_documents(self):
        """Generate shipment documentation."""
        if self.shipment_id:
            with self.client.get(
                f"/api/v1/shipments/{self.shipment_id}/generate-pdf/",
                catch_response=True,
                name="Shipment Lifecycle: Generate PDF"
            ) as response:
                if response.status_code == 200:
                    response.success()
                else:
                    response.failure(f"PDF generation failed: {response.status_code}")


class ComplianceAuditWorkflow(SequentialTaskSet):
    """
    Compliance audit workflow for safety and regulatory compliance.
    Simulates compliance officer conducting safety audits.
    """
    
    def on_start(self):
        """Initialize audit session."""
        self.audit_findings = []
        self.review_period = "last_30_days"
    
    @task
    def review_audit_logs(self):
        """Review system audit logs for compliance."""
        with self.client.get(
            f"/api/v1/audit/logs/?date_range={self.review_period}&limit=50",
            catch_response=True,
            name="Compliance Audit: Audit Logs"
        ) as response:
            if response.status_code == 200:
                logs = response.json().get('results', [])
                # Flag suspicious activities
                for log in logs:
                    if log.get('action') in ['delete', 'bulk_update']:
                        self.audit_findings.append(log)
                response.success()
            else:
                response.failure(f"Audit logs failed: {response.status_code}")
    
    @task
    def check_training_compliance(self):
        """Check driver training compliance."""
        with self.client.get(
            "/api/v1/training/compliance-report/?status=all",
            catch_response=True,
            name="Compliance Audit: Training Compliance"
        ) as response:
            if response.status_code == 200:
                report = response.json()
                # Check for expired training
                expired_count = report.get('expired_training_count', 0)
                if expired_count > 0:
                    self.audit_findings.append(f"Found {expired_count} expired training records")
                response.success()
            else:
                response.failure(f"Training compliance failed: {response.status_code}")
    
    @task
    def review_incident_reports(self):
        """Review recent incident reports."""
        with self.client.get(
            "/api/v1/incidents/?status=all&date_range=last_quarter",
            catch_response=True,
            name="Compliance Audit: Incident Reports"
        ) as response:
            if response.status_code == 200:
                incidents = response.json().get('results', [])
                # Analyze incident patterns
                high_severity = [i for i in incidents if i.get('severity') == 'high']
                if len(high_severity) > 5:
                    self.audit_findings.append(f"High number of severe incidents: {len(high_severity)}")
                response.success()
            else:
                response.failure(f"Incident review failed: {response.status_code}")
    
    @task
    def generate_compliance_report(self):
        """Generate comprehensive compliance report."""
        report_data = {
            "report_type": "safety_compliance",
            "period": self.review_period,
            "findings": self.audit_findings,
            "generated_by": "compliance_audit_workflow"
        }
        
        with self.client.post(
            "/api/v1/reports/compliance/",
            json=report_data,
            catch_response=True,
            name="Compliance Audit: Generate Report"
        ) as response:
            if response.status_code == 201:
                response.success()
            else:
                response.failure(f"Report generation failed: {response.status_code}")


class EmergencyResponseWorkflow(SequentialTaskSet):
    """
    Emergency response workflow simulation.
    Tests emergency procedures and incident reporting.
    """
    
    def on_start(self):
        """Initialize emergency scenario."""
        self.incident_types = ["spill", "fire", "exposure", "transport_accident"]
        self.incident_id = None
    
    @task
    def report_incident(self):
        """Report a dangerous goods incident."""
        incident_data = {
            "type": random.choice(self.incident_types),
            "severity": random.choice(["low", "medium", "high", "critical"]),
            "description": fake.paragraph(),
            "location": {
                "latitude": float(fake.latitude()),
                "longitude": float(fake.longitude()),
                "address": fake.address()
            },
            "dangerous_goods_involved": [
                {
                    "un_number": random.choice(["UN1203", "UN1993", "UN3480"]),
                    "estimated_quantity": random.randint(1, 100)
                }
            ],
            "reported_by": fake.name(),
            "contact_phone": fake.phone_number()
        }
        
        with self.client.post(
            "/api/v1/incidents/",
            json=incident_data,
            catch_response=True,
            name="Emergency Response: Report Incident"
        ) as response:
            if response.status_code == 201:
                incident = response.json()
                self.incident_id = incident['id']
                response.success()
            else:
                response.failure(f"Incident reporting failed: {response.status_code}")
    
    @task
    def get_emergency_procedures(self):
        """Get emergency response procedures."""
        hazard_classes = ["3", "4.1", "6.1", "8"]
        hazard_class = random.choice(hazard_classes)
        
        with self.client.get(
            f"/api/v1/emergency-procedures/quick-reference/?hazard_class={hazard_class}&emergency_type=spill",
            catch_response=True,
            name="Emergency Response: Get Procedures"
        ) as response:
            if response.status_code == 200:
                response.success()
            else:
                response.failure(f"Emergency procedures failed: {response.status_code}")
    
    @task
    def contact_emergency_services(self):
        """Get emergency contact information."""
        with self.client.get(
            "/api/v1/emergency-procedures/contacts/?location=current&service_type=hazmat",
            catch_response=True,
            name="Emergency Response: Get Contacts"
        ) as response:
            if response.status_code == 200:
                response.success()
            else:
                response.failure(f"Emergency contacts failed: {response.status_code}")
    
    @task
    def update_incident_status(self):
        """Update incident response status."""
        if self.incident_id:
            status_updates = ["investigating", "responding", "contained", "resolved"]
            status = random.choice(status_updates)
            
            with self.client.patch(
                f"/api/v1/incidents/{self.incident_id}/",
                json={
                    "status": status,
                    "response_notes": f"Status updated to {status} - {fake.sentence()}"
                },
                catch_response=True,
                name="Emergency Response: Update Status"
            ) as response:
                if response.status_code == 200:
                    response.success()
                else:
                    response.failure(f"Status update failed: {response.status_code}")


# User classes that use the workflow task sets
class DangerousGoodsResearcher(HttpUser):
    """User focused on dangerous goods research and compliance."""
    
    wait_time = between(3, 10)
    tasks = [DangerousGoodsResearchWorkflow]
    weight = 3
    
    def on_start(self):
        self.authenticate_as_compliance_officer()
    
    def authenticate_as_compliance_officer(self):
        """Authenticate as compliance officer."""
        response = self.client.post("/api/v1/auth/login/", json={
            "username": "compliance_officer",
            "password": "test_password"
        })
        if response.status_code == 200:
            token = response.json().get("access_token")
            self.client.headers.update({"Authorization": f"Bearer {token}"})


class ShipmentCoordinator(HttpUser):
    """User focused on shipment coordination and logistics."""
    
    wait_time = between(2, 8)
    tasks = [ShipmentLifecycleWorkflow]
    weight = 5
    
    def on_start(self):
        self.authenticate_as_dispatcher()
    
    def authenticate_as_dispatcher(self):
        """Authenticate as dispatcher."""
        response = self.client.post("/api/v1/auth/login/", json={
            "username": "dispatcher",
            "password": "test_password"
        })
        if response.status_code == 200:
            token = response.json().get("access_token")
            self.client.headers.update({"Authorization": f"Bearer {token}"})


class ComplianceAuditor(HttpUser):
    """User focused on compliance auditing and safety reviews."""
    
    wait_time = between(5, 15)
    tasks = [ComplianceAuditWorkflow]
    weight = 2
    
    def on_start(self):
        self.authenticate_as_auditor()
    
    def authenticate_as_auditor(self):
        """Authenticate as compliance auditor."""
        response = self.client.post("/api/v1/auth/login/", json={
            "username": "compliance_auditor",
            "password": "test_password"
        })
        if response.status_code == 200:
            token = response.json().get("access_token")
            self.client.headers.update({"Authorization": f"Bearer {token}"})


class EmergencyResponder(HttpUser):
    """User focused on emergency response scenarios."""
    
    wait_time = between(1, 5)  # Emergency scenarios require quick response
    tasks = [EmergencyResponseWorkflow]
    weight = 1
    
    def on_start(self):
        self.authenticate_as_emergency_coordinator()
    
    def authenticate_as_emergency_coordinator(self):
        """Authenticate as emergency coordinator."""
        response = self.client.post("/api/v1/auth/login/", json={
            "username": "emergency_coordinator",
            "password": "test_password"
        })
        if response.status_code == 200:
            token = response.json().get("access_token")
            self.client.headers.update({"Authorization": f"Bearer {token}"})


# Mixed workflow user for realistic simulation
class MixedWorkflowUser(HttpUser):
    """User that performs mixed workflows - most realistic simulation."""
    
    wait_time = between(2, 10)
    weight = 4
    
    tasks = {
        DangerousGoodsResearchWorkflow: 3,
        ShipmentLifecycleWorkflow: 2,
        ComplianceAuditWorkflow: 1
    }
    
    def on_start(self):
        """Authenticate as general user."""
        response = self.client.post("/api/v1/auth/login/", json={
            "username": "general_user",
            "password": "test_password"
        })
        if response.status_code == 200:
            token = response.json().get("access_token")
            self.client.headers.update({"Authorization": f"Bearer {token}"})