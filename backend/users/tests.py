# users/tests.py
from django.test import TestCase
from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework.test import APITestCase # APITestCase is often preferred for API tests
from rest_framework import status
from .services import create_user_account, update_user_profile
from django.core.exceptions import ValidationError as DjangoValidationError, PermissionDenied # Import PermissionDenied
from typing import TYPE_CHECKING, Dict # For type hinting

# This block is for static type checking (Pylance/MyPy)
if TYPE_CHECKING:
    from .models import User  # Assuming your User model is in 'users.models'
    # If your User model is defined in a different app, adjust the import path.
    # e.g., from ..models import User if models.py is one level up and User is there.
    # Or from <other_app_name>.models import User

# Get the User model for runtime use (e.g., for creating instances, accessing enums)
UserRuntime = get_user_model()

class UserServiceTests(TestCase):
    def setUp(self):
        self.admin_user: 'User' = UserRuntime.objects.create_superuser(
            username='admin', email='admin@example.com', password='password123'
        )
        self.dispatcher_user_data: Dict = {
            'username': 'dispatcher',
            'email': 'dispatcher@example.com',
            'password': 'password123',
            'role': UserRuntime.Role.DISPATCHER, # Accessing Role enum via UserRuntime
            'depot': 'Central'
        }
        self.dispatcher_user: 'User' = create_user_account(data=self.dispatcher_user_data, performing_user=self.admin_user)


    def test_create_user_service(self):
        user_data: Dict = {
            'username': 'newuser',
            'email': 'newuser@example.com',
            'password': 'NewPassword123!',
            'role': UserRuntime.Role.DISPATCHER, 
            'depot': 'Main Depot'
        }
        user: 'User' = create_user_account(data=user_data, performing_user=self.admin_user)
        # Adjust count based on how many users are created in setUp
        self.assertEqual(UserRuntime.objects.count(), 3) # admin_user, dispatcher_user, newuser
        self.assertEqual(user.username, 'newuser')
        self.assertTrue(user.check_password('NewPassword123!'))
        self.assertEqual(user.role, UserRuntime.Role.DISPATCHER)

    def test_create_user_missing_fields_service(self):
        user_data: Dict = {'username': 'test'} # Missing email and password
        with self.assertRaises(DjangoValidationError): 
            create_user_account(data=user_data, performing_user=self.admin_user)

    def test_update_user_profile_service(self):
        user_to_update: 'User' = UserRuntime.objects.create_user(
            username='toupdate', email='toupdate@example.com', password='password123', 
            first_name="OldFirst", role=UserRuntime.Role.DRIVER 
        )
        update_data: Dict = {'first_name': 'NewFirst', 'last_name': 'NewLast'}
        
        # Test self update
        updated_user: 'User' = update_user_profile(user_to_update=user_to_update, data=update_data, performing_user=user_to_update)
        self.assertEqual(updated_user.first_name, 'NewFirst')
        self.assertEqual(updated_user.last_name, 'NewLast')

        # Test admin update
        admin_update_data: Dict = {'role': UserRuntime.Role.DISPATCHER} 
        admin_updated_user: 'User' = update_user_profile(user_to_update=user_to_update, data=admin_update_data, performing_user=self.admin_user)
        self.assertEqual(admin_updated_user.role, UserRuntime.Role.DISPATCHER)
        self.assertEqual(admin_updated_user.depot, 'New Depot')

    def test_update_profile_permission_denied_service(self):
        user1: 'User' = UserRuntime.objects.create_user('user1', 'user1@example.com', 'pass')
        user2: 'User' = UserRuntime.objects.create_user('user2', 'user2@example.com', 'pass')
        update_data: Dict = {'first_name': 'AttemptedUpdate'}
        with self.assertRaises(PermissionDenied): # This should now be defined
            update_user_profile(user_to_update=user1, data=update_data, performing_user=user2)


