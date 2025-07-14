import uuid
import hmac
import hashlib
import json
import requests
from typing import Dict, Any, Optional
from django.conf import settings
from django.utils import timezone
from django.core.cache import cache

def get_client_ip(request):
    """Get the real client IP address"""
    x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
    if x_forwarded_for:
        ip = x_forwarded_for.split(',')[0].strip()
    else:
        ip = request.META.get('REMOTE_ADDR')
    return ip

def generate_request_id():
    """Generate a unique request ID"""
    return str(uuid.uuid4())

def generate_webhook_signature(payload: str, secret: str) -> str:
    """Generate HMAC signature for webhook payload"""
    return hmac.new(
        secret.encode('utf-8'),
        payload.encode('utf-8'),
        hashlib.sha256
    ).hexdigest()

def verify_webhook_signature(payload: str, signature: str, secret: str) -> bool:
    """Verify webhook signature"""
    expected_signature = generate_webhook_signature(payload, secret)
    return hmac.compare_digest(signature, expected_signature)

def send_webhook(webhook_endpoint, event_type: str, event_data: Dict[str, Any]) -> Dict[str, Any]:
    """Send webhook notification"""
    from .models import WebhookDelivery
    
    payload = {
        'event_type': event_type,
        'event_id': str(uuid.uuid4()),
        'timestamp': timezone.now().isoformat(),
        'data': event_data
    }
    
    payload_json = json.dumps(payload, default=str)
    signature = generate_webhook_signature(payload_json, webhook_endpoint.secret)
    
    headers = {
        'Content-Type': 'application/json',
        'X-Safeshipper-Signature': signature,
        'X-Safeshipper-Event': event_type,
        'User-Agent': 'SafeShipper-Webhooks/1.0'
    }
    
    # Create delivery record
    delivery = WebhookDelivery.objects.create(
        webhook=webhook_endpoint,
        event_type=event_type,
        event_id=payload['event_id'],
        payload=payload
    )
    
    try:
        response = requests.post(
            webhook_endpoint.url,
            data=payload_json,
            headers=headers,
            timeout=webhook_endpoint.timeout_seconds
        )
        
        delivery.http_status = response.status_code
        delivery.response_headers = dict(response.headers)
        delivery.response_body = response.text[:1000]  # Limit size
        delivery.delivered_at = timezone.now()
        delivery.attempt_count += 1
        
        if 200 <= response.status_code < 300:
            delivery.status = 'delivered'
            webhook_endpoint.successful_deliveries += 1
        else:
            delivery.status = 'failed'
            delivery.error_message = f"HTTP {response.status_code}: {response.text[:500]}"
            webhook_endpoint.failed_deliveries += 1
            
    except requests.RequestException as e:
        delivery.status = 'failed'
        delivery.error_message = str(e)[:500]
        delivery.attempt_count += 1
        webhook_endpoint.failed_deliveries += 1
    
    delivery.save()
    webhook_endpoint.total_deliveries += 1
    webhook_endpoint.last_delivery_at = timezone.now()
    webhook_endpoint.save(update_fields=[
        'total_deliveries', 'successful_deliveries', 'failed_deliveries', 'last_delivery_at'
    ])
    
    return {
        'delivery_id': delivery.id,
        'status': delivery.status,
        'http_status': delivery.http_status
    }

def get_api_metrics(api_key_id: str, hours: int = 24) -> Dict[str, Any]:
    """Get API usage metrics for a specific API key"""
    from .models import APIUsageLog
    from django.db.models import Count, Avg, Q
    from django.utils import timezone
    from datetime import timedelta
    
    end_time = timezone.now()
    start_time = end_time - timedelta(hours=hours)
    
    logs = APIUsageLog.objects.filter(
        api_key_id=api_key_id,
        timestamp__gte=start_time
    )
    
    # Basic metrics
    total_requests = logs.count()
    error_requests = logs.filter(status_code__gte=400).count()
    avg_response_time = logs.aggregate(avg_time=Avg('response_time_ms'))['avg_time'] or 0
    
    # Status code breakdown
    status_codes = logs.values('status_code').annotate(
        count=Count('id')
    ).order_by('status_code')
    
    # Popular endpoints
    endpoints = logs.values('endpoint', 'method').annotate(
        count=Count('id'),
        avg_time=Avg('response_time_ms')
    ).order_by('-count')[:10]
    
    # Hourly breakdown
    hourly_data = []
    for i in range(hours):
        hour_start = start_time + timedelta(hours=i)
        hour_end = hour_start + timedelta(hours=1)
        
        hour_logs = logs.filter(
            timestamp__gte=hour_start,
            timestamp__lt=hour_end
        )
        
        hourly_data.append({
            'hour': hour_start.isoformat(),
            'requests': hour_logs.count(),
            'errors': hour_logs.filter(status_code__gte=400).count(),
            'avg_response_time': hour_logs.aggregate(avg=Avg('response_time_ms'))['avg'] or 0
        })
    
    return {
        'period': {
            'start': start_time.isoformat(),
            'end': end_time.isoformat(),
            'hours': hours
        },
        'summary': {
            'total_requests': total_requests,
            'error_requests': error_requests,
            'error_rate': (error_requests / total_requests * 100) if total_requests > 0 else 0,
            'avg_response_time_ms': round(avg_response_time, 2)
        },
        'status_codes': list(status_codes),
        'popular_endpoints': list(endpoints),
        'hourly_breakdown': hourly_data
    }

