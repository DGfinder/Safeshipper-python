from typing import Dict, Optional, List
from django.db.models import Count, Q, Sum, Avg, F, Value, FloatField
from django.db.models.functions import TruncDay, TruncWeek, TruncMonth, Coalesce
from django.utils import timezone
from django.utils.translation import gettext_lazy as _
from datetime import timedelta, datetime
from users.models import User
from shipments.models import Shipment
from documents.models import Document
from vehicles.models import Vehicle
from load_plans.models import LoadPlan
from routes.models import Route
from capacity_marketplace.models import CapacityListing, CapacityBooking, MarketplaceMetrics
from enterprise_auth.models import AuthenticationLog, MFADevice, SSOProvider, SecurityPolicy
from audits.models import AuditLog, ComplianceAuditLog, ShipmentAuditLog
from inspections.models import Inspection, InspectionItem
from training.models import TrainingRecord, ComplianceStatus, TrainingEnrollment

def get_compliance_dashboard_data(user: User) -> Dict:
    """
    Get compliance-related data for the dashboard.
    
    Args:
        user: The user requesting the dashboard data
        
    Returns:
        Dict containing aggregated compliance data
    """
    # Base queryset for shipments
    shipments_qs = Shipment.objects.all()
    
    # Base queryset for documents
    documents_qs = Document.objects.filter(
        document_type__in=[
            'DG_MANIFEST',
            'DG_DECLARATION'
        ]
    )
    
    # Base queryset for audits (audits app now enabled)
    audits_qs = AuditLog.objects.all()
    compliance_audits_qs = ComplianceAuditLog.objects.all()
    
    # Base queryset for inspections (inspections app now enabled)
    inspections_qs = Inspection.objects.all()
    inspection_items_qs = InspectionItem.objects.all()
    
    # Base queryset for training (training app now enabled)
    training_records_qs = TrainingRecord.objects.all()
    compliance_status_qs = ComplianceStatus.objects.all()
    training_enrollments_qs = TrainingEnrollment.objects.all()
    
    # Apply user-specific filtering
    if user.role == User.Role.ADMIN:
        # Admins can see all data
        pass
    elif user.role == User.Role.DISPATCHER:
        # Dispatchers can only see data for their depot
        if hasattr(user, 'depot') and user.depot:
            shipments_qs = shipments_qs.filter(assigned_depot=user.depot)
            documents_qs = documents_qs.filter(shipment__assigned_depot=user.depot)
            # Filter audits to those related to user's depot shipments
            depot_shipments = shipments_qs.values_list('id', flat=True)
            audits_qs = audits_qs.filter(
                Q(content_type__model='shipment', object_id__in=depot_shipments) |
                Q(user=user)
            )
            compliance_audits_qs = compliance_audits_qs.filter(
                audit_log__in=audits_qs
            )
            # Filter inspections to depot shipments
            inspections_qs = inspections_qs.filter(shipment__in=depot_shipments)
            inspection_items_qs = inspection_items_qs.filter(inspection__in=inspections_qs)
            # Filter training to depot users
            depot_users = User.objects.filter(depot=user.depot)
            training_records_qs = training_records_qs.filter(employee__in=depot_users)
            compliance_status_qs = compliance_status_qs.filter(employee__in=depot_users)
            training_enrollments_qs = training_enrollments_qs.filter(employee__in=depot_users)
    elif user.role == User.Role.DRIVER:
        # Drivers can only see their own shipments
        shipments_qs = shipments_qs.filter(assigned_driver=user)
        documents_qs = documents_qs.filter(shipment__assigned_driver=user)
        # Filter inspections to driver's shipments
        inspections_qs = inspections_qs.filter(shipment__assigned_driver=user)
        inspection_items_qs = inspection_items_qs.filter(inspection__shipment__assigned_driver=user)
        # Filter training to driver only
        training_records_qs = training_records_qs.filter(employee=user)
        compliance_status_qs = compliance_status_qs.filter(employee=user)
        training_enrollments_qs = training_enrollments_qs.filter(employee=user)
    
    # Get shipment exceptions
    shipment_exceptions = shipments_qs.filter(
        status='EXCEPTION'
    ).count()
    
    # Get document validation errors
    document_errors = documents_qs.filter(
        status='VALIDATED_WITH_ERRORS'
    ).count()
    
    # Count recent audit activities
    recent_audits = audits_qs.filter(
        timestamp__gte=timezone.now() - timedelta(days=30)
    ).count()
    
    # Count compliance violations
    compliance_violations = compliance_audits_qs.filter(
        compliance_status='NON_COMPLIANT'
    ).count()
    
    # Count inspection failures
    failed_inspections = inspections_qs.filter(overall_result='FAIL').count()
    
    # Count pending inspections
    pending_inspections = inspections_qs.filter(status='SCHEDULED').count()
    
    # Count inspection items with failures
    failed_inspection_items = inspection_items_qs.filter(result='FAIL').count()
    
    # Count training compliance issues
    expired_certifications = training_records_qs.filter(status='expired').count()
    expiring_certifications = training_records_qs.filter(status='expiring_soon').count()
    non_compliant_employees = compliance_status_qs.filter(status='non_compliant').count()
    overdue_training = compliance_status_qs.filter(status='overdue').count()
    failed_training = training_enrollments_qs.filter(status='failed').count()
    
    # Get recent compliance issues
    recent_issues = []
    
    # Add recent shipment exceptions
    recent_shipment_exceptions = shipments_qs.filter(
        status='EXCEPTION',
        updated_at__gte=timezone.now() - timezone.timedelta(days=7)
    ).values('id', 'reference_number', 'status', 'updated_at')[:5]
    
    for shipment in recent_shipment_exceptions:
        recent_issues.append({
            'type': 'shipment',
            'id': shipment['id'],
            'reference': shipment['reference_number'],
            'status': shipment['status'],
            'updated_at': shipment['updated_at'],
            'description': _('Shipment in exception status')
        })
    
    # Add recent document validation errors
    recent_document_errors = documents_qs.filter(
        status='VALIDATED_WITH_ERRORS',
        updated_at__gte=timezone.now() - timezone.timedelta(days=7)
    ).values('id', 'original_filename', 'shipment__reference_number', 'updated_at')[:5]
    
    for doc in recent_document_errors:
        recent_issues.append({
            'type': 'document',
            'id': doc['id'],
            'reference': doc['shipment__reference_number'],
            'filename': doc['original_filename'],
            'updated_at': doc['updated_at'],
            'description': _('Document validation failed')
        })
    
    # Add recent compliance audit issues
    recent_compliance_issues = compliance_audits_qs.filter(
        compliance_status='NON_COMPLIANT',
        audit_log__timestamp__gte=timezone.now() - timezone.timedelta(days=7)
    ).select_related('audit_log').values(
        'id', 'regulation_type', 'audit_log__timestamp', 'audit_log__action_description'
    )[:5]
    
    for compliance_issue in recent_compliance_issues:
        recent_issues.append({
            'type': 'compliance',
            'id': compliance_issue['id'],
            'reference': compliance_issue['regulation_type'],
            'updated_at': compliance_issue['audit_log__timestamp'],
            'description': compliance_issue['audit_log__action_description'] or _('Compliance violation detected')
        })
    
    # Add recent failed inspections
    recent_failed_inspections = inspections_qs.filter(
        overall_result='FAIL',
        completed_at__gte=timezone.now() - timezone.timedelta(days=7)
    ).values(
        'id', 'inspection_type', 'completed_at', 'notes'
    )[:5]
    
    for failed_inspection in recent_failed_inspections:
        recent_issues.append({
            'type': 'inspection',
            'id': failed_inspection['id'],
            'reference': failed_inspection['inspection_type'],
            'updated_at': failed_inspection['completed_at'],
            'description': failed_inspection['notes'] or _('Inspection failed')
        })
    
    # Add recent training compliance issues
    recent_expired_certs = training_records_qs.filter(
        status='expired',
        updated_at__gte=timezone.now() - timezone.timedelta(days=7)
    ).select_related('employee', 'program').values(
        'id', 'employee__first_name', 'employee__last_name', 'program__name', 'updated_at'
    )[:5]
    
    for cert in recent_expired_certs:
        recent_issues.append({
            'type': 'training',
            'id': cert['id'],
            'reference': f"{cert['employee__first_name']} {cert['employee__last_name']}",
            'updated_at': cert['updated_at'],
            'description': f"Expired certification: {cert['program__name']}"
        })
    
    # Add recent non-compliance issues
    recent_non_compliance = compliance_status_qs.filter(
        status__in=['non_compliant', 'overdue'],
        updated_at__gte=timezone.now() - timezone.timedelta(days=7)
    ).select_related('employee', 'requirement').values(
        'id', 'employee__first_name', 'employee__last_name', 'requirement__name', 'status', 'updated_at'
    )[:5]
    
    for comp in recent_non_compliance:
        recent_issues.append({
            'type': 'compliance',
            'id': comp['id'],
            'reference': f"{comp['employee__first_name']} {comp['employee__last_name']}",
            'updated_at': comp['updated_at'],
            'description': f"Training compliance: {comp['requirement__name']} ({comp['status']})"
        })
    
    # Sort recent issues by updated_at
    recent_issues.sort(key=lambda x: x['updated_at'], reverse=True)
    
    # Get compliance trends (last 30 days)
    thirty_days_ago = timezone.now() - timezone.timedelta(days=30)
    
    # Shipment status trends
    shipment_trends = shipments_qs.filter(
        updated_at__gte=thirty_days_ago
    ).values('status').annotate(
        count=Count('id')
    ).order_by('status')
    
    # Document validation trends
    document_trends = documents_qs.filter(
        updated_at__gte=thirty_days_ago
    ).values('status').annotate(
        count=Count('id')
    ).order_by('status')
    
    return {
        'summary': {
            'shipment_exceptions': shipment_exceptions,
            'document_validation_errors': document_errors,
            'recent_audits': recent_audits,
            'compliance_violations': compliance_violations,
            'failed_inspections': failed_inspections,
            'pending_inspections': pending_inspections,
            'failed_inspection_items': failed_inspection_items,
            'expired_certifications': expired_certifications,
            'expiring_certifications': expiring_certifications,
            'non_compliant_employees': non_compliant_employees,
            'overdue_training': overdue_training,
            'failed_training': failed_training,
            'total_issues': (shipment_exceptions + document_errors + compliance_violations + 
                           failed_inspections + expired_certifications + non_compliant_employees + overdue_training)
        },
        'recent_issues': recent_issues[:5],  # Limit to 5 most recent
        'trends': {
            'shipments': list(shipment_trends),
            'documents': list(document_trends)
        },
        'last_updated': timezone.now()
    }

