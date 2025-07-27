"""
Analytics models for unified analytics system.
Defines analytics queries, caching strategies, and access permissions.
"""

from django.db import models
from django.contrib.auth import get_user_model
from django.contrib.postgres.fields import JSONField
from django.core.validators import MinValueValidator, MaxValueValidator
import uuid

User = get_user_model()


class AnalyticsDefinition(models.Model):
    """
    Defines analytics queries and their access permissions.
    Central registry for all analytics across the platform.
    """
    
    class AnalyticsType(models.TextChoices):
        # Fleet Analytics
        FLEET_UTILIZATION = 'fleet_utilization', 'Fleet Utilization'
        FLEET_PERFORMANCE = 'fleet_performance', 'Fleet Performance'
        VEHICLE_EFFICIENCY = 'vehicle_efficiency', 'Vehicle Efficiency'
        DRIVER_PERFORMANCE = 'driver_performance', 'Driver Performance'
        
        # Shipment Analytics
        SHIPMENT_TRENDS = 'shipment_trends', 'Shipment Trends'
        DELIVERY_PERFORMANCE = 'delivery_performance', 'Delivery Performance'
        ROUTE_OPTIMIZATION = 'route_optimization', 'Route Optimization'
        CAPACITY_UTILIZATION = 'capacity_utilization', 'Capacity Utilization'
        
        # Compliance Analytics
        COMPLIANCE_METRICS = 'compliance_metrics', 'Compliance Metrics'
        DG_COMPLIANCE = 'dg_compliance', 'Dangerous Goods Compliance'
        SAFETY_METRICS = 'safety_metrics', 'Safety Metrics'
        AUDIT_METRICS = 'audit_metrics', 'Audit Metrics'
        
        # Financial Analytics
        FINANCIAL_PERFORMANCE = 'financial_performance', 'Financial Performance'
        COST_ANALYSIS = 'cost_analysis', 'Cost Analysis'
        REVENUE_ANALYSIS = 'revenue_analysis', 'Revenue Analysis'
        PROFITABILITY = 'profitability', 'Profitability'
        
        # Operational Analytics
        OPERATIONAL_EFFICIENCY = 'operational_efficiency', 'Operational Efficiency'
        CUSTOMER_INSIGHTS = 'customer_insights', 'Customer Insights'
        ENVIRONMENTAL_IMPACT = 'environmental_impact', 'Environmental Impact'
        RISK_ANALYTICS = 'risk_analytics', 'Risk Analytics'
        
        # Predictive Analytics
        PREDICTIVE_MAINTENANCE = 'predictive_maintenance', 'Predictive Maintenance'
        DEMAND_FORECASTING = 'demand_forecasting', 'Demand Forecasting'
        INCIDENT_PREDICTION = 'incident_prediction', 'Incident Prediction'
        PERFORMANCE_PREDICTION = 'performance_prediction', 'Performance Prediction'
    
    class RefreshStrategy(models.TextChoices):
        REALTIME = 'realtime', 'Real-time'
        NEAR_REALTIME = 'near_realtime', 'Near Real-time (1-5 min)'
        SCHEDULED = 'scheduled', 'Scheduled (hourly/daily)'
        ON_DEMAND = 'on_demand', 'On Demand'
    
    class DataScope(models.TextChoices):
        GLOBAL = 'global', 'Global (All Data)'
        COMPANY = 'company', 'Company Scoped'
        DEPOT = 'depot', 'Depot Scoped'
        USER = 'user', 'User Scoped'
        CUSTOM = 'custom', 'Custom Filter'
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=100, unique=True)
    display_name = models.CharField(max_length=150)
    description = models.TextField(blank=True)
    analytics_type = models.CharField(max_length=50, choices=AnalyticsType.choices)
    
    # Query Configuration
    query_template = models.TextField(help_text="SQL template with parameter placeholders")
    materialized_view = models.CharField(max_length=100, blank=True, help_text="Associated materialized view name")
    base_table = models.CharField(max_length=100, help_text="Primary table for the analytics")
    
    # Permission Configuration
    required_roles = JSONField(default=list, help_text="List of roles that can access this analytics")
    required_permissions = JSONField(default=list, help_text="List of permissions required")
    data_scope = models.CharField(max_length=20, choices=DataScope.choices, default=DataScope.COMPANY)
    
    # Performance Configuration
    cache_duration = models.IntegerField(default=300, help_text="Cache duration in seconds")
    refresh_strategy = models.CharField(max_length=20, choices=RefreshStrategy.choices, default=RefreshStrategy.SCHEDULED)
    computation_cost = models.IntegerField(
        default=1, 
        validators=[MinValueValidator(1), MaxValueValidator(10)],
        help_text="Computation cost scale 1-10 (10 = most expensive)"
    )
    max_time_range = models.CharField(max_length=10, default='1y', help_text="Maximum time range allowed (e.g., '30d', '1y')")
    
    # Metadata
    is_active = models.BooleanField(default=True)
    version = models.CharField(max_length=10, default='1.0')
    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='created_analytics')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    last_computed = models.DateTimeField(null=True, blank=True)
    
    # Export Configuration
    export_formats = JSONField(default=list, help_text="Allowed export formats: pdf, csv, excel, json")
    export_permissions = JSONField(default=list, help_text="Roles allowed to export this analytics")
    
    class Meta:
        db_table = 'analytics_definitions'
        ordering = ['name']
        indexes = [
            models.Index(fields=['analytics_type']),
            models.Index(fields=['is_active', 'analytics_type']),
            models.Index(fields=['refresh_strategy']),
        ]
    
    def __str__(self):
        return f"{self.display_name} ({self.analytics_type})"
    
    def can_user_access(self, user):
        """Check if user has access to this analytics definition"""
        if not user or not user.is_authenticated:
            return False
        
        # Check role requirements
        if self.required_roles:
            user_roles = getattr(user, 'roles', [])
            if not any(role in self.required_roles for role in user_roles):
                return False
        
        # Check permission requirements
        if self.required_permissions:
            for permission in self.required_permissions:
                if not user.has_perm(permission):
                    return False
        
        return True
    
    def can_user_export(self, user, format_type):
        """Check if user can export this analytics in specified format"""
        if not self.can_user_access(user):
            return False
        
        if format_type not in self.export_formats:
            return False
        
        if self.export_permissions:
            user_roles = getattr(user, 'roles', [])
            return any(role in self.export_permissions for role in user_roles)
        
        return True


