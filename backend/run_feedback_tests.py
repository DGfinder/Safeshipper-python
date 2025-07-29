#!/usr/bin/env python
"""
SafeShipper Feedback System Test Runner

This script runs the comprehensive test suite for the SafeShipper Enhanced POD 
Workflow with Customer Feedback system.

Usage:
    python run_feedback_tests.py [options]

Options:
    --verbose, -v     Run tests in verbose mode
    --coverage, -c    Run tests with coverage report  
    --specific TEST   Run specific test case or method
    --parallel, -p    Run tests in parallel (faster)
    --failfast, -f    Stop on first failure

Examples:
    python run_feedback_tests.py
    python run_feedback_tests.py --verbose --coverage
    python run_feedback_tests.py --specific shipments.tests.test_feedback_system.FeedbackModelTestCase
    python run_feedback_tests.py --specific shipments.tests.test_feedback_system.FeedbackModelTestCase.test_feedback_creation
"""

import os
import sys
import django
import argparse
from django.conf import settings
from django.test.utils import get_runner

# Add the backend directory to Python path
backend_dir = os.path.dirname(os.path.abspath(__file__))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

# Configure Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'safeshipper.settings')
django.setup()


def run_tests(verbosity=1, coverage=False, specific=None, parallel=False, failfast=False):
    """
    Run the feedback system test suite.
    
    Args:
        verbosity (int): Test verbosity level (0-3)
        coverage (bool): Whether to run with coverage reporting
        specific (str): Specific test case or method to run
        parallel (bool): Whether to run tests in parallel
        failfast (bool): Whether to stop on first failure
    """
    
    # Test modules to run
    test_modules = [
        'shipments.tests.test_feedback_system',
        'shipments.tests.test_notification_integration', 
        'shipments.tests.test_erp_webhook_integration',
    ]
    
    if specific:
        test_modules = [specific]
    
    # Configure test runner
    TestRunner = get_runner(settings)
    test_runner = TestRunner(
        verbosity=verbosity,
        interactive=False,
        parallel=parallel if parallel else 1,
        failfast=failfast,
        keepdb=True  # Keep test database for faster subsequent runs
    )
    
    print("=" * 70)
    print("SafeShipper Enhanced POD Workflow - Feedback System Test Suite")
    print("=" * 70)
    print(f"Running tests: {', '.join(test_modules)}")
    print(f"Verbosity: {verbosity}")
    print(f"Coverage: {'Enabled' if coverage else 'Disabled'}")
    print(f"Parallel: {'Enabled' if parallel else 'Disabled'}")
    print(f"Fail Fast: {'Enabled' if failfast else 'Disabled'}")
    print("=" * 70)
    
    if coverage:
        try:
            import coverage as cov
            
            # Start coverage
            coverage_instance = cov.Coverage(
                source=[
                    'shipments.models',
                    'shipments.api_views', 
                    'shipments.data_retention_service',
                    'shipments.incident_service',
                    'shipments.weekly_reports_service',
                    'notifications.feedback_notification_service',
                    'notifications.notification_preferences',
                    'notifications.sms_service',
                    'erp_integration.feedback_webhook_service',
                ],
                omit=[
                    '*/tests/*',
                    '*/migrations/*',
                    '*/venv/*',
                    '*/env/*',
                ]
            )
            
            coverage_instance.start()
            
            # Run tests
            failures = test_runner.run_tests(test_modules)
            
            # Stop coverage and generate report
            coverage_instance.stop()
            coverage_instance.save()
            
            print("\n" + "=" * 70)
            print("COVERAGE REPORT")
            print("=" * 70)
            coverage_instance.report()
            
            # Generate HTML coverage report
            try:
                coverage_instance.html_report(directory='htmlcov')
                print(f"\nHTML coverage report generated in: {os.path.abspath('htmlcov')}")
                print("Open htmlcov/index.html in your browser to view detailed coverage.")
            except Exception as e:
                print(f"Could not generate HTML report: {e}")
                
        except ImportError:
            print("Coverage package not installed. Install with: pip install coverage")
            print("Running tests without coverage...")
            failures = test_runner.run_tests(test_modules)
    else:
        failures = test_runner.run_tests(test_modules)
    
    # Print test summary
    print("\n" + "=" * 70)
    print("TEST SUMMARY")
    print("=" * 70)
    
    if failures:
        print(f"❌ FAILED: {failures} test(s) failed")
        print("\nTest modules run:")
        for module in test_modules:
            print(f"  - {module}")
        return 1
    else:
        print("✅ SUCCESS: All tests passed!")
        print("\nTest modules run:")
        for module in test_modules:
            print(f"  ✓ {module}")
        
        print("\nTest Categories Covered:")
        print("  ✓ Model functionality and business logic")
        print("  ✓ API endpoints and serialization")
        print("  ✓ Notification system integration")
        print("  ✓ SMS service integration") 
        print("  ✓ ERP webhook integration")
        print("  ✓ Data retention and anonymization")
        print("  ✓ Weekly report generation")
        print("  ✓ Incident service integration")
        print("  ✓ Permission-based access control")
        print("  ✓ Analytics and dashboard functionality")
        print("  ✓ End-to-end workflow integration")
        
        return 0


def main():
    """Main entry point for the test runner."""
    parser = argparse.ArgumentParser(
        description='Run SafeShipper Feedback System Test Suite',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=__doc__
    )
    
    parser.add_argument(
        '--verbose', '-v',
        action='store_true',
        help='Run tests in verbose mode'
    )
    
    parser.add_argument(
        '--coverage', '-c',
        action='store_true',
        help='Run tests with coverage report'
    )
    
    parser.add_argument(
        '--specific',
        type=str,
        help='Run specific test case or method'
    )
    
    parser.add_argument(
        '--parallel', '-p',
        action='store_true',
        help='Run tests in parallel (faster)'
    )
    
    parser.add_argument(
        '--failfast', '-f',
        action='store_true',
        help='Stop on first failure'
    )
    
    args = parser.parse_args()
    
    # Determine verbosity
    verbosity = 2 if args.verbose else 1
    
    # Run tests
    exit_code = run_tests(
        verbosity=verbosity,
        coverage=args.coverage,
        specific=args.specific,
        parallel=args.parallel,
        failfast=args.failfast
    )
    
    sys.exit(exit_code)


if __name__ == '__main__':
    main()