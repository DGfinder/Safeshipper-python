#!/usr/bin/env python3
"""
SafeShipper Backend Test Runner

This script provides a convenient way to run the comprehensive test suite
for the SafeShipper backend APIs.

Usage:
    python run_tests.py                    # Run all tests
    python run_tests.py --auth             # Run authentication tests only
    python run_tests.py --shipments        # Run shipment tests only  
    python run_tests.py --dangerous-goods  # Run dangerous goods tests only
    python run_tests.py --coverage         # Run with coverage report
    python run_tests.py --fast             # Run without database migrations
"""

import argparse
import subprocess
import sys
import os

def run_command(command, description=""):
    """Run a shell command and handle errors"""
    print(f"\n{'='*60}")
    print(f"Running: {description or command}")
    print(f"{'='*60}")
    
    result = subprocess.run(command, shell=True, capture_output=True, text=True)
    
    print(result.stdout)
    if result.stderr:
        print("STDERR:", result.stderr)
    
    if result.returncode != 0:
        print(f"❌ Command failed with return code {result.returncode}")
        return False
    else:
        print(f"✅ {description or 'Command'} completed successfully")
        return True

def main():
    parser = argparse.ArgumentParser(description='Run SafeShipper Backend Tests')
    parser.add_argument('--auth', action='store_true', 
                       help='Run authentication and user management tests')
    parser.add_argument('--shipments', action='store_true',
                       help='Run shipment management tests')
    parser.add_argument('--dangerous-goods', action='store_true',
                       help='Run dangerous goods compliance tests')
    parser.add_argument('--coverage', action='store_true',
                       help='Run tests with coverage report')
    parser.add_argument('--fast', action='store_true',
                       help='Skip migrations for faster testing')
    parser.add_argument('--verbosity', type=int, default=2,
                       help='Test verbosity level (0-3)')
    
    args = parser.parse_args()
    
    # Change to backend directory
    backend_dir = os.path.dirname(os.path.abspath(__file__))
    os.chdir(backend_dir)
    
    print("🚀 SafeShipper Backend Test Suite")
    print(f"Working directory: {backend_dir}")
    
    # Base command options
    base_options = f"--verbosity={args.verbosity}"
    if args.fast:
        base_options += " --nomigrations --debug-mode"
    
    # Determine which tests to run
    test_modules = []
    
    if args.auth:
        test_modules.append("users.tests.test_api")
    
    if args.shipments:
        test_modules.append("shipments.tests.test_api")
        
    if args.dangerous_goods:
        test_modules.append("dangerous_goods.tests.test_api")
    
    # If no specific tests selected, run all
    if not test_modules:
        test_modules = [
            "users.tests.test_api",
            "shipments.tests.test_api", 
            "dangerous_goods.tests.test_api"
        ]
    
    # Build test command
    test_targets = " ".join(test_modules)
    
    if args.coverage:
        # Run with coverage
        commands = [
            ("coverage erase", "Clearing previous coverage data"),
            (f"coverage run --source='.' manage.py test {test_targets} {base_options}",
             "Running tests with coverage"),
            ("coverage report --show-missing", "Generating coverage report"),
            ("coverage html", "Generating HTML coverage report")
        ]
    else:
        # Run without coverage
        commands = [
            (f"python manage.py test {test_targets} {base_options}",
             "Running test suite")
        ]
    
    # Execute commands
    all_success = True
    for command, description in commands:
        success = run_command(command, description)
        if not success:
            all_success = False
            break
    
    # Print summary
    print(f"\n{'='*60}")
    if all_success:
        print("🎉 All tests completed successfully!")
        print("\nTest Coverage Summary:")
        print("✅ Authentication & User Management APIs")
        print("✅ Shipment Management & Role-based Filtering") 
        print("✅ Dangerous Goods Compliance & Compatibility")
        
        if args.coverage:
            print("\n📊 Coverage report generated in htmlcov/index.html")
            
    else:
        print("❌ Some tests failed. Please check the output above.")
        sys.exit(1)
    
    print(f"{'='*60}")

if __name__ == "__main__":
    main()