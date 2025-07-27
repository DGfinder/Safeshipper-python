# SafeShipper Backend Architecture Guide

**Comprehensive guide to the SafeShipper backend architecture, design patterns, and implementation details**

This document provides an in-depth view of the SafeShipper backend architecture, covering the technical decisions, design patterns, data flows, and implementation strategies that power the platform.

---

## 🏗️ **Architecture Overview**

### **High-Level System Architecture**

```
┌─────────────────────────────────────────────────────────────────┐
│                     SafeShipper Backend                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────────┐    ┌─────────────────┐    ┌──────────────┐ │
│  │   API Gateway   │    │  Load Balancer  │    │   Frontend   │ │
│  │   Rate Limiting │    │   SSL/TLS       │    │   React App  │ │
│  │   Auth Layer    │◄──►│   Compression   │◄──►│   Mobile App │ │
│  │   Versioning    │    │   Caching       │    │   3rd Party  │ │
│  └─────────────────┘    └─────────────────┘    └──────────────┘ │
│             │                                                   │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │                 Django REST Framework                      │ │
│  │  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌────────┐│ │
│  │  │ Emergency   │ │ Search &    │ │ File Upload │ │ Legacy │││ │
│  │  │ Procedures  │ │ Discovery   │ │ Management  │ │ APIs   │││ │
│  │  └─────────────┘ └─────────────┘ └─────────────┘ └────────┘│ │
│  │                                                             │ │
│  │  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌────────┐│ │
│  │  │ Dangerous   │ │ Shipment    │ │ User        │ │ Fleet  │││ │
│  │  │ Goods       │ │ Management  │ │ Management  │ │ Mgmt   │││ │
│  │  └─────────────┘ └─────────────┘ └─────────────┘ └────────┘│ │
│  └─────────────────────────────────────────────────────────────┘ │
│             │                                                   │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │                Business Logic Layer                        │ │
│  │  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌────────┐│ │
│  │  │ Safety      │ │ Compliance  │ │ Document    │ │ Audit  │││ │
│  │  │ Services    │ │ Engine      │ │ Processing  │ │ System │││ │
│  │  └─────────────┘ └─────────────┘ └─────────────┘ └────────┘│ │
│  └─────────────────────────────────────────────────────────────┘ │
│             │                                                   │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │                   Data Access Layer                        │ │
│  │  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌────────┐│ │
│  │  │ PostgreSQL  │ │ Redis       │ │ Elasticsearch│ │ File   │││ │
│  │  │ + PostGIS   │ │ Cache       │ │ Search      │ │ Storage│││ │
│  │  └─────────────┘ └─────────────┘ └─────────────┘ └────────┘│ │
│  └─────────────────────────────────────────────────────────────┘ │
│             │                                                   │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │                Infrastructure Layer                        │ │
│  │  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌────────┐│ │
│  │  │ Docker      │ │ Celery      │ │ WebSocket   │ │ Monitor│││ │
│  │  │ Containers  │ │ Workers     │ │ Real-time   │ │ & Logs │││ │
│  │  └─────────────┘ └─────────────┘ └─────────────┘ └────────┘│ │
│  └─────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

### **Core Architecture Principles**

1. **Domain-Driven Design**: Each app represents a bounded context
2. **API-First Architecture**: RESTful APIs with clear contracts
3. **Microservices Ready**: Modular design for future decomposition
4. **Event-Driven Patterns**: Signals and async processing
5. **Security by Design**: Multi-layer authentication and authorization
6. **Performance First**: Optimized queries, caching, and indexing

---

## 📦 **Application Architecture**

### **Django Apps Structure**

```
SafeShipper Backend Apps
├── Core Infrastructure
│   ├── safeshipper_core/      # Django project settings
│   ├── api_gateway/           # API versioning, rate limiting
│   ├── audits/               # System-wide audit logging
│   └── communications/       # WebSocket, email, SMS services
│
├── Safety & Compliance Domain
│   ├── emergency_procedures/  # Emergency response management
│   ├── dangerous_goods/      # Dangerous goods classification
│   ├── sds/                 # Safety Data Sheet management
│   ├── compliance/          # Regulatory compliance monitoring
│   └── incidents/           # Incident tracking and reporting
│
├── Logistics Domain
│   ├── shipments/           # Shipment lifecycle management
│   ├── manifests/           # Manifest creation and processing
│   ├── tracking/            # GPS tracking and location services
│   ├── routes/              # Route planning and optimization
│   └── load_plans/          # 3D load planning with constraints
│
├── Fleet Management Domain
│   ├── vehicles/            # Vehicle registration and maintenance
│   ├── users/              # User management and authentication
│   ├── training/           # Driver training and certification
│   └── inspections/        # Vehicle and safety inspections
│
├── Data & Analytics Domain
│   ├── analytics/          # Business intelligence and reporting
│   ├── search/             # Unified search across all data
│   ├── documents/          # Document management and processing
│   └── iot_devices/        # IoT device integration
│
└── Integration Domain
    ├── erp_integration/    # ERP system integrations
    ├── mobile_api/         # Mobile-optimized API endpoints
    ├── customer_portal/    # Customer-facing API services
    └── enterprise_auth/    # SSO and enterprise authentication
