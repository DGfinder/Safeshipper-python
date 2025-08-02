import uuid
from django.db import models
# from django.contrib.gis.db import models as gis_models  # Temporarily disabled for setup
from django.utils import timezone
from django.core.exceptions import ValidationError
# from locations.models import GeoLocation  # Temporarily disabled
from companies.models import Company

class Vehicle(models.Model):
    class VehicleType(models.TextChoices):
        SEMI = 'SEMI', 'Semi-Trailer'
        RIGID = 'RIGID', 'Rigid Truck'
        TANKER = 'TANKER', 'Tanker'
        VAN = 'VAN', 'Van'
        TRAILER = 'TRAILER', 'Trailer'
        CONTAINER = 'CONTAINER', 'Container'
        OTHER = 'OTHER', 'Other'

    class Status(models.TextChoices):
        AVAILABLE = 'AVAILABLE', 'Available'
        IN_USE = 'IN_USE', 'In Use'
        MAINTENANCE = 'MAINTENANCE', 'In Maintenance'
        OUT_OF_SERVICE = 'OUT_OF_SERVICE', 'Out of Service'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    registration_number = models.CharField(max_length=32, unique=True, db_index=True)
    vehicle_type = models.CharField(max_length=16, choices=VehicleType.choices)
    capacity_kg = models.FloatField(null=True, blank=True)
    status = models.CharField(max_length=16, choices=Status.choices, default=Status.AVAILABLE)
    # assigned_depot = models.ForeignKey(
    #     GeoLocation,
    #     on_delete=models.SET_NULL,
    #     null=True,
    #     blank=True,
    #     related_name='vehicles',
    #     limit_choices_to={'type': 'DEPOT'}
    # )
    assigned_depot = models.CharField(max_length=255, blank=True, null=True, help_text="Depot name (temporary)")
    owning_company = models.ForeignKey(
        Company,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='vehicles'
    )
    
    # Live tracking fields
    last_known_location_lat = models.FloatField(
        null=True,
        blank=True,
        help_text="Last reported GPS latitude of the vehicle"
    )
    last_known_location_lng = models.FloatField(
        null=True,
        blank=True,
        help_text="Last reported GPS longitude of the vehicle"
    )
    last_reported_at = models.DateTimeField(
        null=True,
        blank=True,
        help_text="Timestamp of the last location report"
    )
    
    # Driver assignment for mobile app
    assigned_driver = models.ForeignKey(
        'users.User',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='assigned_vehicles',
        limit_choices_to={'role': 'DRIVER'},
        help_text="Currently assigned driver"
    )
    
    created_at = models.DateTimeField(default=timezone.now, editable=False)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.registration_number} ({self.get_vehicle_type_display()})"
    
    @property
    def current_location(self):
        """Get the current location as lat/lng dictionary"""
        if self.last_known_location_lat and self.last_known_location_lng:
            return {
                'latitude': self.last_known_location_lat,
                'longitude': self.last_known_location_lng,
                'last_updated': self.last_reported_at.isoformat() if self.last_reported_at else None
            }
        return None
    
    @property
    def is_location_stale(self):
        """Check if the last location report is older than 30 minutes"""
        if not self.last_reported_at:
            return True
        from django.utils import timezone
        return (timezone.now() - self.last_reported_at).total_seconds() > 1800  # 30 minutes
    
    def update_location(self, latitude, longitude, timestamp=None):
        """Update the vehicle's location"""
        if timestamp is None:
            timestamp = timezone.now()
        
        self.last_known_location_lat = latitude
        self.last_known_location_lng = longitude
        self.last_reported_at = timestamp
        self.save(update_fields=['last_known_location_lat', 'last_known_location_lng', 'last_reported_at', 'updated_at'])
    
    @property
    def safety_equipment_status(self):
        """Get overall safety equipment compliance status"""
        equipment = self.safety_equipment.filter(status='ACTIVE')
        if not equipment.exists():
            return {
                'status': 'NO_EQUIPMENT',
                'compliant': False,
                'message': 'No safety equipment registered'
            }
        
        non_compliant = equipment.filter(
            models.Q(expiry_date__lt=timezone.now().date()) |
            models.Q(next_inspection_date__lt=timezone.now().date())
        )
        
        if non_compliant.exists():
            return {
                'status': 'NON_COMPLIANT',
                'compliant': False,
                'message': f'{non_compliant.count()} items need attention'
            }
        
        return {
            'status': 'COMPLIANT',
            'compliant': True,
            'message': 'All equipment compliant'
        }
    
    @property
    def required_fire_extinguisher_capacity(self):
        """Calculate required fire extinguisher capacity based on ADR 2025 rules"""
        if not self.capacity_kg:
            return "2kg"  # Default minimum
        
        weight_tonnes = self.capacity_kg / 1000
        
        if weight_tonnes <= 3.5:
            return "4kg total (minimum)"
        elif weight_tonnes <= 7.5:
            return "8kg total (6kg minimum for largest)"
        else:
            return "12kg total (6kg minimum for largest)"
    
    def get_equipment_by_category(self, category):
        """Get active safety equipment by category"""
        return self.safety_equipment.filter(
            equipment_type__category=category,
            status='ACTIVE'
        )
    
    def is_compliant_for_dangerous_goods(self, adr_classes=None):
        """Check if vehicle meets safety equipment requirements for dangerous goods transport"""
        if not adr_classes:
            adr_classes = ['ALL_CLASSES']
        
        # Get required equipment types for the ADR classes
        required_equipment_types = SafetyEquipmentType.objects.filter(
            models.Q(required_for_adr_classes__overlap=adr_classes) |
            models.Q(required_for_adr_classes__contains=['ALL_CLASSES']),
            is_active=True
        )
        
        compliance_issues = []
        
        for equipment_type in required_equipment_types:
            # Check if vehicle has this equipment
            vehicle_equipment = self.safety_equipment.filter(
                equipment_type=equipment_type,
                status='ACTIVE'
            ).first()
            
            if not vehicle_equipment:
                compliance_issues.append(f"Missing: {equipment_type.name}")
                continue
            
            # Check if equipment is compliant
            if not vehicle_equipment.is_compliant:
                if vehicle_equipment.is_expired:
                    compliance_issues.append(f"Expired: {equipment_type.name}")
                elif vehicle_equipment.inspection_overdue:
                    compliance_issues.append(f"Inspection overdue: {equipment_type.name}")
        
        return {
            'compliant': len(compliance_issues) == 0,
            'issues': compliance_issues
        }

    class Meta:
        ordering = ["registration_number"]
        verbose_name = "Vehicle"
        verbose_name_plural = "Vehicles"
        indexes = [
            models.Index(fields=['registration_number']),
            models.Index(fields=['vehicle_type']),
            models.Index(fields=['status']),
            models.Index(fields=['created_at']),
        ]


