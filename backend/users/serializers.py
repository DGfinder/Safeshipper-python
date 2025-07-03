# users/serializers.py
from rest_framework import serializers
from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError as DjangoValidationError

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

class UserCreateSerializer(serializers.ModelSerializer):
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
        # Ensure email is unique
        if User.objects.filter(email=value).exists():
            raise serializers.ValidationError("A user with that email already exists.")
        return value

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

class UserUpdateSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, required=False, allow_blank=True, validators=[validate_password])
    password2 = serializers.CharField(write_only=True, required=False, allow_blank=True, label="Confirm password")

    class Meta:
        model = User
        fields = [
            'email',
            'first_name',
            'last_name',
            'role',
            
            'is_active',
            'is_staff',
            'password',
            'password2',
        ]
        extra_kwargs = {
            'email': {'required': False},
            'role': {'required': False},
            'is_active': {'required': False},
            'is_staff': {'required': False},
            'password': {'required': False},
            'password2': {'required': False},
        }

    def validate_email(self, value):
        user = self.instance
        if user and User.objects.filter(email=value).exclude(pk=user.pk).exists():
            raise serializers.ValidationError("A user with that email already exists.")
        return value

    def validate(self, attrs):
        password = attrs.get('password')
        password2 = attrs.get('password2')

        if password or password2:
            if password != password2:
                raise serializers.ValidationError({"password": "Password fields didn't match."})
        
        if 'password2' in attrs:
            attrs.pop('password2')
        return attrs

    def update(self, instance, validated_data):
        password = validated_data.pop('password', None)

        # This ensures we only update fields that are passed in the request
        for attr, value in validated_data.items():
            setattr(instance, attr, value)

        if password:
            try:
                validate_password(password, instance)
                instance.set_password(password)
            except DjangoValidationError as e:
                raise serializers.ValidationError({'password': list(e.messages)})

        instance.save()
        return instance
