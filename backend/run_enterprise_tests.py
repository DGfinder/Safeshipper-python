#!/usr/bin/env python
"""
Enterprise Features Test Suite Runner

This script runs comprehensive tests for all enterprise features implemented in SafeShipper:
- Audit trail system
- Document generation and management
- Public tracking with enhanced features

Usage:
    python run_enterprise_tests.py [options]

Options:
    --verbose, -v       Enable verbose output
    --coverage, -c      Run with coverage analysis
    --failfast, -f      Stop on first failure
    --pattern, -p       Specify test pattern (default: test*.py)
    --apps              Comma-separated list of specific apps to test
    --report            Generate detailed test report

Examples:
    python run_enterprise_tests.py --verbose --coverage
    python run_enterprise_tests.py --apps=audits,documents,tracking
    python run_enterprise_tests.py --failfast --pattern="*integration*"
"""

import os
import sys
import django
import argparse
import subprocess
from pathlib import Path
from datetime import datetime

# Setup Django environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'safeshipper.settings')
django.setup()

from django.test.utils import get_runner
from django.conf import settings
from django.core.management import execute_from_command_line


class EnterpriseTestRunner:
    """Test runner for enterprise features"""
    
    def __init__(self):
        self.enterprise_apps = [
            'audits',
            'documents', 
            'tracking',
            'shipments',  # For shipment-related tests
            'users',      # For user-related tests
            'communications'  # For communication tests
        ]
        
        self.test_categories = {
            'unit': [
                'audits.tests.AuditModelsTestCase',
                'audits.tests.AuditSignalsTestCase',
                'documents.tests.DocumentModelsTestCase', 
                'documents.tests.PDFGeneratorTestCase',
                'tracking.tests.TrackingModelsTestCase'
            ],
            'api': [
                'audits.tests.AuditAPITestCase',
                'documents.tests.DocumentAPITestCase',
                'tracking.tests.PublicTrackingAPITestCase',
                'tracking.tests.PublicDocumentDownloadTestCase',
                'tracking.tests.PublicDeliveryTimelineTestCase'
            ],
            'integration': [
                'audits.tests.AuditIntegrationTestCase',
                'documents.tests.DocumentIntegrationTestCase',
                'tracking.tests.TrackingIntegrationTestCase'
            ]
        }
        
    def run_tests(self, args):
        """Run the test suite with specified arguments"""
        
        # Prepare test command
        test_command = ['python', 'manage.py', 'test']
        
        # Add specific apps if specified
        if args.apps:
            apps = args.apps.split(',')
            test_command.extend([f'{app}.tests' for app in apps if app in self.enterprise_apps])
        else:
            # Test all enterprise apps
            test_command.extend([f'{app}.tests' for app in self.enterprise_apps])
            
        # Add test options
        if args.verbose:
            test_command.append('--verbosity=2')
            
        if args.failfast:
            test_command.append('--failfast')
            
        if args.pattern:
            test_command.extend(['--pattern', args.pattern])
            
        # Add coverage if requested
        if args.coverage:
            test_command = ['coverage', 'run', '--source=.'] + test_command[1:]
            
        print(f"Running enterprise tests with command: {' '.join(test_command)}")
        print("=" * 80)
        
        # Execute tests
        result = subprocess.run(test_command, cwd=os.getcwd())
        
        # Generate coverage report if requested
        if args.coverage and result.returncode == 0:
            print("\n" + "=" * 80)
            print("COVERAGE REPORT")
            print("=" * 80)
            subprocess.run(['coverage', 'report', '--include=audits/*,documents/*,tracking/*'])
            
            if args.report:
                print("\nGenerating HTML coverage report...")
                subprocess.run(['coverage', 'html', '--include=audits/*,documents/*,tracking/*'])
                print("HTML coverage report generated in htmlcov/")
                
        return result.returncode
        
    def run_specific_categories(self, categories, args):
        """Run specific test categories"""
        test_classes = []
        
        for category in categories:
            if category in self.test_categories:
                test_classes.extend(self.test_categories[category])
            else:
                print(f"Warning: Unknown test category '{category}'")
                
        if test_classes:
            test_command = ['python', 'manage.py', 'test'] + test_classes
            
            if args.verbose:
                test_command.append('--verbosity=2')
                
            if args.failfast:
                test_command.append('--failfast')
                
            print(f"Running {', '.join(categories)} tests...")
            print("=" * 80)
            
            result = subprocess.run(test_command, cwd=os.getcwd())
            return result.returncode
        else:
            print("No test classes found for specified categories")
            return 1
            
    def generate_test_report(self):
        """Generate a comprehensive test report"""
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        report_file = f"enterprise_test_report_{timestamp}.txt"
        
        print(f"Generating test report: {report_file}")
        
        with open(report_file, 'w') as f:
            f.write("SAFESHIPPER ENTERPRISE FEATURES TEST REPORT\n")
            f.write("=" * 80 + "\n")
            f.write(f"Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n\n")
            
            f.write("TEST COVERAGE:\n")
            f.write("-" * 40 + "\n")
            f.write("1. Audit Trail System\n")
            f.write("   - Audit log models and relationships\n")
            f.write("   - Automatic audit capture via Django signals\n")
            f.write("   - API endpoints with role-based access control\n")
            f.write("   - Search and filtering functionality\n")
            f.write("   - Export capabilities\n\n")
            
            f.write("2. Document Generation & Management\n")
            f.write("   - PDF generation using WeasyPrint\n")
            f.write("   - Professional document templates\n")
            f.write("   - Document upload and validation\n")
            f.write("   - Batch document generation\n")
            f.write("   - Document access controls\n\n")
            
            f.write("3. Enhanced Public Tracking\n")
            f.write("   - Public shipment tracking API\n")
            f.write("   - Document download functionality\n")
            f.write("   - Communication logs integration\n")
            f.write("   - Proof of delivery features\n")
            f.write("   - Data minimization for security\n\n")
            
            f.write("TEST CATEGORIES:\n")
            f.write("-" * 40 + "\n")
            for category, tests in self.test_categories.items():
                f.write(f"{category.upper()} TESTS:\n")
                for test in tests:
                    f.write(f"  - {test}\n")
                f.write("\n")
                
            f.write("APPS TESTED:\n")
            f.write("-" * 40 + "\n")
            for app in self.enterprise_apps:
                f.write(f"  - {app}\n")
                
        print(f"Test report saved to: {report_file}")
        return report_file