class SafetyEquipmentType(models.Model):
    """Defines types of safety equipment required for vehicle compliance"""
    
    class EquipmentCategory(models.TextChoices):
        FIRE_EXTINGUISHER = 'FIRE_EXTINGUISHER', 'Fire Extinguisher'
        FIRST_AID_KIT = 'FIRST_AID_KIT', 'First Aid Kit'
        SPILL_KIT = 'SPILL_KIT', 'Spill Kit'
        EMERGENCY_STOP = 'EMERGENCY_STOP', 'Emergency Stop Equipment'
        PROTECTIVE_EQUIPMENT = 'PROTECTIVE_EQUIPMENT', 'Protective Equipment'
        COMMUNICATION = 'COMMUNICATION', 'Communication Equipment'
        TOOLS = 'TOOLS', 'Emergency Tools'
        DOCUMENTATION = 'DOCUMENTATION', 'Documentation'
        OTHER = 'OTHER', 'Other'
    
    class ADRClass(models.TextChoices):
        """ADR hazard classes that require specific equipment"""
        CLASS_1 = 'CLASS_1', 'Class 1 - Explosives'
        CLASS_2 = 'CLASS_2', 'Class 2 - Gases'
        CLASS_3 = 'CLASS_3', 'Class 3 - Flammable Liquids'
        CLASS_4_1 = 'CLASS_4_1', 'Class 4.1 - Flammable Solids'
        CLASS_4_2 = 'CLASS_4_2', 'Class 4.2 - Spontaneous Combustion'
        CLASS_4_3 = 'CLASS_4_3', 'Class 4.3 - Water Reactive'
        CLASS_5_1 = 'CLASS_5_1', 'Class 5.1 - Oxidizers'
        CLASS_5_2 = 'CLASS_5_2', 'Class 5.2 - Organic Peroxides'
        CLASS_6_1 = 'CLASS_6_1', 'Class 6.1 - Toxic Substances'
        CLASS_6_2 = 'CLASS_6_2', 'Class 6.2 - Infectious Substances'
        CLASS_7 = 'CLASS_7', 'Class 7 - Radioactive'
        CLASS_8 = 'CLASS_8', 'Class 8 - Corrosives'
        CLASS_9 = 'CLASS_9', 'Class 9 - Miscellaneous'
        ALL_CLASSES = 'ALL_CLASSES', 'All Classes'
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=100, unique=True, db_index=True)
    category = models.CharField(max_length=32, choices=EquipmentCategory.choices)
    description = models.TextField(blank=True)
    
    # ADR Requirements
    required_for_adr_classes = models.JSONField(
        default=list,
        help_text="List of ADR classes requiring this equipment"
    )
    required_by_vehicle_weight = models.BooleanField(
        default=False,
        help_text="Whether equipment requirement varies by vehicle weight"
    )
    
    # Specifications
    minimum_capacity = models.CharField(
        max_length=50,
        blank=True,
        help_text="Minimum capacity requirement (e.g., '2kg', '6kg')"
    )
    certification_standard = models.CharField(
        max_length=100,
        blank=True,
        help_text="Required certification standard (e.g., 'EN 3', 'AS/NZS 1841')"
    )
    
    # Lifecycle management
    has_expiry_date = models.BooleanField(default=True)
    inspection_interval_months = models.PositiveIntegerField(
        default=12,
        help_text="Months between required inspections"
    )
    replacement_interval_months = models.PositiveIntegerField(
        null=True,
        blank=True,
        help_text="Months until equipment must be replaced (if applicable)"
    )
    
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(default=timezone.now, editable=False)
    updated_at = models.DateTimeField(auto_now=True)
    
    def __str__(self):
        return f"{self.name} ({self.get_category_display()})"
    
    class Meta:
        ordering = ['category', 'name']
        verbose_name = "Safety Equipment Type"
        verbose_name_plural = "Safety Equipment Types"
        indexes = [
            models.Index(fields=['category']),
            models.Index(fields=['is_active']),
        ]


