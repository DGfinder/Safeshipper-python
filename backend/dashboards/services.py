from typing import Dict, Optional, List
from django.db.models import Count, Q, Sum, Avg, F, Value
from django.db.models.functions import TruncDay, TruncWeek, TruncMonth, Coalesce
from django.utils import timezone
from django.utils.translation import gettext_lazy as _
from datetime import timedelta, datetime
from users.models import User
from shipments.models import Shipment
from documents.models import Document
from vehicles.models import Vehicle
from load_plans.models import LoadPlan
try:
    from capacity_marketplace.models import CapacityListing, CapacityBooking, MarketplaceMetrics
    from routes.models import Route
    MARKETPLACE_AVAILABLE = True
except ImportError:
    MARKETPLACE_AVAILABLE = False

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
            Document.DocumentType.DG_MANIFEST,
            Document.DocumentType.DG_DECLARATION
        ]
    )
    
    # Base queryset for audits
    audits_qs = Audit.objects.filter(
        scheduled_date__gte=timezone.now()
    )
    
    # Apply user-specific filtering
    if user.role == User.Role.ADMIN:
        # Admins can see all data
        pass
    elif user.role == User.Role.DISPATCHER:
        # Dispatchers can only see data for their depot
        if user.depot:
            shipments_qs = shipments_qs.filter(assigned_depot=user.depot)
            documents_qs = documents_qs.filter(shipment__assigned_depot=user.depot)
            audits_qs = audits_qs.filter(depot=user.depot)
    elif user.role == User.Role.DRIVER:
        # Drivers can only see their own shipments
        shipments_qs = shipments_qs.filter(assigned_driver=user)
        documents_qs = documents_qs.filter(shipment__assigned_driver=user)
        audits_qs = audits_qs.filter(assigned_driver=user)
    
    # Get shipment exceptions
    shipment_exceptions = shipments_qs.filter(
        status=Shipment.Status.EXCEPTION
    ).count()
    
    # Get document validation errors
    document_errors = documents_qs.filter(
        status=Document.DocumentStatus.VALIDATED_WITH_ERRORS
    ).count()
    
    # Get upcoming audits
    upcoming_audits = audits_qs.count()
    
    # Get recent compliance issues
    recent_issues = []
    
    # Add recent shipment exceptions
    recent_shipment_exceptions = shipments_qs.filter(
        status=Shipment.Status.EXCEPTION,
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
        status=Document.DocumentStatus.VALIDATED_WITH_ERRORS,
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
            'upcoming_audits': upcoming_audits,
            'total_issues': shipment_exceptions + document_errors
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
    
    if user.role == User.Role.DISPATCHER and user.depot:
        load_plans_qs = load_plans_qs.filter(vehicle__assigned_depot=user.depot)
        vehicles_qs = vehicles_qs.filter(assigned_depot=user.depot)
    elif user.role == User.Role.DRIVER:
        # Drivers see plans for vehicles they're assigned to
        load_plans_qs = load_plans_qs.filter(vehicle__in=vehicles_qs.filter(
            Q(routes__driver=user) | Q(capacity_listings__driver=user)
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
            'id': plan.id,
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
    if not MARKETPLACE_AVAILABLE:
        return {'available': False, 'message': 'Marketplace module not available'}
    
    # Base querysets
    listings_qs = CapacityListing.objects.all()
    bookings_qs = CapacityBooking.objects.all()
    
    # Apply user filtering
    if user.role == User.Role.DISPATCHER and user.depot:
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
            'id': listing.id,
            'title': listing.title,
            'carrier': listing.carrier.name,
            'capacity_kg': listing.available_weight_kg,
            'price_per_kg': float(listing.base_price_per_kg),
            'created_at': listing.created_at
        })
    
    for booking in recent_bookings:
        marketplace_activity.append({
            'type': 'booking',
            'id': booking.id,
            'reference': booking.booking_reference,
            'shipper': booking.shipper.name,
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
    if not MARKETPLACE_AVAILABLE:
        return {'available': False, 'message': 'Routes module not available'}
    
    # Base querysets
    routes_qs = Route.objects.all()
    
    # Apply user filtering
    if user.role == User.Role.DISPATCHER and user.depot:
        routes_qs = routes_qs.filter(vehicle__assigned_depot=user.depot)
    elif user.role == User.Role.DRIVER:
        routes_qs = routes_qs.filter(driver=user)
    
    # Route efficiency metrics
    completed_routes = routes_qs.filter(status=Route.Status.COMPLETED)
    
    avg_efficiency = completed_routes.aggregate(
        avg_efficiency=Avg('efficiency_score')
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
        'generated_at': timezone.now()
    } 