```

### **App Dependencies and Communication**

```
┌─────────────────────────────────────────────────────────────────┐
│                     App Communication Flow                     │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  emergency_procedures ──► dangerous_goods ──► sds              │
│           │                      │               │             │
│           │                      ▼               ▼             │
│           └──────────► shipments ◄────► manifests              │
│                           │                      │             │
│                           ▼                      ▼             │
│      vehicles ◄───── tracking ◄─────────── load_plans          │
│         │                │                      │             │
│         ▼                ▼                      ▼             │
│      users ──────► inspections ──────► documents               │
│         │                │                      │             │
│         ▼                ▼                      ▼             │
│    training ──────► analytics ◄────────── search               │
│                           │                      │             │
│                           ▼                      ▼             │
│                    audits ◄────────── communications           │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🎯 **API Design Patterns**

### **RESTful API Design**

#### **Resource Naming Conventions**
```python
# Collection resources (plural nouns)
/api/v1/shipments/
/api/v1/dangerous-goods/
/api/v1/emergency-procedures/

# Resource instances (UUID-based)
/api/v1/shipments/{uuid}/
/api/v1/dangerous-goods/{uuid}/

# Sub-resources (nested relationships)
/api/v1/shipments/{uuid}/consignment-items/
/api/v1/vehicles/{uuid}/inspections/

# Actions on resources (verbs for non-CRUD operations)
/api/v1/dangerous-goods/check-compatibility/
/api/v1/emergency-procedures/api/incidents/{uuid}/start-response/
/api/v1/search/api/suggestions/
```

#### **HTTP Method Usage**
```python
GET     # Retrieve resources (idempotent, safe)
POST    # Create new resources, non-idempotent actions
PUT     # Full resource replacement (idempotent)
PATCH   # Partial resource updates (idempotent)
DELETE  # Resource removal (idempotent)
HEAD    # Metadata only (used for file existence checks)
OPTIONS # CORS preflight, API discovery
```

#### **Status Code Strategy**
```python
# Success Responses
200  # OK - Successful GET, PUT, PATCH
201  # Created - Successful POST
202  # Accepted - Async operation started
204  # No Content - Successful DELETE

# Client Error Responses
400  # Bad Request - Invalid request data
401  # Unauthorized - Authentication required
403  # Forbidden - Insufficient permissions
404  # Not Found - Resource doesn't exist
422  # Unprocessable Entity - Validation errors
429  # Too Many Requests - Rate limit exceeded

# Server Error Responses
500  # Internal Server Error - Unexpected server error
502  # Bad Gateway - Upstream service error
503  # Service Unavailable - Temporary unavailability
```

### **ViewSet Architecture Pattern**

```python
# Base ViewSet Pattern for all APIs
class BaseViewSet(viewsets.ModelViewSet):
    """
    Base ViewSet with common functionality:
    - Permission checking
    - Query optimization
    - Standardized error handling
    - Audit logging
    - Caching strategies
    """
    permission_classes = [IsAuthenticated, HasRequiredPermission]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    pagination_class = StandardResultsSetPagination
    
    def get_queryset(self):
        """Apply company-based filtering and optimization"""
        queryset = super().get_queryset()
        
        # Apply company-based data segregation
        if hasattr(self.request.user, 'company'):
            queryset = queryset.filter(company=self.request.user.company)
        
        # Apply select_related and prefetch_related optimizations
        queryset = self.optimize_queryset(queryset)
        
        return queryset
    
    def perform_create(self, serializer):
        """Add audit logging and company assignment"""
        instance = serializer.save(
            created_by=self.request.user,
            company=self.request.user.company
        )
        
        # Log creation event
        audit_logger.log_create(
            user=self.request.user,
            model=instance.__class__.__name__,
            instance_id=instance.id
        )
    
    def handle_exception(self, exc):
        """Standardized error handling with logging"""
        error_logger.log_api_error(
            user=self.request.user,
            endpoint=self.request.path,
            error=str(exc),
            request_data=self.request.data
        )
        return super().handle_exception(exc)
```