class AnalyticsCache(models.Model):
    """
    Manages caching for analytics results.
    Tracks cache keys, expiration, and invalidation strategies.
    """
    
    class CacheLevel(models.TextChoices):
        MEMORY = 'memory', 'Memory Cache'
        REDIS = 'redis', 'Redis Cache'
        MATERIALIZED = 'materialized', 'Materialized View'
        DATABASE = 'database', 'Database Result'
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    analytics_definition = models.ForeignKey(AnalyticsDefinition, on_delete=models.CASCADE, related_name='cache_entries')
    cache_key = models.CharField(max_length=255, unique=True)
    cache_level = models.CharField(max_length=20, choices=CacheLevel.choices)
    
    # Cache Configuration
    user_id = models.UUIDField(null=True, blank=True, help_text="User-specific cache if applicable")
    company_id = models.IntegerField(null=True, blank=True, help_text="Company-scoped cache")
    filters_hash = models.CharField(max_length=64, help_text="Hash of applied filters")
    time_range = models.CharField(max_length=20, help_text="Time range for the cached data")
    granularity = models.CharField(max_length=20, default='auto', help_text="Data granularity")
    
    # Cache Metadata
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField()
    last_accessed = models.DateTimeField(auto_now=True)
    hit_count = models.IntegerField(default=0)
    data_size_bytes = models.BigIntegerField(default=0)
    computation_time_ms = models.IntegerField(default=0)
    
    # Invalidation
    is_valid = models.BooleanField(default=True)
    invalidated_at = models.DateTimeField(null=True, blank=True)
    invalidation_reason = models.CharField(max_length=100, blank=True)
    
    class Meta:
        db_table = 'analytics_cache'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['cache_key']),
            models.Index(fields=['analytics_definition', 'is_valid']),
            models.Index(fields=['expires_at', 'is_valid']),
            models.Index(fields=['company_id', 'cache_level']),
        ]
    
    def __str__(self):
        return f"Cache: {self.analytics_definition.name} - {self.cache_level}"
    
    def is_expired(self):
        """Check if cache entry has expired"""
        from django.utils import timezone
        return timezone.now() > self.expires_at
    
    def invalidate(self, reason="Manual invalidation"):
        """Mark cache entry as invalid"""
        from django.utils import timezone
        self.is_valid = False
        self.invalidated_at = timezone.now()
        self.invalidation_reason = reason
        self.save(update_fields=['is_valid', 'invalidated_at', 'invalidation_reason'])


