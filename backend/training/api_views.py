# training/api_views.py

from rest_framework import viewsets, permissions, status, views
from rest_framework.decorators import action
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import SearchFilter, OrderingFilter
from django.utils import timezone
from django.contrib.auth import get_user_model

from .models import (
    TrainingCategory, TrainingProgram, TrainingSession, 
    TrainingEnrollment, TrainingRecord, ComplianceRequirement
)
from .adg_driver_qualifications import (
    DriverLicense, ADGDriverCertificate, DriverCompetencyProfile,
    DriverQualificationService
)
from .serializers import (
    TrainingCategorySerializer, TrainingProgramSerializer, TrainingSessionSerializer,
    TrainingEnrollmentSerializer, TrainingRecordSerializer, ComplianceRequirementSerializer,
    DriverLicenseSerializer, ADGDriverCertificateSerializer, DriverCompetencyProfileSerializer,
    DriverQualificationValidationSerializer, FleetCompetencyReportSerializer
)

User = get_user_model()


class TrainingCategoryViewSet(viewsets.ReadOnlyModelViewSet):
    """API endpoint for training categories"""
    queryset = TrainingCategory.objects.all()
    serializer_class = TrainingCategorySerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['is_mandatory']
    search_fields = ['name', 'description']
    ordering_fields = ['name', 'created_at']
    ordering = ['name']


class TrainingProgramViewSet(viewsets.ReadOnlyModelViewSet):
    """API endpoint for training programs"""
    queryset = TrainingProgram.objects.select_related('category', 'instructor')
    serializer_class = TrainingProgramSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = [
        'category', 'delivery_method', 'difficulty_level', 
        'is_mandatory', 'compliance_required', 'is_active'
    ]
    search_fields = ['name', 'description', 'learning_objectives']
    ordering_fields = ['name', 'duration_hours', 'created_at']
    ordering = ['category__name', 'name']


class TrainingRecordViewSet(viewsets.ReadOnlyModelViewSet):
    """API endpoint for training records"""
    queryset = TrainingRecord.objects.select_related('employee', 'program', 'enrollment')
    serializer_class = TrainingRecordSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['employee', 'program', 'status', 'passed']
    search_fields = ['employee__username', 'employee__first_name', 'employee__last_name', 'program__name']
    ordering_fields = ['completed_at', 'certificate_expires_at', 'score']
    ordering = ['-completed_at']

    def get_queryset(self):
        """Filter records by current user if not staff"""
        queryset = super().get_queryset()
        if not self.request.user.is_staff:
            queryset = queryset.filter(employee=self.request.user)
        return queryset


# ADG Driver Qualification ViewSets

class DriverLicenseViewSet(viewsets.ModelViewSet):
    """API endpoint for driver licenses"""
    queryset = DriverLicense.objects.select_related('driver', 'verified_by')
    serializer_class = DriverLicenseSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['driver', 'license_class', 'state_issued', 'status']
    search_fields = ['license_number', 'driver__username', 'driver__first_name', 'driver__last_name']
    ordering_fields = ['issue_date', 'expiry_date', 'created_at']
    ordering = ['-expiry_date']

    def get_queryset(self):
        """Filter licenses by user permissions"""
        queryset = super().get_queryset()
        if not self.request.user.is_staff:
            # Non-staff users can only see their own licenses
            queryset = queryset.filter(driver=self.request.user)
        return queryset

    @action(detail=False, methods=['get'])
    def expiring_soon(self, request):
        """Get driver licenses expiring within next 30 days"""
        from datetime import timedelta
        cutoff_date = timezone.now().date() + timedelta(days=30)
        
        licenses = self.get_queryset().filter(
            expiry_date__lte=cutoff_date,
            expiry_date__gte=timezone.now().date(),
            status__in=[DriverLicense.LicenseStatus.VALID, DriverLicense.LicenseStatus.EXPIRING_SOON]
        )
        
        serializer = self.get_serializer(licenses, many=True)
        return Response(serializer.data)


