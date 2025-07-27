# training/adg_driver_qualifications.py

"""
ADG (Australian Dangerous Goods) driver qualification and competency tracking system.

This module extends the existing training system to provide specialized tracking for:
- Driver license validation and expiration
- ADG dangerous goods driver training certificates
- Hazard class-specific qualifications
- Competency validation for shipment assignments
- Real-time compliance monitoring
"""

from typing import Dict, List, Optional, Tuple
from datetime import date, timedelta
from django.db import models
from django.utils import timezone
from django.core.exceptions import ValidationError
from django.contrib.auth import get_user_model

from .models import TrainingRecord, TrainingProgram, ComplianceRequirement
from dangerous_goods.models import DangerousGood

User = get_user_model()


class DriverLicense(models.Model):
    """Driver license information and tracking"""
    
    class LicenseClass(models.TextChoices):
        # Australian driver license classes
        C = 'C', 'Class C (Car)'
        LR = 'LR', 'Class LR (Light Rigid)'
        MR = 'MR', 'Class MR (Medium Rigid)'
        HR = 'HR', 'Class HR (Heavy Rigid)'
        HC = 'HC', 'Class HC (Heavy Combination)'
        MC = 'MC', 'Class MC (Multi-Combination)'
    
    class LicenseStatus(models.TextChoices):
        VALID = 'VALID', 'Valid'
        EXPIRED = 'EXPIRED', 'Expired'
        SUSPENDED = 'SUSPENDED', 'Suspended'
        CANCELLED = 'CANCELLED', 'Cancelled'
        EXPIRING_SOON = 'EXPIRING_SOON', 'Expiring Soon'
    
    driver = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='driver_licenses',
        limit_choices_to={'role': 'DRIVER'}
    )
    
    license_number = models.CharField(
        max_length=20,
        unique=True,
        help_text="Driver license number"
    )
    
    license_class = models.CharField(
        max_length=5,
        choices=LicenseClass.choices,
        help_text="Australian driver license class"
    )
    
    state_issued = models.CharField(
        max_length=10,
        choices=[
            ('NSW', 'New South Wales'),
            ('VIC', 'Victoria'),
            ('QLD', 'Queensland'),
            ('WA', 'Western Australia'),
            ('SA', 'South Australia'),
            ('TAS', 'Tasmania'),
            ('ACT', 'Australian Capital Territory'),
            ('NT', 'Northern Territory')
        ],
        help_text="State/territory where license was issued"
    )
    
    issue_date = models.DateField(help_text="License issue date")
    expiry_date = models.DateField(help_text="License expiry date")
    
    # Endorsements and restrictions
    endorsements = models.JSONField(
        default=list,
        help_text="Special endorsements (e.g., F - Forklift, V - Vehicles for hire)"
    )
    
    restrictions = models.JSONField(
        default=list,
        help_text="License restrictions or conditions"
    )
    
    # Status tracking
    status = models.CharField(
        max_length=15,
        choices=LicenseStatus.choices,
        default=LicenseStatus.VALID
    )
    
    # Verification
    verified_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='verified_licenses'
    )
    verified_at = models.DateTimeField(null=True, blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = "Driver License"
        verbose_name_plural = "Driver Licenses"
        indexes = [
            models.Index(fields=['driver', 'license_class']),
            models.Index(fields=['expiry_date']),
            models.Index(fields=['status']),
        ]
    
    def __str__(self):
        return f"{self.driver.get_full_name()} - {self.license_class} ({self.license_number})"
    
    def save(self, *args, **kwargs):
        self.update_status()
        super().save(*args, **kwargs)
    
    def update_status(self):
        """Update license status based on expiry date"""
        today = timezone.now().date()
        days_until_expiry = (self.expiry_date - today).days
        
        if days_until_expiry < 0:
            self.status = self.LicenseStatus.EXPIRED
        elif days_until_expiry <= 30:
            self.status = self.LicenseStatus.EXPIRING_SOON
        else:
            self.status = self.LicenseStatus.VALID
    
    @property
    def is_valid_for_dangerous_goods(self) -> bool:
        """Check if license class is suitable for dangerous goods transport"""
        dangerous_goods_classes = [
            self.LicenseClass.LR, self.LicenseClass.MR,
            self.LicenseClass.HR, self.LicenseClass.HC, self.LicenseClass.MC
        ]
        return (self.status == self.LicenseStatus.VALID and 
                self.license_class in dangerous_goods_classes)


class ADGDriverCertificate(models.Model):
    """ADG dangerous goods driver training certificates"""
    
    class CertificateType(models.TextChoices):
        BASIC_ADG = 'BASIC_ADG', 'Basic ADG Training'
        LOAD_RESTRAINT = 'LOAD_RESTRAINT', 'Load Restraint'
        SECURITY_AWARENESS = 'SECURITY_AWARENESS', 'Security Awareness'
        VEHICLE_MAINTENANCE = 'VEHICLE_MAINTENANCE', 'Vehicle Maintenance for DG'
        EMERGENCY_RESPONSE = 'EMERGENCY_RESPONSE', 'Emergency Response'
        CLASS_SPECIFIC = 'CLASS_SPECIFIC', 'Class-Specific Training'
    
    class CertificateStatus(models.TextChoices):
        VALID = 'VALID', 'Valid'
        EXPIRED = 'EXPIRED', 'Expired'
        EXPIRING_SOON = 'EXPIRING_SOON', 'Expiring Soon'
        SUSPENDED = 'SUSPENDED', 'Suspended'
        REVOKED = 'REVOKED', 'Revoked'
    
    driver = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='adg_certificates',
        limit_choices_to={'role': 'DRIVER'}
    )
    
    certificate_type = models.CharField(
        max_length=20,
        choices=CertificateType.choices
    )
    
    certificate_number = models.CharField(
        max_length=30,
        unique=True,
        help_text="ADG certificate number"
    )
    
    # Certificate details
    issuing_authority = models.CharField(
        max_length=100,
        help_text="Training provider or authority that issued the certificate"
    )
    
    issue_date = models.DateField()
    expiry_date = models.DateField()
    
    # Training program linkage
    training_program = models.ForeignKey(
        TrainingProgram,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        help_text="Associated training program if completed internally"
    )
    
    training_record = models.ForeignKey(
        TrainingRecord,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        help_text="Associated training record if completed internally"
    )
    
    # Competency areas covered
    hazard_classes_covered = models.JSONField(
        default=list,
        help_text="List of dangerous goods classes covered by this certificate"
    )
    
    competency_areas = models.JSONField(
        default=list,
        help_text="Specific competency areas (e.g., packaging, loading, documentation)"
    )
    
    # Status
    status = models.CharField(
        max_length=15,
        choices=CertificateStatus.choices,
        default=CertificateStatus.VALID
    )
    
    # Verification
    verified_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='verified_adg_certificates'
    )
    verified_at = models.DateTimeField(null=True, blank=True)
    
    # File attachment
    certificate_file = models.FileField(
        upload_to='adg_certificates/',
        null=True,
        blank=True,
        help_text="Scanned copy of the certificate"
    )
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = "ADG Driver Certificate"
        verbose_name_plural = "ADG Driver Certificates"
        indexes = [
            models.Index(fields=['driver', 'certificate_type']),
            models.Index(fields=['expiry_date']),
            models.Index(fields=['status']),
        ]
        unique_together = ['driver', 'certificate_type', 'certificate_number']
    
    def __str__(self):
        return f"{self.driver.get_full_name()} - {self.get_certificate_type_display()}"
    
    def save(self, *args, **kwargs):
        self.update_status()
        super().save(*args, **kwargs)
    
    def update_status(self):
        """Update certificate status based on expiry date"""
        today = timezone.now().date()
        days_until_expiry = (self.expiry_date - today).days
        
        if days_until_expiry < 0:
            self.status = self.CertificateStatus.EXPIRED
        elif days_until_expiry <= 30:
            self.status = self.CertificateStatus.EXPIRING_SOON
        else:
            self.status = self.CertificateStatus.VALID
    
    def covers_hazard_class(self, hazard_class: str) -> bool:
        """Check if certificate covers a specific hazard class"""
        if not self.hazard_classes_covered:
            return False
        
        # Convert class to string format and check
        class_str = str(hazard_class).replace('CLASS_', '').replace('class_', '')
        return class_str in self.hazard_classes_covered or 'ALL' in self.hazard_classes_covered


