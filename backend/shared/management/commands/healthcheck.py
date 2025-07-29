# shared/management/commands/healthcheck.py
"""
Django management command for SafeShipper health checks.
Allows running health checks from command line for monitoring and deployment.
"""

import json
import sys
from django.core.management.base import BaseCommand, CommandError
from django.utils import timezone
from shared.health_service import HealthCheckService, ServiceDependencyChecker


class Command(BaseCommand):
    help = 'Run SafeShipper system health checks'
    
    def add_arguments(self, parser):
        parser.add_argument(
            '--service',
            type=str,
            help='Check specific service only (database, cache, dangerous_goods_data, etc.)'
        )
        
        parser.add_argument(
            '--detailed',
            action='store_true',
            help='Run detailed health checks including dangerous goods dependencies'
        )
        
        parser.add_argument(
            '--format',
            choices=['json', 'text'],
            default='text',
            help='Output format (default: text)'
        )
        
        parser.add_argument(
            '--exit-code',
            action='store_true',
            help='Use exit codes to indicate health status (0=healthy, 1=degraded, 2=unhealthy)'
        )
        
        parser.add_argument(
            '--timeout',
            type=int,
            default=30,
            help='Health check timeout in seconds (default: 30)'
        )
        
        parser.add_argument(
            '--critical-only',
            action='store_true',
            help='Check only critical services'
        )
    
    def handle(self, *args, **options):
        """Execute health check command"""
        try:
            self.stdout.write('SafeShipper Health Check Started...')
            
            if options['service']:
                # Check specific service
                result = self._check_specific_service(options['service'])
            elif options['detailed']:
                # Detailed health check
                result = self._detailed_health_check()
            else:
                # Standard comprehensive health check
                result = self._comprehensive_health_check()
            
            # Filter for critical services only if requested
            if options['critical_only'] and 'services' in result:
                critical_services = HealthCheckService.CRITICAL_SERVICES
                result['services'] = {
                    k: v for k, v in result['services'].items() 
                    if k in critical_services
                }
                # Recalculate summary for critical services only
                HealthCheckService._calculate_health_summary(result)
            
            # Output results
            self._output_results(result, options['format'])
            
            # Handle exit codes if requested
            if options['exit_code']:
                exit_code = self._determine_exit_code(result)
                sys.exit(exit_code)
                
        except Exception as e:
            self.stderr.write(
                self.style.ERROR(f'Health check command failed: {str(e)}')
            )
            if options['exit_code']:
                sys.exit(2)  # Unhealthy
            raise CommandError(f'Health check failed: {str(e)}')
    
    def _check_specific_service(self, service_name):
        """Check a specific service"""
        valid_services = (
            HealthCheckService.CRITICAL_SERVICES + 
            HealthCheckService.OPTIONAL_SERVICES
        )
        
        if service_name not in valid_services:
            raise CommandError(
                f'Invalid service: {service_name}. '
                f'Valid services: {", ".join(valid_services)}'
            )
        
        service_health = HealthCheckService._check_service(service_name)
        
        return {
            'service_name': service_name,
            'timestamp': timezone.now().isoformat(),
            'status': service_health['status'],
            'service_result': service_health,
            'check_type': 'single_service'
        }
    
    def _comprehensive_health_check(self):
        """Run comprehensive health check"""
        result = HealthCheckService.comprehensive_health_check()
        result['check_type'] = 'comprehensive'
        return result
    
    def _detailed_health_check(self):
        """Run detailed health check with dangerous goods dependencies"""
        # Get comprehensive health check
        result = HealthCheckService.comprehensive_health_check()
        
        # Add dangerous goods dependencies
        dg_dependencies = ServiceDependencyChecker.check_dangerous_goods_dependencies()
        result['dangerous_goods_dependencies'] = dg_dependencies
        
        # Update overall status considering DG dependencies
        if (result['status'] == 'unhealthy' or 
            dg_dependencies['status'] == 'failed'):
            result['status'] = 'unhealthy'
        elif (result['status'] == 'degraded' or 
              dg_dependencies['status'] == 'degraded'):
            result['status'] = 'degraded'
        
        result['check_type'] = 'detailed'
        return result
    
    def _output_results(self, result, output_format):
        """Output health check results in specified format"""
        if output_format == 'json':
            self.stdout.write(json.dumps(result, indent=2))
        else:
            self._output_text_format(result)
    
    def _output_text_format(self, result):
        """Output health check results in human-readable text format"""
        status = result.get('status', 'unknown')
        
        # Overall status with colored output
        if status == 'healthy':
            status_style = self.style.SUCCESS
        elif status == 'degraded':
            status_style = self.style.WARNING
        else:
            status_style = self.style.ERROR
        
        self.stdout.write(f'\\nOverall Status: {status_style(status.upper())}')
        self.stdout.write(f'Timestamp: {result.get("timestamp", "N/A")}')
        
        if 'response_time_ms' in result:
            self.stdout.write(f'Response Time: {result["response_time_ms"]}ms')
        
        # Summary
        if 'summary' in result:
            summary = result['summary']
            self.stdout.write('\\n=== SUMMARY ===')
            self.stdout.write(f'Total Services: {summary.get("total_services", 0)}')
            self.stdout.write(f'Healthy: {summary.get("healthy_services", 0)}')
            self.stdout.write(f'Degraded: {summary.get("degraded_services", 0)}')
            self.stdout.write(f'Failed: {summary.get("failed_services", 0)}')
            self.stdout.write(f'Health Percentage: {summary.get("health_percentage", 0)}%')
        
        # Individual services
        if 'services' in result:
            self.stdout.write('\\n=== SERVICES ===')
            for service_name, service_data in result['services'].items():
                service_status = service_data.get('status', 'unknown')
                
                if service_status == 'healthy':
                    status_indicator = self.style.SUCCESS('✓')
                elif service_status == 'degraded':
                    status_indicator = self.style.WARNING('⚠')
                else:
                    status_indicator = self.style.ERROR('✗')
                
                self.stdout.write(f'{status_indicator} {service_name}: {service_status}')
                
                # Show response time if available
                if 'response_time_ms' in service_data:
                    self.stdout.write(f'   Response Time: {service_data["response_time_ms"]}ms')
                
                # Show message
                if 'message' in service_data:
                    self.stdout.write(f'   Message: {service_data["message"]}')
                
                # Show additional info for some services
                if service_name == 'cache' and 'statistics' in service_data:
                    stats = service_data['statistics']
                    if 'memory_usage_mb' in stats:
                        self.stdout.write(f'   Memory Usage: {stats["memory_usage_mb"]}MB')
                
                if service_name == 'dangerous_goods_data' and 'total_records' in service_data:
                    self.stdout.write(f'   Total Records: {service_data["total_records"]}')
                
                self.stdout.write('')  # Empty line for readability
        
        # System metrics
        if 'system_metrics' in result:
            metrics = result['system_metrics']
            self.stdout.write('=== SYSTEM METRICS ===')
            
            if 'cpu_usage_percent' in metrics:
                cpu = metrics['cpu_usage_percent']
                if cpu > 80:
                    cpu_style = self.style.ERROR
                elif cpu > 60:
                    cpu_style = self.style.WARNING
                else:
                    cpu_style = self.style.SUCCESS
                self.stdout.write(f'CPU Usage: {cpu_style(f"{cpu}%")}')
            
            if 'memory' in metrics:
                memory = metrics['memory']
                memory_used = memory.get('used_percent', 0)
                if memory_used > 85:
                    memory_style = self.style.ERROR
                elif memory_used > 70:
                    memory_style = self.style.WARNING
                else:
                    memory_style = self.style.SUCCESS
                self.stdout.write(f'Memory Usage: {memory_style(f"{memory_used}%")} ({memory.get("available_gb", 0)}GB available)')
            
            if 'disk' in metrics:
                disk = metrics['disk']
                disk_used = disk.get('used_percent', 0)
                if disk_used > 90:
                    disk_style = self.style.ERROR
                elif disk_used > 80:
                    disk_style = self.style.WARNING
                else:
                    disk_style = self.style.SUCCESS
                self.stdout.write(f'Disk Usage: {disk_style(f"{disk_used}%")} ({disk.get("free_gb", 0)}GB free)')
        
        # Dangerous goods dependencies (for detailed checks)
        if 'dangerous_goods_dependencies' in result:
            dg_deps = result['dangerous_goods_dependencies']
            self.stdout.write('\\n=== DANGEROUS GOODS DEPENDENCIES ===')
            
            for dep_name, dep_data in dg_deps['dependencies'].items():
                dep_status = dep_data.get('status', 'unknown')
                
                if dep_status == 'healthy':
                    status_indicator = self.style.SUCCESS('✓')
                elif dep_status == 'degraded':
                    status_indicator = self.style.WARNING('⚠')
                else:
                    status_indicator = self.style.ERROR('✗')
                
                self.stdout.write(f'{status_indicator} {dep_name.replace("_", " ").title()}: {dep_status}')
                if 'message' in dep_data:
                    self.stdout.write(f'   {dep_data["message"]}')
        
        # Single service result (for specific service checks)
        if 'service_result' in result:
            service_data = result['service_result']
            self.stdout.write('\\n=== SERVICE DETAILS ===')
            
            for key, value in service_data.items():
                if key not in ['status', 'message', 'timestamp']:
                    self.stdout.write(f'{key.replace("_", " ").title()}: {value}')
    
    def _determine_exit_code(self, result):
        """Determine appropriate exit code based on health status"""
        status = result.get('status', 'unknown')
        
        if status == 'healthy':
            return 0
        elif status == 'degraded':
            return 1
        else:
            return 2