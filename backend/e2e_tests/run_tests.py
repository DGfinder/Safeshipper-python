# e2e_tests/run_tests.py
"""
Test runner for SafeShipper end-to-end tests.
Orchestrates comprehensive E2E testing with reporting and environment management.
"""

import os
import sys
import json
import time
import argparse
import unittest
from datetime import datetime
from typing import Dict, List, Any
from pathlib import Path

# Add the backend directory to Python path
backend_dir = Path(__file__).parent.parent
sys.path.insert(0, str(backend_dir))

# Django setup
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'safeshipper.settings.testing')

import django
django.setup()

from django.test.runner import DiscoverRunner
from django.test.utils import get_runner
from django.conf import settings
from django.db import connections
from django.core.management import call_command


class SafeShipperE2ETestRunner:
    """
    Comprehensive E2E test runner for SafeShipper platform.
    """
    
    def __init__(self, verbosity: int = 2, keepdb: bool = False):
        self.verbosity = verbosity
        self.keepdb = keepdb
        self.results = {}
        self.start_time = None
        self.end_time = None
        
    def setup_test_environment(self):
        """Setup test environment and database."""
        print("🔧 Setting up SafeShipper E2E test environment...")
        
        # Clear any existing test data
        if not self.keepdb:
            print("   - Creating fresh test database...")
            call_command('flush', '--noinput')
        
        # Load test fixtures
        print("   - Loading test fixtures...")
        try:
            call_command('loaddata', 'test_dangerous_goods.json', verbosity=0)
            call_command('loaddata', 'test_emergency_procedures.json', verbosity=0)
        except Exception as e:
            print(f"   ⚠️  Warning: Could not load fixtures: {e}")
        
        # Run migrations
        print("   - Ensuring database schema is current...")
        call_command('migrate', '--run-syncdb', verbosity=0)
        
        print("✅ Test environment ready\n")
    
    def run_test_suite(self, test_patterns: List[str] = None) -> Dict[str, Any]:
        """Run the complete E2E test suite."""
        self.start_time = time.time()
        
        print("🧪 Starting SafeShipper End-to-End Test Suite")
        print("=" * 60)
        
        # Setup environment
        self.setup_test_environment()
        
        # Define test modules
        test_modules = test_patterns or [
            'e2e_tests.test_shipment_lifecycle',
            'e2e_tests.test_compliance_workflows', 
            'e2e_tests.test_emergency_procedures',
            'e2e_tests.test_integration_flows'
        ]
        
        # Initialize test runner
        test_runner_class = get_runner(settings)
        test_runner = test_runner_class(
            verbosity=self.verbosity,
            interactive=False,
            keepdb=self.keepdb,
            parallel=1  # E2E tests should run sequentially
        )
        
        # Run tests
        suite_results = {}
        overall_failures = 0
        overall_errors = 0
        total_tests = 0
        
        for module in test_modules:
            print(f"\n🔍 Running {module}...")
            print("-" * 40)
            
            try:
                # Discover and run tests for this module
                suite = unittest.TestLoader().loadTestsFromName(module)
                result = test_runner.run_tests([module])
                
                # Collect results
                module_name = module.split('.')[-1]
                suite_results[module_name] = {
                    'passed': result == 0,
                    'test_count': suite.countTestCases(),
                    'duration': time.time() - self.start_time
                }
                
                total_tests += suite.countTestCases()
                if result != 0:
                    overall_failures += 1
                
                print(f"✅ {module_name}: {'PASSED' if result == 0 else 'FAILED'}")
                
            except Exception as e:
                print(f"❌ {module}: ERROR - {str(e)}")
                suite_results[module.split('.')[-1]] = {
                    'passed': False,
                    'error': str(e),
                    'test_count': 0
                }
                overall_errors += 1
        
        self.end_time = time.time()
        
        # Compile final results
        self.results = {
            'overall_status': 'PASSED' if overall_failures == 0 and overall_errors == 0 else 'FAILED',
            'total_duration': self.end_time - self.start_time,
            'total_tests': total_tests,
            'suite_results': suite_results,
            'failures': overall_failures,
            'errors': overall_errors,
            'timestamp': datetime.now().isoformat()
        }
        
        return self.results
    
    def run_specific_workflow(self, workflow: str) -> Dict[str, Any]:
        """Run specific workflow tests."""
        workflow_modules = {
            'shipment': ['e2e_tests.test_shipment_lifecycle'],
            'compliance': ['e2e_tests.test_compliance_workflows'],
            'emergency': ['e2e_tests.test_emergency_procedures'],
            'integration': ['e2e_tests.test_integration_flows']
        }
        
        if workflow not in workflow_modules:
            raise ValueError(f"Unknown workflow: {workflow}. Available: {list(workflow_modules.keys())}")
        
        return self.run_test_suite(workflow_modules[workflow])
    
    def run_smoke_tests(self) -> Dict[str, Any]:
        """Run smoke tests for critical functionality."""
        print("💨 Running SafeShipper E2E Smoke Tests")
        print("=" * 40)
        
        # Define critical smoke tests
        smoke_test_methods = [
            'e2e_tests.test_shipment_lifecycle.ShipmentLifecycleE2ETests.test_complete_shipment_lifecycle_success_flow',
            'e2e_tests.test_compliance_workflows.ComplianceWorkflowE2ETests.test_complete_audit_trail_workflow',
            'e2e_tests.test_emergency_procedures.EmergencyProcedureE2ETests.test_complete_emergency_response_workflow'
        ]
        
        return self.run_test_suite(smoke_test_methods)
    
    def generate_report(self) -> str:
        """Generate comprehensive test report."""
        if not self.results:
            return "No test results available"
        
        report = []
        report.append("SafeShipper End-to-End Test Report")
        report.append("=" * 50)
        report.append(f"Execution Date: {self.results['timestamp']}")
        report.append(f"Total Duration: {self.results['total_duration']:.2f} seconds")
        report.append(f"Overall Status: {self.results['overall_status']}")
        report.append("")
        
        # Summary
        report.append("Test Summary")
        report.append("-" * 20)
        report.append(f"Total Tests: {self.results['total_tests']}")
        report.append(f"Failures: {self.results['failures']}")
        report.append(f"Errors: {self.results['errors']}")
        report.append("")
        
        # Suite Results
        report.append("Suite Results")
        report.append("-" * 20)
        
        for suite_name, suite_data in self.results['suite_results'].items():
            status = "✅ PASSED" if suite_data['passed'] else "❌ FAILED"
            test_count = suite_data.get('test_count', 0)
            duration = suite_data.get('duration', 0)
            
            report.append(f"{suite_name}: {status} ({test_count} tests, {duration:.2f}s)")
            
            if 'error' in suite_data:
                report.append(f"  Error: {suite_data['error']}")
        
        report.append("")
        
        # Recommendations
        if self.results['overall_status'] == 'FAILED':
            report.append("Recommendations")
            report.append("-" * 20)
            report.append("• Review failed test details in logs")
            report.append("• Check system configuration and dependencies")
            report.append("• Verify test environment setup")
            report.append("• Run individual test suites for detailed diagnostics")
        
        return "\n".join(report)
    
    def save_results(self, output_dir: str = "e2e_test_results"):
        """Save test results to files."""
        output_path = Path(output_dir)
        output_path.mkdir(exist_ok=True)
        
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        
        # Save JSON results
        json_file = output_path / f"e2e_results_{timestamp}.json"
        with open(json_file, 'w') as f:
            json.dump(self.results, f, indent=2, default=str)
        
        # Save text report
        report_file = output_path / f"e2e_report_{timestamp}.txt"
        with open(report_file, 'w') as f:
            f.write(self.generate_report())
        
        print(f"\n📄 Results saved to:")
        print(f"   JSON: {json_file}")
        print(f"   Report: {report_file}")
        
        return json_file, report_file
    
    def cleanup_test_environment(self):
        """Cleanup test environment."""
        if not self.keepdb:
            print("\n🧹 Cleaning up test environment...")
            try:
                # Close all database connections
                for conn in connections.all():
                    conn.close()
                print("✅ Test environment cleaned up")
            except Exception as e:
                print(f"⚠️  Warning: Cleanup issue: {e}")