### **Serializer Patterns**

#### **Dynamic Serializer Selection**
```python
class DynamicSerializerMixin:
    """
    Mixin for ViewSets to use different serializers for different actions
    """
    serializer_action_classes = {}
    
    def get_serializer_class(self):
        """
        Return different serializers based on action:
        - list: Lightweight serializer for performance
        - create: Validation-heavy serializer with password handling
        - retrieve: Full detailed serializer
        - update: Update-specific serializer (no password fields)
        """
        try:
            return self.serializer_action_classes[self.action]
        except KeyError:
            return super().get_serializer_class()

# Example usage in ViewSet
class UserViewSet(DynamicSerializerMixin, BaseViewSet):
    serializer_class = UserSerializer  # Default
    serializer_action_classes = {
        'create': UserCreateSerializer,
        'update': UserUpdateSerializer,
        'partial_update': UserUpdateSerializer,
        'list': UserListSerializer,  # Lightweight for performance
    }
```

#### **Nested Serializer Strategy**
```python
class ShipmentSerializer(serializers.ModelSerializer):
    """
    Complex serializer with nested relationships and computed fields
    """
    consignment_items = ConsignmentItemSerializer(many=True, read_only=True)
    dangerous_goods_summary = serializers.SerializerMethodField()
    compliance_status = serializers.SerializerMethodField()
    
    class Meta:
        model = Shipment
        fields = '__all__'
        read_only_fields = ('created_at', 'updated_at', 'shipment_number')
    
    def get_dangerous_goods_summary(self, obj):
        """Compute dangerous goods classification summary"""
        return {
            'has_dangerous_goods': obj.has_dangerous_goods,
            'highest_hazard_class': obj.get_highest_hazard_class(),
            'placard_required': obj.requires_placard(),
            'total_dg_weight_kg': obj.get_total_dg_weight()
        }
    
    def get_compliance_status(self, obj):
        """Real-time compliance checking"""
        return ComplianceEngine.check_shipment_compliance(obj)
```

---

## 🛡️ **Security Architecture**

### **Authentication & Authorization Flow**

```
┌─────────────────────────────────────────────────────────────────┐
│                Authentication & Authorization Flow             │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Client Request                                                 │
│       │                                                         │
│       ▼                                                         │
│  ┌─────────────┐    401/403      ┌─────────────┐                │
│  │ API Gateway │ ───────────────► │   Error     │                │
│  │ Rate Limit  │                 │   Response  │                │
│  └─────────────┘                 └─────────────┘                │
│       │                                                         │
│       ▼ (Valid Rate)                                            │
│  ┌─────────────┐                                                │
│  │ JWT Token   │                                                │
│  │ Validation  │                                                │
│  └─────────────┘                                                │
│       │                                                         │
│       ▼ (Valid Token)                                           │
│  ┌─────────────┐                                                │
│  │ Permission  │                                                │
│  │ Checking    │                                                │
│  └─────────────┘                                                │
│       │                                                         │
│       ▼ (Authorized)                                            │
│  ┌─────────────┐                                                │
│  │ Data Access │                                                │
│  │ Filtering   │                                                │
│  └─────────────┘                                                │
│       │                                                         │
│       ▼                                                         │
│  ┌─────────────┐                                                │
│  │ Response    │                                                │
│  │ Generation  │                                                │
│  └─────────────┘                                                │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### **Permission System Implementation**

#### **Role-Based Access Control (RBAC)**
```python
class SafeShipperPermissionSystem:
    """
    Hierarchical permission system for SafeShipper
    """
    
    ROLES = {
        'VIEWER': {
            'level': 1,
            'permissions': [
                'view_shipments',
                'view_dangerous_goods',
                'view_sds',
                'view_documents'
            ]
        },
        'DRIVER': {
            'level': 2,
            'inherits': ['VIEWER'],
            'permissions': [
                'report_incidents',
                'update_location',
                'upload_pod'
            ]
        },
        'OPERATOR': {
            'level': 3,
            'inherits': ['DRIVER'],
            'permissions': [
                'create_shipments',
                'manage_manifests',
                'assign_drivers',
                'upload_documents'
            ]
        },
        'MANAGER': {
            'level': 4,
            'inherits': ['OPERATOR'],
            'permissions': [
                'manage_users',
                'view_analytics',
                'manage_fleet',
                'emergency_coordination'
            ]
        },
        'ADMIN': {
            'level': 5,
            'inherits': ['MANAGER'],
            'permissions': ['*']  # All permissions
        }
    }