class UserAPITests(APITestCase): 
    def setUp(self):
        self.admin_user: 'User' = UserRuntime.objects.create_superuser(
            username='admin_api', email='admin_api@example.com', password='password123', role=UserRuntime.Role.ADMIN 
        )
        self.user1_data: Dict = {
            'username': 'user1_api', 
            'email': 'user1_api@example.com', 
            'password': 'password123', 
            'role': UserRuntime.Role.DRIVER, 
            }
        self.user1: 'User' = UserRuntime.objects.create_user(**self.user1_data)

        self.user_create_payload: Dict = {
            'username': 'newapiuser',
            'email': 'newapiuser@example.com',
            'password': 'NewSecurePassword123!',
            'password2': 'NewSecurePassword123!', # Assuming UserCreateSerializer handles this
            'first_name': 'New',
            'last_name': 'User',
            'role': UserRuntime.Role.DISPATCHER, 
            'depot': 'Main Depot'
        }

    def test_list_users_unauthenticated(self):
        url = reverse('user-list') # Assumes basename='user' in users/urls.py
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_list_users_admin(self):
        self.client.force_authenticate(user=self.admin_user)
        url = reverse('user-list')
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        # Count should be admin_user + user1
        self.assertEqual(len(response.data), 2) 

    def test_list_users_normal_user_denied(self):
        self.client.force_authenticate(user=self.user1)
        url = reverse('user-list')
        response = self.client.get(url)
        # Based on CanManageUsers permission, non-admin/staff cannot list users
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)


    def test_create_user_admin(self):
        self.client.force_authenticate(user=self.admin_user)
        url = reverse('user-list')
        response = self.client.post(url, self.user_create_payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(UserRuntime.objects.count(), 3) 
        self.assertEqual(response.data['username'], 'newapiuser')
        self.assertEqual(response.data['role'], UserRuntime.Role.DISPATCHER)

    def test_create_user_normal_user_denied(self):
        self.client.force_authenticate(user=self.user1)
        url = reverse('user-list')
        response = self.client.post(url, self.user_create_payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_retrieve_own_profile(self):
        self.client.force_authenticate(user=self.user1)
        url = reverse('user-detail', kwargs={'pk': self.user1.pk})
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['username'], self.user1.username)

    def test_retrieve_other_profile_admin(self):
        self.client.force_authenticate(user=self.admin_user)
        url = reverse('user-detail', kwargs={'pk': self.user1.pk})
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['username'], self.user1.username)
        
    def test_retrieve_other_profile_normal_user_denied(self):
        user2: 'User' = UserRuntime.objects.create_user(username='user2_api', email='user2_api@example.com', password='password123')
        self.client.force_authenticate(user=self.user1)
        url = reverse('user-detail', kwargs={'pk': user2.pk})
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        
    def test_update_own_profile(self):
        self.client.force_authenticate(user=self.user1)
        url = reverse('user-detail', kwargs={'pk': self.user1.pk})
        payload: Dict = {'first_name': 'UpdatedFirst', 'last_name': 'UpdatedLast'}
        response = self.client.patch(url, payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.user1.refresh_from_db()
        self.assertEqual(self.user1.first_name, 'UpdatedFirst')

    def test_update_own_role_by_self_denied_in_me_endpoint_if_not_admin(self):
        self.client.force_authenticate(user=self.user1) 
        url = reverse('user-me') 
        payload: Dict = {'role': UserRuntime.Role.ADMIN} 
        response = self.client.put(url, payload, format='json') 
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_admin_can_update_user_role(self):
        self.client.force_authenticate(user=self.admin_user)
        url = reverse('user-detail', kwargs={'pk': self.user1.pk})
        payload: Dict = {'role': UserRuntime.Role.ADMIN} 
        response = self.client.patch(url, payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.user1.refresh_from_db()
        self.assertEqual(self.user1.role, UserRuntime.Role.ADMIN)

    def test_get_me_endpoint(self):
        self.client.force_authenticate(user=self.user1)
        url = reverse('user-me')
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['username'], self.user1.username)

    def test_dispatcher_cannot_create_admin(self):
        # Create a dispatcher user and authenticate
        dispatcher = UserRuntime.objects.create_user(
            username='dispatch', email='dispatch@example.com', password='password123', role=UserRuntime.Role.DISPATCHER
        )
        self.client.force_authenticate(user=dispatcher)
        url = reverse('user-list')
        payload = {
            'username': 'newadmin',
            'email': 'newadmin@example.com',
            'password': 'Password123!',
            'password2': 'Password123!',
            'role': UserRuntime.Role.ADMIN,
        }
        response = self.client.post(url, payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_non_staff_cannot_escalate_own_role_or_staff_status(self):
        # Authenticate as a normal user
        self.client.force_authenticate(user=self.user1)
        url = reverse('user-me')
        # Try to escalate role
        payload = {'role': UserRuntime.Role.ADMIN}
        response = self.client.patch(url, payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        # Try to escalate staff status
        payload = {'is_staff': True}
        response = self.client.patch(url, payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_admin_can_create_privileged_user(self):
        self.client.force_authenticate(user=self.admin_user)
        url = reverse('user-list')
        payload = {
            'username': 'newmanager',
            'email': 'newmanager@example.com',
            'password': 'Password123!',
            'password2': 'Password123!',
            'role': UserRuntime.Role.DISPATCHER,
        }
        response = self.client.post(url, payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['role'], UserRuntime.Role.DISPATCHER)
