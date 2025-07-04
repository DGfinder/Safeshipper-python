# users/tests/test_api.py
import json
from django.test import TestCase
from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework.test import APITestCase, APIClient
from rest_framework import status
from rest_framework_simplejwt.tokens import RefreshToken
from django.core.exceptions import ValidationError, PermissionDenied
from ..services import create_user_account, update_user_profile

User = get_user_model()

class AuthenticationAPITests(APITestCase):
    """Test authentication endpoints including JWT login/logout and me endpoint"""
    
    def setUp(self):
        self.client = APIClient()
        
        # Create test users with different roles
        self.admin_user = User.objects.create_user(
            username='admin_test',
            email='admin@test.com',
            password='SecurePass123!',
            role=User.Role.ADMIN,
            is_staff=True,
            is_active=True
        )
        
        self.dispatcher_user = User.objects.create_user(
            username='dispatcher_test',
            email='dispatcher@test.com',
            password='SecurePass123!',
            role=User.Role.DISPATCHER,
            is_active=True
        )
        
        self.driver_user = User.objects.create_user(
            username='driver_test',
            email='driver@test.com',
            password='SecurePass123!',
            role=User.Role.DRIVER,
            is_active=True
        )
        
        self.inactive_user = User.objects.create_user(
            username='inactive_test',
            email='inactive@test.com',
            password='SecurePass123!',
            role=User.Role.DRIVER,
            is_active=False
        )

    def test_login_with_valid_credentials(self):
        """Test successful login with valid email and password returns JWT token"""
        url = reverse('auth_login')
        data = {
            'email': 'admin@test.com',
            'password': 'SecurePass123!'
        }
        
        response = self.client.post(url, data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('access_token', response.data)
        self.assertIn('refresh_token', response.data)
        self.assertIn('user', response.data)
        self.assertEqual(response.data['user']['email'], 'admin@test.com')
        self.assertEqual(response.data['user']['role'], User.Role.ADMIN)
        self.assertEqual(response.data['message'], 'Login successful')

    def test_login_with_invalid_email(self):
        """Test login fails with non-existent email"""
        url = reverse('auth_login')
        data = {
            'email': 'nonexistent@test.com',
            'password': 'SecurePass123!'
        }
        
        response = self.client.post(url, data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(response.data['error'], 'Invalid email or password')

    def test_login_with_invalid_password(self):
        """Test login fails with incorrect password"""
        url = reverse('auth_login')
        data = {
            'email': 'admin@test.com',
            'password': 'WrongPassword123!'
        }
        
        response = self.client.post(url, data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(response.data['error'], 'Invalid email or password')

    def test_login_with_inactive_account(self):
        """Test login fails with inactive account"""
        url = reverse('auth_login')
        data = {
            'email': 'inactive@test.com',
            'password': 'SecurePass123!'
        }
        
        response = self.client.post(url, data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(response.data['error'], 'Account is disabled')

    def test_login_missing_credentials(self):
        """Test login fails when email or password is missing"""
        url = reverse('auth_login')
        
        # Missing password
        response = self.client.post(url, {'email': 'admin@test.com'}, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.data['error'], 'Email and password are required')
        
        # Missing email
        response = self.client.post(url, {'password': 'SecurePass123!'}, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.data['error'], 'Email and password are required')

    def test_me_endpoint_authenticated_user(self):
        """Test /me endpoint returns current user profile for authenticated user"""
        self.client.force_authenticate(user=self.dispatcher_user)
        url = reverse('auth_me')
        
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['email'], 'dispatcher@test.com')
        self.assertEqual(response.data['username'], 'dispatcher_test')
        self.assertEqual(response.data['role'], User.Role.DISPATCHER)

    def test_me_endpoint_unauthenticated_user(self):
        """Test /me endpoint fails for unauthenticated user"""
        url = reverse('auth_me')
        
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_logout_with_valid_refresh_token(self):
        """Test logout endpoint blacklists refresh token"""
        # First login to get tokens
        refresh = RefreshToken.for_user(self.admin_user)
        self.client.force_authenticate(user=self.admin_user)
        
        url = reverse('auth_logout')
        data = {'refresh_token': str(refresh)}
        
        response = self.client.post(url, data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['message'], 'Logout successful')

    def test_logout_without_token(self):
        """Test logout still succeeds even without refresh token"""
        self.client.force_authenticate(user=self.admin_user)
        url = reverse('auth_logout')
        
        response = self.client.post(url, {}, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['message'], 'Logout completed')


class UserManagementAPITests(APITestCase):
    """Test user CRUD operations and role-based permissions"""
    
    def setUp(self):
        self.client = APIClient()
        
        # Create test users
        self.admin_user = User.objects.create_user(
            username='admin_user',
            email='admin@example.com',
            password='AdminPass123!',
            role=User.Role.ADMIN,
            is_staff=True,
            is_active=True
        )
        
        self.dispatcher_user = User.objects.create_user(
            username='dispatcher_user',
            email='dispatcher@example.com',
            password='DispatcherPass123!',
            role=User.Role.DISPATCHER,
            is_active=True
        )
        
        self.driver_user = User.objects.create_user(
            username='driver_user',
            email='driver@example.com',
            password='DriverPass123!',
            role=User.Role.DRIVER,
            is_active=True
        )
        
        self.compliance_user = User.objects.create_user(
            username='compliance_user',
            email='compliance@example.com',
            password='CompliancePass123!',
            role=User.Role.COMPLIANCE_OFFICER,
            is_active=True
        )
        
        # Sample user creation payload
        self.new_user_payload = {
            'username': 'new_test_user',
            'email': 'newuser@example.com',
            'password': 'NewUserPass123!',
            'password2': 'NewUserPass123!',
            'first_name': 'Test',
            'last_name': 'User',
            'role': User.Role.DRIVER,
            'is_active': True
        }

    def test_admin_can_list_all_users(self):
        """Test that ADMIN users can see all users in the system"""
        self.client.force_authenticate(user=self.admin_user)
        url = reverse('user-list')
        
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        # Should see all 4 users created in setUp
        self.assertEqual(len(response.data), 4)
        
        # Verify all user roles are represented
        user_roles = [user['role'] for user in response.data]
        self.assertIn(User.Role.ADMIN, user_roles)
        self.assertIn(User.Role.DISPATCHER, user_roles)
        self.assertIn(User.Role.DRIVER, user_roles)
        self.assertIn(User.Role.COMPLIANCE_OFFICER, user_roles)

    def test_non_admin_cannot_list_users(self):
        """Test that non-ADMIN users get 403 Forbidden when trying to list users"""
        for user in [self.dispatcher_user, self.driver_user, self.compliance_user]:
            with self.subTest(user=user):
                self.client.force_authenticate(user=user)
                url = reverse('user-list')
                
                response = self.client.get(url)
                
                self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_admin_can_create_new_user(self):
        """Test that ADMIN users can create new users with any role"""
        self.client.force_authenticate(user=self.admin_user)
        url = reverse('user-list')
        
        response = self.client.post(url, self.new_user_payload, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['username'], 'new_test_user')
        self.assertEqual(response.data['email'], 'newuser@example.com')
        self.assertEqual(response.data['role'], User.Role.DRIVER)
        
        # Verify user was actually created in database
        new_user = User.objects.get(username='new_test_user')
        self.assertEqual(new_user.email, 'newuser@example.com')
        self.assertTrue(new_user.check_password('NewUserPass123!'))

    def test_non_admin_cannot_create_user(self):
        """Test that non-ADMIN users cannot create new users"""
        for user in [self.dispatcher_user, self.driver_user, self.compliance_user]:
            with self.subTest(user=user):
                self.client.force_authenticate(user=user)
                url = reverse('user-list')
                
                response = self.client.post(url, self.new_user_payload, format='json')
                
                self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_admin_can_create_privileged_user(self):
        """Test that ADMIN users can create users with privileged roles"""
        self.client.force_authenticate(user=self.admin_user)
        url = reverse('user-list')
        
        privileged_payload = self.new_user_payload.copy()
        privileged_payload.update({
            'username': 'new_admin_user',
            'email': 'newadmin@example.com',
            'role': User.Role.ADMIN,
            'is_staff': True
        })
        
        response = self.client.post(url, privileged_payload, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['role'], User.Role.ADMIN)

    def test_user_can_retrieve_own_profile(self):
        """Test that any authenticated user can retrieve their own profile"""
        for user in [self.admin_user, self.dispatcher_user, self.driver_user]:
            with self.subTest(user=user):
                self.client.force_authenticate(user=user)
                url = reverse('user-detail', kwargs={'pk': user.pk})
                
                response = self.client.get(url)
                
                self.assertEqual(response.status_code, status.HTTP_200_OK)
                self.assertEqual(response.data['username'], user.username)
                self.assertEqual(response.data['email'], user.email)

    def test_admin_can_retrieve_any_user_profile(self):
        """Test that ADMIN users can retrieve any user's profile"""
        self.client.force_authenticate(user=self.admin_user)
        
        for target_user in [self.dispatcher_user, self.driver_user, self.compliance_user]:
            with self.subTest(target_user=target_user):
                url = reverse('user-detail', kwargs={'pk': target_user.pk})
                
                response = self.client.get(url)
                
                self.assertEqual(response.status_code, status.HTTP_200_OK)
                self.assertEqual(response.data['username'], target_user.username)

    def test_non_admin_cannot_retrieve_other_user_profile(self):
        """Test that non-ADMIN users cannot retrieve other users' profiles"""
        self.client.force_authenticate(user=self.dispatcher_user)
        url = reverse('user-detail', kwargs={'pk': self.driver_user.pk})
        
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_user_can_update_own_profile(self):
        """Test that users can update their own basic profile information"""
        self.client.force_authenticate(user=self.driver_user)
        url = reverse('user-detail', kwargs={'pk': self.driver_user.pk})
        
        update_payload = {
            'first_name': 'Updated',
            'last_name': 'Name',
            'email': 'updated_driver@example.com'
        }
        
        response = self.client.patch(url, update_payload, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['first_name'], 'Updated')
        self.assertEqual(response.data['last_name'], 'Name')
        
        # Verify changes in database
        self.driver_user.refresh_from_db()
        self.assertEqual(self.driver_user.first_name, 'Updated')
        self.assertEqual(self.driver_user.last_name, 'Name')

    def test_non_admin_cannot_escalate_own_role(self):
        """Test that non-ADMIN users cannot change their own role to privileged roles"""
        self.client.force_authenticate(user=self.driver_user)
        url = reverse('user-detail', kwargs={'pk': self.driver_user.pk})
        
        escalation_payload = {'role': User.Role.ADMIN}
        
        response = self.client.patch(url, escalation_payload, format='json')
        
        # Should either be forbidden or ignore the role change
        self.assertIn(response.status_code, [status.HTTP_403_FORBIDDEN, status.HTTP_200_OK])
        
        # Verify role wasn't changed in database
        self.driver_user.refresh_from_db()
        self.assertEqual(self.driver_user.role, User.Role.DRIVER)

    def test_admin_can_update_user_role(self):
        """Test that ADMIN users can update any user's role"""
        self.client.force_authenticate(user=self.admin_user)
        url = reverse('user-detail', kwargs={'pk': self.driver_user.pk})
        
        role_update_payload = {'role': User.Role.DISPATCHER}
        
        response = self.client.patch(url, role_update_payload, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['role'], User.Role.DISPATCHER)
        
        # Verify change in database
        self.driver_user.refresh_from_db()
        self.assertEqual(self.driver_user.role, User.Role.DISPATCHER)

    def test_admin_can_delete_user(self):
        """Test that ADMIN users can delete users"""
        # Create a user to delete
        user_to_delete = User.objects.create_user(
            username='delete_me',
            email='deleteme@example.com',
            password='DeleteMe123!',
            role=User.Role.DRIVER
        )
        
        self.client.force_authenticate(user=self.admin_user)
        url = reverse('user-detail', kwargs={'pk': user_to_delete.pk})
        
        response = self.client.delete(url)
        
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        
        # Verify user was deleted
        with self.assertRaises(User.DoesNotExist):
            User.objects.get(pk=user_to_delete.pk)

    def test_non_admin_cannot_delete_user(self):
        """Test that non-ADMIN users cannot delete users"""
        # Create a user that might be deleted
        user_to_delete = User.objects.create_user(
            username='dont_delete_me',
            email='dontdeleteme@example.com',
            password='DontDeleteMe123!',
            role=User.Role.DRIVER
        )
        
        self.client.force_authenticate(user=self.dispatcher_user)
        url = reverse('user-detail', kwargs={'pk': user_to_delete.pk})
        
        response = self.client.delete(url)
        
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        
        # Verify user still exists
        self.assertTrue(User.objects.filter(pk=user_to_delete.pk).exists())

    def test_create_user_validation_errors(self):
        """Test user creation with invalid data returns appropriate errors"""
        self.client.force_authenticate(user=self.admin_user)
        url = reverse('user-list')
        
        # Test missing required fields
        invalid_payload = {
            'username': 'test_user',
            # Missing email, password, etc.
        }
        
        response = self.client.post(url, invalid_payload, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        
        # Test duplicate email
        duplicate_email_payload = self.new_user_payload.copy()
        duplicate_email_payload['email'] = self.admin_user.email  # Use existing email
        
        response = self.client.post(url, duplicate_email_payload, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_unauthenticated_access_denied(self):
        """Test that all user management endpoints require authentication"""
        url = reverse('user-list')
        
        # Test list endpoint
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        
        # Test create endpoint
        response = self.client.post(url, self.new_user_payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        
        # Test detail endpoint
        detail_url = reverse('user-detail', kwargs={'pk': self.admin_user.pk})
        response = self.client.get(detail_url)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)


class UserServiceTests(TestCase):
    """Test user management service layer functions"""
    
    def setUp(self):
        self.admin_user = User.objects.create_superuser(
            username='admin_service',
            email='admin@service.com',
            password='AdminService123!'
        )
        
        self.dispatcher_user = User.objects.create_user(
            username='dispatcher_service',
            email='dispatcher@service.com',
            password='DispatcherService123!',
            role=User.Role.DISPATCHER
        )

    def test_create_user_account_service(self):
        """Test create_user_account service function with valid data"""
        user_data = {
            'username': 'service_test_user',
            'email': 'servicetest@example.com',
            'password': 'ServiceTest123!',
            'first_name': 'Service',
            'last_name': 'Test',
            'role': User.Role.DRIVER
        }
        
        user = create_user_account(data=user_data, performing_user=self.admin_user)
        
        self.assertIsInstance(user, User)
        self.assertEqual(user.username, 'service_test_user')
        self.assertEqual(user.email, 'servicetest@example.com')
        self.assertTrue(user.check_password('ServiceTest123!'))
        self.assertEqual(user.role, User.Role.DRIVER)

    def test_create_user_account_missing_fields(self):
        """Test create_user_account service with missing required fields"""
        incomplete_data = {
            'username': 'incomplete_user',
            # Missing email and password
        }
        
        with self.assertRaises(ValidationError):
            create_user_account(data=incomplete_data, performing_user=self.admin_user)

    def test_update_user_profile_service_self(self):
        """Test update_user_profile service for self-updates"""
        update_data = {
            'first_name': 'Updated',
            'last_name': 'Dispatcher',
            'email': 'updated_dispatcher@service.com'
        }
        
        updated_user = update_user_profile(
            user_to_update=self.dispatcher_user,
            data=update_data,
            performing_user=self.dispatcher_user
        )
        
        self.assertEqual(updated_user.first_name, 'Updated')
        self.assertEqual(updated_user.last_name, 'Dispatcher')
        self.assertEqual(updated_user.email, 'updated_dispatcher@service.com')

    def test_update_user_profile_service_admin(self):
        """Test update_user_profile service for admin updates"""
        update_data = {
            'role': User.Role.COMPLIANCE_OFFICER,
            'is_staff': True
        }
        
        updated_user = update_user_profile(
            user_to_update=self.dispatcher_user,
            data=update_data,
            performing_user=self.admin_user
        )
        
        self.assertEqual(updated_user.role, User.Role.COMPLIANCE_OFFICER)
        self.assertTrue(updated_user.is_staff)

    def test_update_user_profile_permission_denied(self):
        """Test update_user_profile service denies unauthorized updates"""
        other_user = User.objects.create_user(
            username='other_user',
            email='other@service.com',
            password='Other123!',
            role=User.Role.DRIVER
        )
        
        update_data = {'first_name': 'Unauthorized'}
        
        with self.assertRaises(PermissionDenied):
            update_user_profile(
                user_to_update=other_user,
                data=update_data,
                performing_user=self.dispatcher_user
            )