# shipments/management/commands/feedback_data_retention.py

from django.core.management.base import BaseCommand, CommandError
from django.utils import timezone
from shipments.data_retention_service import FeedbackDataRetentionService
import json


class Command(BaseCommand):
    help = 'Manage feedback data retention, anonymization, and deletion according to SafeShipper policy'

    def add_arguments(self, parser):
        parser.add_argument(
            '--action',
            type=str,
            choices=['status', 'dry-run', 'anonymize', 'delete', 'full-process'],
            default='status',
            help='Action to perform (default: status)'
        )
        
        parser.add_argument(
            '--batch-size',
            type=int,
            default=50,
            help='Batch size for processing records (default: 50)'
        )
        
        parser.add_argument(
            '--force',
            action='store_true',
            help='Force execution without confirmation prompts'
        )
        
        parser.add_argument(
            '--output-format',
            type=str,
            choices=['text', 'json'],
            default='text',
            help='Output format (default: text)'
        )

    def handle(self, *args, **options):
        service = FeedbackDataRetentionService()
        action = options['action']
        output_format = options['output_format']
        
        try:
            if action == 'status':
                self._handle_status(service, output_format)
            elif action == 'dry-run':
                self._handle_dry_run(service, output_format)
            elif action == 'anonymize':
                self._handle_anonymize(service, options)
            elif action == 'delete':
                self._handle_delete(service, options)
            elif action == 'full-process':
                self._handle_full_process(service, options)
                
        except Exception as e:
            raise CommandError(f'Command failed: {e}')

    def _handle_status(self, service, output_format):
        """Handle status command"""
        self.stdout.write(self.style.HTTP_INFO('Checking data retention policy status...'))
        
        status = service.get_retention_policy_status()
        
        if output_format == 'json':
            self.stdout.write(json.dumps(status, indent=2))
        else:
            self._print_status_report(status)

    def _handle_dry_run(self, service, output_format):
        """Handle dry-run command"""
        self.stdout.write(self.style.HTTP_INFO('Running data retention dry-run...'))
        
        results = service.run_data_retention_process(dry_run=True)
        
        if output_format == 'json':
            self.stdout.write(json.dumps(results, indent=2))
        else:
            self._print_dry_run_results(results)

    def _handle_anonymize(self, service, options):
        """Handle anonymize command"""
        if not options['force']:
            candidates = service.identify_feedback_for_anonymization()
            if not candidates:
                self.stdout.write(self.style.SUCCESS('No feedback records require anonymization.'))
                return
                
            self.stdout.write(
                self.style.WARNING(f'Found {len(candidates)} feedback records to anonymize.')
            )
            
            # Show sample records
            for candidate in candidates[:5]:
                self.stdout.write(f"  - Feedback {candidate['feedback_id']}: {candidate['tracking_number']} ({candidate['age_days']} days old)")
            
            if len(candidates) > 5:
                self.stdout.write(f"  ... and {len(candidates) - 5} more records")
            
            confirm = input('\nProceed with anonymization? [y/N]: ')
            if confirm.lower() != 'y':
                self.stdout.write('Anonymization cancelled.')
                return
        
        self.stdout.write(self.style.HTTP_INFO('Starting anonymization process...'))
        
        candidates = service.identify_feedback_for_anonymization()
        if candidates:
            feedback_ids = [c['feedback_id'] for c in candidates]
            results = service.anonymize_feedback_batch(feedback_ids, options['batch_size'])
            
            self.stdout.write(
                self.style.SUCCESS(
                    f'Anonymization completed: {results["successful"]} successful, {results["failed"]} failed'
                )
            )
            
            if results['errors']:
                self.stdout.write(self.style.ERROR('Errors occurred:'))
                for error in results['errors'][:10]:  # Show first 10 errors
                    self.stdout.write(f"  - {error}")
        else:
            self.stdout.write(self.style.SUCCESS('No records require anonymization.'))

    def _handle_delete(self, service, options):
        """Handle delete command"""
        if not options['force']:
            candidates = service.identify_feedback_for_deletion()
            if not candidates:
                self.stdout.write(self.style.SUCCESS('No feedback records require deletion.'))
                return
                
            self.stdout.write(
                self.style.ERROR(f'Found {len(candidates)} feedback records for PERMANENT DELETION.')
            )
            
            # Show sample records
            for candidate in candidates[:5]:
                self.stdout.write(f"  - Feedback {candidate['feedback_id']}: {candidate['tracking_number']} ({candidate['age_days']} days old)")
            
            if len(candidates) > 5:
                self.stdout.write(f"  ... and {len(candidates) - 5} more records")
            
            self.stdout.write(self.style.ERROR('\nWARNING: This action is IRREVERSIBLE!'))
            confirm = input('Type "DELETE" to confirm permanent deletion: ')
            if confirm != 'DELETE':
                self.stdout.write('Deletion cancelled.')
                return
        
        self.stdout.write(self.style.HTTP_INFO('Starting deletion process...'))
        
        candidates = service.identify_feedback_for_deletion()
        if candidates:
            feedback_ids = [c['feedback_id'] for c in candidates]
            results = service.delete_feedback_batch(feedback_ids, options['batch_size'])
            
            self.stdout.write(
                self.style.SUCCESS(
                    f'Deletion completed: {results["successful"]} successful, {results["failed"]} failed'
                )
            )
            
            if results['archived_data']:
                self.stdout.write(f'Archived {len(results["archived_data"])} records for compliance.')
            
            if results['errors']:
                self.stdout.write(self.style.ERROR('Errors occurred:'))
                for error in results['errors'][:10]:  # Show first 10 errors
                    self.stdout.write(f"  - {error}")
        else:
            self.stdout.write(self.style.SUCCESS('No records require deletion.'))

    def _handle_full_process(self, service, options):
        """Handle full retention process"""
        if not options['force']:
            # Get overview
            anon_candidates = service.identify_feedback_for_anonymization()
            del_candidates = service.identify_feedback_for_deletion()
            
            if not anon_candidates and not del_candidates:
                self.stdout.write(self.style.SUCCESS('No records require processing.'))
                return
            
            self.stdout.write(self.style.WARNING('Full data retention process overview:'))
            if anon_candidates:
                self.stdout.write(f'  - {len(anon_candidates)} records to anonymize')
            if del_candidates:
                self.stdout.write(f'  - {len(del_candidates)} records to delete (PERMANENT)')
            
            if del_candidates:
                self.stdout.write(self.style.ERROR('\nWARNING: Deletion is IRREVERSIBLE!'))
                confirm = input('Type "PROCEED" to run full retention process: ')
                if confirm != 'PROCEED':
                    self.stdout.write('Process cancelled.')
                    return
            else:
                confirm = input('\nProceed with full retention process? [y/N]: ')
                if confirm.lower() != 'y':
                    self.stdout.write('Process cancelled.')
                    return
        
        self.stdout.write(self.style.HTTP_INFO('Running full data retention process...'))
        
        results = service.run_data_retention_process(dry_run=False)
        
        self.stdout.write(self.style.SUCCESS('Data retention process completed:'))
        self.stdout.write(f'  - Anonymization: {results["anonymization"]["successful"]} successful')
        self.stdout.write(f'  - Deletion: {results["deletion"]["successful"]} successful')
        
        if results['errors']:
            self.stdout.write(self.style.ERROR(f'  - {len(results["errors"])} errors occurred'))

    def _print_status_report(self, status):
        """Print formatted status report"""
        if 'error' in status:
            self.stdout.write(self.style.ERROR(f'Error: {status["error"]}'))
            return
        
        self.stdout.write(self.style.SUCCESS('=== Data Retention Policy Status ==='))
        self.stdout.write(f'Policy Version: {status["policy_version"]}')
        self.stdout.write(f'Retention Period: {status["retention_period_months"]} months')
        self.stdout.write(f'Anonymization Period: {status["anonymization_period_months"]} months')
        self.stdout.write('')
        
        self.stdout.write(self.style.HTTP_INFO('=== Record Counts ==='))
        self.stdout.write(f'Total Feedback Records: {status["total_feedback_records"]:,}')
        self.stdout.write(f'Already Anonymized: {status["already_anonymized"]:,}')
        
        if status["overdue_for_deletion"] > 0:
            self.stdout.write(
                self.style.ERROR(f'Overdue for Deletion: {status["overdue_for_deletion"]:,}')
            )
        else:
            self.stdout.write(f'Overdue for Deletion: {status["overdue_for_deletion"]:,}')
        
        if status["due_for_anonymization"] > 0:
            self.stdout.write(
                self.style.WARNING(f'Due for Anonymization: {status["due_for_anonymization"]:,}')
            )
        else:
            self.stdout.write(f'Due for Anonymization: {status["due_for_anonymization"]:,}')
        
        if status["approaching_retention"] > 0:
            self.stdout.write(
                self.style.HTTP_INFO(f'Approaching Retention: {status["approaching_retention"]:,}')
            )
        else:
            self.stdout.write(f'Approaching Retention: {status["approaching_retention"]:,}')
        
        self.stdout.write('')
        
        # Compliance status
        compliance = status["compliance_percentage"]
        if compliance >= 95:
            style = self.style.SUCCESS
        elif compliance >= 80:
            style = self.style.WARNING
        else:
            style = self.style.ERROR
        
        self.stdout.write(style(f'Compliance: {compliance}%'))
        self.stdout.write(f'Last Checked: {status["last_checked"]}')

    def _print_dry_run_results(self, results):
        """Print formatted dry-run results"""
        if 'error' in results:
            self.stdout.write(self.style.ERROR(f'Error: {results["error"]}'))
            return
        
        self.stdout.write(self.style.SUCCESS('=== Data Retention Dry-Run Results ==='))
        self.stdout.write(f'Started: {results["started_at"]}')
        self.stdout.write('')
        
        self.stdout.write(self.style.HTTP_INFO('Anonymization:'))
        self.stdout.write(f'  - Records identified: {results["anonymization"]["identified"]}')
        
        self.stdout.write(self.style.HTTP_INFO('Deletion:'))
        self.stdout.write(f'  - Records identified: {results["deletion"]["identified"]}')
        
        self.stdout.write(self.style.HTTP_INFO('Warnings:'))
        self.stdout.write(f'  - Records approaching retention: {results["warnings"]["identified"]}')
        
        if results["deletion"]["identified"] > 0 or results["anonymization"]["identified"] > 0:
            self.stdout.write('')
            self.stdout.write(self.style.WARNING('Run with --action=full-process to execute changes.'))
        else:
            self.stdout.write('')
            self.stdout.write(self.style.SUCCESS('No action required - all records within policy.'))