class VehicleSafetyEquipment(models.Model):
    """Tracks specific safety equipment instances installed on vehicles"""
    
    class Status(models.TextChoices):
        ACTIVE = 'ACTIVE', 'Active'
        EXPIRED = 'EXPIRED', 'Expired'
        MAINTENANCE = 'MAINTENANCE', 'Under Maintenance'
        DECOMMISSIONED = 'DECOMMISSIONED', 'Decommissioned'
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    vehicle = models.ForeignKey(
        Vehicle,
        on_delete=models.CASCADE,
        related_name='safety_equipment'
    )
    equipment_type = models.ForeignKey(
        SafetyEquipmentType,
        on_delete=models.CASCADE,
        related_name='vehicle_instances'
    )
    
    # Equipment details
    serial_number = models.CharField(max_length=100, blank=True, db_index=True)
    manufacturer = models.CharField(max_length=100, blank=True)
    model = models.CharField(max_length=100, blank=True)
    capacity = models.CharField(
        max_length=50,
        blank=True,
        help_text="Actual capacity (e.g., '2kg', '6kg')"
    )
    
    # Installation and lifecycle
    installation_date = models.DateField()
    expiry_date = models.DateField(null=True, blank=True)
    last_inspection_date = models.DateField(null=True, blank=True)
    next_inspection_date = models.DateField(null=True, blank=True)
    
    # Status tracking
    status = models.CharField(max_length=16, choices=Status.choices, default=Status.ACTIVE)
    location_on_vehicle = models.CharField(
        max_length=100,
        blank=True,
        help_text="Physical location on vehicle (e.g., 'Driver side cab', 'Rear of trailer')"
    )
    
    # Compliance tracking
    certification_number = models.CharField(max_length=100, blank=True)
    compliance_notes = models.TextField(blank=True)
    
    created_at = models.DateTimeField(default=timezone.now, editable=False)
    updated_at = models.DateTimeField(auto_now=True)
    
    def __str__(self):
        return f"{self.vehicle.registration_number} - {self.equipment_type.name}"
    
    @property
    def is_expired(self):
        """Check if equipment has expired"""
        if not self.expiry_date:
            return False
        return self.expiry_date < timezone.now().date()
    
    @property
    def inspection_overdue(self):
        """Check if inspection is overdue"""
        if not self.next_inspection_date:
            return False
        return self.next_inspection_date < timezone.now().date()
    
    @property
    def is_compliant(self):
        """Check if equipment is currently compliant"""
        return (
            self.status == self.Status.ACTIVE and
            not self.is_expired and
            not self.inspection_overdue
        )
    
    def clean(self):
        """Validate equipment data"""
        if self.expiry_date and self.installation_date:
            if self.expiry_date <= self.installation_date:
                raise ValidationError("Expiry date must be after installation date")
        
        if self.last_inspection_date and self.installation_date:
            if self.last_inspection_date < self.installation_date:
                raise ValidationError("Last inspection date cannot be before installation date")
    
    class Meta:
        ordering = ['-installation_date']
        verbose_name = "Vehicle Safety Equipment"
        verbose_name_plural = "Vehicle Safety Equipment"
        indexes = [
            models.Index(fields=['vehicle', 'equipment_type']),
            models.Index(fields=['status']),
            models.Index(fields=['expiry_date']),
            models.Index(fields=['next_inspection_date']),
            models.Index(fields=['serial_number']),
        ]
        constraints = [
            models.UniqueConstraint(
                fields=['vehicle', 'equipment_type', 'serial_number'],
                name='unique_equipment_per_vehicle',
                condition=models.Q(status='ACTIVE')
            )
        ]


