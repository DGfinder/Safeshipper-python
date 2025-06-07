from rest_framework import viewsets, permissions, filters
from .models import Vehicle
from .serializers import VehicleSerializer
from django_filters.rest_framework import DjangoFilterBackend

class IsStaffOrReadOnly(permissions.BasePermission):
    def has_permission(self, request, view):
        if request.method in permissions.SAFE_METHODS:
            return True
        return request.user and request.user.is_staff

class VehicleViewSet(viewsets.ModelViewSet):
    queryset = Vehicle.objects.all()
    serializer_class = VehicleSerializer
    permission_classes = [IsStaffOrReadOnly]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter]
    filterset_fields = ['vehicle_type', 'assigned_depot']
    search_fields = ['registration_number'] 