def get_capacity_optimization_dashboard(user: User) -> Dict:
    """
    Get capacity optimization and load planning analytics.
    """
    # Apply user-specific filtering
    load_plans_qs = LoadPlan.objects.all()
    vehicles_qs = Vehicle.objects.all()
    
    if hasattr(user, 'role') and user.role == User.Role.DISPATCHER and hasattr(user, 'depot') and user.depot:
        load_plans_qs = load_plans_qs.filter(vehicle__assigned_depot=user.depot)
        vehicles_qs = vehicles_qs.filter(assigned_depot=user.depot)
    elif hasattr(user, 'role') and user.role == User.Role.DRIVER:
        # Drivers see plans for vehicles they're assigned to
        load_plans_qs = load_plans_qs.filter(vehicle__in=vehicles_qs.filter(
            Q(routes__driver=user)
        ).distinct())
    
    # Calculate optimization metrics
    avg_weight_utilization = load_plans_qs.aggregate(
        avg_weight=Avg('weight_utilization_pct')
    )['avg_weight'] or 0
    
    avg_volume_utilization = load_plans_qs.aggregate(
        avg_volume=Avg('volume_utilization_pct')
    )['avg_volume'] or 0
    
    # Load plan efficiency
    optimized_plans = load_plans_qs.filter(
        status=LoadPlan.Status.OPTIMIZED
    ).count()
    
    total_plans = load_plans_qs.count()
    optimization_rate = (optimized_plans / total_plans * 100) if total_plans > 0 else 0
    
    # Vehicle utilization
    active_vehicles = vehicles_qs.filter(status=Vehicle.Status.IN_USE).count()
    total_vehicles = vehicles_qs.count()
    vehicle_utilization = (active_vehicles / total_vehicles * 100) if total_vehicles > 0 else 0
    
    # Recent optimization results
    recent_optimizations = load_plans_qs.filter(
        optimized_at__isnull=False,
        optimized_at__gte=timezone.now() - timedelta(days=7)
    ).order_by('-optimized_at')[:5]
    
    optimization_results = []
    for plan in recent_optimizations:
        optimization_results.append({
            'id': str(plan.id),
            'name': plan.name,
            'vehicle': plan.vehicle.registration_number,
            'optimization_score': plan.optimization_score,
            'weight_utilization': plan.weight_utilization_pct,
            'volume_utilization': plan.volume_utilization_pct,
            'optimized_at': plan.optimized_at
        })
    
    # Utilization trends over time
    utilization_trends = load_plans_qs.filter(
        created_at__gte=timezone.now() - timedelta(days=30)
    ).annotate(
        date=TruncDay('created_at')
    ).values('date').annotate(
        avg_weight_util=Avg('weight_utilization_pct'),
        avg_volume_util=Avg('volume_utilization_pct'),
        avg_score=Avg('optimization_score')
    ).order_by('date')
    
    return {
        'summary': {
            'avg_weight_utilization': round(avg_weight_utilization, 1),
            'avg_volume_utilization': round(avg_volume_utilization, 1),
            'optimization_rate': round(optimization_rate, 1),
            'vehicle_utilization': round(vehicle_utilization, 1),
            'total_load_plans': total_plans,
            'optimized_plans': optimized_plans
        },
        'recent_optimizations': optimization_results,
        'utilization_trends': list(utilization_trends),
        'last_updated': timezone.now()
    }