```

#### **Object-Level Permissions**
```python
class CompanyDataPermission(BasePermission):
    """
    Ensure users can only access data from their company
    """
    
    def has_permission(self, request, view):
        return request.user.is_authenticated
    
    def has_object_permission(self, request, view, obj):
        # Super users and staff can access all data
        if request.user.is_superuser or request.user.is_staff:
            return True
        
        # Check if object belongs to user's company
        if hasattr(obj, 'company'):
            return obj.company == request.user.company
        
        # Check if object is owned by user
        if hasattr(obj, 'user') or hasattr(obj, 'created_by'):
            owner = getattr(obj, 'user', None) or getattr(obj, 'created_by', None)
            return owner == request.user
        
        return False
```

### **Data Security Patterns**

#### **Sensitive Data Handling**
```python
class SecureModelMixin:
    """
    Mixin for models that handle sensitive data
    """
    
    def save(self, *args, **kwargs):
        # Encrypt sensitive fields before saving
        if hasattr(self, 'ENCRYPTED_FIELDS'):
            for field in self.ENCRYPTED_FIELDS:
                value = getattr(self, field)
                if value and not value.startswith('enc:'):
                    encrypted_value = encrypt_field(value)
                    setattr(self, field, encrypted_value)
        
        super().save(*args, **kwargs)
    
    def get_decrypted_field(self, field_name):
        """Safely decrypt and return field value"""
        value = getattr(self, field_name)
        if value and value.startswith('enc:'):
            return decrypt_field(value)
        return value

class EmergencyContact(SecureModelMixin, models.Model):
    """Example of secure model implementation"""
    ENCRYPTED_FIELDS = ['phone', 'email', 'contact_details']
    
    name = models.CharField(max_length=100)
    phone = models.CharField(max_length=255)  # Encrypted
    email = models.CharField(max_length=255)  # Encrypted
    contact_details = models.TextField(blank=True)  # Encrypted
```

---

## 📊 **Data Architecture**

### **Database Design Patterns**

#### **Multi-Tenant Data Segregation**
```sql
-- Company-based data segregation pattern
-- Every major table includes company_id for data isolation

CREATE TABLE companies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    abn VARCHAR(20) UNIQUE,
    created_at TIMESTAMP DEFAULT NOW(),
    is_active BOOLEAN DEFAULT TRUE
);

CREATE TABLE shipments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES companies(id),
    shipment_number VARCHAR(50) NOT NULL,
    -- ... other fields
    
    -- Ensure unique shipment numbers within company
    UNIQUE(company_id, shipment_number)
);

-- Row Level Security (RLS) example
ALTER TABLE shipments ENABLE ROW LEVEL SECURITY;

CREATE POLICY shipment_company_policy ON shipments
    FOR ALL
    TO application_role
    USING (company_id = current_setting('app.current_company_id')::UUID);
