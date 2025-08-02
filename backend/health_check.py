#!/usr/bin/env python3
"""
SafeShipper Health Check Script

This script performs a comprehensive health check of the SafeShipper system
including database, Redis, and basic system metrics.
"""

import sys
import os
import django
from pathlib import Path

# Add the backend directory to Python path
backend_dir = Path(__file__).resolve().parent
sys.path.insert(0, str(backend_dir))

# Set Django settings
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'safeshipper_core.settings')

try:
    django.setup()
    
    # Import after Django setup
    from safeshipper_core.performance_monitor import HealthChecker, get_performance_report
    import json
    
    def main():
        print("🏥 SafeShipper System Health Check")
        print("=" * 50)
        
        # Basic connectivity checks
        print("\n🔍 Running connectivity checks...")
        
        # Database check
        print("📊 Checking database connection...")
        db_result = HealthChecker.check_database_connection()
        if db_result['status'] == 'healthy':
            print(f"   ✅ Database: {db_result['message']} ({db_result['response_time_ms']}ms)")
        else:
            print(f"   ❌ Database: {db_result['message']}")
            if 'error' in db_result:
                print(f"      Error: {db_result['error']}")
        
        # Redis check
        print("🔄 Checking Redis connection...")
        redis_result = HealthChecker.check_redis_connection()
        if redis_result['status'] == 'healthy':
            print(f"   ✅ Redis: {redis_result['message']} ({redis_result['response_time_ms']}ms)")
        else:
            print(f"   ❌ Redis: {redis_result['message']}")
            if 'error' in redis_result:
                print(f"      Error: {redis_result['error']}")
        
        # System health check
        print("\n🖥️  Running system health check...")
        health = HealthChecker.check_system_health()
        
        status_icons = {
            'healthy': '✅',
            'warning': '⚠️',
            'critical': '❌'
        }
        
        overall_icon = status_icons.get(health['overall_status'], '❓')
        print(f"   {overall_icon} Overall Status: {health['overall_status'].upper()}")
        
        # Individual checks
        for check_name, status in health['checks'].items():
            icon = status_icons.get(status, '❓')
            print(f"   {icon} {check_name.title()}: {status}")
        
        # Alerts
        if health['alerts']:
            print(f"\n⚠️  Alerts ({len(health['alerts'])}):")
            for alert in health['alerts']:
                print(f"   • {alert}")
        
        # System metrics
        metrics = health['metrics']
        print(f"\n📈 System Metrics:")
        print(f"   CPU Usage: {metrics['system']['cpu_percent']:.1f}%")
        print(f"   Memory Usage: {metrics['system']['memory_percent']:.1f}%")
        print(f"   Disk Usage: {metrics['system']['disk_usage_percent']:.1f}%")
        print(f"   Uptime: {metrics['system']['uptime_hours']:.1f} hours")
        
        # Database metrics
        if metrics['database']['total_queries'] > 0:
            print(f"\n🗄️  Database Metrics:")
            print(f"   Total Queries: {metrics['database']['total_queries']}")
            print(f"   Avg Query Time: {metrics['database']['avg_query_time_ms']:.2f}ms")
            print(f"   Slow Queries: {metrics['database']['slow_queries_count']}")
        
        # Cache metrics
        if metrics['cache']['total_operations'] > 0:
            print(f"\n🔄 Cache Metrics:")
            print(f"   Hit Rate: {metrics['cache']['hit_rate_percent']:.1f}%")
            print(f"   Total Operations: {metrics['cache']['total_operations']}")
            print(f"   Hits: {metrics['cache']['hits']}")
            print(f"   Misses: {metrics['cache']['misses']}")
        
        # API metrics
        if metrics['api']['total_requests'] > 0:
            print(f"\n🌐 API Metrics:")
            print(f"   Total Requests: {metrics['api']['total_requests']}")
            print(f"   Avg Response Time: {metrics['api']['avg_response_time_ms']:.2f}ms")
            print(f"   Error Rate: {metrics['api']['error_rate_percent']:.1f}%")
            print(f"   Slow Requests: {metrics['api']['slow_requests_count']}")
        
        print(f"\n📋 Health check completed at {health['timestamp']}")
        
        # Return appropriate exit code
        if health['overall_status'] == 'critical':
            return 2
        elif health['overall_status'] == 'warning':
            return 1
        else:
            return 0
    
    if __name__ == "__main__":
        exit_code = main()
        sys.exit(exit_code)
        
except ImportError as e:
    print(f"❌ Failed to import Django modules: {str(e)}")
    print("   Make sure you're running this from the backend directory with proper environment setup")
    sys.exit(1)
except Exception as e:
    print(f"❌ Health check failed: {str(e)}")
    sys.exit(1)