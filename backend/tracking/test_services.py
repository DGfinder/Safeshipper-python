"""
Tests for tracking services to verify the refactoring of business logic from models to services.
"""

from django.test import TestCase
from django.utils import timezone
from datetime import timedelta
from decimal import Decimal

from .models import LocationVisit, GPSEvent
from .services import calculate_visit_duration, calculate_demurrage_for_visit
from locations.models import GeoLocation
from vehicles.models import Vehicle
from shipments.models import Shipment


class TrackingServicesTestCase(TestCase):
    """Test cases for tracking service functions."""
    
    def setUp(self):
        """Set up test data."""
        # Create test location with demurrage settings
        self.location = GeoLocation.objects.create(
            name="Test Depot",
            location_type="DEPOT",
            demurrage_enabled=True,
            free_time_hours=2.0,
            demurrage_rate_per_hour=Decimal('50.00')
        )
        
        # Create test vehicle
        self.vehicle = Vehicle.objects.create(
            registration_number="TEST123",
            vehicle_type="rigid-truck",
            make="Test",
            model="Truck",
            year=2020
        )
        
        # Create test shipment
        self.shipment = Shipment.objects.create(
            reference_number="SHIP001",
            status="in_transit"
        )
        
        # Create test GPS events
        self.entry_time = timezone.now()
        self.exit_time = self.entry_time + timedelta(hours=4)  # 4 hour visit
        
        self.entry_event = GPSEvent.objects.create(
            vehicle=self.vehicle,
            shipment=self.shipment,
            latitude=-31.9505,
            longitude=115.8605,
            timestamp=self.entry_time
        )
        
        self.exit_event = GPSEvent.objects.create(
            vehicle=self.vehicle,
            shipment=self.shipment,
            latitude=-31.9505,
            longitude=115.8605,
            timestamp=self.exit_time
        )
        
        # Create test visit
        self.visit = LocationVisit.objects.create(
            location=self.location,
            vehicle=self.vehicle,
            shipment=self.shipment,
            entry_time=self.entry_time,
            exit_time=self.exit_time,
            entry_event=self.entry_event,
            exit_event=self.exit_event,
            status='COMPLETED'
        )
    
    def test_calculate_visit_duration(self):
        """Test that visit duration is calculated correctly."""
        duration = calculate_visit_duration(self.visit)
        self.assertEqual(duration, 4.0)  # 4 hours
    
    def test_calculate_visit_duration_active_visit(self):
        """Test that active visits return None for duration."""
        active_visit = LocationVisit.objects.create(
            location=self.location,
            vehicle=self.vehicle,
            shipment=self.shipment,
            entry_time=self.entry_time,
            entry_event=self.entry_event,
            status='ACTIVE'
        )
        
        duration = calculate_visit_duration(active_visit)
        self.assertIsNone(duration)
    
    def test_calculate_demurrage_for_visit(self):
        """Test that demurrage is calculated correctly."""
        demurrage = calculate_demurrage_for_visit(self.visit)
        
        self.assertIsNotNone(demurrage)
        self.assertEqual(demurrage['hours'], 2.0)  # 4 hours - 2 hours free = 2 chargeable hours
        self.assertEqual(demurrage['charge'], Decimal('100.00'))  # 2 hours * $50/hour
    
    def test_calculate_demurrage_for_visit_short_stay(self):
        """Test that short stays don't incur demurrage charges."""
        short_visit = LocationVisit.objects.create(
            location=self.location,
            vehicle=self.vehicle,
            shipment=self.shipment,
            entry_time=self.entry_time,
            exit_time=self.entry_time + timedelta(hours=1),  # 1 hour visit
            entry_event=self.entry_event,
            exit_event=self.exit_event,
            status='COMPLETED'
        )
        
        demurrage = calculate_demurrage_for_visit(short_visit)
        self.assertIsNotNone(demurrage)
        self.assertEqual(demurrage['hours'], 0.0)  # No chargeable hours
        self.assertIsNone(demurrage['charge'])  # No charge
    
    def test_calculate_demurrage_for_visit_disabled(self):
        """Test that demurrage is not calculated when disabled."""
        # Create location with demurrage disabled
        location_no_demurrage = GeoLocation.objects.create(
            name="No Demurrage Depot",
            location_type="DEPOT",
            demurrage_enabled=False
        )
        
        visit_no_demurrage = LocationVisit.objects.create(
            location=location_no_demurrage,
            vehicle=self.vehicle,
            shipment=self.shipment,
            entry_time=self.entry_time,
            exit_time=self.exit_time,
            entry_event=self.entry_event,
            exit_event=self.exit_event,
            status='COMPLETED'
        )
        
        demurrage = calculate_demurrage_for_visit(visit_no_demurrage)
        self.assertIsNone(demurrage)
    
    def test_model_methods_still_work(self):
        """Test that model methods still work after refactoring."""
        # Test duration_hours property
        duration = self.visit.duration_hours
        self.assertEqual(duration, 4.0)
        
        # Test calculate_demurrage method
        demurrage = self.visit.calculate_demurrage()
        self.assertIsNotNone(demurrage)
        self.assertEqual(demurrage['hours'], 2.0)
        self.assertEqual(demurrage['charge'], Decimal('100.00'))
    
    def test_is_active_property(self):
        """Test the is_active property."""
        # Test completed visit
        self.assertFalse(self.visit.is_active)
        
        # Test active visit
        active_visit = LocationVisit.objects.create(
            location=self.location,
            vehicle=self.vehicle,
            shipment=self.shipment,
            entry_time=self.entry_time,
            entry_event=self.entry_event,
            status='ACTIVE'
        )
        self.assertTrue(active_visit.is_active) 