```

#### **Spatial Data with PostGIS**
```sql
-- Advanced spatial indexing for tracking data
CREATE TABLE gps_tracking (
    id BIGSERIAL PRIMARY KEY,
    shipment_id UUID NOT NULL REFERENCES shipments(id),
    vehicle_id UUID NOT NULL REFERENCES vehicles(id),
    location GEOMETRY(POINT, 4326) NOT NULL,
    accuracy_meters DECIMAL(8,2),
    speed_kmh DECIMAL(6,2),
    heading_degrees INTEGER,
    recorded_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Spatial indexes for performance
CREATE INDEX idx_gps_tracking_location ON gps_tracking USING GIST (location);
CREATE INDEX idx_gps_tracking_time ON gps_tracking (recorded_at);
CREATE INDEX idx_gps_tracking_shipment ON gps_tracking (shipment_id, recorded_at);

-- Spatial partitioning for large datasets
CREATE TABLE gps_tracking_2024_01 PARTITION OF gps_tracking
    FOR VALUES FROM ('2024-01-01') TO ('2024-02-01');
```

#### **Optimized Query Patterns**
```python
class OptimizedQueryMixin:
    """
    Mixin providing optimized query patterns
    """
    
    @classmethod
    def get_optimized_shipments(cls, company, **filters):
        """
        Highly optimized shipment queries with proper joins
        """
        return cls.objects.select_related(
            'origin',
            'destination', 
            'assigned_driver',
            'assigned_vehicle',
            'company'
        ).prefetch_related(
            'consignment_items__dangerous_good',
            'documents',
            'tracking_updates'
        ).filter(
            company=company,
            **filters
        ).order_by('-created_at')
    
    @classmethod
    def get_dashboard_stats(cls, company):
        """
        Efficient dashboard statistics using aggregation
        """
        from django.db.models import Count, Sum, Q, Case, When
        
        return cls.objects.filter(company=company).aggregate(
            total_shipments=Count('id'),
            active_shipments=Count(
                Case(When(status='IN_TRANSIT', then=1))
            ),
            total_weight=Sum('total_weight_kg'),
            dangerous_goods_shipments=Count(
                Case(When(has_dangerous_goods=True, then=1))
            ),
            compliance_rate=Avg(
                Case(
                    When(compliance_status='COMPLIANT', then=100),
                    default=0,
                    output_field=DecimalField()
                )
            )
        )
```

### **Caching Strategy**

#### **Multi-Layer Caching Architecture**
```python
class CacheManager:
    """
    Multi-layer caching system for performance optimization
    """
    
    # Layer 1: In-memory cache (fastest)
    local_cache = {}
    
    # Layer 2: Redis cache (fast, shared)
    redis_client = redis.Redis(host='redis', port=6379, db=0)
    
    # Layer 3: Database query cache
    @staticmethod
    def cache_queryset(queryset, cache_key, timeout=300):
        """Cache QuerySet results with automatic invalidation"""
        cached_data = cache.get(cache_key)
        if cached_data is None:
            # Execute query and serialize results
            cached_data = list(queryset.values())
            cache.set(cache_key, cached_data, timeout)
        return cached_data
    
    @staticmethod
    def invalidate_related_caches(model_class, instance):
        """Invalidate caches when model instances change"""
        cache_patterns = {
            'Shipment': ['shipments:*', 'dashboard:*', 'analytics:*'],
            'DangerousGood': ['dg:*', 'compatibility:*'],
            'EmergencyProcedure': ['emergency:*', 'procedures:*']
        }
        
        patterns = cache_patterns.get(model_class.__name__, [])
        for pattern in patterns:
            cache.delete_pattern(pattern)

# Automatic cache invalidation using Django signals
@receiver(post_save)
def invalidate_cache_on_save(sender, instance, **kwargs):
    CacheManager.invalidate_related_caches(sender, instance)
```

---

## ⚡ **Performance Optimization**

### **Database Query Optimization**

#### **Strategic Indexing**
```sql
-- Compound indexes for complex query patterns
CREATE INDEX idx_shipments_company_status_date ON shipments 
    (company_id, status, created_at DESC);

CREATE INDEX idx_dangerous_goods_search ON dangerous_goods 
    USING GIN (to_tsvector('english', proper_shipping_name || ' ' || synonyms));

-- Partial indexes for frequently filtered data
CREATE INDEX idx_active_vehicles ON vehicles (company_id) 
    WHERE is_active = TRUE;

CREATE INDEX idx_emergency_incidents_open ON emergency_incidents (company_id, created_at) 
    WHERE status IN ('REPORTED', 'IN_PROGRESS');
```

#### **Query Performance Monitoring**
```python
class QueryPerformanceMiddleware:
    """
    Middleware to monitor and log slow database queries
    """
    
    def __init__(self, get_response):
        self.get_response = get_response
    
    def __call__(self, request):
        # Start query monitoring
        queries_before = len(connection.queries)
        start_time = time.time()
        
        response = self.get_response(request)
        
        # Calculate query performance
        queries_after = len(connection.queries)
        query_count = queries_after - queries_before
        query_time = time.time() - start_time
        
        # Log slow requests
        if query_time > 1.0 or query_count > 20:
            performance_logger.warning(
                f"Slow request: {request.path} "
                f"({query_count} queries, {query_time:.2f}s)"
            )
        
        return response
```

### **Async Processing Architecture**

#### **Celery Task Patterns**
```python
# celery.py - Celery configuration
from celery import Celery
from celery.schedules import crontab

app = Celery('safeshipper')

# Task routing for different queues
app.conf.task_routes = {
    'emergency.*': {'queue': 'emergency', 'priority': 10},
    'documents.process': {'queue': 'documents', 'priority': 5},
    'analytics.*': {'queue': 'analytics', 'priority': 3},
    'notifications.*': {'queue': 'notifications', 'priority': 7},
}

# Periodic tasks
app.conf.beat_schedule = {
    'check_vehicle_compliance': {
        'task': 'vehicles.tasks.check_compliance',
        'schedule': crontab(minute=0),  # Every hour
    },
    'process_pending_documents': {
        'task': 'documents.tasks.process_pending',
        'schedule': crontab(minute='*/15'),  # Every 15 minutes
    },
    'update_emergency_contacts': {
        'task': 'emergency_procedures.tasks.verify_contacts',
        'schedule': crontab(hour=2, minute=0),  # Daily at 2 AM
    },
}

# Example task implementation
@shared_task(bind=True, max_retries=3)
def process_manifest_document(self, document_id):
    """
    Async processing of manifest documents with OCR and validation
    """
    try:
        document = Document.objects.get(id=document_id)
        
        # Update progress
        document.processing_status = 'IN_PROGRESS'
        document.save()
        
        # OCR processing
        extracted_text = OCRService.extract_text(document.file_path)
        
        # Dangerous goods detection
        detected_dg = DGDetectionService.analyze_text(extracted_text)
        
        # Validation
        validation_results = ManifestValidator.validate(detected_dg)
        
        # Update document
        document.extracted_data = {
            'text': extracted_text,
            'dangerous_goods': detected_dg,
            'validation': validation_results
        }
        document.processing_status = 'COMPLETED'
        document.save()
        
        # Send notification
        notify_document_processed.delay(document_id)
        
    except Exception as exc:
        # Retry with exponential backoff
        raise self.retry(exc=exc, countdown=60 * (2 ** self.request.retries))
```

---

## 🔄 **Integration Patterns**

### **External API Integration**

#### **Government API Integration**
```python
class GovernmentAPIClient:
    """
    Client for integrating with government dangerous goods databases
    """
    
    def __init__(self):
        self.base_url = settings.GOVERNMENT_API_URL
        self.api_key = settings.GOVERNMENT_API_KEY
        self.session = requests.Session()
        self.session.headers.update({
            'Authorization': f'Bearer {self.api_key}',
            'Content-Type': 'application/json'
        })
    
    @retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=4, max=10))
    def get_dangerous_good_info(self, un_number):
        """
        Fetch dangerous goods information with automatic retry
        """
        try:
            response = self.session.get(
                f"{self.base_url}/dangerous-goods/{un_number}",
                timeout=30
            )
            response.raise_for_status()
            return response.json()
            
        except requests.exceptions.RequestException as e:
            api_logger.error(f"Government API error for UN{un_number}: {e}")
            raise
    
    def sync_dangerous_goods_updates(self):
        """
        Sync daily updates from government database
        """
        last_sync = cache.get('last_dg_sync', datetime.now() - timedelta(days=1))
        
        try:
            updates = self.session.get(
                f"{self.base_url}/updates",
                params={'since': last_sync.isoformat()}
            ).json()
            
            for update in updates['results']:
                self.process_dangerous_good_update(update)
            
            cache.set('last_dg_sync', datetime.now(), timeout=86400)
            
        except Exception as e:
            sync_logger.error(f"Failed to sync DG updates: {e}")