class ADGDriverCertificateViewSet(viewsets.ModelViewSet):
    """API endpoint for ADG driver certificates"""
    queryset = ADGDriverCertificate.objects.select_related('driver', 'training_program', 'verified_by')
    serializer_class = ADGDriverCertificateSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['driver', 'certificate_type', 'status', 'issuing_authority']
    search_fields = [
        'certificate_number', 'driver__username', 'driver__first_name', 
        'driver__last_name', 'issuing_authority'
    ]
    ordering_fields = ['issue_date', 'expiry_date', 'created_at']
    ordering = ['-expiry_date']

    def get_queryset(self):
        """Filter certificates by user permissions"""
        queryset = super().get_queryset()
        if not self.request.user.is_staff:
            queryset = queryset.filter(driver=self.request.user)
        return queryset

    @action(detail=False, methods=['get'])
    def expiring_soon(self, request):
        """Get ADG certificates expiring within next 30 days"""
        from datetime import timedelta
        cutoff_date = timezone.now().date() + timedelta(days=30)
        
        certificates = self.get_queryset().filter(
            expiry_date__lte=cutoff_date,
            expiry_date__gte=timezone.now().date(),
            status__in=[ADGDriverCertificate.CertificateStatus.VALID, 
                       ADGDriverCertificate.CertificateStatus.EXPIRING_SOON]
        )
        
        serializer = self.get_serializer(certificates, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def by_hazard_class(self, request):
        """Get certificates that cover specific hazard classes"""
        hazard_classes = request.query_params.getlist('hazard_classes')
        
        if not hazard_classes:
            return Response(
                {'error': 'hazard_classes parameter is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        certificates = []
        for cert in self.get_queryset().filter(status=ADGDriverCertificate.CertificateStatus.VALID):
            for hazard_class in hazard_classes:
                if cert.covers_hazard_class(hazard_class):
                    certificates.append(cert)
                    break
        
        serializer = self.get_serializer(certificates, many=True)
        return Response(serializer.data)


class DriverCompetencyProfileViewSet(viewsets.ModelViewSet):
    """API endpoint for driver competency profiles"""
    queryset = DriverCompetencyProfile.objects.select_related('driver')
    serializer_class = DriverCompetencyProfileSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['overall_status', 'driver']
    search_fields = ['driver__username', 'driver__first_name', 'driver__last_name']
    ordering_fields = ['compliance_percentage', 'last_assessment_date', 'created_at']
    ordering = ['-compliance_percentage']

    def get_queryset(self):
        """Filter profiles by user permissions"""
        queryset = super().get_queryset()
        if not self.request.user.is_staff:
            queryset = queryset.filter(driver=self.request.user)
        return queryset

    @action(detail=True, methods=['post'])
    def refresh_status(self, request, pk=None):
        """Refresh the driver's qualification status"""
        profile = self.get_object()
        issues = profile.refresh_qualification_status()
        
        serializer = self.get_serializer(profile)
        return Response({
            'profile': serializer.data,
            'issues_found': issues,
            'updated_at': timezone.now()
        })

    @action(detail=False, methods=['get'])
    def qualified_for_classes(self, request):
        """Get drivers qualified for specific hazard classes"""
        hazard_classes = request.query_params.getlist('hazard_classes')
        
        if not hazard_classes:
            return Response(
                {'error': 'hazard_classes parameter is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        qualified_drivers = DriverQualificationService.get_qualified_drivers_for_classes(hazard_classes)
        
        result = []
        for driver_info in qualified_drivers:
            driver_data = {
                'driver_id': driver_info['driver'].id,
                'driver_name': driver_info['driver'].get_full_name(),
                'overall_qualified': driver_info['validation_result']['overall_qualified'],
                'compliance_percentage': driver_info['validation_result']['compliance_percentage'],
                'qualified_classes': driver_info['qualified_classes']
            }
            result.append(driver_data)
        
        return Response({
            'qualified_drivers': result,
            'total_qualified': len(result),
            'hazard_classes_requested': hazard_classes
        })


# API Views for Driver Qualification Validation

class DriverQualificationValidationView(views.APIView):
    """Validate driver qualifications for specific dangerous goods"""
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        """
        Validate driver qualifications for dangerous goods transport.
        
        Expected payload:
        {
            "driver_id": "uuid",
            "dangerous_goods_classes": ["3", "8"]
        }
        """
        driver_id = request.data.get('driver_id')
        dangerous_goods_classes = request.data.get('dangerous_goods_classes', [])
        
        if not driver_id:
            return Response(
                {'error': 'driver_id is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        if not dangerous_goods_classes:
            return Response(
                {'error': 'dangerous_goods_classes is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            driver = User.objects.get(id=driver_id, role='DRIVER')
        except User.DoesNotExist:
            return Response(
                {'error': 'Driver not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        validation_result = DriverQualificationService.validate_driver_for_shipment(
            driver, dangerous_goods_classes
        )
        
        serializer = DriverQualificationValidationSerializer(validation_result)
        return Response(serializer.data)


class FleetCompetencyReportView(views.APIView):
    """Generate fleet driver competency reports"""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        """Generate comprehensive fleet competency report"""
        company_id = request.query_params.get('company_id')
        
        # Only allow staff or company users to access fleet reports
        if not request.user.is_staff and company_id != str(request.user.company_id):
            return Response(
                {'error': 'Permission denied'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        report = DriverQualificationService.generate_fleet_competency_report(company_id)
        
        serializer = FleetCompetencyReportSerializer(report)
        return Response(serializer.data)


class QualifiedDriversForShipmentView(views.APIView):
    """Get qualified drivers for a specific shipment"""
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        """
        Get drivers qualified for shipment's dangerous goods.
        
        Expected payload:
        {
            "shipment_id": "uuid"
        }
        OR
        {
            "dangerous_goods_classes": ["3", "8"]
        }
        """
        shipment_id = request.data.get('shipment_id')
        dangerous_goods_classes = request.data.get('dangerous_goods_classes')
        
        if shipment_id:
            # Get dangerous goods classes from shipment
            try:
                from shipments.models import Shipment
                shipment = Shipment.objects.get(id=shipment_id)
                
                # Extract dangerous goods classes from shipment items
                dangerous_goods_classes = []
                for item in shipment.items.filter(is_dangerous_good=True):
                    if item.dangerous_good_entry and item.dangerous_good_entry.hazard_class:
                        hazard_class = item.dangerous_good_entry.hazard_class.split('.')[0]  # Get main class
                        if hazard_class not in dangerous_goods_classes:
                            dangerous_goods_classes.append(hazard_class)
                
            except Shipment.DoesNotExist:
                return Response(
                    {'error': 'Shipment not found'},
                    status=status.HTTP_404_NOT_FOUND
                )
        
        elif not dangerous_goods_classes:
            return Response(
                {'error': 'Either shipment_id or dangerous_goods_classes is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        if not dangerous_goods_classes:
            return Response(
                {'error': 'No dangerous goods found in shipment'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        qualified_drivers = DriverQualificationService.get_qualified_drivers_for_classes(
            dangerous_goods_classes
        )
        
        result = []
        for driver_info in qualified_drivers:
            driver_data = {
                'driver_id': driver_info['driver'].id,
                'driver_name': driver_info['driver'].get_full_name(),
                'email': driver_info['driver'].email,
                'phone': getattr(driver_info['driver'], 'phone', None),
                'overall_qualified': driver_info['validation_result']['overall_qualified'],
                'compliance_percentage': driver_info['validation_result']['compliance_percentage'],
                'qualified_classes': driver_info['validation_result']['class_validations'],
                'warnings': driver_info['validation_result']['warnings']
            }
            result.append(driver_data)
        
        return Response({
            'qualified_drivers': result,
            'total_qualified': len(result),
            'dangerous_goods_classes': dangerous_goods_classes,
            'shipment_id': shipment_id
        })