def get_marketplace_analytics(user: User) -> Dict:
    """
    Get marketplace performance analytics.
    """
    # Base querysets
    listings_qs = CapacityListing.objects.all()
    bookings_qs = CapacityBooking.objects.all()
    
    # Apply user filtering
    if user.role == User.Role.DISPATCHER and hasattr(user, 'depot') and user.depot:
        listings_qs = listings_qs.filter(vehicle__assigned_depot=user.depot)
    elif user.role == User.Role.DRIVER:
        listings_qs = listings_qs.filter(driver=user)
        
    # Current marketplace status
    active_listings = listings_qs.filter(status=CapacityListing.Status.ACTIVE).count()
    total_capacity_kg = listings_qs.filter(
        status__in=[
            CapacityListing.Status.ACTIVE,
            CapacityListing.Status.PARTIALLY_BOOKED
        ]
    ).aggregate(
        total=Sum('available_weight_kg')
    )['total'] or 0
    
    # Booking metrics
    confirmed_bookings = bookings_qs.filter(
        status=CapacityBooking.Status.CONFIRMED
    ).count()
    
    total_revenue = bookings_qs.filter(
        status__in=[
            CapacityBooking.Status.CONFIRMED,
            CapacityBooking.Status.PAID,
            CapacityBooking.Status.DELIVERED
        ]
    ).aggregate(
        revenue=Sum('final_price')
    )['revenue'] or 0
    
    # Calculate utilization rate
    booked_capacity = bookings_qs.filter(
        status__in=[
            CapacityBooking.Status.CONFIRMED,
            CapacityBooking.Status.IN_TRANSIT
        ]
    ).aggregate(
        booked=Sum('booked_weight_kg')
    )['booked'] or 0
    
    utilization_rate = (booked_capacity / total_capacity_kg * 100) if total_capacity_kg > 0 else 0
    
    # Average pricing
    avg_price_per_kg = listings_qs.aggregate(
        avg_price=Avg('base_price_per_kg')
    )['avg_price'] or 0
    
    # Recent marketplace activity
    recent_listings = listings_qs.filter(
        created_at__gte=timezone.now() - timedelta(days=7)
    ).order_by('-created_at')[:5]
    
    recent_bookings = bookings_qs.filter(
        created_at__gte=timezone.now() - timedelta(days=7)
    ).order_by('-created_at')[:5]
    
    marketplace_activity = []
    
    for listing in recent_listings:
        marketplace_activity.append({
            'type': 'listing',
            'id': str(listing.id),
            'title': listing.title,
            'carrier': listing.carrier.name if listing.carrier else 'Unknown',
            'capacity_kg': listing.available_weight_kg,
            'price_per_kg': float(listing.base_price_per_kg),
            'created_at': listing.created_at
        })
    
    for booking in recent_bookings:
        marketplace_activity.append({
            'type': 'booking',
            'id': str(booking.id),
            'reference': booking.booking_reference,
            'shipper': booking.shipper.name if booking.shipper else 'Unknown',
            'booked_weight': booking.booked_weight_kg,
            'quoted_price': float(booking.quoted_price),
            'created_at': booking.created_at
        })
    
    # Sort by created_at
    marketplace_activity.sort(key=lambda x: x['created_at'], reverse=True)
    
    # Marketplace trends
    marketplace_trends = []
    for i in range(30):
        date = timezone.now().date() - timedelta(days=i)
        day_listings = listings_qs.filter(created_at__date=date).count()
        day_bookings = bookings_qs.filter(created_at__date=date).count()
        day_revenue = bookings_qs.filter(
            created_at__date=date,
            status__in=[CapacityBooking.Status.CONFIRMED, CapacityBooking.Status.PAID]
        ).aggregate(revenue=Sum('quoted_price'))['revenue'] or 0
        
        marketplace_trends.append({
            'date': date,
            'new_listings': day_listings,
            'new_bookings': day_bookings,
            'revenue': float(day_revenue)
        })
    
    marketplace_trends.reverse()  # Show oldest first
    
    return {
        'available': True,
        'summary': {
            'active_listings': active_listings,
            'total_capacity_kg': round(total_capacity_kg, 1),
            'confirmed_bookings': confirmed_bookings,
            'total_revenue': float(total_revenue),
            'utilization_rate': round(utilization_rate, 1),
            'avg_price_per_kg': round(float(avg_price_per_kg), 2)
        },
        'recent_activity': marketplace_activity[:10],
        'trends': marketplace_trends[-7:],  # Last 7 days
        'last_updated': timezone.now()
    }