```

### **ERP System Integration**

#### **Flexible ERP Adapter Pattern**
```python
class ERPAdapterRegistry:
    """
    Registry for different ERP system adapters
    """
    
    adapters = {}
    
    @classmethod
    def register(cls, erp_type):
        def decorator(adapter_class):
            cls.adapters[erp_type] = adapter_class
            return adapter_class
        return decorator
    
    @classmethod
    def get_adapter(cls, erp_type):
        adapter_class = cls.adapters.get(erp_type)
        if not adapter_class:
            raise ValueError(f"No adapter found for ERP type: {erp_type}")
        return adapter_class()

@ERPAdapterRegistry.register('SAP')
class SAPAdapter(BaseERPAdapter):
    """SAP ERP integration adapter"""
    
    def sync_shipment_data(self, shipment):
        """Sync shipment data to SAP"""
        sap_data = self.transform_shipment_to_sap(shipment)
        
        response = self.sap_client.post('/deliveries', data=sap_data)
        
        if response.status_code == 201:
            shipment.external_id = response.json()['delivery_id']
            shipment.save()
        
        return response.status_code == 201
    
    def transform_shipment_to_sap(self, shipment):
        """Transform SafeShipper shipment to SAP format"""
        return {
            'delivery_number': shipment.shipment_number,
            'customer_id': shipment.customer.external_id,
            'items': [
                {
                    'material_number': item.dangerous_good.un_number,
                    'quantity': item.quantity,
                    'unit': item.unit,
                    'weight': item.net_weight_kg
                }
                for item in shipment.consignment_items.all()
            ],
            'delivery_date': shipment.scheduled_delivery.isoformat(),
            'special_handling': shipment.get_special_handling_codes()
        }
