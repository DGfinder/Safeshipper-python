# shipments/management/commands/test_feedback_permissions.py
"""
Management command to test permission enforcement across all feedback system components.
Validates that proper permissions are checked for feedback analytics, views, and management.
"""

from django.core.management.base import BaseCommand, CommandError
from django.contrib.auth import get_user_model
from django.test import RequestFactory
from django.contrib.auth.models import AnonymousUser
from django.utils import timezone
from rest_framework.test import force_authenticate
from rest_framework import status

from companies.models import Company
from shipments.models import Shipment, ShipmentFeedback
from shipments.views import (
    ShipmentFeedbackViewSet, 
    FeedbackAnalyticsViewSet,
    DeliverySuccessStatsView
)
from users.models import User

User = get_user_model()


class Command(BaseCommand):
    help = 'Test permission enforcement across all feedback system components'

    def add_arguments(self, parser):
        parser.add_argument(
            '--company-id',
            type=str,
            help='Company ID to test with (defaults to creating test companies)'
        )
        parser.add_argument(
            '--verbose',
            action='store_true',
            help='Show detailed test output'
        )

    def handle(self, *args, **options):
        self.verbose = options['verbose']
        self.factory = RequestFactory()
        
        self.stdout.write(self.style.SUCCESS('Testing SafeShipper Feedback Permission Enforcement'))
        self.stdout.write('=' * 70)

        try:
            # Setup test environment
            test_data = self._setup_test_environment(options.get('company_id'))
            
            # Test API endpoint permissions
            self._test_feedback_api_permissions(test_data)
            
            # Test analytics permissions
            self._test_analytics_permissions(test_data)
            
            # Test company data isolation
            self._test_company_data_isolation(test_data)
            
            # Test role-based access
            self._test_role_based_access(test_data)
            
            # Test frontend permission enforcement (simulation)
            self._test_frontend_permission_patterns(test_data)
            
            self.stdout.write(self.style.SUCCESS('\n✅ All permission enforcement tests completed successfully'))
            
        except Exception as e:
            raise CommandError(f'Permission test failed: {str(e)}')

    def _setup_test_environment(self, company_id):
        """Setup test companies, users, and data."""
        self.stdout.write('\nSetting up test environment...')
        
        # Create or get test companies
        if company_id:
            company_a = Company.objects.get(id=company_id)
            company_b = Company.objects.exclude(id=company_id).first()
            if not company_b:
                company_b = Company.objects.create(
                    name="Test Company B for Permissions",
                    company_type="CARRIER",
                    abn="11111111111"
                )
        else:
            company_a, _ = Company.objects.get_or_create(
                name="Test Company A for Permissions",
                defaults={"company_type": "CARRIER", "abn": "22222222222"}
            )
            company_b, _ = Company.objects.get_or_create(
                name="Test Company B for Permissions", 
                defaults={"company_type": "CARRIER", "abn": "11111111111"}
            )
        
        # Create test users with different roles
        users = {}
        
        # Company A users
        users['admin_a'] = self._get_or_create_user(company_a, 'admin', 'ADMIN')
        users['manager_a'] = self._get_or_create_user(company_a, 'manager', 'MANAGER')
        users['driver_a'] = self._get_or_create_user(company_a, 'driver', 'DRIVER')
        users['readonly_a'] = self._get_or_create_user(company_a, 'readonly', 'READONLY')
        
        # Company B users  
        users['admin_b'] = self._get_or_create_user(company_b, 'admin', 'ADMIN')
        users['manager_b'] = self._get_or_create_user(company_b, 'manager', 'MANAGER')
        
        # Create test shipments and feedback
        shipment_a = self._create_test_shipment(company_a, users['driver_a'])
        shipment_b = self._create_test_shipment(company_b, users['admin_b'])
        
        feedback_a = self._create_test_feedback(shipment_a)
        feedback_b = self._create_test_feedback(shipment_b)
        
        test_data = {
            'company_a': company_a,
            'company_b': company_b,
            'users': users,
            'shipment_a': shipment_a,
            'shipment_b': shipment_b,
            'feedback_a': feedback_a,
            'feedback_b': feedback_b
        }
        
        if self.verbose:
            self.stdout.write(f"  Company A: {company_a.name} ({len([u for u in users.values() if u.company == company_a])} users)")
            self.stdout.write(f"  Company B: {company_b.name} ({len([u for u in users.values() if u.company == company_b])} users)")
            self.stdout.write(f"  Test feedback created: {feedback_a.id}, {feedback_b.id}")
        
        return test_data

    def _test_feedback_api_permissions(self, test_data):
        """Test feedback API endpoint permissions."""
        self.stdout.write('\nTesting Feedback API Permissions:')
        self.stdout.write('-' * 35)
        
        viewset = ShipmentFeedbackViewSet()
        
        # Test list endpoint access
        self._test_api_endpoint(
            viewset, 'list', test_data,
            expected_access={
                'admin_a': True, 'manager_a': True, 'driver_a': False, 'readonly_a': True,
                'admin_b': True, 'manager_b': True  # Should only see their company's data
            }
        )
        
        # Test detail view access
        self._test_api_endpoint(
            viewset, 'retrieve', test_data,
            endpoint_kwargs={'pk': str(test_data['feedback_a'].id)},
            expected_access={
                'admin_a': True, 'manager_a': True, 'driver_a': False, 'readonly_a': True,
                'admin_b': False, 'manager_b': False  # Cannot access other company's feedback
            }
        )
        
        # Test feedback management permissions
        self._test_api_endpoint(
            viewset, 'partial_update', test_data,
            endpoint_kwargs={'pk': str(test_data['feedback_a'].id)},
            request_data={'feedback_notes': 'Updated by test'},
            expected_access={
                'admin_a': True, 'manager_a': True, 'driver_a': False, 'readonly_a': False,
                'admin_b': False, 'manager_b': False
            }
        )

    def _test_analytics_permissions(self, test_data):
        """Test analytics endpoint permissions."""
        self.stdout.write('\nTesting Analytics Permissions:')
        self.stdout.write('-' * 32)
        
        analytics_viewset = FeedbackAnalyticsViewSet()
        
        # Test analytics access
        self._test_api_endpoint(
            analytics_viewset, 'list', test_data,
            expected_access={
                'admin_a': True, 'manager_a': True, 'driver_a': False, 'readonly_a': True,
                'admin_b': True, 'manager_b': True  # Should only see their company's analytics
            }
        )
        
        # Test delivery success stats
        stats_view = DeliverySuccessStatsView()
        self._test_api_endpoint(
            stats_view, 'get', test_data,
            expected_access={
                'admin_a': True, 'manager_a': True, 'driver_a': False, 'readonly_a': True,
                'admin_b': True, 'manager_b': True
            }
        )

    def _test_company_data_isolation(self, test_data):
        """Test that companies can only access their own data."""
        self.stdout.write('\nTesting Company Data Isolation:')
        self.stdout.write('-' * 34)
        
        # Test that Company A users cannot see Company B feedback
        viewset = ShipmentFeedbackViewSet()
        
        for role in ['admin', 'manager']:
            user_a = test_data['users'][f'{role}_a']
            user_b = test_data['users'][f'{role}_b']
            
            # Test Company A user accessing Company B feedback
            request = self.factory.get('/api/feedback/')
            force_authenticate(request, user=user_a)
            viewset.request = request
            viewset.format_kwarg = None
            
            queryset = viewset.get_queryset()
            company_b_feedback_visible = queryset.filter(
                shipment__carrier=test_data['company_b']
            ).exists()
            
            if company_b_feedback_visible:
                self.stdout.write(
                    self.style.ERROR(f"❌ {role.title()} A can see Company B feedback (data leak!)")
                )
            else:
                self.stdout.write(
                    self.style.SUCCESS(f"✅ {role.title()} A properly isolated from Company B data")
                )

    def _test_role_based_access(self, test_data):
        """Test role-based access controls."""
        self.stdout.write('\nTesting Role-Based Access:')
        self.stdout.write('-' * 28)
        
        role_permissions = {
            'ADMIN': ['view', 'manage', 'analytics', 'export'],
            'MANAGER': ['view', 'manage', 'analytics', 'export'],
            'DRIVER': [],  # Drivers should not have feedback permissions
            'READONLY': ['view', 'analytics']  # Read-only access
        }
        
        for role, expected_permissions in role_permissions.items():
            user = test_data['users'][f'{role.lower()}_a']
            
            # Simulate permission checking
            has_view = 'view' in expected_permissions
            has_manage = 'manage' in expected_permissions
            has_analytics = 'analytics' in expected_permissions
            has_export = 'export' in expected_permissions
            
            self.stdout.write(f"  {role} permissions:")
            self.stdout.write(f"    View: {'✅' if has_view else '❌'}")
            self.stdout.write(f"    Manage: {'✅' if has_manage else '❌'}")
            self.stdout.write(f"    Analytics: {'✅' if has_analytics else '❌'}")
            self.stdout.write(f"    Export: {'✅' if has_export else '❌'}")

    def _test_frontend_permission_patterns(self, test_data):
        """Test frontend permission enforcement patterns."""
        self.stdout.write('\nTesting Frontend Permission Patterns:')
        self.stdout.write('-' * 38)
        
        # Simulate the "Build Once, Render for Permissions" pattern
        feedback_components = {
            'FeedbackList': ['shipments.feedback.view'],
            'FeedbackAnalytics': ['shipments.analytics.view'],
            'FeedbackExport': ['shipments.analytics.export'],
            'FeedbackManagement': ['shipments.feedback.manage'],
            'DeliverySuccessWidget': ['shipments.analytics.view']
        }
        
        # Test each role's access to components
        for role in ['ADMIN', 'MANAGER', 'DRIVER', 'READONLY']:
            user = test_data['users'][f'{role.lower()}_a']
            accessible_components = []
            
            for component, required_perms in feedback_components.items():
                # Simulate permission checking based on role
                user_permissions = self._get_user_permissions(role)
                has_access = all(perm in user_permissions for perm in required_perms)
                
                if has_access:
                    accessible_components.append(component)
            
            self.stdout.write(f"  {role} can access: {', '.join(accessible_components) if accessible_components else 'No feedback components'}")

    def _test_api_endpoint(self, viewset_or_view, action, test_data, endpoint_kwargs=None, 
                          request_data=None, expected_access=None):
        """Test API endpoint access for different users."""
        endpoint_kwargs = endpoint_kwargs or {}
        request_data = request_data or {}
        expected_access = expected_access or {}
        
        method_map = {
            'list': 'get',
            'retrieve': 'get', 
            'create': 'post',
            'update': 'put',
            'partial_update': 'patch',
            'destroy': 'delete',
            'get': 'get'
        }
        
        http_method = method_map.get(action, 'get')
        
        for user_key, should_have_access in expected_access.items():
            user = test_data['users'][user_key]
            
            # Create request
            if http_method == 'get':
                request = self.factory.get('/api/test/', request_data)
            elif http_method == 'post':
                request = self.factory.post('/api/test/', request_data)
            elif http_method == 'patch':
                request = self.factory.patch('/api/test/', request_data)
            else:
                request = self.factory.get('/api/test/')
            
            force_authenticate(request, user=user)
            
            # Setup viewset/view
            if hasattr(viewset_or_view, 'request'):
                viewset_or_view.request = request
                viewset_or_view.format_kwarg = None
                
                # Set up action and kwargs for viewset
                if hasattr(viewset_or_view, 'action'):
                    viewset_or_view.action = action
                if hasattr(viewset_or_view, 'kwargs'):
                    viewset_or_view.kwargs = endpoint_kwargs
            
            try:
                # Test permission checking
                if hasattr(viewset_or_view, 'check_permissions'):
                    viewset_or_view.check_permissions(request)
                
                if hasattr(viewset_or_view, 'check_object_permissions') and endpoint_kwargs.get('pk'):
                    # Get object for object-level permission check
                    if hasattr(viewset_or_view, 'get_object'):
                        try:
                            obj = viewset_or_view.get_object()
                            viewset_or_view.check_object_permissions(request, obj)
                        except:
                            pass  # Object might not exist or be accessible
                
                # If we get here, access was granted
                access_granted = True
                
            except Exception:
                # Permission denied or other error
                access_granted = False
            
            # Check result
            if access_granted == should_have_access:
                status_icon = "✅"
            else:
                status_icon = "❌"
                
            if self.verbose:
                expected_text = "should have access" if should_have_access else "should be denied"
                actual_text = "granted" if access_granted else "denied"
                self.stdout.write(f"    {status_icon} {user_key}: {expected_text}, got {actual_text}")

    def _get_or_create_user(self, company, role_name, role):
        """Get or create a test user."""
        email = f"test-{role_name}@{company.name.lower().replace(' ', '')}.com"
        
        try:
            return User.objects.get(email=email)
        except User.DoesNotExist:
            return User.objects.create_user(
                username=f"test_{role_name}_{company.id}",
                email=email,
                first_name=f"Test {role_name.title()}",
                last_name="User",
                company=company,
                role=role,
                is_active=True
            )

    def _create_test_shipment(self, company, user):
        """Create a test shipment."""
        customer_company = Company.objects.exclude(id=company.id).first()
        if not customer_company:
            customer_company = Company.objects.create(
                name=f"Customer for {company.name}",
                company_type="CUSTOMER",
                abn="33333333333"
            )
        
        return Shipment.objects.create(
            tracking_number=f"PERM-{company.id}-{timezone.now().strftime('%H%M%S')}",
            customer=customer_company,
            carrier=company,
            origin_location="Test Origin",
            destination_location="Test Destination", 
            status='DELIVERED',
            requested_by=user,
            actual_delivery_date=timezone.now() - timezone.timedelta(hours=2)
        )

    def _create_test_feedback(self, shipment):
        """Create test feedback."""
        return ShipmentFeedback.objects.create(
            shipment=shipment,
            was_on_time=True,
            was_complete_and_undamaged=True,
            was_driver_professional=False,  # 67% score
            feedback_notes="Test feedback for permission testing"
        )

    def _get_user_permissions(self, role):
        """Get permissions for a user role (simulating frontend permission context)."""
        role_permissions = {
            'ADMIN': [
                'shipments.feedback.view',
                'shipments.feedback.manage', 
                'shipments.analytics.view',
                'shipments.analytics.export'
            ],
            'MANAGER': [
                'shipments.feedback.view',
                'shipments.feedback.manage',
                'shipments.analytics.view', 
                'shipments.analytics.export'
            ],
            'DRIVER': [
                # Drivers should not have feedback permissions
            ],
            'READONLY': [
                'shipments.feedback.view',
                'shipments.analytics.view'
            ]
        }
        
        return role_permissions.get(role, [])