def main():
    parser = argparse.ArgumentParser(
        description='Enterprise Features Test Suite Runner',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=__doc__
    )
    
    parser.add_argument(
        '--verbose', '-v',
        action='store_true',
        help='Enable verbose output'
    )
    
    parser.add_argument(
        '--coverage', '-c',
        action='store_true',
        help='Run with coverage analysis'
    )
    
    parser.add_argument(
        '--failfast', '-f',
        action='store_true',
        help='Stop on first failure'
    )
    
    parser.add_argument(
        '--pattern', '-p',
        default='test*.py',
        help='Specify test pattern (default: test*.py)'
    )
    
    parser.add_argument(
        '--apps',
        help='Comma-separated list of specific apps to test'
    )
    
    parser.add_argument(
        '--report',
        action='store_true',
        help='Generate detailed test report'
    )
    
    parser.add_argument(
        '--categories',
        choices=['unit', 'api', 'integration', 'all'],
        help='Run specific test categories'
    )
    
    parser.add_argument(
        '--list-tests',
        action='store_true',
        help='List all available tests without running them'
    )
    
    args = parser.parse_args()
    
    runner = EnterpriseTestRunner()
    
    if args.list_tests:
        print("AVAILABLE TEST CATEGORIES:")
        print("=" * 40)
        for category, tests in runner.test_categories.items():
            print(f"\n{category.upper()}:")
            for test in tests:
                print(f"  - {test}")
        print(f"\nAVAILABLE APPS: {', '.join(runner.enterprise_apps)}")
        return 0
        
    if args.report and not args.coverage:
        runner.generate_test_report()
        return 0
        
    if args.categories:
        if args.categories == 'all':
            categories = list(runner.test_categories.keys())
        else:
            categories = [args.categories]
        return runner.run_specific_categories(categories, args)
    else:
        return runner.run_tests(args)


if __name__ == '__main__':
    exit_code = main()
    sys.exit(exit_code)