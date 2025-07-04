# users/api_views.py
from django.contrib.auth import get_user_model
from rest_framework import viewsets, status, permissions
from rest_framework.response import Response
from rest_framework.decorators import action
from .serializers import UserSerializer, UserCreateSerializer, UserUpdateSerializer
from .permissions import IsSelfOrAdmin, CanManageUsers, IsAdminOrSelf
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import SearchFilter, OrderingFilter

User = get_user_model()

class UserViewSet(viewsets.ModelViewSet):
    """
    API endpoint for user management with role-based access control.
    Admins can perform all operations. Users can view/update their own profiles only.
    """
    queryset = User.objects.all().order_by('username')
    permission_classes = [permissions.IsAuthenticated, IsAdminOrSelf]

    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['role', 'is_active', 'is_staff']
    search_fields = ['username', 'first_name', 'last_name', 'email']
    ordering_fields = ['username', 'email', 'role', 'date_joined']

    def get_serializer_class(self):
        """Use dynamic serializer selection based on action."""
        if self.action == 'create':
            return UserCreateSerializer
        elif self.action in ['update', 'partial_update']:
            return UserUpdateSerializer
        return UserSerializer

    def get_queryset(self):
        """Admin users see all users, regular users see only themselves."""
        if self.request.user.is_staff or self.request.user.role == 'ADMIN':
            return User.objects.all().order_by('username')
        else:
            # Non-admin users should only see themselves
            return User.objects.filter(id=self.request.user.id)
    
    # If you want a specific endpoint for the current user's profile
    @action(detail=False, methods=['get', 'put', 'patch'], permission_classes=[permissions.IsAuthenticated, IsSelfOrAdmin])
    def me(self, request):
        user = request.user
        if request.method == 'GET':
            serializer = UserSerializer(user)
            return Response(serializer.data)
        elif request.method in ['PUT', 'PATCH']:
            # For 'me' endpoint, ensure users can only update allowed fields from UserUpdateSerializer
            # but ensure they can't change their role, is_staff etc. unless an admin does it.
            # The UserUpdateSerializer should ideally be used here.
            # The IsSelfOrAdmin permission ensures only the user themselves or admin can access.
            # We might need a more restricted serializer for self-update.
            # For now, using UserUpdateSerializer and relying on its field definition.
            serializer = UserUpdateSerializer(user, data=request.data, partial=request.method == 'PATCH')
            if serializer.is_valid():
                # Prevent self-update of role, is_staff, is_superuser unless current user is admin
                if not request.user.is_staff and not request.user.is_superuser:
                    if 'role' in serializer.validated_data and serializer.validated_data['role'] != user.role:
                        return Response({'detail': 'You cannot change your own role.'}, status=status.HTTP_403_FORBIDDEN)
                    if 'is_staff' in serializer.validated_data and serializer.validated_data['is_staff'] != user.is_staff:
                         return Response({'detail': 'You cannot change your own staff status.'}, status=status.HTTP_403_FORBIDDEN)
                
                serializer.save()
                return Response(serializer.data)
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    # Add other custom actions if needed, e.g., set_password for admins