class AnalyticsExecution(models.Model):
    """
    Tracks analytics execution for performance monitoring and optimization.
    """
    
    class ExecutionStatus(models.TextChoices):
        PENDING = 'pending', 'Pending'
        RUNNING = 'running', 'Running'
        COMPLETED = 'completed', 'Completed'
        FAILED = 'failed', 'Failed'
        CACHED = 'cached', 'Served from Cache'
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    analytics_definition = models.ForeignKey(AnalyticsDefinition, on_delete=models.CASCADE, related_name='executions')
    
    # Execution Context
    user = models.ForeignKey(User, on_delete=models.SET_NULL, null=True)
    company_id = models.IntegerField(null=True, blank=True)
    filters = JSONField(default=dict)
    time_range = models.CharField(max_length=20)
    granularity = models.CharField(max_length=20, default='auto')
    
    # Execution Metadata
    status = models.CharField(max_length=20, choices=ExecutionStatus.choices, default=ExecutionStatus.PENDING)
    started_at = models.DateTimeField(auto_now_add=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    execution_time_ms = models.IntegerField(null=True, blank=True)
    
    # Performance Metrics
    query_time_ms = models.IntegerField(null=True, blank=True)
    cache_hit = models.BooleanField(default=False)
    cache_level = models.CharField(max_length=20, blank=True)
    result_size_bytes = models.BigIntegerField(null=True, blank=True)
    rows_returned = models.IntegerField(null=True, blank=True)
    
    # Error Handling
    error_message = models.TextField(blank=True)
    error_traceback = models.TextField(blank=True)
    
    class Meta:
        db_table = 'analytics_executions'
        ordering = ['-started_at']
        indexes = [
            models.Index(fields=['analytics_definition', 'status']),
            models.Index(fields=['user', 'started_at']),
            models.Index(fields=['company_id', 'started_at']),
            models.Index(fields=['started_at']),
        ]
    
    def __str__(self):
        return f"Execution: {self.analytics_definition.name} - {self.status}"
    
    def mark_completed(self, execution_time_ms, result_size_bytes=None, rows_returned=None):
        """Mark execution as completed with performance metrics"""
        from django.utils import timezone
        self.status = self.ExecutionStatus.COMPLETED
        self.completed_at = timezone.now()
        self.execution_time_ms = execution_time_ms
        if result_size_bytes is not None:
            self.result_size_bytes = result_size_bytes
        if rows_returned is not None:
            self.rows_returned = rows_returned
        self.save()
    
    def mark_failed(self, error_message, error_traceback=""):
        """Mark execution as failed with error details"""
        from django.utils import timezone
        self.status = self.ExecutionStatus.FAILED
        self.completed_at = timezone.now()
        self.error_message = error_message
        self.error_traceback = error_traceback
        self.save()


class AnalyticsAlert(models.Model):
    """
    Configurable alerts for analytics thresholds and anomalies.
    """
    
    class AlertType(models.TextChoices):
        THRESHOLD = 'threshold', 'Threshold Alert'
        ANOMALY = 'anomaly', 'Anomaly Detection'
        TREND = 'trend', 'Trend Alert'
        MISSING_DATA = 'missing_data', 'Missing Data Alert'
    
    class AlertSeverity(models.TextChoices):
        LOW = 'low', 'Low'
        MEDIUM = 'medium', 'Medium'
        HIGH = 'high', 'High'
        CRITICAL = 'critical', 'Critical'
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    analytics_definition = models.ForeignKey(AnalyticsDefinition, on_delete=models.CASCADE, related_name='alerts')
    
    # Alert Configuration
    name = models.CharField(max_length=100)
    description = models.TextField(blank=True)
    alert_type = models.CharField(max_length=20, choices=AlertType.choices)
    severity = models.CharField(max_length=20, choices=AlertSeverity.choices)
    
    # Threshold Configuration
    metric_field = models.CharField(max_length=50, help_text="Field to monitor")
    threshold_value = models.FloatField(null=True, blank=True)
    comparison_operator = models.CharField(max_length=10, default='>', choices=[
        ('>', 'Greater than'),
        ('<', 'Less than'),
        ('>=', 'Greater than or equal'),
        ('<=', 'Less than or equal'),
        ('==', 'Equal to'),
        ('!=', 'Not equal to'),
    ])
    
    # Alert Rules
    condition = JSONField(default=dict, help_text="Complex alert conditions")
    check_interval = models.IntegerField(default=300, help_text="Check interval in seconds")
    cooldown_period = models.IntegerField(default=3600, help_text="Cooldown period between alerts in seconds")
    
    # Notification Configuration
    notification_channels = JSONField(default=list, help_text="List of notification channels (email, slack, etc.)")
    recipients = JSONField(default=list, help_text="List of recipient emails/users")
    
    # Metadata
    is_active = models.BooleanField(default=True)
    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    last_triggered = models.DateTimeField(null=True, blank=True)
    trigger_count = models.IntegerField(default=0)
    
    class Meta:
        db_table = 'analytics_alerts'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['analytics_definition', 'is_active']),
            models.Index(fields=['alert_type', 'severity']),
            models.Index(fields=['is_active', 'last_triggered']),
        ]
    
    def __str__(self):
        return f"Alert: {self.name} ({self.severity})"