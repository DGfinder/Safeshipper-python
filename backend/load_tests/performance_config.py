# load_tests/performance_config.py
"""
Performance testing configuration and utilities for SafeShipper load testing.
Defines test scenarios, thresholds, and monitoring setup.
"""

import os
from typing import Dict, List, Any
from dataclasses import dataclass
from datetime import datetime, timedelta


@dataclass
class PerformanceThreshold:
    """Define performance thresholds for different operations."""
    endpoint: str
    max_response_time_ms: int
    max_95th_percentile_ms: int
    min_requests_per_second: float
    max_error_rate_percent: float


@dataclass
class LoadTestScenario:
    """Define load test scenarios."""
    name: str
    description: str
    user_count: int
    spawn_rate: int
    run_time_minutes: int
    user_classes: List[str]
    host: str = "http://localhost:8000"


class SafeShipperPerformanceConfig:
    """
    Performance testing configuration for SafeShipper dangerous goods platform.
    """
    
    # Performance thresholds for critical SafeShipper operations
    PERFORMANCE_THRESHOLDS = [
        PerformanceThreshold(
            endpoint="/api/v1/dangerous-goods/search/",
            max_response_time_ms=500,
            max_95th_percentile_ms=1000,
            min_requests_per_second=50.0,
            max_error_rate_percent=1.0
        ),
        PerformanceThreshold(
            endpoint="/api/v1/dangerous-goods/[un_number]/",
            max_response_time_ms=200,
            max_95th_percentile_ms=500,
            min_requests_per_second=100.0,
            max_error_rate_percent=0.5
        ),
        PerformanceThreshold(
            endpoint="/api/v1/shipments/",
            max_response_time_ms=1000,
            max_95th_percentile_ms=2000,
            min_requests_per_second=20.0,
            max_error_rate_percent=2.0
        ),
        PerformanceThreshold(
            endpoint="/api/v1/system/health/",
            max_response_time_ms=100,
            max_95th_percentile_ms=200,
            min_requests_per_second=200.0,
            max_error_rate_percent=0.1
        ),
        PerformanceThreshold(
            endpoint="/api/v1/emergency-procedures/quick-reference/",
            max_response_time_ms=300,
            max_95th_percentile_ms=600,
            min_requests_per_second=30.0,
            max_error_rate_percent=0.5
        ),
        PerformanceThreshold(
            endpoint="/api/v1/shipments/[id]/generate-pdf/",
            max_response_time_ms=3000,
            max_95th_percentile_ms=5000,
            min_requests_per_second=5.0,
            max_error_rate_percent=2.0
        ),
    ]
    
    # Load test scenarios for different use cases
    LOAD_TEST_SCENARIOS = [
        LoadTestScenario(
            name="smoke_test",
            description="Quick smoke test with minimal load",
            user_count=5,
            spawn_rate=1,
            run_time_minutes=2,
            user_classes=["SafeShipperAPIUser"]
        ),
        LoadTestScenario(
            name="normal_operation",
            description="Normal business operations load",
            user_count=25,
            spawn_rate=2,
            run_time_minutes=10,
            user_classes=["SafeShipperAPIUser", "ComplianceOfficerTasks"]
        ),
        LoadTestScenario(
            name="peak_hours",
            description="Peak business hours with high concurrent users",
            user_count=100,
            spawn_rate=5,
            run_time_minutes=15,
            user_classes=["SafeShipperAPIUser", "DriverMobileTasks", "ComplianceOfficerTasks"]
        ),
        LoadTestScenario(
            name="stress_test",
            description="Stress test to find breaking points",
            user_count=200,
            spawn_rate=10,
            run_time_minutes=20,
            user_classes=["HighVolumeAPIUser", "DatabaseStressUser"]
        ),
        LoadTestScenario(
            name="endurance_test",
            description="Long-running test for memory leaks and stability",
            user_count=50,
            spawn_rate=2,
            run_time_minutes=60,
            user_classes=["SafeShipperAPIUser", "DriverMobileTasks"]
        ),
        LoadTestScenario(
            name="spike_test",
            description="Sudden traffic spike simulation",
            user_count=300,
            spawn_rate=50,
            run_time_minutes=5,
            user_classes=["HighVolumeAPIUser"]
        ),
        LoadTestScenario(
            name="database_stress",
            description="Database-intensive operations stress test",
            user_count=75,
            spawn_rate=5,
            run_time_minutes=15,
            user_classes=["DatabaseStressUser"]
        ),
        LoadTestScenario(
            name="mobile_heavy",
            description="Mobile driver operations heavy load",
            user_count=150,
            spawn_rate=10,
            run_time_minutes=12,
            user_classes=["DriverMobileTasks"]
        ),
    ]
    
    # Environment-specific configurations
    ENVIRONMENT_CONFIGS = {
        "local": {
            "host": "http://localhost:8000",
            "database_url": "postgresql://localhost:5432/safeshipper_test",
            "redis_url": "redis://localhost:6379/1",
            "max_users": 50,
            "monitoring_enabled": False
        },
        "staging": {
            "host": "https://staging.safeshipper.com",
            "database_url": os.getenv("STAGING_DATABASE_URL"),
            "redis_url": os.getenv("STAGING_REDIS_URL"),
            "max_users": 200,
            "monitoring_enabled": True
        },
        "production": {
            "host": "https://api.safeshipper.com",
            "database_url": os.getenv("PROD_DATABASE_URL"),
            "redis_url": os.getenv("PROD_REDIS_URL"),
            "max_users": 500,
            "monitoring_enabled": True
        }
    }
    
    # Critical SafeShipper business operations that must maintain performance
    CRITICAL_OPERATIONS = [
        "dangerous_goods_search",
        "shipment_creation",
        "emergency_procedures_lookup",
        "system_health_check",
        "driver_qualification_check",
        "vehicle_compatibility_check"
    ]
    
    # Performance monitoring metrics
    MONITORING_METRICS = [
        "response_time_avg",
        "response_time_95th",
        "requests_per_second",
        "error_rate",
        "database_query_time",
        "cache_hit_rate",
        "memory_usage",
        "cpu_usage",
        "database_connections",
        "redis_memory_usage"
    ]
    
    @classmethod
    def get_scenario_by_name(cls, scenario_name: str) -> LoadTestScenario:
        """Get load test scenario by name."""
        for scenario in cls.LOAD_TEST_SCENARIOS:
            if scenario.name == scenario_name:
                return scenario
        raise ValueError(f"Unknown scenario: {scenario_name}")
    
    @classmethod
    def get_environment_config(cls, environment: str) -> Dict[str, Any]:
        """Get environment-specific configuration."""
        if environment not in cls.ENVIRONMENT_CONFIGS:
            raise ValueError(f"Unknown environment: {environment}")
        return cls.ENVIRONMENT_CONFIGS[environment]
    
    @classmethod
    def get_threshold_for_endpoint(cls, endpoint: str) -> PerformanceThreshold:
        """Get performance threshold for specific endpoint."""
        for threshold in cls.PERFORMANCE_THRESHOLDS:
            if threshold.endpoint == endpoint:
                return threshold
        # Return default threshold
        return PerformanceThreshold(
            endpoint=endpoint,
            max_response_time_ms=1000,
            max_95th_percentile_ms=2000,
            min_requests_per_second=10.0,
            max_error_rate_percent=5.0
        )
    
    @classmethod
    def get_recommended_scenario(cls, environment: str, test_type: str) -> LoadTestScenario:
        """Get recommended scenario based on environment and test type."""
        env_config = cls.get_environment_config(environment)
        max_users = env_config["max_users"]
        
        recommendations = {
            "smoke": "smoke_test",
            "functional": "normal_operation",
            "performance": "peak_hours",
            "stress": "stress_test",
            "endurance": "endurance_test",
            "spike": "spike_test"
        }
        
        scenario_name = recommendations.get(test_type, "normal_operation")
        scenario = cls.get_scenario_by_name(scenario_name)
        
        # Adjust user count based on environment limits
        if scenario.user_count > max_users:
            scenario.user_count = max_users
            scenario.spawn_rate = min(scenario.spawn_rate, max_users // 10)
        
        scenario.host = env_config["host"]
        return scenario


class PerformanceAnalyzer:
    """
    Analyze load test results against performance thresholds.
    """
    
    def __init__(self, config: SafeShipperPerformanceConfig):
        self.config = config
        self.results = {}
        self.violations = []
    
    def analyze_results(self, test_results: Dict[str, Any]) -> Dict[str, Any]:
        """Analyze test results against performance thresholds."""
        analysis = {
            "overall_status": "PASS",
            "threshold_violations": [],
            "performance_summary": {},
            "recommendations": []
        }
        
        for endpoint_stats in test_results.get("stats", {}).values():
            endpoint = endpoint_stats.get("name", "unknown")
            threshold = self.config.get_threshold_for_endpoint(endpoint)
            
            violations = self._check_thresholds(endpoint_stats, threshold)
            if violations:
                analysis["threshold_violations"].extend(violations)
                analysis["overall_status"] = "FAIL"
        
        # Generate performance summary
        analysis["performance_summary"] = self._generate_performance_summary(test_results)
        
        # Generate recommendations
        analysis["recommendations"] = self._generate_recommendations(analysis)
        
        return analysis
    
    def _check_thresholds(self, stats: Dict[str, Any], threshold: PerformanceThreshold) -> List[Dict[str, Any]]:
        """Check individual endpoint stats against thresholds."""
        violations = []
        
        # Check average response time
        avg_response_time = stats.get("avg_response_time", 0)
        if avg_response_time > threshold.max_response_time_ms:
            violations.append({
                "type": "response_time",
                "endpoint": threshold.endpoint,
                "actual": avg_response_time,
                "threshold": threshold.max_response_time_ms,
                "severity": "HIGH"
            })
        
        # Check 95th percentile response time
        p95_response_time = stats.get("95th_percentile", 0)
        if p95_response_time > threshold.max_95th_percentile_ms:
            violations.append({
                "type": "95th_percentile",
                "endpoint": threshold.endpoint,
                "actual": p95_response_time,
                "threshold": threshold.max_95th_percentile_ms,
                "severity": "MEDIUM"
            })
        
        # Check error rate
        error_rate = (stats.get("num_failures", 0) / max(stats.get("num_requests", 1), 1)) * 100
        if error_rate > threshold.max_error_rate_percent:
            violations.append({
                "type": "error_rate",
                "endpoint": threshold.endpoint,
                "actual": error_rate,
                "threshold": threshold.max_error_rate_percent,
                "severity": "CRITICAL"
            })
        
        return violations
    
    def _generate_performance_summary(self, test_results: Dict[str, Any]) -> Dict[str, Any]:
        """Generate overall performance summary."""
        total_requests = sum(stats.get("num_requests", 0) for stats in test_results.get("stats", {}).values())
        total_failures = sum(stats.get("num_failures", 0) for stats in test_results.get("stats", {}).values())
        
        return {
            "total_requests": total_requests,
            "total_failures": total_failures,
            "overall_error_rate": (total_failures / max(total_requests, 1)) * 100,
            "test_duration": test_results.get("duration", 0),
            "average_rps": total_requests / max(test_results.get("duration", 1), 1)
        }
    
    def _generate_recommendations(self, analysis: Dict[str, Any]) -> List[str]:
        """Generate performance improvement recommendations."""
        recommendations = []
        
        if analysis["overall_status"] == "FAIL":
            recommendations.append("Performance thresholds violated - immediate optimization required")
        
        error_rate = analysis["performance_summary"]["overall_error_rate"]
        if error_rate > 2.0:
            recommendations.append("High error rate detected - check application logs and error handling")
        
        # Check for specific violation patterns
        response_time_violations = [v for v in analysis["threshold_violations"] if v["type"] == "response_time"]
        if len(response_time_violations) > 3:
            recommendations.append("Multiple endpoints showing slow response times - consider database optimization")
        
        if any(v["endpoint"].endswith("/search/") for v in analysis["threshold_violations"]):
            recommendations.append("Search endpoints performing poorly - consider search index optimization")
        
        return recommendations


# Test data setup utilities
class TestDataSetup:
    """Setup test data for load testing."""
    
    @staticmethod
    def create_test_users(user_count: int = 100):
        """Create test users for load testing."""
        # This would be implemented to create test users in the database
        pass
    
    @staticmethod
    def create_test_dangerous_goods(dg_count: int = 1000):
        """Create test dangerous goods data."""
        # This would be implemented to populate dangerous goods test data
        pass
    
    @staticmethod
    def create_test_shipments(shipment_count: int = 500):
        """Create test shipments for load testing."""
        # This would be implemented to create test shipments
        pass
    
    @staticmethod
    def cleanup_test_data():
        """Clean up test data after load testing."""
        # This would be implemented to clean up test data
        pass