def get_system_health() -> Dict[str, Any]:
    """Get overall API system health metrics"""
    from .models import APIKey, APIUsageLog, WebhookEndpoint
    from django.db.models import Count, Avg
    from django.utils import timezone
    from datetime import timedelta
    
    now = timezone.now()
    last_hour = now - timedelta(hours=1)
    last_day = now - timedelta(days=1)
    
    # API key metrics
    active_keys = APIKey.objects.filter(status='active').count()
    total_keys = APIKey.objects.count()
    
    # Usage metrics (last hour)
    recent_logs = APIUsageLog.objects.filter(timestamp__gte=last_hour)
    requests_last_hour = recent_logs.count()
    errors_last_hour = recent_logs.filter(status_code__gte=400).count()
    avg_response_time = recent_logs.aggregate(avg=Avg('response_time_ms'))['avg'] or 0
    
    # Webhook metrics
    active_webhooks = WebhookEndpoint.objects.filter(status='active').count()
    failed_webhooks = WebhookEndpoint.objects.filter(status='failed').count()
    
    # Rate limiting status
    rate_limited_keys = cache.get('rate_limited_keys', set())
    
    # Determine overall health
    error_rate = (errors_last_hour / requests_last_hour * 100) if requests_last_hour > 0 else 0
    
    if error_rate > 10 or avg_response_time > 5000:
        health_status = 'unhealthy'
    elif error_rate > 5 or avg_response_time > 2000:
        health_status = 'degraded'
    else:
        health_status = 'healthy'
    
    return {
        'status': health_status,
        'timestamp': now.isoformat(),
        'api_keys': {
            'active': active_keys,
            'total': total_keys,
            'rate_limited': len(rate_limited_keys)
        },
        'requests': {
            'last_hour': requests_last_hour,
            'errors_last_hour': errors_last_hour,
            'error_rate_percent': round(error_rate, 2),
            'avg_response_time_ms': round(avg_response_time, 2)
        },
        'webhooks': {
            'active': active_webhooks,
            'failed': failed_webhooks
        }
    }

def format_api_response(data: Any, status_code: int = 200, 
                       request_id: Optional[str] = None) -> Dict[str, Any]:
    """Format standardized API response"""
    response = {
        'status': 'success' if status_code < 400 else 'error',
        'data': data,
        'timestamp': timezone.now().isoformat()
    }
    
    if request_id:
        response['request_id'] = request_id
    
    if status_code >= 400:
        response['error'] = {
            'code': status_code,
            'message': data if isinstance(data, str) else 'An error occurred'
        }
        response['data'] = None
    
    return response

def validate_api_scopes(required_scopes: list, user_scopes: list) -> bool:
    """Validate if user has required API scopes"""
    if not required_scopes:
        return True
    
    if 'admin' in user_scopes:
        return True
    
    return all(scope in user_scopes for scope in required_scopes)

def paginate_response(queryset, page_size: int = 50, page: int = 1) -> Dict[str, Any]:
    """Paginate queryset and return formatted response"""
    from django.core.paginator import Paginator
    
    paginator = Paginator(queryset, page_size)
    page_obj = paginator.get_page(page)
    
    return {
        'items': list(page_obj),
        'pagination': {
            'page': page,
            'page_size': page_size,
            'total_pages': paginator.num_pages,
            'total_items': paginator.count,
            'has_next': page_obj.has_next(),
            'has_previous': page_obj.has_previous()
        }
    }

def cache_api_response(cache_key: str, data: Any, timeout: int = 300) -> None:
    """Cache API response data"""
    cache.set(cache_key, data, timeout)

def get_cached_response(cache_key: str) -> Optional[Any]:
    """Get cached API response"""
    return cache.get(cache_key)

def invalidate_cache_pattern(pattern: str) -> None:
    """Invalidate cache keys matching pattern"""
    # This would require a more sophisticated cache backend
    # For now, we'll implement basic invalidation
    pass