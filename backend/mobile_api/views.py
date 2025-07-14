from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.shortcuts import get_object_or_404
from shipments.models import Shipment
from dangerous_goods.models import DangerousGood
from .serializers import (
    MobileShipmentSerializer, MobileDangerousGoodSerializer,
    LocationUpdateSerializer, ProofOfDeliverySerializer
)


class MobileShipmentViewSet(viewsets.ReadOnlyModelViewSet):
    """Mobile-optimized shipment API"""
    
    serializer_class = MobileShipmentSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        """Filter shipments for mobile users"""
        user = self.request.user
        if hasattr(user, 'assigned_shipments'):
            return user.assigned_shipments.select_related('customer', 'carrier')
        return Shipment.objects.select_related('customer', 'carrier')
    
    @action(detail=True, methods=['post'])
    def update_location(self, request, pk=None):
        """Update shipment location from mobile device"""
        shipment = self.get_object()
        serializer = LocationUpdateSerializer(data=request.data)
        
        if serializer.is_valid():
            # Update shipment location
            location_data = serializer.validated_data
            # Implementation would update tracking data
            return Response({'status': 'location updated'})
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=True, methods=['post'])
    def proof_of_delivery(self, request, pk=None):
        """Submit proof of delivery"""
        shipment = self.get_object()
        serializer = ProofOfDeliverySerializer(data=request.data)
        
        if serializer.is_valid():
            # Process proof of delivery
            return Response({'status': 'delivery confirmed'})
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class MobileDangerousGoodsViewSet(viewsets.ReadOnlyModelViewSet):
    """Mobile dangerous goods lookup"""
    
    queryset = DangerousGood.objects.all()
    serializer_class = MobileDangerousGoodSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        """Filter and search dangerous goods"""
        queryset = super().get_queryset()
        search = self.request.query_params.get('search', '')
        
        if search:
            queryset = queryset.filter(
                proper_shipping_name__icontains=search
            )
        
        return queryset[:50]  # Limit for mobile performance