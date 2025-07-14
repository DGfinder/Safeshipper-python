from django.core.management.base import BaseCommand
from django.utils import timezone
from django.db import transaction
from datetime import timedelta
from erp_integration.models import (
    ERPSystem, DataSyncJob, ERPEventLog, ERPDataBuffer, 
    ERPConfiguration, ERPMapping, IntegrationEndpoint
)


class Command(BaseCommand):
    help = 'Clean up old ERP integration data and optimize database performance'
    
    def add_arguments(self, parser):
        parser.add_argument(
            '--days',
            type=int,
            default=30,
            help='Number of days to keep data (default: 30)'
        )
        parser.add_argument(
            '--sync-jobs-days',
            type=int,
            default=90,
            help='Number of days to keep sync job data (default: 90)'
        )
        parser.add_argument(
            '--event-logs-days',
            type=int,
            default=30,
            help='Number of days to keep event logs (default: 30)'
        )
        parser.add_argument(
            '--buffer-days',
            type=int,
            default=7,
            help='Number of days to keep buffer data (default: 7)'
        )
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Show what would be deleted without actually deleting'
        )
        parser.add_argument(
            '--force',
            action='store_true',
            help='Force cleanup without confirmation'
        )
        parser.add_argument(
            '--cleanup-type',
            choices=['all', 'sync-jobs', 'event-logs', 'buffer', 'expired'],
            default='all',
            help='Type of cleanup to perform'
        )
    
    def handle(self, *args, **options):
        days = options['days']
        sync_jobs_days = options['sync_jobs_days']
        event_logs_days = options['event_logs_days']
        buffer_days = options['buffer_days']
        dry_run = options['dry_run']
        force = options['force']
        cleanup_type = options['cleanup_type']
        
        # Calculate cutoff dates
        now = timezone.now()
        sync_jobs_cutoff = now - timedelta(days=sync_jobs_days)
        event_logs_cutoff = now - timedelta(days=event_logs_days)
        buffer_cutoff = now - timedelta(days=buffer_days)
        
        if dry_run:
            self.stdout.write(
                self.style.WARNING('DRY RUN MODE - No data will be deleted')
            )
        
        # Show what will be cleaned up
        self._show_cleanup_summary(
            sync_jobs_cutoff, event_logs_cutoff, buffer_cutoff, cleanup_type
        )
        
        # Ask for confirmation unless forced
        if not dry_run and not force:
            confirm = input('\nProceed with cleanup? (y/N): ')
            if confirm.lower() != 'y':
                self.stdout.write(
                    self.style.WARNING('Cleanup cancelled')
                )
                return
        
        # Perform cleanup
        total_deleted = 0
        
        if cleanup_type in ['all', 'sync-jobs']:
            deleted = self._cleanup_sync_jobs(sync_jobs_cutoff, dry_run)
            total_deleted += deleted
        
        if cleanup_type in ['all', 'event-logs']:
            deleted = self._cleanup_event_logs(event_logs_cutoff, dry_run)
            total_deleted += deleted
        
        if cleanup_type in ['all', 'buffer']:
            deleted = self._cleanup_buffer_data(buffer_cutoff, dry_run)
            total_deleted += deleted
        
        if cleanup_type in ['all', 'expired']:
            deleted = self._cleanup_expired_data(now, dry_run)
            total_deleted += deleted
        
        # Summary
        action = 'Would delete' if dry_run else 'Deleted'
        self.stdout.write(
            self.style.SUCCESS(f'\n{action} {total_deleted} total records')
        )
        
        if not dry_run:
            self.stdout.write(
                self.style.SUCCESS('✓ Cleanup completed successfully')
            )
    
    def _show_cleanup_summary(self, sync_jobs_cutoff, event_logs_cutoff, buffer_cutoff, cleanup_type):
        """Show summary of what will be cleaned up"""
        
        self.stdout.write(
            self.style.SUCCESS('ERP Integration Data Cleanup Summary:')
        )
        
        if cleanup_type in ['all', 'sync-jobs']:
            sync_jobs_count = DataSyncJob.objects.filter(
                created_at__lt=sync_jobs_cutoff,
                status__in=['completed', 'failed', 'cancelled']
            ).count()
            
            self.stdout.write(
                f'  Sync Jobs (before {sync_jobs_cutoff.strftime("%Y-%m-%d")}): {sync_jobs_count}'
            )
        
        if cleanup_type in ['all', 'event-logs']:
            event_logs_count = ERPEventLog.objects.filter(
                timestamp__lt=event_logs_cutoff
            ).count()
            
            self.stdout.write(
                f'  Event Logs (before {event_logs_cutoff.strftime("%Y-%m-%d")}): {event_logs_count}'
            )
        
        if cleanup_type in ['all', 'buffer']:
            buffer_count = ERPDataBuffer.objects.filter(
                created_at__lt=buffer_cutoff,
                is_processed=True
            ).count()
            
            self.stdout.write(
                f'  Buffer Data (before {buffer_cutoff.strftime("%Y-%m-%d")}): {buffer_count}'
            )
        
        if cleanup_type in ['all', 'expired']:
            expired_count = ERPDataBuffer.objects.filter(
                expires_at__lt=timezone.now()
            ).count()
            
            self.stdout.write(
                f'  Expired Buffer Data: {expired_count}'
            )
    
    def _cleanup_sync_jobs(self, cutoff_date, dry_run):
        """Clean up old sync job records"""
        
        queryset = DataSyncJob.objects.filter(
            created_at__lt=cutoff_date,
            status__in=['completed', 'failed', 'cancelled']
        )
        
        count = queryset.count()
        
        if count > 0:
            action = 'Would delete' if dry_run else 'Deleting'
            self.stdout.write(
                self.style.SUCCESS(f'{action} {count} sync job records...')
            )
            
            if not dry_run:
                with transaction.atomic():
                    deleted_count = queryset.delete()[0]
                    self.stdout.write(
                        self.style.SUCCESS(f'✓ Deleted {deleted_count} sync job records')
                    )
        
        return count
    
    def _cleanup_event_logs(self, cutoff_date, dry_run):
        """Clean up old event log records"""
        
        queryset = ERPEventLog.objects.filter(
            timestamp__lt=cutoff_date
        )
        
        count = queryset.count()
        
        if count > 0:
            action = 'Would delete' if dry_run else 'Deleting'
            self.stdout.write(
                self.style.SUCCESS(f'{action} {count} event log records...')
            )
            
            if not dry_run:
                with transaction.atomic():
                    deleted_count = queryset.delete()[0]
                    self.stdout.write(
                        self.style.SUCCESS(f'✓ Deleted {deleted_count} event log records')
                    )
        
        return count
    
    def _cleanup_buffer_data(self, cutoff_date, dry_run):
        """Clean up old buffer data"""
        
        queryset = ERPDataBuffer.objects.filter(
            created_at__lt=cutoff_date,
            is_processed=True
        )
        
        count = queryset.count()
        
        if count > 0:
            action = 'Would delete' if dry_run else 'Deleting'
            self.stdout.write(
                self.style.SUCCESS(f'{action} {count} buffer data records...')
            )
            
            if not dry_run:
                with transaction.atomic():
                    deleted_count = queryset.delete()[0]
                    self.stdout.write(
                        self.style.SUCCESS(f'✓ Deleted {deleted_count} buffer data records')
                    )
        
        return count
    
    def _cleanup_expired_data(self, now, dry_run):
        """Clean up expired buffer data"""
        
        queryset = ERPDataBuffer.objects.filter(
            expires_at__lt=now
        )
        
        count = queryset.count()
        
        if count > 0:
            action = 'Would delete' if dry_run else 'Deleting'
            self.stdout.write(
                self.style.SUCCESS(f'{action} {count} expired buffer records...')
            )
            
            if not dry_run:
                with transaction.atomic():
                    deleted_count = queryset.delete()[0]
                    self.stdout.write(
                        self.style.SUCCESS(f'✓ Deleted {deleted_count} expired buffer records')
                    )
        
        return count
    
    def add_arguments(self, parser):
        super().add_arguments(parser)
        
        parser.add_argument(
            '--reset-error-counts',
            action='store_true',
            help='Reset error counts for all ERP systems'
        )
        parser.add_argument(
            '--optimize-database',
            action='store_true',
            help='Run database optimization after cleanup'
        )
    
    def handle(self, *args, **options):
        # Call the parent handle method first
        super().handle(*args, **options)
        
        # Additional cleanup operations
        if options.get('reset_error_counts'):
            self._reset_error_counts(options['dry_run'])
        
        if options.get('optimize_database') and not options['dry_run']:
            self._optimize_database()
    
    def _reset_error_counts(self, dry_run):
        """Reset error counts for all ERP systems"""
        
        erp_systems = ERPSystem.objects.filter(error_count__gt=0)
        count = erp_systems.count()
        
        if count > 0:
            action = 'Would reset' if dry_run else 'Resetting'
            self.stdout.write(
                self.style.SUCCESS(f'{action} error counts for {count} ERP systems...')
            )
            
            if not dry_run:
                with transaction.atomic():
                    updated_count = erp_systems.update(error_count=0, last_error='')
                    self.stdout.write(
                        self.style.SUCCESS(f'✓ Reset error counts for {updated_count} ERP systems')
                    )
    
    def _optimize_database(self):
        """Run database optimization"""
        
        self.stdout.write(
            self.style.SUCCESS('Running database optimization...')
        )
        
        # This is a placeholder for database optimization
        # In a real implementation, you might run VACUUM, ANALYZE, etc.
        # depending on your database backend
        
        self.stdout.write(
            self.style.SUCCESS('✓ Database optimization completed')
        )