def main():
    """Main entry point for E2E test runner."""
    parser = argparse.ArgumentParser(description="SafeShipper E2E Test Runner")
    parser.add_argument('--workflow', type=str, 
                       choices=['shipment', 'compliance', 'emergency', 'integration'],
                       help='Run specific workflow tests')
    parser.add_argument('--smoke', action='store_true',
                       help='Run smoke tests only')
    parser.add_argument('--keepdb', action='store_true',
                       help='Keep test database after tests')
    parser.add_argument('--verbosity', type=int, default=2, choices=[0, 1, 2, 3],
                       help='Verbosity level')
    parser.add_argument('--output-dir', type=str, default='e2e_test_results',
                       help='Output directory for test results')
    parser.add_argument('--patterns', type=str, nargs='+',
                       help='Specific test patterns to run')
    
    args = parser.parse_args()
    
    # Initialize test runner
    runner = SafeShipperE2ETestRunner(
        verbosity=args.verbosity,
        keepdb=args.keepdb
    )
    
    try:
        # Run tests based on arguments
        if args.smoke:
            results = runner.run_smoke_tests()
        elif args.workflow:
            results = runner.run_specific_workflow(args.workflow)
        elif args.patterns:
            results = runner.run_test_suite(args.patterns)
        else:
            results = runner.run_test_suite()
        
        # Generate and display report
        print("\n" + "=" * 60)
        print(runner.generate_report())
        
        # Save results
        runner.save_results(args.output_dir)
        
        # Cleanup
        runner.cleanup_test_environment()
        
        # Exit with appropriate code
        exit_code = 0 if results['overall_status'] == 'PASSED' else 1
        
        if exit_code == 0:
            print("\n🎉 All E2E tests passed!")
        else:
            print(f"\n💥 E2E tests failed: {results['failures']} failures, {results['errors']} errors")
        
        return exit_code
        
    except KeyboardInterrupt:
        print("\n🛑 Tests interrupted by user")
        runner.cleanup_test_environment()
        return 2
        
    except Exception as e:
        print(f"\n💥 Test runner failed: {str(e)}")
        runner.cleanup_test_environment()
        return 3


if __name__ == "__main__":
    sys.exit(main())