def get_route_optimization_analytics(user: User) -> Dict:
    """
    Get route optimization analytics.
    """
    # Base querysets
    routes_qs = Route.objects.all()
    
    # Apply user filtering
    if user.role == User.Role.DISPATCHER and hasattr(user, 'depot') and user.depot:
        routes_qs = routes_qs.filter(vehicle__assigned_depot=user.depot)
    elif user.role == User.Role.DRIVER:
        routes_qs = routes_qs.filter(driver=user)
    
    # Route efficiency metrics
    completed_routes = routes_qs.filter(status=Route.Status.COMPLETED)
    
    # Calculate efficiency as revenue per km
    avg_efficiency = completed_routes.exclude(
        total_distance_km=0
    ).aggregate(
        avg_efficiency=Avg(F('estimated_revenue') / F('total_distance_km'), output_field=FloatField())
    )['avg_efficiency'] or 0
    
    total_distance = completed_routes.aggregate(
        total_dist=Sum('total_distance_km')
    )['total_dist'] or 0
    
    avg_optimization_score = routes_qs.filter(
        status__in=[Route.Status.OPTIMIZED, Route.Status.COMPLETED]
    ).aggregate(
        avg_score=Avg('optimization_score')
    )['avg_score'] or 0
    
    # On-time performance
    on_time_routes = completed_routes.filter(
        actual_end_time__lte=F('planned_end_time')
    ).count()
    
    total_completed = completed_routes.count()
    on_time_percentage = (on_time_routes / total_completed * 100) if total_completed > 0 else 0
    
    # Recent route performance
    recent_routes = completed_routes.filter(
        actual_end_time__gte=timezone.now() - timedelta(days=7)
    ).order_by('-actual_end_time')[:5]
    
    route_results = []
    for route in recent_routes:
        efficiency_score = float(route.estimated_revenue) / route.total_distance_km if route.total_distance_km > 0 else 0
        route_results.append({
            'id': str(route.id),
            'name': route.name,
            'vehicle': route.vehicle.registration_number,
            'driver': route.driver.username if route.driver else None,
            'total_distance_km': route.total_distance_km,
            'efficiency_score': round(efficiency_score, 2),
            'optimization_score': route.optimization_score,
            'on_time': route.actual_end_time <= route.planned_end_time if route.actual_end_time and route.planned_end_time else None,
            'completed_at': route.actual_end_time
        })
    
    # Route trends over time
    route_trends = completed_routes.filter(
        actual_end_time__gte=timezone.now() - timedelta(days=30)
    ).exclude(
        total_distance_km=0
    ).annotate(
        date=TruncDay('actual_end_time')
    ).values('date').annotate(
        avg_efficiency=Avg(F('estimated_revenue') / F('total_distance_km'), output_field=FloatField()),
        avg_distance=Avg('total_distance_km'),
        avg_optimization=Avg('optimization_score'),
        route_count=Count('id')
    ).order_by('date')
    
    return {
        'available': True,
        'summary': {
            'total_routes': routes_qs.count(),
            'completed_routes': total_completed,
            'avg_efficiency_score': round(avg_efficiency, 1),
            'total_distance_km': round(total_distance, 1),
            'avg_optimization_score': round(avg_optimization_score, 1),
            'on_time_percentage': round(on_time_percentage, 1)
        },
        'recent_routes': route_results,
        'route_trends': list(route_trends),
        'last_updated': timezone.now()
    }

