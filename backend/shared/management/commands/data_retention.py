# shared/management/commands/data_retention.py
"""
Django management command for SafeShipper data retention operations.
Allows manual execution of data cleanup and retention policies.
"""

import json
from django.core.management.base import BaseCommand, CommandError
from django.utils import timezone
from shared.data_retention_service import (
    DataRetentionService, DataRetentionPolicy, DataRetentionReporter
)


class Command(BaseCommand):
    help = 'Run SafeShipper data retention and cleanup operations'
    
    def add_arguments(self, parser):
        parser.add_argument(
            '--data-type',
            type=str,
            action='append',
            help='Specific data type(s) to clean up (can be used multiple times)'
        )
        
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Show what would be deleted without actually deleting'
        )
        
        parser.add_argument(
            '--format',
            choices=['json', 'text'],
            default='text',
            help='Output format (default: text)'
        )
        
        parser.add_argument(
            '--list-policies',
            action='store_true',
            help='List all available data retention policies'
        )
        
        parser.add_argument(
            '--policy-info',
            type=str,
            help='Show detailed information about a specific retention policy'
        )
        
        parser.add_argument(
            '--send-report',
            action='store_true',
            help='Send retention report via email after completion'
        )
        
        parser.add_argument(
            '--critical-only',
            action='store_true',
            help='Process only critical data types'
        )
        
        parser.add_argument(
            '--force',
            action='store_true',
            help='Force cleanup of critical data (use with caution)'
        )
    
    def handle(self, *args, **options):
        """Execute data retention command"""
        try:
            if options['list_policies']:
                self._list_retention_policies()
                return
            
            if options['policy_info']:
                self._show_policy_info(options['policy_info'])
                return
            
            # Validate data types if specified
            data_types = options.get('data_type')
            if data_types:
                self._validate_data_types(data_types)
            
            # Filter for critical data types if requested
            if options['critical_only']:
                if data_types:
                    data_types = [dt for dt in data_types if DataRetentionPolicy.is_critical_data(dt)]
                else:
                    data_types = DataRetentionPolicy.CRITICAL_DATA_TYPES
                
                if not data_types:
                    self.stdout.write(self.style.WARNING('No critical data types to process'))
                    return
            
            # Check for critical data processing
            if data_types:
                critical_types = [dt for dt in data_types if DataRetentionPolicy.is_critical_data(dt)]
                if critical_types and not options['force'] and not options['dry_run']:
                    self.stdout.write(
                        self.style.ERROR(
                            f'Warning: Processing critical data types: {critical_types}\\n'
                            'This may affect compliance and audit requirements.\\n'
                            'Use --force to proceed or --dry-run to preview.'
                        )
                    )
                    return
            
            # Run data retention cleanup
            self.stdout.write('Starting data retention cleanup...')
            
            service = DataRetentionService()
            stats = service.cleanup_expired_data(
                data_types=data_types,
                dry_run=options['dry_run']
            )
            
            # Generate report
            report = DataRetentionReporter.generate_retention_report(stats)
            
            # Output results
            self._output_results(stats, report, options['format'])
            
            # Send report if requested
            if options['send_report'] and not options['dry_run']:
                self._send_retention_report(stats)
            
            # Set exit code based on results
            if stats['errors'] > 0:
                raise CommandError('Data retention completed with errors')
            
        except Exception as e:
            self.stderr.write(
                self.style.ERROR(f'Data retention command failed: {str(e)}')
            )
            raise CommandError(f'Data retention failed: {str(e)}')
    
    def _validate_data_types(self, data_types):
        """Validate that specified data types are valid"""
        valid_types = list(DataRetentionPolicy.RETENTION_PERIODS.keys())
        invalid_types = [dt for dt in data_types if dt not in valid_types]
        
        if invalid_types:
            self.stderr.write(
                self.style.ERROR(
                    f'Invalid data types: {", ".join(invalid_types)}\\n'
                    f'Valid types: {", ".join(valid_types)}'
                )
            )
            raise CommandError('Invalid data types specified')
    
    def _list_retention_policies(self):
        """List all available retention policies"""
        self.stdout.write(self.style.SUCCESS('SafeShipper Data Retention Policies:\\n'))
        
        # Group by category
        categories = {
            'Compliance & Audit': [
                'audit_logs', 'authentication_logs', 'incident_reports', 
                'training_records', 'inspection_records', 'sds_documents'
            ],
            'Operational': [
                'shipment_tracking', 'proof_of_delivery', 'feedback_data'
            ],
            'System': [
                'cache_data', 'temporary_files', 'rate_limit_data',
                'health_check_logs', 'performance_metrics', 'error_logs',
                'notification_logs'
            ],
            'Personal Data': [
                'user_sessions', 'user_activity_logs', 'personal_data_exports'
            ]
        }
        
        for category, data_types in categories.items():
            self.stdout.write(f'\\n{self.style.SUCCESS(category)}:')
            for data_type in data_types:
                if data_type in DataRetentionPolicy.RETENTION_PERIODS:
                    period = DataRetentionPolicy.get_retention_period(data_type)
                    is_critical = DataRetentionPolicy.is_critical_data(data_type)
                    should_archive = DataRetentionPolicy.should_archive(data_type)
                    
                    flags = []
                    if is_critical:
                        flags.append('CRITICAL')
                    if should_archive:
                        flags.append('ARCHIVED')
                    
                    flag_str = f' ({", ".join(flags)})' if flags else ''
                    
                    self.stdout.write(f'  • {data_type}: {period.days} days{flag_str}')
    
    def _show_policy_info(self, data_type):
        """Show detailed information about a specific retention policy"""
        if data_type not in DataRetentionPolicy.RETENTION_PERIODS:
            raise CommandError(f'Unknown data type: {data_type}')
        
        period = DataRetentionPolicy.get_retention_period(data_type)
        is_critical = DataRetentionPolicy.is_critical_data(data_type)
        should_archive = DataRetentionPolicy.should_archive(data_type)
        
        self.stdout.write(f'\\n{self.style.SUCCESS(f"Retention Policy: {data_type}")}\\n')
        self.stdout.write(f'Retention Period: {period.days} days ({period})')
        self.stdout.write(f'Critical Data: {"Yes" if is_critical else "No"}')
        self.stdout.write(f'Archive Instead of Delete: {"Yes" if should_archive else "No"}')
        
        # Show additional information based on data type
        policy_descriptions = {
            'audit_logs': 'Regulatory requirement to keep audit logs for 7 years',
            'incident_reports': 'Safety critical data kept for 7 years for compliance',
            'training_records': 'Employee training records for compliance and certification tracking',
            'sds_documents': 'Safety Data Sheets required for regulatory compliance',
            'cache_data': 'Temporary cache data cleared daily for performance',
            'temporary_files': 'System temporary files cleaned weekly',
        }
        
        if data_type in policy_descriptions:
            self.stdout.write(f'Description: {policy_descriptions[data_type]}')
        
        if is_critical:
            self.stdout.write(
                self.style.WARNING(
                    '\\nWARNING: This is critical data that may be required for '
                    'regulatory compliance, safety audits, or legal requirements.'
                )
            )
    
    def _output_results(self, stats, report, output_format):
        """Output retention results in specified format"""
        if output_format == 'json':
            output_data = {
                'stats': stats,
                'report': report
            }
            # Convert datetime objects to strings for JSON serialization
            self._make_json_serializable(output_data)
            self.stdout.write(json.dumps(output_data, indent=2))
        else:
            self._output_text_format(stats, report)
    
    def _output_text_format(self, stats, report):
        """Output retention results in human-readable text format"""
        # Summary
        self.stdout.write(f'\\n{self.style.SUCCESS("DATA RETENTION SUMMARY")}')
        self.stdout.write(f'Execution Time: {stats.get("start_time", timezone.now()).strftime("%Y-%m-%d %H:%M:%S")}')
        self.stdout.write(f'Duration: {stats.get("duration_seconds", 0):.2f} seconds')
        
        # Statistics
        self.stdout.write(f'\\n{self.style.SUCCESS("STATISTICS")}')
        self.stdout.write(f'Total Processed: {stats["total_processed"]}')
        self.stdout.write(f'Records Deleted: {stats["deleted_records"]}')
        self.stdout.write(f'Records Archived: {stats["archived_records"]}')
        self.stdout.write(f'Errors: {stats["errors"]}')
        
        # Success rate with color coding
        success_rate = report['summary']['success_rate']
        if success_rate >= 95:
            rate_style = self.style.SUCCESS
        elif success_rate >= 80:
            rate_style = self.style.WARNING
        else:
            rate_style = self.style.ERROR
        
        self.stdout.write(f'Success Rate: {rate_style(f"{success_rate}%")}')
        
        # Data types processed
        if stats.get('data_types_processed'):
            self.stdout.write(f'\\n{self.style.SUCCESS("DATA TYPES PROCESSED")}')
            for data_type in stats['data_types_processed']:
                self.stdout.write(f'  ✓ {data_type}')
        
        # Warnings
        if stats.get('warnings'):
            self.stdout.write(f'\\n{self.style.WARNING("WARNINGS")}')
            for warning in stats['warnings']:
                self.stdout.write(f'  ⚠ {warning}')
        
        # Recommendations
        if report.get('recommendations'):
            self.stdout.write(f'\\n{self.style.SUCCESS("RECOMMENDATIONS")}')
            for rec in report['recommendations']:
                self.stdout.write(f'  • {rec}')
        
        # Compliance status
        compliance_status = report['compliance_status']
        if compliance_status == 'COMPLIANT':
            compliance_style = self.style.SUCCESS
        elif compliance_status == 'PARTIALLY_COMPLIANT':
            compliance_style = self.style.WARNING
        else:
            compliance_style = self.style.ERROR
        
        self.stdout.write(f'\\nCompliance Status: {compliance_style(compliance_status)}')
    
    def _send_retention_report(self, stats):
        """Send retention report via email"""
        try:
            from django.conf import settings
            recipients = getattr(settings, 'DATA_RETENTION_NOTIFICATION_RECIPIENTS', [])
            
            if recipients:
                DataRetentionReporter.send_retention_notification(stats, recipients)
                self.stdout.write(f'Retention report sent to {len(recipients)} recipients')
            else:
                self.stdout.write(
                    self.style.WARNING('No recipients configured for retention reports')
                )
        except Exception as e:
            self.stderr.write(
                self.style.ERROR(f'Failed to send retention report: {str(e)}')
            )
    
    def _make_json_serializable(self, obj):
        """Convert datetime objects to strings for JSON serialization"""
        if isinstance(obj, dict):
            for key, value in obj.items():
                obj[key] = self._make_json_serializable(value)
        elif isinstance(obj, list):
            for i, item in enumerate(obj):
                obj[i] = self._make_json_serializable(item)
        elif hasattr(obj, 'isoformat'):
            return obj.isoformat()
        
        return obj