```

---

## 📊 **Monitoring & Observability**

### **Comprehensive Logging Strategy**

#### **Structured Logging Implementation**
```python
import structlog
from datetime import datetime

# Configure structured logging
structlog.configure(
    processors=[
        structlog.stdlib.filter_by_level,
        structlog.stdlib.add_logger_name,
        structlog.stdlib.add_log_level,
        structlog.stdlib.PositionalArgumentsFormatter(),
        structlog.processors.TimeStamper(fmt="iso"),
        structlog.processors.StackInfoRenderer(),
        structlog.processors.format_exc_info,
        structlog.processors.UnicodeDecoder(),
        structlog.processors.JSONRenderer()
    ],
    context_class=dict,
    logger_factory=structlog.stdlib.LoggerFactory(),
    wrapper_class=structlog.stdlib.BoundLogger,
    cache_logger_on_first_use=True,
)

# Application-specific loggers
api_logger = structlog.get_logger("api")
security_logger = structlog.get_logger("security")
performance_logger = structlog.get_logger("performance")
business_logger = structlog.get_logger("business")

# Example usage in views
class EmergencyProcedureViewSet(BaseViewSet):
    def create(self, request, *args, **kwargs):
        api_logger.info(
            "Emergency procedure creation started",
            user_id=request.user.id,
            company_id=request.user.company.id,
            request_data=request.data
        )
        
        try:
            response = super().create(request, *args, **kwargs)
            
            business_logger.info(
                "Emergency procedure created",
                procedure_id=response.data['id'],
                procedure_type=response.data['emergency_type'],
                user_id=request.user.id
            )
            
            return response
            
        except Exception as e:
            api_logger.error(
                "Emergency procedure creation failed",
                error=str(e),
                user_id=request.user.id,
                request_data=request.data
            )
            raise
```

### **Performance Monitoring**

#### **Custom Metrics Collection**
```python
class SafeShipperMetrics:
    """
    Custom metrics collection for business KPIs
    """
    
    def __init__(self):
        self.redis_client = redis.Redis(host='redis', port=6379, db=1)
    
    def track_api_call(self, endpoint, method, response_time, status_code):
        """Track API performance metrics"""
        timestamp = int(time.time())
        
        # Store metrics in Redis time series
        self.redis_client.zadd(
            f"api:response_times:{endpoint}:{method}",
            {timestamp: response_time}
        )
        
        self.redis_client.incr(f"api:calls:{endpoint}:{method}")
        self.redis_client.incr(f"api:status:{status_code}")
    
    def track_business_event(self, event_type, **metadata):
        """Track business-specific events"""
        event_data = {
            'timestamp': datetime.now().isoformat(),
            'event_type': event_type,
            'metadata': metadata
        }
        
        # Store in Redis list for real-time processing
        self.redis_client.lpush(
            'business_events',
            json.dumps(event_data)
        )
        
        # Also store in time series for analytics
        self.redis_client.zadd(
            f"events:{event_type}",
            {int(time.time()): 1}
        )