class SafetyEquipmentInspection(models.Model):
    """Records inspections and maintenance of safety equipment"""
    
    class InspectionType(models.TextChoices):
        ROUTINE = 'ROUTINE', 'Routine Inspection'
        MAINTENANCE = 'MAINTENANCE', 'Maintenance Check'
        INCIDENT = 'INCIDENT', 'Incident-Related'
        PRE_TRIP = 'PRE_TRIP', 'Pre-Trip Check'
        CERTIFICATION = 'CERTIFICATION', 'Certification Inspection'
    
    class Result(models.TextChoices):
        PASSED = 'PASSED', 'Passed'
        FAILED = 'FAILED', 'Failed'
        CONDITIONAL = 'CONDITIONAL', 'Conditional Pass'
        MAINTENANCE_REQUIRED = 'MAINTENANCE_REQUIRED', 'Maintenance Required'
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    equipment = models.ForeignKey(
        VehicleSafetyEquipment,
        on_delete=models.CASCADE,
        related_name='inspections'
    )
    
    # Inspection details
    inspection_type = models.CharField(max_length=16, choices=InspectionType.choices)
    inspection_date = models.DateField()
    inspector = models.ForeignKey(
        'users.User',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='safety_inspections'
    )
    
    # Results
    result = models.CharField(max_length=32, choices=Result.choices)
    findings = models.TextField(blank=True)
    actions_required = models.TextField(blank=True)
    
    # Follow-up
    next_inspection_due = models.DateField(null=True, blank=True)
    maintenance_completed = models.BooleanField(default=False)
    
    created_at = models.DateTimeField(default=timezone.now, editable=False)
    updated_at = models.DateTimeField(auto_now=True)
    
    def __str__(self):
        return f"{self.equipment} - {self.inspection_type} ({self.inspection_date})"
    
    class Meta:
        ordering = ['-inspection_date']
        verbose_name = "Safety Equipment Inspection"
        verbose_name_plural = "Safety Equipment Inspections"
        indexes = [
            models.Index(fields=['equipment', 'inspection_date']),
            models.Index(fields=['result']),
            models.Index(fields=['next_inspection_due']),
        ]


class SafetyEquipmentCertification(models.Model):
    """Manages compliance certifications and documents for safety equipment"""
    
    class CertificationType(models.TextChoices):
        MANUFACTURING = 'MANUFACTURING', 'Manufacturing Certificate'
        TESTING = 'TESTING', 'Testing Certificate'
        CALIBRATION = 'CALIBRATION', 'Calibration Certificate'
        COMPLIANCE = 'COMPLIANCE', 'Compliance Certificate'
        WARRANTY = 'WARRANTY', 'Warranty Document'
        OTHER = 'OTHER', 'Other'
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    equipment = models.ForeignKey(
        VehicleSafetyEquipment,
        on_delete=models.CASCADE,
        related_name='certifications'
    )
    
    # Certification details
    certification_type = models.CharField(max_length=16, choices=CertificationType.choices)
    certificate_number = models.CharField(max_length=100, db_index=True)
    issuing_authority = models.CharField(max_length=200)
    standard_reference = models.CharField(
        max_length=100,
        blank=True,
        help_text="Relevant standard (e.g., 'EN 3-7:2004', 'AS/NZS 1841.1')"
    )
    
    # Validity
    issue_date = models.DateField()
    expiry_date = models.DateField(null=True, blank=True)
    
    # Documentation
    document_file = models.FileField(
        upload_to='safety_equipment/certifications/',
        null=True,
        blank=True
    )
    notes = models.TextField(blank=True)
    
    created_at = models.DateTimeField(default=timezone.now, editable=False)
    updated_at = models.DateTimeField(auto_now=True)
    
    def __str__(self):
        return f"{self.equipment} - {self.certificate_number}"
    
    @property
    def is_valid(self):
        """Check if certification is currently valid"""
        if not self.expiry_date:
            return True  # No expiry date means it doesn't expire
        return self.expiry_date >= timezone.now().date()
    
    class Meta:
        ordering = ['-issue_date']
        verbose_name = "Safety Equipment Certification"
        verbose_name_plural = "Safety Equipment Certifications"
        indexes = [
            models.Index(fields=['equipment', 'certification_type']),
            models.Index(fields=['certificate_number']),
            models.Index(fields=['expiry_date']),
        ]
