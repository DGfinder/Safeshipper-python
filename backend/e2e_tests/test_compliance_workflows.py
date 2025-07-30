# e2e_tests/test_compliance_workflows.py
"""
End-to-end tests for compliance workflows in SafeShipper.
Tests regulatory compliance, audit trails, and safety procedures.
"""

from datetime import datetime, timedelta
from django.test import override_settings
from django.core import mail
from rest_framework import status
from .utils import BaseE2ETestCase, E2ETestUtils


class ComplianceWorkflowE2ETests(BaseE2ETestCase):
    """
    End-to-end tests for compliance and regulatory workflows.
    """
    
    def test_complete_audit_trail_workflow(self):
        """
        Test complete audit trail generation and compliance reporting.
        """
        # Step 1: Generate auditable activities across the system
        self.authenticate_as('dispatcher')
        
        # Create shipment (auditable action)
        shipment_data = E2ETestUtils.create_test_shipment_data(['UN1203'])
        response = self.client.post('/api/v1/shipments/', shipment_data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        shipment_id = response.json()['id']
        
        # Assign driver (auditable action)
        assignment_data = {
            'assigned_driver': self.test_users['driver'].id,
            'assigned_vehicle': self.test_vehicles[0].id,
            'status': 'assigned'
        }
        response = self.client.patch(f'/api/v1/shipments/{shipment_id}/', assignment_data, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Update shipment status (auditable action)
        self.client.patch(f'/api/v1/shipments/{shipment_id}/', {'status': 'in_transit'}, format='json')
        
        # Step 2: Driver performs actions
        self.authenticate_as('driver')
        
        # Driver accepts shipment (auditable action)
        response = self.client.post(f'/api/v1/shipments/{shipment_id}/accept/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Driver updates location (auditable action)
        location_data = E2ETestUtils.simulate_mobile_location_update(40.7128, -74.0060)
        response = self.client.post(
            f'/api/v1/shipments/{shipment_id}/update-location/',
            location_data,
            format='json'
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Step 3: Compliance officer reviews audit trail
        self.authenticate_as('compliance')
        
        # Get comprehensive audit logs
        response = self.client.get('/api/v1/audit/logs/', {
            'date_range': 'today',
            'object_type': 'shipment',
            'object_id': shipment_id
        })
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        audit_logs = response.json()['results']
        self.assertGreaterEqual(len(audit_logs), 5)  # At least 5 auditable actions
        
        # Verify required audit fields
        for log in audit_logs:
            E2ETestUtils.assert_response_contains_fields(log, [
                'id', 'user', 'action', 'object_type', 'object_id',
                'timestamp', 'ip_address', 'user_agent', 'changes'
            ])
        
        # Step 4: Generate compliance report
        report_request = {
            'report_type': 'audit_trail',
            'date_range': {
                'start_date': (datetime.now() - timedelta(days=1)).isoformat(),
                'end_date': datetime.now().isoformat()
            },
            'filters': {
                'object_types': ['shipment', 'driver_assignment'],
                'actions': ['create', 'update', 'assign']
            },
            'format': 'detailed'
        }
        
        response = self.client.post('/api/v1/audit/reports/', report_request, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        
        report = response.json()
        self.assertIn('report_id', report)
        self.assertIn('download_url', report)
        
        # Step 5: Verify report contents
        report_id = report['report_id']
        response = self.client.get(f'/api/v1/audit/reports/{report_id}/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        detailed_report = response.json()
        self.assertIn('summary', detailed_report)
        self.assertIn('audit_entries', detailed_report)
        self.assertIn('compliance_status', detailed_report)
        
        # Verify compliance metrics
        summary = detailed_report['summary']
        self.assertGreater(summary['total_actions'], 0)
        self.assertEqual(summary['failed_actions'], 0)
        self.assertEqual(detailed_report['compliance_status'], 'COMPLIANT')
    
    def test_training_compliance_workflow(self):
        """
        Test training compliance tracking and certificate management.
        """
        # Step 1: Check initial training status
        self.authenticate_as('compliance')
        
        response = self.client.get('/api/v1/training/compliance-report/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        initial_report = response.json()
        
        # Step 2: Assign training to driver
        training_assignment = {
            'user': self.test_users['driver'].id,
            'training_module': self.test_training_modules[0].id,
            'due_date': (datetime.now() + timedelta(days=30)).isoformat(),
            'priority': 'mandatory'
        }
        
        response = self.client.post('/api/v1/training/assignments/', training_assignment, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        assignment_id = response.json()['id']
        
        # Step 3: Driver completes training
        self.authenticate_as('driver')
        
        # Driver views assigned training
        response = self.client.get('/api/v1/training/assignments/?assigned_to_me=true')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        assignments = response.json()['results']
        self.assertTrue(any(a['id'] == assignment_id for a in assignments))
        
        # Driver starts training
        response = self.client.post(f'/api/v1/training/assignments/{assignment_id}/start/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Driver completes training
        completion_data = {
            'completion_timestamp': datetime.now().isoformat(),
            'score': 95,
            'time_spent_minutes': 120,
            'answers': {
                'question_1': 'A',
                'question_2': 'B', 
                'question_3': 'C'
            }
        }
        
        response = self.client.post(
            f'/api/v1/training/assignments/{assignment_id}/complete/',
            completion_data,
            format='json'
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Step 4: Verify training record created
        response = self.client.get(f'/api/v1/training/records/?user={self.test_users["driver"].id}')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        records = response.json()['results']
        completed_record = next((r for r in records if r['assignment'] == assignment_id), None)
        self.assertIsNotNone(completed_record)
        self.assertEqual(completed_record['status'], 'completed')
        self.assertEqual(completed_record['score'], 95)
        
        # Step 5: Compliance officer reviews updated status
        self.authenticate_as('compliance')
        
        response = self.client.get('/api/v1/training/compliance-report/')
        updated_report = response.json()
        
        # Verify compliance metrics improved
        self.assertGreaterEqual(
            updated_report['completed_training_count'],
            initial_report['completed_training_count']
        )
        
        # Step 6: Generate training compliance certificate
        response = self.client.post(
            f'/api/v1/training/records/{completed_record["id"]}/generate-certificate/'
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        certificate = response.json()
        self.assertIn('certificate_id', certificate)
        self.assertIn('download_url', certificate)
        
        # Verify certificate is valid PDF
        cert_response = self.client.get(certificate['download_url'])
        self.assertEqual(cert_response.status_code, status.HTTP_200_OK)
        self.assertEqual(cert_response['Content-Type'], 'application/pdf')
    
    def test_dangerous_goods_compliance_validation(self):
        """
        Test dangerous goods regulatory compliance validation.
        """
        self.authenticate_as('compliance')
        
        # Step 1: Review dangerous goods database compliance
        response = self.client.get('/api/v1/dangerous-goods/compliance-check/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        compliance_check = response.json()
        self.assertIn('total_entries', compliance_check)
        self.assertIn('compliant_entries', compliance_check)
        self.assertIn('non_compliant_entries', compliance_check)
        
        # Step 2: Validate specific UN numbers
        test_un_numbers = ['UN1203', 'UN3480', 'UN1993']
        
        for un_number in test_un_numbers:
            response = self.client.get(f'/api/v1/dangerous-goods/{un_number}/compliance/')
            self.assertEqual(response.status_code, status.HTTP_200_OK)
            
            compliance = response.json()
            E2ETestUtils.assert_response_contains_fields(compliance, [
                'un_number', 'is_compliant', 'adg_compliant', 'dot_compliant',
                'iata_compliant', 'last_updated', 'validation_notes'
            ])
        
        # Step 3: Create shipment and validate DG compliance
        self.authenticate_as('dispatcher')
        
        shipment_data = E2ETestUtils.create_test_shipment_data(['UN1203', 'UN3480'])
        response = self.client.post('/api/v1/shipments/', shipment_data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        shipment_id = response.json()['id']
        
        # Step 4: Run shipment compliance validation
        self.authenticate_as('compliance')
        
        response = self.client.get(f'/api/v1/shipments/{shipment_id}/compliance-check/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        shipment_compliance = response.json()
        E2ETestUtils.assert_response_contains_fields(shipment_compliance, [
            'shipment_id', 'overall_compliance', 'dangerous_goods_compliance',
            'vehicle_compliance', 'driver_compliance', 'documentation_compliance'
        ])
        
        # Step 5: Generate compliance report for shipment
        report_request = {
            'shipment_id': shipment_id,
            'include_dangerous_goods': True,
            'include_vehicle_details': True,
            'include_driver_qualifications': True
        }
        
        response = self.client.post(
            f'/api/v1/shipments/{shipment_id}/compliance-report/',
            report_request,
            format='json'
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        
        # Verify report generation
        report = response.json()
        self.assertIn('report_id', report)
        self.assertIn('compliance_status', report)
    
    def test_regulatory_document_management(self):
        """
        Test regulatory document upload and management workflow.
        """
        self.authenticate_as('compliance')
        
        # Step 1: Upload safety data sheet
        sds_data = {
            'document_type': 'safety_data_sheet',
            'un_number': 'UN1203',
            'product_name': 'Gasoline',
            'manufacturer': 'Test Petroleum Company',
            'revision_date': '2024-01-15',
            'expiry_date': '2027-01-15',
            'language': 'en',
            'file_content': 'base64_encoded_pdf_content_here'
        }
        
        response = self.client.post('/api/v1/documents/sds/', sds_data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        
        sds_id = response.json()['id']
        
        # Step 2: Upload certification document
        cert_data = {
            'document_type': 'vehicle_certification',
            'vehicle_id': self.test_vehicles[0].id,
            'certification_type': 'dangerous_goods_transport',
            'certification_number': 'CERT-DG-12345',
            'issued_date': '2023-06-01',
            'expiry_date': '2025-06-01',
            'issuing_authority': 'National Transport Safety Board',
            'file_content': 'base64_encoded_pdf_content_here'
        }
        
        response = self.client.post('/api/v1/documents/certifications/', cert_data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        
        cert_id = response.json()['id']
        
        # Step 3: Document expiry monitoring
        response = self.client.get('/api/v1/documents/expiry-report/', {
            'days_ahead': 90
        })
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        expiry_report = response.json()
        self.assertIn('expiring_documents', expiry_report)
        self.assertIn('expired_documents', expiry_report)
        
        # Step 4: Document validation
        response = self.client.get(f'/api/v1/documents/sds/{sds_id}/validate/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        validation = response.json()
        E2ETestUtils.assert_response_contains_fields(validation, [
            'is_valid', 'validation_status', 'issues', 'expiry_status'
        ])
        
        # Step 5: Generate document inventory report
        response = self.client.get('/api/v1/documents/inventory-report/', {
            'include_expired': True,
            'group_by': 'document_type'
        })
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        inventory = response.json()
        self.assertIn('total_documents', inventory)
        self.assertIn('document_types', inventory)
        self.assertGreater(inventory['total_documents'], 0)
    
    def test_incident_compliance_workflow(self):
        """
        Test incident reporting and compliance workflow.
        """
        # Step 1: Create incident requiring regulatory reporting
        self.authenticate_as('driver')
        
        incident_data = E2ETestUtils.create_test_incident_data()
        incident_data['severity'] = 'high'
        incident_data['requires_regulatory_reporting'] = True
        incident_data['environmental_impact'] = True
        
        response = self.client.post('/api/v1/incidents/', incident_data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        incident_id = response.json()['id']
        
        # Step 2: Compliance officer reviews incident
        self.authenticate_as('compliance')
        
        response = self.client.get(f'/api/v1/incidents/{incident_id}/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        incident = response.json()
        
        # Step 3: Determine regulatory reporting requirements
        response = self.client.get(f'/api/v1/incidents/{incident_id}/regulatory-requirements/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        requirements = response.json()
        E2ETestUtils.assert_response_contains_fields(requirements, [
            'reporting_agencies', 'reporting_deadlines', 'required_forms',
            'notification_requirements'
        ])
        
        # Step 4: Generate regulatory notification
        notification_data = {
            'agencies': requirements['reporting_agencies'],
            'notification_type': 'immediate',
            'include_preliminary_details': True
        }
        
        response = self.client.post(
            f'/api/v1/incidents/{incident_id}/regulatory-notification/',
            notification_data,
            format='json'
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        
        # Step 5: Track compliance status
        response = self.client.get(f'/api/v1/incidents/{incident_id}/compliance-status/')
        compliance_status = response.json()
        
        E2ETestUtils.assert_response_contains_fields(compliance_status, [
            'regulatory_notifications_sent', 'required_reports_submitted',
            'compliance_percentage', 'outstanding_requirements'
        ])
        
        # Step 6: Generate incident compliance report
        response = self.client.get(f'/api/v1/incidents/{incident_id}/compliance-report/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response['Content-Type'], 'application/pdf')
    
    def test_data_retention_compliance_workflow(self):
        """
        Test data retention and compliance workflow.
        """
        self.authenticate_as('compliance')
        
        # Step 1: Review current data retention status
        response = self.client.get('/api/v1/data-retention/status/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        retention_status = response.json()
        E2ETestUtils.assert_response_contains_fields(retention_status, [
            'total_records', 'eligible_for_retention', 'retention_schedule',
            'compliance_status'
        ])
        
        # Step 2: Review retention policies
        response = self.client.get('/api/v1/data-retention/policies/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        policies = response.json()
        self.assertIn('audit_logs', policies)
        self.assertIn('incident_reports', policies)
        self.assertIn('training_records', policies)
        
        # Step 3: Execute dry-run retention check
        dry_run_request = {
            'data_types': ['cache_data', 'temporary_files'],
            'dry_run': True
        }
        
        response = self.client.post('/api/v1/data-retention/execute/', dry_run_request, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        dry_run_result = response.json()
        E2ETestUtils.assert_response_contains_fields(dry_run_result, [
            'affected_records', 'retention_actions', 'compliance_impact'
        ])
        
        # Step 4: Generate retention compliance report
        response = self.client.get('/api/v1/data-retention/compliance-report/', {
            'period': 'quarterly',
            'include_predictions': True
        })
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        compliance_report = response.json()
        self.assertIn('retention_summary', compliance_report)
        self.assertIn('compliance_metrics', compliance_report)
        self.assertIn('recommendations', compliance_report)
    
    @override_settings(CELERY_TASK_ALWAYS_EAGER=True)
    def test_automated_compliance_monitoring(self):
        """
        Test automated compliance monitoring and alerting.
        """
        self.authenticate_as('compliance')
        
        # Step 1: Set up compliance monitoring rules
        monitoring_rules = [
            {
                'rule_type': 'training_expiry',
                'threshold_days': 30,
                'notification_recipients': ['compliance@testcompany.com'],
                'is_active': True
            },
            {
                'rule_type': 'document_expiry',
                'threshold_days': 60,
                'notification_recipients': ['compliance@testcompany.com'],
                'is_active': True
            },
            {
                'rule_type': 'incident_reporting_delay',
                'threshold_hours': 24,
                'notification_recipients': ['compliance@testcompany.com'],
                'is_active': True
            }
        ]
        
        for rule in monitoring_rules:
            response = self.client.post('/api/v1/compliance/monitoring-rules/', rule, format='json')
            self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        
        # Step 2: Trigger compliance monitoring check
        response = self.client.post('/api/v1/compliance/run-monitoring-check/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        monitoring_result = response.json()
        self.assertIn('alerts_generated', monitoring_result)
        self.assertIn('compliance_score', monitoring_result)
        
        # Step 3: Review generated alerts
        response = self.client.get('/api/v1/compliance/alerts/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        alerts = response.json()['results']
        
        # Step 4: Verify alert notifications sent
        if alerts:
            self.assertTrue(E2ETestUtils.verify_email_sent('Compliance Alert'))
        
        # Step 5: Generate compliance dashboard data
        response = self.client.get('/api/v1/compliance/dashboard/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        dashboard = response.json()
        E2ETestUtils.assert_response_contains_fields(dashboard, [
            'overall_compliance_score', 'training_compliance', 'document_compliance',
            'incident_compliance', 'recent_alerts', 'compliance_trends'
        ])