# Middleware integration
class MetricsMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response
        self.metrics = SafeShipperMetrics()
    
    def __call__(self, request):
        start_time = time.time()
        
        response = self.get_response(request)
        
        response_time = time.time() - start_time
        
        self.metrics.track_api_call(
            endpoint=request.path,
            method=request.method,
            response_time=response_time,
            status_code=response.status_code
        )
        
        return response
```

---

## 🚀 **Deployment Architecture**

### **Docker Multi-Stage Build**

```dockerfile
# Multi-stage production-optimized Dockerfile
FROM python:3.11-slim as builder

# Install system dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    postgresql-client \
    libpq-dev \
    gdal-bin \
    libgdal-dev \
    && rm -rf /var/lib/apt/lists/*

# Create virtual environment
RUN python -m venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"

# Install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Production stage
FROM python:3.11-slim as production

# Install only runtime dependencies
RUN apt-get update && apt-get install -y \
    postgresql-client \
    libpq5 \
    gdal-bin \
    && rm -rf /var/lib/apt/lists/*

# Copy virtual environment from builder
COPY --from=builder /opt/venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"

# Create app user
RUN useradd --create-home --shell /bin/bash safeshipper
USER safeshipper

# Copy application code
WORKDIR /app
COPY --chown=safeshipper:safeshipper . .

# Collect static files
RUN python manage.py collectstatic --noinput

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD python manage.py health_check || exit 1

# Run application
EXPOSE 8000
CMD ["gunicorn", "--bind", "0.0.0.0:8000", "--workers", "4", "safeshipper_core.wsgi:application"]
```

### **Kubernetes Deployment Configuration**

```yaml
# kubernetes/backend-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: safeshipper-backend
  labels:
    app: safeshipper-backend
spec:
  replicas: 3
  selector:
    matchLabels:
      app: safeshipper-backend
  template:
    metadata:
      labels:
        app: safeshipper-backend
    spec:
      containers:
      - name: backend
        image: safeshipper/backend:latest
        ports:
        - containerPort: 8000
        env:
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: safeshipper-secrets
              key: database-url
        - name: REDIS_URL
          valueFrom:
            secretKeyRef:
              name: safeshipper-secrets
              key: redis-url
        resources:
          requests:
            memory: "512Mi"
            cpu: "250m"
          limits:
            memory: "1Gi"
            cpu: "500m"
        livenessProbe:
          httpGet:
            path: /health/
            port: 8000
          initialDelaySeconds: 30
          periodSeconds: 30
        readinessProbe:
          httpGet:
            path: /health/ready/
            port: 8000
          initialDelaySeconds: 5
          periodSeconds: 10
---
apiVersion: v1
kind: Service
metadata:
  name: safeshipper-backend-service
spec:
  selector:
    app: safeshipper-backend
  ports:
  - protocol: TCP
    port: 80
    targetPort: 8000
  type: ClusterIP
```

---

## 🎯 **Best Practices & Guidelines**

### **Code Organization Principles**

1. **Domain-Driven Design**: Each Django app represents a bounded context
2. **Single Responsibility**: Each class and function has one clear purpose
3. **Dependency Injection**: Use Django's dependency injection patterns
4. **Configuration Management**: Environment-based configuration
5. **Test-Driven Development**: Comprehensive test coverage >90%

### **API Development Guidelines**

1. **Versioning Strategy**: URL-based versioning (`/api/v1/`)
2. **Error Handling**: Consistent error response format
3. **Documentation**: OpenAPI/Swagger auto-generated docs
4. **Rate Limiting**: Per-user and per-endpoint rate limits
5. **Caching**: Multi-layer caching strategy

### **Security Best Practices**

1. **Input Validation**: Validate all user inputs at serializer level
2. **Output Encoding**: Prevent XSS through proper encoding
3. **SQL Injection Prevention**: Use Django ORM exclusively
4. **Authentication**: JWT tokens with proper expiration
5. **Authorization**: Multi-level permission checking

---

**This architecture guide provides the foundation for understanding, maintaining, and extending the SafeShipper backend system. It emphasizes security, performance, scalability, and maintainability to ensure the platform can grow with business needs while maintaining the highest standards of safety and compliance.**