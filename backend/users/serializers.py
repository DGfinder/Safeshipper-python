# users/serializers.py
from rest_framework import serializers
from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError as DjangoValidationError
from shared.validation_service import SafeShipperValidationMixin

User = get_user_model()

class UserSerializer(serializers.ModelSerializer):
    # To display the human-readable role name instead of the key
    role_display = serializers.CharField(source='get_role_display', read_only=True)

    class Meta:
        model = User
        fields = [
            'id', 
            'username', 
            'email', 
            'first_name', 
            'last_name', 
            'role', 
            'role_display', # Human-readable role
            'is_active',
            'is_staff',
            'is_superuser',
            'last_login',
            'date_joined',
            # Do not include 'password' here for general GET requests for security
        ]
        read_only_fields = ['last_login', 'date_joined', 'is_superuser'] # is_superuser usually managed by specific commands/admin
    
    def validate_first_name(self, value):
        """Validate first name"""
        return self.validate_text_content(value, max_length=150) if value else value
    
    def validate_last_name(self, value):
        """Validate last name"""
        return self.validate_text_content(value, max_length=150) if value else value

class UserCreateSerializer(SafeShipperValidationMixin, serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, required=True, validators=[validate_password])
    password2 = serializers.CharField(write_only=True, required=True, label="Confirm password")

    class Meta:
        model = User
        fields = [
            'username', 
            'password', 
            'password2',
            'email', 
            'first_name', 
            'last_name', 
            'role', 
            'is_staff', # Allow setting is_staff during creation by admin if needed
            'is_active',
        ]
        extra_kwargs = {
            'first_name': {'required': False},
            'last_name': {'required': False},
            'email': {'required': True}, # Making email required
            'is_staff': {'default': False},
            'is_active': {'default': True},
        }

    def validate_email(self, value):
        # Use enhanced email validation
        validated_email = self.validate_email_address(value)
        
        # Ensure email is unique
        if User.objects.filter(email=validated_email).exists():
            raise serializers.ValidationError("A user with that email already exists.")
        return validated_email
    
    def validate_first_name(self, value):
        """Validate first name"""
        return self.validate_text_content(value, max_length=150) if value else value
    
    def validate_last_name(self, value):
        """Validate last name"""
        return self.validate_text_content(value, max_length=150) if value else value

    def validate(self, attrs):
        if attrs['password'] != attrs['password2']:
            raise serializers.ValidationError({"password": "Password fields didn't match."})
        # Remove password2 as it's not a model field
        attrs.pop('password2')
        return attrs

    def create(self, validated_data):
        user = User.objects.create_user(
            username=validated_data['username'],
            email=validated_data['email'],
            password=validated_data['password'], # create_user handles hashing
            first_name=validated_data.get('first_name', ''),
            last_name=validated_data.get('last_name', ''),
            role=validated_data.get('role', User.Role.DRIVER), # Default role if not provided
            is_staff=validated_data.get('is_staff', False),
            is_active=validated_data.get('is_active', True)
        )
        return user

class UserUpdateSerializer(SafeShipperValidationMixin, serializers.ModelSerializer):
    """
    Serializer for user updates - excludes password changes for security.
    Password changes should be handled by a separate dedicated endpoint.
    """

    class Meta:
        model = User
        fields = [
            'email',
            'first_name',
            'last_name',
            'role',
            'is_active',
            'is_staff',
        ]
        extra_kwargs = {
            'email': {'required': False},
            'role': {'required': False},
            'is_active': {'required': False},
            'is_staff': {'required': False},
        }

    def validate_email(self, value):
        # Use enhanced email validation
        validated_email = self.validate_email_address(value)
        
        user = self.instance
        if user and User.objects.filter(email=validated_email).exclude(pk=user.pk).exists():
            raise serializers.ValidationError("A user with that email already exists.")
        return validated_email
    
    def validate_first_name(self, value):
        """Validate first name"""
        return self.validate_text_content(value, max_length=150) if value else value
    
    def validate_last_name(self, value):
        """Validate last name"""
        return self.validate_text_content(value, max_length=150) if value else value

    def update(self, instance, validated_data):
        # Update only the fields that are provided
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        
        instance.save()
        return instance
