# users/api_views.py
from django.contrib.auth import get_user_model
from rest_framework import viewsets, status, permissions
from rest_framework.response import Response
from rest_framework.decorators import action
from .serializers import UserSerializer, UserCreateSerializer, UserUpdateSerializer
from .permissions import IsSelfOrAdmin, CanManageUsers #, IsAdminUserOrReadOnly
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import SearchFilter, OrderingFilter

User = get_user_model()

class UserViewSet(viewsets.ModelViewSet):
    """
    API endpoint that allows users to be viewed or edited.
    """
    queryset = User.objects.all().order_by('username')
    # serializer_class = UserSerializer # Default serializer
    permission_classes = [permissions.IsAuthenticated, CanManageUsers] # Overall permission for the viewset

    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['role', 'is_active', 'is_staff']
    search_fields = ['username', 'first_name', 'last_name', 'email']
    ordering_fields = ['username', 'email', 'role', 'date_joined']

    def get_serializer_class(self):
        if self.action == 'create':
            return UserCreateSerializer
        elif self.action in ['update', 'partial_update']:
            return UserUpdateSerializer
        return UserSerializer # For list, retrieve

    def get_permissions(self):
        """
        Instantiates and returns the list of permissions that this view requires.
        """
        if self.action in ['update', 'partial_update', 'destroy', 'retrieve']:
            # For object-level actions, use IsSelfOrAdmin in conjunction with CanManageUsers
            # CanManageUsers' has_object_permission will be primary for these.
            return [permissions.IsAuthenticated(), CanManageUsers()] 
        # For list, create, use permissions defined at class level or customize here.
        return super().get_permissions()
    
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