def get_security_dashboard_data(user: User) -> Dict:
    """
    Get enterprise security analytics.
    """
    # Authentication log metrics
    auth_logs_qs = AuthenticationLog.objects.all()
    
    # Apply user filtering (only admins can see full security data)
    if user.role != User.Role.ADMIN:
        # Non-admins can only see their own authentication logs
        auth_logs_qs = auth_logs_qs.filter(user=user)
    
    # Recent authentication activity (last 24 hours)
    recent_cutoff = timezone.now() - timedelta(hours=24)
    recent_auth = auth_logs_qs.filter(timestamp__gte=recent_cutoff)
    
    # Success/failure rates
    total_attempts = recent_auth.count()
    successful_attempts = recent_auth.filter(success=True).count()
    failed_attempts = recent_auth.filter(success=False).count()
    success_rate = (successful_attempts / total_attempts * 100) if total_attempts > 0 else 0
    
    # MFA adoption metrics
    total_users = User.objects.count()
    users_with_mfa = User.objects.filter(
        mfa_devices__is_confirmed=True
    ).distinct().count()
    mfa_adoption_rate = (users_with_mfa / total_users * 100) if total_users > 0 else 0
    
    # SSO usage
    sso_providers = SSOProvider.objects.filter(is_active=True)
    sso_logins = recent_auth.filter(event_type='sso_login').count()
    sso_usage_rate = (sso_logins / total_attempts * 100) if total_attempts > 0 else 0
    
    # Security alerts (failed attempts, suspicious activity)
    failed_login_attempts = recent_auth.filter(
        event_type='login_failed'
    ).count()
    
    failed_mfa_attempts = recent_auth.filter(
        event_type='mfa_failed'
    ).count()
    
    # Top IP addresses by activity
    top_ips = recent_auth.values('ip_address').annotate(
        attempt_count=Count('id'),
        success_count=Count('id', filter=Q(success=True)),
        failure_count=Count('id', filter=Q(success=False))
    ).order_by('-attempt_count')[:10]
    
    # Recent security events
    recent_events = auth_logs_qs.order_by('-timestamp')[:20]
    
    event_list = []
    for event in recent_events:
        event_list.append({
            'id': str(event.id),
            'event_type': event.get_event_type_display(),
            'user': event.user.username if event.user else event.username_attempted,
            'ip_address': event.ip_address,
            'success': event.success,
            'timestamp': event.timestamp,
            'failure_reason': event.failure_reason if not event.success else None
        })
    
    # Authentication trends over last 7 days
    auth_trends = auth_logs_qs.filter(
        timestamp__gte=timezone.now() - timedelta(days=7)
    ).annotate(
        date=TruncDay('timestamp')
    ).values('date').annotate(
        total_attempts=Count('id'),
        successful_attempts=Count('id', filter=Q(success=True)),
        failed_attempts=Count('id', filter=Q(success=False)),
        sso_attempts=Count('id', filter=Q(event_type='sso_login')),
        mfa_attempts=Count('id', filter=Q(event_type__in=['mfa_success', 'mfa_failed']))
    ).order_by('date')
    
    return {
        'available': True,
        'summary': {
            'total_auth_attempts_24h': total_attempts,
            'successful_attempts_24h': successful_attempts,
            'failed_attempts_24h': failed_attempts,
            'auth_success_rate': round(success_rate, 1),
            'total_users': total_users,
            'users_with_mfa': users_with_mfa,
            'mfa_adoption_rate': round(mfa_adoption_rate, 1),
            'active_sso_providers': sso_providers.count(),
            'sso_usage_rate': round(sso_usage_rate, 1),
            'failed_login_attempts': failed_login_attempts,
            'failed_mfa_attempts': failed_mfa_attempts
        },
        'recent_events': event_list,
        'top_ip_addresses': list(top_ips),
        'auth_trends': list(auth_trends),
        'last_updated': timezone.now()
    }

def get_comprehensive_dashboard_data(user: User) -> Dict:
    """
    Get comprehensive dashboard data combining all analytics.
    """
    return {
        'compliance': get_compliance_dashboard_data(user),
        'capacity_optimization': get_capacity_optimization_dashboard(user),
        'marketplace': get_marketplace_analytics(user),
        'route_optimization': get_route_optimization_analytics(user),
        'security': get_security_dashboard_data(user),
        'generated_at': timezone.now()
    } 