"""
Django management command for GPS event partition management.
Provides utilities for maintaining the partitioned GPS event tables.
"""

from django.core.management.base import BaseCommand, CommandError
from django.db import connection
from datetime import datetime, date, timedelta
import logging

logger = logging.getLogger(__name__)


class Command(BaseCommand):
    help = 'Manage GPS event partitions for optimal performance'

    def add_arguments(self, parser):
        parser.add_argument(
            'action',
            choices=['create', 'maintain', 'status', 'migrate'],
            help='Action to perform on GPS partitions'
        )
        parser.add_argument(
            '--date',
            type=str,
            help='Date for partition operations (YYYY-MM-DD format)'
        )
        parser.add_argument(
            '--months-ahead',
            type=int,
            default=3,
            help='Number of months ahead to create partitions (default: 3)'
        )
        parser.add_argument(
            '--months-archive',
            type=int,
            default=12,
            help='Number of months to keep before archiving (default: 12)'
        )
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Show what would be done without executing'
        )

    def handle(self, *args, **options):
        action = options['action']
        
        try:
            if action == 'create':
                self.create_partitions(options)
            elif action == 'maintain':
                self.maintain_partitions(options)
            elif action == 'status':
                self.show_partition_status()
            elif action == 'migrate':
                self.migrate_existing_data(options)
                
        except Exception as e:
            logger.error(f"Error in GPS partition management: {str(e)}")
            raise CommandError(f"Failed to {action} partitions: {str(e)}")

    def create_partitions(self, options):
        """Create new partitions for specified date range."""
        months_ahead = options['months_ahead']
        target_date = self.parse_date(options.get('date')) or date.today()
        
        self.stdout.write(f"Creating partitions starting from {target_date}")
        
        for i in range(months_ahead):
            partition_date = target_date + timedelta(days=30 * i)
            partition_date = partition_date.replace(day=1)  # First day of month
            
            if options['dry_run']:
                self.stdout.write(f"Would create partition for {partition_date.strftime('%Y-%m')}")
            else:
                self.create_monthly_partition(partition_date)
                
        if not options['dry_run']:
            self.stdout.write(
                self.style.SUCCESS(f"Created {months_ahead} partitions successfully")
            )

    def create_monthly_partition(self, partition_date):
        """Create a single monthly partition."""
        with connection.cursor() as cursor:
            cursor.execute("SELECT create_monthly_gps_partition(%s)", [partition_date])
            
        self.stdout.write(f"Created partition for {partition_date.strftime('%Y-%m')}")

    def maintain_partitions(self, options):
        """Run maintenance on partitions (create future, archive old)."""
        months_ahead = options['months_ahead']
        months_archive = options['months_archive']
        
        if options['dry_run']:
            self.stdout.write("DRY RUN: Partition maintenance operations")
            
        # Create future partitions
        today = date.today()
        for i in range(1, months_ahead + 1):
            future_date = (today.replace(day=1) + timedelta(days=32 * i)).replace(day=1)
            
            if options['dry_run']:
                self.stdout.write(f"Would ensure partition exists for {future_date.strftime('%Y-%m')}")
            else:
                self.create_monthly_partition(future_date)
        
        # Archive old partitions
        archive_date = (today.replace(day=1) - timedelta(days=32 * months_archive)).replace(day=1)
        
        if options['dry_run']:
            self.stdout.write(f"Would archive partitions older than {archive_date.strftime('%Y-%m')}")
        else:
            self.archive_old_partitions(archive_date)
            
        if not options['dry_run']:
            self.stdout.write(self.style.SUCCESS("Partition maintenance completed"))

    def archive_old_partitions(self, cutoff_date):
        """Archive partitions older than the cutoff date."""
        with connection.cursor() as cursor:
            # Find old partitions
            cursor.execute("""
                SELECT schemaname, tablename 
                FROM pg_tables 
                WHERE tablename LIKE 'tracking_gpsevent_%%'
                AND tablename ~ '^tracking_gpsevent_[0-9]{4}_[0-9]{2}$'
                ORDER BY tablename
            """)
            
            partitions = cursor.fetchall()
            archived_count = 0
            
            for schema, table_name in partitions:
                # Extract date from partition name
                try:
                    date_part = table_name.replace('tracking_gpsevent_', '')
                    year, month = date_part.split('_')
                    partition_date = date(int(year), int(month), 1)
                    
                    if partition_date < cutoff_date:
                        # Archive the partition
                        archive_table = f"tracking_gpsevent_archive_{date_part}"
                        
                        cursor.execute(f"""
                            CREATE TABLE IF NOT EXISTS {archive_table} AS 
                            SELECT * FROM {table_name}
                        """)
                        
                        cursor.execute(f"DROP TABLE {table_name}")
                        archived_count += 1
                        
                        self.stdout.write(f"Archived partition: {table_name}")
                        
                except (ValueError, IndexError):
                    self.stdout.write(
                        self.style.WARNING(f"Skipped invalid partition name: {table_name}")
                    )
                    continue
            
            if archived_count > 0:
                self.stdout.write(f"Archived {archived_count} old partitions")
            else:
                self.stdout.write("No partitions needed archiving")

    def show_partition_status(self):
        """Display current partition status and statistics."""
        with connection.cursor() as cursor:
            # Get partition information
            cursor.execute("""
                SELECT 
                    schemaname,
                    tablename,
                    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size,
                    (SELECT count(*) FROM information_schema.table_constraints 
                     WHERE table_name = pg_tables.tablename AND constraint_type = 'CHECK') as constraints
                FROM pg_tables 
                WHERE tablename LIKE 'tracking_gpsevent%%'
                ORDER BY tablename
            """)
            
            partitions = cursor.fetchall()
            
            if not partitions:
                self.stdout.write("No GPS event partitions found")
                return
                
            self.stdout.write("\n=== GPS Event Partition Status ===")
            self.stdout.write(f"{'Partition Name':<30} {'Size':<10} {'Constraints':<12}")
            self.stdout.write("-" * 60)
            
            total_size = 0
            for schema, table_name, size, constraints in partitions:
                self.stdout.write(f"{table_name:<30} {size:<10} {constraints:<12}")
                
            # Get total statistics
            cursor.execute("""
                SELECT 
                    COUNT(*) as total_events,
                    pg_size_pretty(pg_total_relation_size('tracking_gpsevent')) as main_table_size,
                    MIN(timestamp) as earliest_event,
                    MAX(timestamp) as latest_event
                FROM tracking_gpsevent
            """)
            
            stats = cursor.fetchone()
            if stats:
                self.stdout.write(f"\n=== Overall Statistics ===")
                self.stdout.write(f"Total GPS Events: {stats[0]:,}")
                self.stdout.write(f"Main Table Size: {stats[1]}")
                self.stdout.write(f"Date Range: {stats[2]} to {stats[3]}")
            
            # Performance statistics
            cursor.execute("SELECT * FROM analyze_spatial_performance()")
            performance = cursor.fetchall()
            
            if performance:
                self.stdout.write(f"\n=== Index Performance ===")
                self.stdout.write(f"{'Index Name':<40} {'Scans':<10} {'Efficiency %':<12}")
                self.stdout.write("-" * 70)
                
                for row in performance:
                    index_name, table_name, size, scans, reads, fetches, efficiency = row
                    self.stdout.write(f"{index_name:<40} {scans:<10} {efficiency or 0:<12}")

    def migrate_existing_data(self, options):
        """Migrate existing GPS data to partitioned tables."""
        if not options['dry_run']:
            response = input("This will migrate existing GPS data to partitioned tables. Continue? (y/N): ")
            if response.lower() != 'y':
                self.stdout.write("Migration cancelled")
                return
        
        with connection.cursor() as cursor:
            # Check if we have data to migrate
            cursor.execute("SELECT COUNT(*) FROM tracking_gpsevent")
            total_records = cursor.fetchone()[0]
            
            if total_records == 0:
                self.stdout.write("No GPS data to migrate")
                return
                
            self.stdout.write(f"Found {total_records:,} GPS events to migrate")
            
            if options['dry_run']:
                self.stdout.write("Would migrate data to partitioned tables")
                return
            
            # Create partitions for existing data date range
            cursor.execute("SELECT DATE_TRUNC('month', MIN(timestamp)), DATE_TRUNC('month', MAX(timestamp)) FROM tracking_gpsevent")
            min_date, max_date = cursor.fetchone()
            
            current_date = min_date
            while current_date <= max_date:
                self.create_monthly_partition(current_date.date())
                current_date = current_date + timedelta(days=32)
                current_date = current_date.replace(day=1)
            
            # Migrate data in batches
            batch_size = 10000
            migrated = 0
            
            while migrated < total_records:
                cursor.execute("""
                    INSERT INTO tracking_gpsevent_partitioned 
                    SELECT * FROM tracking_gpsevent 
                    ORDER BY timestamp 
                    LIMIT %s OFFSET %s
                """, [batch_size, migrated])
                
                batch_migrated = cursor.rowcount
                migrated += batch_migrated
                
                self.stdout.write(f"Migrated {migrated:,}/{total_records:,} records")
                
                if batch_migrated < batch_size:
                    break
            
            self.stdout.write(self.style.SUCCESS(f"Migration completed: {migrated:,} records"))

    def parse_date(self, date_str):
        """Parse date string into date object."""
        if not date_str:
            return None
            
        try:
            return datetime.strptime(date_str, '%Y-%m-%d').date()
        except ValueError:
            raise CommandError(f"Invalid date format: {date_str}. Use YYYY-MM-DD")