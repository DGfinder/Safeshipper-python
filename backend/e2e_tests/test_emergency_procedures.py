# e2e_tests/test_emergency_procedures.py
"""
End-to-end tests for emergency procedures and incident response in SafeShipper.
Tests emergency response workflows, incident management, and safety protocols.
"""

from datetime import datetime, timedelta
from django.test import override_settings
from django.core import mail
from rest_framework import status
from .utils import BaseE2ETestCase, E2ETestUtils


class EmergencyProcedureE2ETests(BaseE2ETestCase):
    """
    End-to-end tests for emergency procedures and incident response.
    """
    
    def test_complete_emergency_response_workflow(self):
        """
        Test complete emergency response workflow from incident detection to resolution.
        
        Workflow:
        1. Driver detects emergency situation
        2. Driver reports incident through mobile app
        3. System triggers emergency response protocols
        4. Emergency coordinator receives alerts
        5. Emergency procedures are accessed and followed
        6. Incident is managed through resolution
        7. Post-incident compliance reporting
        """
        # Step 1: Driver detects emergency during transport
        self.authenticate_as('driver')
        
        # First create a shipment in transit
        self.authenticate_as('dispatcher')
        shipment_data = E2ETestUtils.create_test_shipment_data(['UN1203'])
        response = self.client.post('/api/v1/shipments/', shipment_data, format='json')
        shipment_id = response.json()['id']
        
        # Assign to driver and start transit
        assignment_data = {
            'assigned_driver': self.test_users['driver'].id,
            'assigned_vehicle': self.test_vehicles[0].id,
            'status': 'in_transit'
        }
        self.client.patch(f'/api/v1/shipments/{shipment_id}/', assignment_data, format='json')
        
        # Step 2: Driver reports emergency incident
        self.authenticate_as('driver')
        
        emergency_incident_data = {
            'title': 'Dangerous Goods Spill - Highway Emergency',
            'description': 'Gasoline spill occurred during transport due to container failure',
            'incident_type': 'spill',
            'severity': 'high',
            'is_emergency': True,
            'related_shipment': shipment_id,
            'location': {
                'latitude': 40.7128,
                'longitude': -74.0060,
                'address': 'I-95 Northbound, Mile Marker 23',
                'landmark': 'Near Exit 23 - Industrial Park'
            },
            'dangerous_goods_involved': [
                {
                    'un_number': 'UN1203',
                    'estimated_quantity': 50,
                    'unit': 'L',
                    'container_type': 'steel_drum',
                    'spill_extent': 'approximately 10 square meters'
                }
            ],
            'environmental_conditions': {
                'weather': 'clear',
                'temperature': 22,
                'wind_speed': 15,
                'wind_direction': 'northwest',
                'precipitation': False
            },
            'immediate_actions_taken': [
                'traffic_diverted',
                'area_secured',
                'emergency_services_contacted'
            ],
            'reported_by': 'Mobile Driver App',
            'contact_phone': '+1-555-0123',
            'emergency_services_contacted': True,
            'injuries_reported': False
        }
        
        response = self.client.post('/api/v1/incidents/', emergency_incident_data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        incident_id = response.json()['id']
        
        # Step 3: System triggers emergency response protocols
        
        # Get emergency procedures for gasoline spill
        response = self.client.get('/api/v1/emergency-procedures/quick-reference/', {
            'hazard_class': '3',
            'incident_type': 'spill',
            'severity': 'high'
        })
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        emergency_procedures = response.json()
        E2ETestUtils.assert_response_contains_fields(emergency_procedures, [
            'immediate_actions', 'emergency_contacts', 'containment_procedures',
            'evacuation_procedures', 'notification_requirements'
        ])
        
        # Get emergency contact information
        response = self.client.get('/api/v1/emergency-procedures/contacts/', {
            'location': 'current',
            'service_type': 'hazmat',
            'urgency': 'emergency'
        })
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        emergency_contacts = response.json()
        self.assertIn('contacts', emergency_contacts)
        self.assertGreater(len(emergency_contacts['contacts']), 0)
        
        # Step 4: Emergency coordinator receives and responds to alerts
        self.authenticate_as('admin')  # Admin acts as emergency coordinator
        
        # Check emergency alerts
        response = self.client.get('/api/v1/incidents/emergency-alerts/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        alerts = response.json()['results']
        emergency_alert = next((a for a in alerts if a['incident_id'] == incident_id), None)
        self.assertIsNotNone(emergency_alert)
        self.assertEqual(emergency_alert['severity'], 'high')
        
        # Acknowledge emergency and start response
        response = self.client.post(f'/api/v1/incidents/{incident_id}/start-response/', {
            'response_team': [
                self.test_users['admin'].id,
                self.test_users['compliance'].id
            ],
            'estimated_response_time': 30,  # minutes
            'response_strategy': 'containment_and_cleanup',
            'resource_requirements': [
                'hazmat_team',
                'containment_equipment',
                'cleanup_materials'
            ]
        })
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Step 5: Access and follow emergency procedures
        
        # Get detailed response procedures
        response = self.client.get(f'/api/v1/emergency-procedures/response-plan/', {
            'incident_id': incident_id,
            'dangerous_goods': 'UN1203',
            'incident_type': 'spill'
        })
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        response_plan = response.json()
        E2ETestUtils.assert_response_contains_fields(response_plan, [
            'response_steps', 'safety_precautions', 'equipment_required',
            'personnel_requirements', 'regulatory_notifications'
        ])
        
        # Execute response steps
        for step_number, step in enumerate(response_plan['response_steps'][:3], 1):
            step_completion = {
                'step_number': step_number,
                'description': step['description'],
                'completed_by': self.test_users['admin'].id,
                'completion_timestamp': datetime.now().isoformat(),
                'notes': f'Step {step_number} completed as per procedure',
                'verification_method': 'visual_inspection'
            }
            
            response = self.client.post(
                f'/api/v1/incidents/{incident_id}/response-steps/',
                step_completion,
                format='json'
            )
            self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        
        # Step 6: Manage incident through resolution
        
        # Update incident status throughout response
        status_updates = [
            ('responding', 'Emergency response team deployed'),
            ('contained', 'Spill contained, cleanup in progress'),
            ('under_control', 'Immediate danger eliminated'),
            ('resolved', 'Cleanup completed, area secured')
        ]
        
        for new_status, notes in status_updates:
            update_data = {
                'status': new_status,
                'response_notes': notes,
                'updated_by': self.test_users['admin'].id
            }
            
            response = self.client.patch(
                f'/api/v1/incidents/{incident_id}/',
                update_data,
                format='json'
            )
            self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Complete incident with final assessment
        completion_data = {
            'resolution_timestamp': datetime.now().isoformat(),
            'final_assessment': {
                'environmental_impact': 'minimal',
                'cleanup_status': 'complete',
                'regulatory_notifications_sent': True,
                'lessons_learned': 'Container inspection protocols should be enhanced',
                'preventive_actions': 'Additional container integrity checks implemented'
            },
            'cost_assessment': {
                'cleanup_cost': 15000.00,
                'equipment_cost': 2500.00,
                'regulatory_fines': 0.00,
                'total_cost': 17500.00
            }
        }
        
        response = self.client.patch(
            f'/api/v1/incidents/{incident_id}/complete/',
            completion_data,
            format='json'
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Step 7: Post-incident compliance reporting
        self.authenticate_as('compliance')
        
        # Generate incident compliance report
        response = self.client.get(f'/api/v1/incidents/{incident_id}/compliance-report/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response['Content-Type'], 'application/pdf')
        
        # Generate regulatory notification documents
        response = self.client.post(f'/api/v1/incidents/{incident_id}/regulatory-notifications/', {
            'agencies': ['EPA', 'DOT', 'state_environmental'],
            'notification_type': 'final_report',
            'include_photos': True,
            'include_witness_statements': True
        })
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        
        # Verify email notifications were sent
        self.assertTrue(E2ETestUtils.verify_email_sent('Emergency Incident'))
        self.assertTrue(E2ETestUtils.verify_email_sent('Incident Resolved'))
    
    def test_emergency_evacuation_workflow(self):
        """
        Test emergency evacuation procedures and coordination.
        """
        # Create high-severity incident requiring evacuation
        self.authenticate_as('driver')
        
        evacuation_incident_data = {
            'title': 'Chemical Fire - Immediate Evacuation Required',
            'description': 'Chemical fire involving multiple dangerous goods containers',
            'incident_type': 'fire',
            'severity': 'critical',
            'is_emergency': True,
            'evacuation_required': True,
            'location': {
                'latitude': 40.7589,
                'longitude': -73.9851,
                'address': '123 Industrial Boulevard, Warehouse District',
                'landmark': 'Chemical Storage Facility'
            },
            'dangerous_goods_involved': [
                {
                    'un_number': 'UN1203',
                    'estimated_quantity': 500,
                    'unit': 'L'
                },
                {
                    'un_number': 'UN1993',
                    'estimated_quantity': 200,
                    'unit': 'L'
                }
            ],
            'evacuation_radius': 500,  # meters
            'estimated_people_affected': 150,
            'emergency_services_contacted': True
        }
        
        response = self.client.post('/api/v1/incidents/', evacuation_incident_data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        incident_id = response.json()['id']
        
        # Get evacuation procedures
        response = self.client.get('/api/v1/emergency-procedures/evacuation/', {
            'incident_id': incident_id,
            'hazard_classes': '3',
            'evacuation_radius': 500
        })
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        evacuation_plan = response.json()
        E2ETestUtils.assert_response_contains_fields(evacuation_plan, [
            'evacuation_zones', 'assembly_points', 'evacuation_routes',
            'notification_procedures', 'resource_requirements'
        ])
        
        # Execute evacuation coordination
        self.authenticate_as('admin')
        
        evacuation_execution = {
            'evacuation_initiated': True,
            'evacuation_start_time': datetime.now().isoformat(),
            'evacuation_coordinator': self.test_users['admin'].id,
            'assembly_points_activated': evacuation_plan['assembly_points'],
            'emergency_services_notified': ['fire_department', 'police', 'ems', 'hazmat'],
            'public_notifications_sent': True
        }
        
        response = self.client.post(
            f'/api/v1/incidents/{incident_id}/initiate-evacuation/',
            evacuation_execution,
            format='json'
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Monitor evacuation progress
        response = self.client.get(f'/api/v1/incidents/{incident_id}/evacuation-status/')
        evacuation_status = response.json()
        
        E2ETestUtils.assert_response_contains_fields(evacuation_status, [
            'evacuation_progress', 'people_evacuated', 'assembly_point_status',
            'outstanding_areas', 'estimated_completion'
        ])
    
    def test_emergency_communication_workflow(self):
        """
        Test emergency communication and notification systems.
        """
        # Create emergency incident
        self.authenticate_as('driver')
        
        communication_incident_data = {
            'title': 'Toxic Gas Leak - Public Safety Alert',
            'description': 'Toxic gas leak requiring public safety notifications',
            'incident_type': 'gas_leak',
            'severity': 'high',
            'is_emergency': True,
            'public_safety_threat': True,
            'location': {
                'latitude': 40.6782,
                'longitude': -73.9442,
                'address': 'Port Industrial Area'
            },
            'dangerous_goods_involved': [
                {
                    'un_number': 'UN1017',  # Chlorine
                    'estimated_quantity': 100,
                    'unit': 'KG'
                }
            ]
        }
        
        response = self.client.post('/api/v1/incidents/', communication_incident_data, format='json')
        incident_id = response.json()['id']
        
        # Test emergency notification system
        self.authenticate_as('admin')
        
        # Send emergency alerts to stakeholders
        alert_data = {
            'alert_type': 'public_safety',
            'priority': 'critical',
            'recipients': ['emergency_responders', 'local_authorities', 'affected_community'],
            'message': 'Toxic gas leak reported. Avoid the area. Emergency responders on scene.',
            'channels': ['sms', 'email', 'push_notification', 'radio'],
            'geographic_scope': {
                'radius_km': 2,
                'center_lat': 40.6782,
                'center_lon': -73.9442
            }
        }
        
        response = self.client.post(
            f'/api/v1/incidents/{incident_id}/emergency-alerts/',
            alert_data,
            format='json'
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        
        # Test media communication
        media_release_data = {
            'release_type': 'emergency_public_statement',
            'title': 'Public Safety Alert - Industrial Area Incident',
            'content': 'Authorities are responding to an industrial incident. Public advised to avoid the area.',
            'spokesperson': 'Emergency Coordinator',
            'distribution_channels': ['local_news', 'social_media', 'government_website'],
            'follow_up_scheduled': True
        }
        
        response = self.client.post(
            f'/api/v1/incidents/{incident_id}/media-releases/',
            media_release_data,
            format='json'
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        
        # Verify notifications sent
        self.assertTrue(E2ETestUtils.verify_email_sent('Emergency Alert'))
    
    def test_emergency_resource_coordination(self):
        """
        Test emergency resource coordination and logistics.
        """
        # Create incident requiring specialized resources
        self.authenticate_as('admin')
        
        resource_incident_data = {
            'title': 'Multi-Vehicle Dangerous Goods Collision',
            'description': 'Multiple vehicles carrying dangerous goods involved in collision',
            'incident_type': 'transport_accident',
            'severity': 'critical',
            'is_emergency': True,
            'multiple_vehicles': True,
            'location': {
                'latitude': 40.7400,
                'longitude': -73.9900,
                'address': 'Highway 95, Mile Marker 45'
            },
            'vehicles_involved': [
                {
                    'vehicle_id': self.test_vehicles[0].id,
                    'dangerous_goods': ['UN1203', 'UN1993'],
                    'damage_assessment': 'severe'
                },
                {
                    'vehicle_type': 'tanker',
                    'dangerous_goods': ['UN1017'],
                    'damage_assessment': 'moderate'
                }
            ]
        }
        
        response = self.client.post('/api/v1/incidents/', resource_incident_data, format='json')
        incident_id = response.json()['id']
        
        # Assess resource requirements
        response = self.client.get(f'/api/v1/emergency-procedures/resource-assessment/', {
            'incident_id': incident_id,
            'dangerous_goods': 'UN1203,UN1993,UN1017',
            'incident_type': 'transport_accident'
        })
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        resource_assessment = response.json()
        E2ETestUtils.assert_response_contains_fields(resource_assessment, [
            'required_equipment', 'specialized_teams', 'estimated_response_time',
            'coordination_requirements', 'logistical_needs'
        ])
        
        # Coordinate emergency resources
        resource_coordination = {
            'incident_commander': self.test_users['admin'].id,
            'response_teams': [
                {
                    'team_type': 'hazmat',
                    'estimated_arrival': (datetime.now() + timedelta(minutes=20)).isoformat(),
                    'capabilities': ['chemical_detection', 'containment', 'decontamination']
                },
                {
                    'team_type': 'fire_rescue',
                    'estimated_arrival': (datetime.now() + timedelta(minutes=15)).isoformat(),
                    'capabilities': ['fire_suppression', 'rescue_operations', 'medical_support']
                }
            ],
            'equipment_deployed': [
                'hazmat_suits',
                'containment_equipment',
                'decontamination_units',
                'air_monitoring_equipment'
            ],
            'logistics_requirements': {
                'staging_area': 'Highway Rest Stop Mile 44',
                'medical_facility': 'Regional Medical Center',
                'evacuation_routes': ['Highway 95 South', 'Local Route 15']
            }
        }
        
        response = self.client.post(
            f'/api/v1/incidents/{incident_id}/coordinate-resources/',
            resource_coordination,
            format='json'
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Track resource deployment
        response = self.client.get(f'/api/v1/incidents/{incident_id}/resource-status/')
        resource_status = response.json()
        
        E2ETestUtils.assert_response_contains_fields(resource_status, [
            'deployed_teams', 'equipment_status', 'logistical_status',
            'coordination_effectiveness', 'resource_utilization'
        ])
    
    def test_emergency_procedure_mobile_access(self):
        """
        Test emergency procedure access from mobile devices in field conditions.
        """
        # Simulate driver accessing emergency procedures from mobile
        self.authenticate_as('driver')
        
        # Test offline-capable emergency procedure lookup
        response = self.client.get('/api/v1/emergency-procedures/mobile/quick-access/', {
            'un_numbers': 'UN1203,UN3480',
            'location': 'current',
            'offline_mode': True
        })
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        mobile_procedures = response.json()
        E2ETestUtils.assert_response_contains_fields(mobile_procedures, [
            'immediate_actions', 'safety_distances', 'emergency_contacts',
            'first_aid_procedures', 'offline_resources'
        ])
        
        # Test emergency contact quick dial
        response = self.client.get('/api/v1/emergency-procedures/mobile/contacts/', {
            'location_lat': 40.7128,
            'location_lon': -74.0060,
            'emergency_type': 'spill'
        })
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        quick_contacts = response.json()
        self.assertIn('emergency_services', quick_contacts)
        self.assertIn('hazmat_specialists', quick_contacts)
        
        # Test procedure checklist for mobile use
        response = self.client.get('/api/v1/emergency-procedures/mobile/checklist/', {
            'incident_type': 'spill',
            'dangerous_goods': 'UN1203'
        })
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        mobile_checklist = response.json()
        E2ETestUtils.assert_response_contains_fields(mobile_checklist, [
            'safety_checks', 'immediate_actions', 'notification_steps',
            'containment_steps', 'documentation_requirements'
        ])
        
        # Simulate driver completing checklist items
        for item in mobile_checklist['immediate_actions'][:3]:
            completion_data = {
                'checklist_item_id': item['id'],
                'completed': True,
                'completion_timestamp': datetime.now().isoformat(),
                'notes': f'Completed: {item["description"]}',
                'location': E2ETestUtils.simulate_mobile_location_update(40.7128, -74.0060)
            }
            
            response = self.client.post(
                '/api/v1/emergency-procedures/mobile/checklist-completion/',
                completion_data,
                format='json'
            )
            self.assertEqual(response.status_code, status.HTTP_201_CREATED)
    
    @override_settings(CELERY_TASK_ALWAYS_EAGER=True)
    def test_emergency_notification_system_performance(self):
        """
        Test emergency notification system performance and reliability.
        """
        # Create critical emergency incident
        self.authenticate_as('driver')
        
        critical_incident_data = {
            'title': 'Critical Emergency - Immediate Response Required',
            'description': 'Critical dangerous goods emergency requiring immediate response',
            'incident_type': 'explosion',
            'severity': 'critical',
            'is_emergency': True,
            'immediate_threat_to_life': True,
            'location': {
                'latitude': 40.7200,
                'longitude': -74.0000,
                'address': 'Critical Infrastructure Facility'
            }
        }
        
        start_time = datetime.now()
        
        response = self.client.post('/api/v1/incidents/', critical_incident_data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        incident_id = response.json()['id']
        
        # Measure notification response time
        notification_time = datetime.now() - start_time
        
        # Verify rapid notification (should be under 30 seconds)
        self.assertLess(notification_time.total_seconds(), 30)
        
        # Verify emergency alerts generated
        self.authenticate_as('admin')
        
        response = self.client.get('/api/v1/incidents/emergency-alerts/')
        alerts = response.json()['results']
        
        critical_alert = next((a for a in alerts if a['incident_id'] == incident_id), None)
        self.assertIsNotNone(critical_alert)
        self.assertEqual(critical_alert['priority'], 'critical')
        
        # Verify multi-channel notifications sent
        self.assertTrue(E2ETestUtils.verify_email_sent('CRITICAL EMERGENCY'))
        
        # Test notification delivery confirmation
        response = self.client.get(f'/api/v1/incidents/{incident_id}/notification-status/')
        notification_status = response.json()
        
        E2ETestUtils.assert_response_contains_fields(notification_status, [
            'notifications_sent', 'delivery_confirmations', 'failed_deliveries',
            'response_acknowledgments'
        ])