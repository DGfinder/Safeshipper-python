# training/api_views.py

from rest_framework import viewsets, permissions, status, views
from rest_framework.decorators import action
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import SearchFilter, OrderingFilter
from django.utils import timezone
from django.contrib.auth import get_user_model
from django.db import models

from .models import (
    TrainingCategory, TrainingProgram, TrainingSession, 
    TrainingEnrollment, TrainingRecord, ComplianceRequirement,
    TrainingModule, UserTrainingRecord, UserModuleProgress
)
from .adg_driver_qualifications import (
    DriverLicense, ADGDriverCertificate, DriverCompetencyProfile,
    DriverQualificationService
)
from .serializers import (
    TrainingCategorySerializer, TrainingProgramSerializer, TrainingSessionSerializer,
    TrainingEnrollmentSerializer, TrainingRecordSerializer, ComplianceRequirementSerializer,
    DriverLicenseSerializer, ADGDriverCertificateSerializer, DriverCompetencyProfileSerializer,
    DriverQualificationValidationSerializer, FleetCompetencyReportSerializer,
    TrainingModuleSerializer, TrainingModuleLightSerializer, UserTrainingRecordSerializer,
    UserTrainingRecordListSerializer, UserModuleProgressSerializer, TrainingExpirationReportSerializer
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


# Enhanced Training Management API with Expiration Tracking

class TrainingModuleViewSet(viewsets.ModelViewSet):
    """
    API endpoint for training modules with comprehensive CRUD operations.
    Provides module management within training programs.
    """
    queryset = TrainingModule.objects.select_related('program', 'created_by')
    serializer_class = TrainingModuleSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    
    filterset_fields = [
        'program', 'module_type', 'status', 'is_mandatory',
        'program__category', 'program__is_active'
    ]
    search_fields = ['title', 'description', 'content', 'program__name']
    ordering_fields = ['order', 'title', 'estimated_duration_minutes', 'created_at']
    ordering = ['program', 'order']
    
    def get_queryset(self):
        """Filter modules based on program access and status"""
        queryset = super().get_queryset()
        
        # Only show published modules to non-staff users
        if not self.request.user.is_staff:
            queryset = queryset.filter(status='published')
        
        return queryset
    
    def get_serializer_class(self):
        """Use light serializer for list view"""
        if self.action == 'list':
            return TrainingModuleLightSerializer
        return TrainingModuleSerializer
    
    @action(detail=False, methods=['get'])
    def by_program(self, request):
        """Get modules for a specific program"""
        program_id = request.query_params.get('program_id')
        
        if not program_id:
            return Response(
                {'error': 'program_id parameter is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        modules = self.get_queryset().filter(
            program_id=program_id,
            status='published'
        ).order_by('order')
        
        serializer = TrainingModuleLightSerializer(modules, many=True)
        return Response({
            'modules': serializer.data,
            'total_count': modules.count(),
            'program_id': program_id
        })
    
    @action(detail=True, methods=['post'])
    def reorder(self, request, pk=None):
        """Reorder module within its program"""
        module = self.get_object()
        new_order = request.data.get('new_order')
        
        if new_order is None:
            return Response(
                {'error': 'new_order is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            new_order = int(new_order)
        except (ValueError, TypeError):
            return Response(
                {'error': 'new_order must be an integer'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Get other modules in the same program
        program_modules = TrainingModule.objects.filter(
            program=module.program
        ).exclude(id=module.id).order_by('order')
        
        # Reorder modules
        old_order = module.order
        module.order = new_order
        module.save()
        
        # Update other modules' order
        if new_order < old_order:
            # Moving up - shift others down
            program_modules.filter(
                order__gte=new_order,
                order__lt=old_order
            ).update(order=models.F('order') + 1)
        else:
            # Moving down - shift others up
            program_modules.filter(
                order__gt=old_order,
                order__lte=new_order
            ).update(order=models.F('order') - 1)
        
        return Response({
            'message': 'Module reordered successfully',
            'old_order': old_order,
            'new_order': new_order
        })


class UserTrainingRecordViewSet(viewsets.ModelViewSet):
    """
    Comprehensive API endpoint for user training records with expiration tracking.
    Provides detailed progress monitoring and compliance management.
    """
    queryset = UserTrainingRecord.objects.select_related(
        'user', 'program', 'enrollment', 'assigned_by'
    ).prefetch_related('module_progress__module')
    serializer_class = UserTrainingRecordSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    
    filterset_fields = [
        'user', 'program', 'progress_status', 'compliance_status',
        'is_mandatory_for_role', 'passed', 'supervisor_approved',
        'program__category', 'program__is_mandatory'
    ]
    search_fields = [
        'user__username', 'user__first_name', 'user__last_name',
        'program__name', 'certificate_number', 'notes'
    ]
    ordering_fields = [
        'created_at', 'started_at', 'completed_at', 'last_accessed_at',
        'overall_progress_percentage', 'certificate_expires_at', 'renewal_due_date'
    ]
    ordering = ['-created_at']
    
    def get_queryset(self):
        """Filter records based on user permissions"""
        queryset = super().get_queryset()
        
        # Non-staff users can only see their own records
        if not self.request.user.is_staff:
            queryset = queryset.filter(user=self.request.user)
        
        return queryset
    
    def get_serializer_class(self):
        """Use list serializer for better performance in list view"""
        if self.action == 'list':
            return UserTrainingRecordListSerializer
        return UserTrainingRecordSerializer
    
    def perform_create(self, serializer):
        """Auto-assign training based on user's role and requirements"""
        user_record = serializer.save()
        
        # Check if this is mandatory training for user's role
        user_role = getattr(user_record.user, 'role', None)
        if user_role and user_record.program.is_mandatory:
            # Set as mandatory and calculate due date
            user_record.is_mandatory_for_role = True
            
            # Set required completion date (30 days from assignment)
            from datetime import timedelta
            user_record.required_by_date = timezone.now().date() + timedelta(days=30)
            user_record.save()
    
    @action(detail=True, methods=['post'])
    def start_training(self, request, pk=None):
        """Start or resume training for a user"""
        record = self.get_object()
        
        if record.progress_status in ['completed', 'expired']:
            return Response(
                {'error': 'Training is already completed or expired'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Mark as started if not already
        if record.progress_status == 'not_started':
            record.progress_status = 'in_progress'
            record.started_at = timezone.now()
        
        record.last_accessed_at = timezone.now()
        record.save()
        
        # Get next module to work on
        next_module = record.get_next_module()
        
        serializer = self.get_serializer(record)
        return Response({
            'record': serializer.data,
            'next_module': {
                'id': next_module.id,
                'title': next_module.title,
                'module_type': next_module.module_type
            } if next_module else None,
            'message': 'Training started successfully'
        })
    
    @action(detail=True, methods=['post'])
    def complete_training(self, request, pk=None):
        """Mark training as completed and issue certificate if applicable"""
        record = self.get_object()
        final_score = request.data.get('final_score')
        
        if record.progress_status == 'completed':
            return Response(
                {'error': 'Training is already completed'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Validate completion requirements
        if record.modules_completed < record.total_modules:
            return Response(
                {'error': 'All mandatory modules must be completed first'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Update completion status
        record.progress_status = 'completed'
        record.completed_at = timezone.now()
        record.overall_progress_percentage = 100.00
        
        if final_score is not None:
            record.latest_score = final_score
            if record.best_score is None or final_score > record.best_score:
                record.best_score = final_score
            
            # Check if passed
            passing_score = record.program.passing_score
            record.passed = final_score >= passing_score if passing_score else True
        else:
            record.passed = True
        
        # Issue certificate if program requires it
        if record.program.compliance_required and record.passed:
            record.certificate_issued = True
            record.certificate_issued_at = timezone.now()
            
            # Set expiration date
            if record.program.certificate_validity_months:
                from dateutil.relativedelta import relativedelta
                record.certificate_expires_at = timezone.now() + relativedelta(
                    months=record.program.certificate_validity_months
                )
                
                # Set renewal due date (30 days before expiration)
                record.renewal_due_date = (record.certificate_expires_at - relativedelta(days=30)).date()
        
        # Update compliance status
        record._update_compliance_status()
        record.save()
        
        serializer = self.get_serializer(record)
        return Response({
            'record': serializer.data,
            'message': 'Training completed successfully',
            'certificate_issued': record.certificate_issued
        })
    
    @action(detail=False, methods=['get'])
    def expiring_soon(self, request):
        """Get training records expiring within specified days"""
        days_ahead = int(request.query_params.get('days', 30))
        
        from datetime import timedelta
        cutoff_date = timezone.now() + timedelta(days=days_ahead)
        
        records = self.get_queryset().filter(
            certificate_expires_at__lte=cutoff_date,
            certificate_expires_at__gte=timezone.now(),
            compliance_status__in=['compliant', 'pending_renewal']
        )
        
        serializer = UserTrainingRecordListSerializer(records, many=True)
        return Response({
            'expiring_records': serializer.data,
            'total_count': records.count(),
            'days_ahead': days_ahead
        })
    
    @action(detail=False, methods=['get'])
    def overdue(self, request):
        """Get overdue training records"""
        today = timezone.now().date()
        
        records = self.get_queryset().filter(
            models.Q(required_by_date__lt=today, progress_status__in=['not_started', 'in_progress']) |
            models.Q(certificate_expires_at__lt=timezone.now(), compliance_status='non_compliant')
        )
        
        serializer = UserTrainingRecordListSerializer(records, many=True)
        return Response({
            'overdue_records': serializer.data,
            'total_count': records.count()
        })
    
    @action(detail=False, methods=['get'])
    def compliance_report(self, request):
        """Generate comprehensive compliance report"""
        company_id = request.query_params.get('company_id')
        
        queryset = self.get_queryset()
        if company_id:
            queryset = queryset.filter(user__company_id=company_id)
        
        # Calculate various compliance metrics
        total_records = queryset.count()
        
        # Expiring soon (30 days)
        from datetime import timedelta
        expiring_cutoff = timezone.now() + timedelta(days=30)
        expiring_soon = queryset.filter(
            certificate_expires_at__lte=expiring_cutoff,
            certificate_expires_at__gte=timezone.now(),
            compliance_status__in=['compliant', 'pending_renewal']
        )
        
        # Expired
        expired = queryset.filter(
            certificate_expires_at__lt=timezone.now(),
            compliance_status='non_compliant'
        )
        
        # Overdue
        today = timezone.now().date()
        overdue = queryset.filter(
            required_by_date__lt=today,
            progress_status__in=['not_started', 'in_progress']
        )
        
        # Compliance percentage
        compliant_count = queryset.filter(compliance_status='compliant').count()
        compliance_percentage = (compliant_count / total_records * 100) if total_records > 0 else 0
        
        report_data = {
            'expiring_soon': expiring_soon,
            'expired': expired,
            'overdue': overdue,
            'total_records': total_records,
            'compliance_percentage': round(compliance_percentage, 2)
        }
        
        serializer = TrainingExpirationReportSerializer(report_data)
        return Response(serializer.data)
    
    @action(detail=True, methods=['post'])
    def extend_deadline(self, request, pk=None):
        """Extend training deadline for a user"""
        record = self.get_object()
        extension_days = request.data.get('extension_days')
        reason = request.data.get('reason', '')
        
        if not extension_days:
            return Response(
                {'error': 'extension_days is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            extension_days = int(extension_days)
        except (ValueError, TypeError):
            return Response(
                {'error': 'extension_days must be an integer'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Extend deadline
        if record.required_by_date:
            from datetime import timedelta
            record.required_by_date += timedelta(days=extension_days)
        
        # Add supervisor note
        if record.supervisor_notes:
            record.supervisor_notes += f"\n\n[{timezone.now().strftime('%Y-%m-%d %H:%M')}] Deadline extended by {extension_days} days. Reason: {reason}"
        else:
            record.supervisor_notes = f"[{timezone.now().strftime('%Y-%m-%d %H:%M')}] Deadline extended by {extension_days} days. Reason: {reason}"
        
        record.save()
        
        return Response({
            'message': f'Deadline extended by {extension_days} days',
            'new_deadline': record.required_by_date,
            'reason': reason
        })


class UserModuleProgressViewSet(viewsets.ModelViewSet):
    """
    API endpoint for tracking individual module progress within training programs.
    Provides granular progress monitoring and engagement metrics.
    """
    queryset = UserModuleProgress.objects.select_related(
        'user_record__user', 'user_record__program', 'module'
    )
    serializer_class = UserModuleProgressSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    
    filterset_fields = [
        'user_record', 'module', 'status', 'passed',
        'user_record__user', 'module__module_type'
    ]
    search_fields = [
        'user_record__user__username', 'user_record__user__first_name',
        'user_record__user__last_name', 'module__title'
    ]
    ordering_fields = [
        'module__order', 'started_at', 'completed_at', 'progress_percentage',
        'time_spent_minutes', 'latest_score'
    ]
    ordering = ['module__order', '-updated_at']
    
    def get_queryset(self):
        """Filter progress records based on user permissions"""
        queryset = super().get_queryset()
        
        # Non-staff users can only see their own progress
        if not self.request.user.is_staff:
            queryset = queryset.filter(user_record__user=self.request.user)
        
        return queryset
    
    @action(detail=True, methods=['post'])
    def update_progress(self, request, pk=None):
        """Update module progress percentage and position"""
        progress = self.get_object()
        
        percentage = request.data.get('percentage')
        position = request.data.get('position', {})
        time_spent = request.data.get('time_spent_minutes', 0)
        
        if percentage is not None:
            try:
                percentage = float(percentage)
                progress.update_progress(percentage)
            except (ValueError, TypeError):
                return Response(
                    {'error': 'percentage must be a number'},
                    status=status.HTTP_400_BAD_REQUEST
                )
        
        # Update position in content
        if position:
            progress.last_position = position
        
        # Add time spent
        if time_spent > 0:
            progress.add_time_spent(int(time_spent))
        
        progress.save()
        
        serializer = self.get_serializer(progress)
        return Response({
            'progress': serializer.data,
            'message': 'Progress updated successfully'
        })
    
    @action(detail=True, methods=['post'])
    def complete_module(self, request, pk=None):
        """Mark module as completed with optional score"""
        progress = self.get_object()
        score = request.data.get('score')
        feedback = request.data.get('completion_feedback', '')
        
        if progress.status == 'completed':
            return Response(
                {'error': 'Module is already completed'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Complete the module
        if score is not None:
            try:
                score = int(score)
                progress.mark_completed(score)
            except (ValueError, TypeError):
                return Response(
                    {'error': 'score must be an integer'},
                    status=status.HTTP_400_BAD_REQUEST
                )
        else:
            progress.mark_completed()
        
        # Add feedback
        if feedback:
            progress.completion_feedback = feedback
            progress.save()
        
        serializer = self.get_serializer(progress)
        return Response({
            'progress': serializer.data,
            'message': 'Module completed successfully',
            'passed': progress.passed
        })
    
    @action(detail=True, methods=['post'])
    def add_bookmark(self, request, pk=None):
        """Add bookmark to specific position in module"""
        progress = self.get_object()
        position = request.data.get('position')
        label = request.data.get('label', '')
        
        if not position:
            return Response(
                {'error': 'position is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        bookmark = {
            'position': position,
            'label': label,
            'created_at': timezone.now().isoformat()
        }
        
        if not progress.bookmarked_positions:
            progress.bookmarked_positions = []
        
        progress.bookmarked_positions.append(bookmark)
        progress.save()
        
        return Response({
            'message': 'Bookmark added successfully',
            'bookmark': bookmark,
            'total_bookmarks': len(progress.bookmarked_positions)
        })
    
    @action(detail=False, methods=['get'])
    def by_training_record(self, request):
        """Get module progress for a specific training record"""
        record_id = request.query_params.get('training_record_id')
        
        if not record_id:
            return Response(
                {'error': 'training_record_id parameter is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        progress_records = self.get_queryset().filter(
            user_record_id=record_id
        ).order_by('module__order')
        
        serializer = self.get_serializer(progress_records, many=True)
        return Response({
            'module_progress': serializer.data,
            'total_modules': progress_records.count(),
            'completed_modules': progress_records.filter(status='completed').count()
        })