class DriverCompetencyProfile(models.Model):
    """Comprehensive driver competency and qualification profile"""
    
    class OverallStatus(models.TextChoices):
        FULLY_QUALIFIED = 'FULLY_QUALIFIED', 'Fully Qualified'
        PARTIALLY_QUALIFIED = 'PARTIALLY_QUALIFIED', 'Partially Qualified'
        NOT_QUALIFIED = 'NOT_QUALIFIED', 'Not Qualified'
        EXPIRED_QUALIFICATIONS = 'EXPIRED_QUALIFICATIONS', 'Expired Qualifications'
        PENDING_VERIFICATION = 'PENDING_VERIFICATION', 'Pending Verification'
    
    driver = models.OneToOneField(
        User,
        on_delete=models.CASCADE,
        related_name='competency_profile',
        limit_choices_to={'role': 'DRIVER'}
    )
    
    # Overall qualification status
    overall_status = models.CharField(
        max_length=25,
        choices=OverallStatus.choices,
        default=OverallStatus.PENDING_VERIFICATION
    )
    
    # Qualified hazard classes
    qualified_hazard_classes = models.JSONField(
        default=list,
        help_text="List of dangerous goods classes the driver is qualified for"
    )
    
    # Experience tracking
    years_experience = models.DecimalField(
        max_digits=4,
        decimal_places=1,
        null=True,
        blank=True,
        help_text="Years of dangerous goods driving experience"
    )
    
    total_loads_transported = models.IntegerField(
        default=0,
        help_text="Total number of dangerous goods loads transported"
    )
    
    last_incident_date = models.DateField(
        null=True,
        blank=True,
        help_text="Date of last safety incident (if any)"
    )
    
    # Competency assessment
    last_assessment_date = models.DateField(
        null=True,
        blank=True,
        help_text="Date of last competency assessment"
    )
    
    next_assessment_due = models.DateField(
        null=True,
        blank=True,
        help_text="Next scheduled competency assessment"
    )
    
    assessment_score = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        null=True,
        blank=True,
        help_text="Last competency assessment score (percentage)"
    )
    
    # Medical fitness
    medical_certificate_expiry = models.DateField(
        null=True,
        blank=True,
        help_text="Commercial driver medical certificate expiry"
    )
    
    # Notes and remarks
    competency_notes = models.TextField(
        blank=True,
        help_text="Additional notes about driver competency"
    )
    
    restrictions = models.JSONField(
        default=list,
        help_text="Specific restrictions on driver's dangerous goods transport"
    )
    
    # Auto-calculated fields
    compliance_percentage = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        default=0,
        help_text="Overall compliance percentage"
    )
    
    last_updated = models.DateTimeField(auto_now=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        verbose_name = "Driver Competency Profile"
        verbose_name_plural = "Driver Competency Profiles"
    
    def __str__(self):
        return f"{self.driver.get_full_name()} - {self.get_overall_status_display()}"
    
    def refresh_qualification_status(self):
        """Refresh the driver's qualification status based on current certificates and licenses"""
        issues = []
        qualified_classes = set()
        
        # Check driver license
        valid_license = self.driver.driver_licenses.filter(
            status__in=[DriverLicense.LicenseStatus.VALID, DriverLicense.LicenseStatus.EXPIRING_SOON]
        ).first()
        
        if not valid_license:
            issues.append("No valid driver license")
        elif not valid_license.is_valid_for_dangerous_goods:
            issues.append("Driver license class not suitable for dangerous goods")
        
        # Check basic ADG certification
        basic_adg = self.driver.adg_certificates.filter(
            certificate_type=ADGDriverCertificate.CertificateType.BASIC_ADG,
            status__in=[ADGDriverCertificate.CertificateStatus.VALID, 
                       ADGDriverCertificate.CertificateStatus.EXPIRING_SOON]
        ).first()
        
        if not basic_adg:
            issues.append("No valid basic ADG training certificate")
        else:
            qualified_classes.update(basic_adg.hazard_classes_covered)
        
        # Check class-specific certifications
        class_certs = self.driver.adg_certificates.filter(
            certificate_type=ADGDriverCertificate.CertificateType.CLASS_SPECIFIC,
            status__in=[ADGDriverCertificate.CertificateStatus.VALID,
                       ADGDriverCertificate.CertificateStatus.EXPIRING_SOON]
        )
        
        for cert in class_certs:
            qualified_classes.update(cert.hazard_classes_covered)
        
        # Check medical certificate
        if self.medical_certificate_expiry:
            days_until_medical_expiry = (self.medical_certificate_expiry - timezone.now().date()).days
            if days_until_medical_expiry < 0:
                issues.append("Medical certificate expired")
            elif days_until_medical_expiry <= 30:
                issues.append("Medical certificate expiring soon")
        
        # Update qualified classes
        self.qualified_hazard_classes = list(qualified_classes)
        
        # Determine overall status
        if not issues:
            self.overall_status = self.OverallStatus.FULLY_QUALIFIED
        elif len(issues) == 1 and "expiring soon" in issues[0]:
            self.overall_status = self.OverallStatus.PARTIALLY_QUALIFIED
        elif any("expired" in issue for issue in issues):
            self.overall_status = self.OverallStatus.EXPIRED_QUALIFICATIONS
        elif qualified_classes:
            self.overall_status = self.OverallStatus.PARTIALLY_QUALIFIED
        else:
            self.overall_status = self.OverallStatus.NOT_QUALIFIED
        
        # Calculate compliance percentage
        total_checks = 4  # License, Basic ADG, Medical, Experience
        passed_checks = 0
        
        if valid_license and valid_license.is_valid_for_dangerous_goods:
            passed_checks += 1
        if basic_adg:
            passed_checks += 1
        if self.medical_certificate_expiry and (self.medical_certificate_expiry - timezone.now().date()).days >= 0:
            passed_checks += 1
        if self.years_experience and self.years_experience >= 1:
            passed_checks += 1
        
        self.compliance_percentage = (passed_checks / total_checks) * 100
        
        self.save()
        return issues
    
    def is_qualified_for_hazard_class(self, hazard_class: str) -> Tuple[bool, List[str]]:
        """Check if driver is qualified for a specific hazard class"""
        issues = []
        
        # Check overall qualification status
        if self.overall_status == self.OverallStatus.NOT_QUALIFIED:
            issues.append("Driver is not qualified for dangerous goods transport")
            return False, issues
        
        if self.overall_status == self.OverallStatus.EXPIRED_QUALIFICATIONS:
            issues.append("Driver has expired qualifications")
            return False, issues
        
        # Check specific hazard class qualification
        class_str = str(hazard_class).replace('CLASS_', '').replace('class_', '')
        
        if class_str not in self.qualified_hazard_classes and 'ALL' not in self.qualified_hazard_classes:
            issues.append(f"Driver not qualified for hazard class {class_str}")
            return False, issues
        
        # Check for specific restrictions
        if f"NO_CLASS_{class_str}" in self.restrictions:
            issues.append(f"Driver has restrictions on hazard class {class_str}")
            return False, issues
        
        return True, issues


class DriverQualificationService:
    """Service for managing driver qualifications and competency validation"""
    
    @staticmethod
    def validate_driver_for_shipment(driver: User, dangerous_goods_classes: List[str]) -> Dict:
        """Validate if a driver is qualified for a shipment with specific dangerous goods"""
        
        # Get or create competency profile
        profile, created = DriverCompetencyProfile.objects.get_or_create(driver=driver)
        
        # Refresh qualification status
        profile_issues = profile.refresh_qualification_status()
        
        validation_result = {
            'driver_id': driver.id,
            'driver_name': driver.get_full_name(),
            'overall_qualified': True,
            'overall_status': profile.overall_status,
            'compliance_percentage': float(profile.compliance_percentage),
            'profile_issues': profile_issues,
            'class_validations': {},
            'critical_issues': [],
            'warnings': []
        }
        
        # Validate each dangerous goods class
        for dg_class in dangerous_goods_classes:
            qualified, class_issues = profile.is_qualified_for_hazard_class(dg_class)
            
            validation_result['class_validations'][dg_class] = {
                'qualified': qualified,
                'issues': class_issues
            }
            
            if not qualified:
                validation_result['overall_qualified'] = False
                validation_result['critical_issues'].extend(class_issues)
        
        # Add warnings for expiring qualifications
        expiring_licenses = driver.driver_licenses.filter(
            status=DriverLicense.LicenseStatus.EXPIRING_SOON
        )
        for license in expiring_licenses:
            validation_result['warnings'].append(f"Driver license {license.license_number} expires on {license.expiry_date}")
        
        expiring_certs = driver.adg_certificates.filter(
            status=ADGDriverCertificate.CertificateStatus.EXPIRING_SOON
        )
        for cert in expiring_certs:
            validation_result['warnings'].append(f"{cert.get_certificate_type_display()} expires on {cert.expiry_date}")
        
        return validation_result
    
    @staticmethod
    def get_qualified_drivers_for_classes(dangerous_goods_classes: List[str]) -> List[Dict]:
        """Get all drivers qualified for specific dangerous goods classes"""
        
        # Get all drivers
        drivers = User.objects.filter(role='DRIVER', is_active=True)
        qualified_drivers = []
        
        for driver in drivers:
            validation = DriverQualificationService.validate_driver_for_shipment(
                driver, dangerous_goods_classes
            )
            
            if validation['overall_qualified']:
                qualified_drivers.append({
                    'driver': driver,
                    'validation_result': validation,
                    'qualified_classes': validation['class_validations']
                })
        
        return qualified_drivers
    
    @staticmethod
    def generate_fleet_competency_report(company_id: Optional[str] = None) -> Dict:
        """Generate comprehensive fleet driver competency report"""
        
        drivers = User.objects.filter(role='DRIVER', is_active=True)
        if company_id:
            drivers = drivers.filter(company_id=company_id)
        
        report = {
            'total_drivers': drivers.count(),
            'fully_qualified': 0,
            'partially_qualified': 0,
            'not_qualified': 0,
            'expired_qualifications': 0,
            'pending_verification': 0,
            'average_compliance': 0,
            'drivers_by_class': {},
            'expiring_qualifications': [],
            'compliance_summary': [],
            'generated_at': timezone.now(),
            'regulatory_framework': 'ADG Code 7.9'
        }
        
        total_compliance = 0
        
        for driver in drivers:
            profile, created = DriverCompetencyProfile.objects.get_or_create(driver=driver)
            if created or not profile.last_updated or \
               (timezone.now() - profile.last_updated).days > 7:
                profile.refresh_qualification_status()
            
            # Count by status
            if profile.overall_status == DriverCompetencyProfile.OverallStatus.FULLY_QUALIFIED:
                report['fully_qualified'] += 1
            elif profile.overall_status == DriverCompetencyProfile.OverallStatus.PARTIALLY_QUALIFIED:
                report['partially_qualified'] += 1
            elif profile.overall_status == DriverCompetencyProfile.OverallStatus.NOT_QUALIFIED:
                report['not_qualified'] += 1
            elif profile.overall_status == DriverCompetencyProfile.OverallStatus.EXPIRED_QUALIFICATIONS:
                report['expired_qualifications'] += 1
            else:
                report['pending_verification'] += 1
            
            total_compliance += profile.compliance_percentage
            
            # Count drivers by qualified classes
            for hazard_class in profile.qualified_hazard_classes:
                if hazard_class not in report['drivers_by_class']:
                    report['drivers_by_class'][hazard_class] = 0
                report['drivers_by_class'][hazard_class] += 1
            
            # Check for expiring qualifications
            expiring_licenses = driver.driver_licenses.filter(
                status=DriverLicense.LicenseStatus.EXPIRING_SOON
            )
            expiring_certs = driver.adg_certificates.filter(
                status=ADGDriverCertificate.CertificateStatus.EXPIRING_SOON
            )
            
            if expiring_licenses.exists() or expiring_certs.exists():
                expiring_info = {
                    'driver_id': driver.id,
                    'driver_name': driver.get_full_name(),
                    'expiring_licenses': [
                        {
                            'license_number': lic.license_number,
                            'expiry_date': lic.expiry_date,
                            'days_until_expiry': (lic.expiry_date - timezone.now().date()).days
                        }
                        for lic in expiring_licenses
                    ],
                    'expiring_certificates': [
                        {
                            'certificate_type': cert.get_certificate_type_display(),
                            'certificate_number': cert.certificate_number,
                            'expiry_date': cert.expiry_date,
                            'days_until_expiry': (cert.expiry_date - timezone.now().date()).days
                        }
                        for cert in expiring_certs
                    ]
                }
                report['expiring_qualifications'].append(expiring_info)
            
            # Add to compliance summary
            report['compliance_summary'].append({
                'driver_id': driver.id,
                'driver_name': driver.get_full_name(),
                'status': profile.overall_status,
                'compliance_percentage': float(profile.compliance_percentage),
                'qualified_classes': profile.qualified_hazard_classes,
                'years_experience': float(profile.years_experience) if profile.years_experience else None
            })
        
        # Calculate average compliance
        if drivers.count() > 0:
            report['average_compliance'] = round(total_compliance / drivers.count(), 2)
        
        return report


def setup_adg_training_programs():
    """Set up ADG-specific training programs in the system"""
    from .models import TrainingCategory, TrainingProgram
    
    # Create ADG training category
    adg_category, created = TrainingCategory.objects.get_or_create(
        name='ADG Dangerous Goods Training',
        defaults={
            'description': 'Australian Dangerous Goods Code training programs for drivers',
            'is_mandatory': True,
            'renewal_period_months': 24
        }
    )
    
    adg_programs = [
        {
            'name': 'ADG Basic Dangerous Goods Driver Training',
            'description': 'Comprehensive ADG Code 7.9 training for dangerous goods transport drivers',
            'delivery_method': 'blended',
            'difficulty_level': 'intermediate',
            'duration_hours': 16,
            'learning_objectives': 'Understand ADG Code requirements, safety procedures, emergency response, and documentation',
            'content_outline': 'ADG Code overview, Classification, Packaging, Marking and Labeling, Loading and Segregation, Transport Documents, Emergency Procedures',
            'is_mandatory': True,
            'compliance_required': True,
            'passing_score': 80,
            'certificate_validity_months': 24
        },
        {
            'name': 'ADG Load Restraint Training',
            'description': 'Proper load restraint techniques for dangerous goods transport',
            'delivery_method': 'hands_on',
            'difficulty_level': 'intermediate',
            'duration_hours': 8,
            'learning_objectives': 'Master safe loading, securing, and restraint of dangerous goods loads',
            'content_outline': 'Load restraint principles, Equipment selection, Securing techniques, Weight distribution, Inspection procedures',
            'is_mandatory': True,
            'compliance_required': True,
            'passing_score': 85,
            'certificate_validity_months': 24
        },
        {
            'name': 'ADG Security Awareness Training',
            'description': 'Security awareness for dangerous goods transport',
            'delivery_method': 'online',
            'difficulty_level': 'beginner',
            'duration_hours': 4,
            'learning_objectives': 'Recognize security risks and implement appropriate security measures',
            'content_outline': 'Security threats, Risk assessment, Security planning, Incident reporting, Personal security',
            'is_mandatory': True,
            'compliance_required': True,
            'passing_score': 75,
            'certificate_validity_months': 24
        },
        {
            'name': 'ADG Emergency Response Training',
            'description': 'Emergency response procedures for dangerous goods incidents',
            'delivery_method': 'classroom',
            'difficulty_level': 'advanced',
            'duration_hours': 12,
            'learning_objectives': 'Respond effectively to dangerous goods emergencies and incidents',
            'content_outline': 'Emergency procedures, First aid, Fire fighting, Spill response, Evacuation procedures, Emergency contacts',
            'is_mandatory': False,
            'compliance_required': False,
            'passing_score': 80,
            'certificate_validity_months': 12
        }
    ]
    
    created_programs = []
    for program_data in adg_programs:
        program, created = TrainingProgram.objects.get_or_create(
            name=program_data['name'],
            category=adg_category,
            defaults=program_data
        )
        if created:
            created_programs.append(program)
    
    return adg_category, created_programs