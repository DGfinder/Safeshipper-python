# security_scanning/cli.py
"""
Command-line interface for SafeShipper security scanning.
Provides easy integration with CI/CD pipelines and manual execution.
"""

import os
import sys
import argparse
import logging
from pathlib import Path
from typing import List, Optional

from .config import SecurityConfig
from .scanners import SecurityScanner
from .pipeline_integration import PipelineIntegrator
from .reporting import SecurityReporter


def setup_logging(verbosity: int = 1):
    """Setup logging configuration."""
    log_levels = {
        0: logging.WARNING,
        1: logging.INFO,
        2: logging.DEBUG
    }
    
    level = log_levels.get(verbosity, logging.INFO)
    
    logging.basicConfig(
        level=level,
        format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
        handlers=[
            logging.StreamHandler(sys.stdout)
        ]
    )


def main():
    """Main CLI entry point."""
    parser = argparse.ArgumentParser(
        description="SafeShipper Security Scanner - Comprehensive security scanning for dangerous goods transportation platform"
    )
    
    parser.add_argument(
        "--project-path",
        type=str,
        default=".",
        help="Path to project directory to scan (default: current directory)"
    )
    
    parser.add_argument(
        "--environment",
        type=str,
        choices=["production", "staging", "development"],
        default="development",
        help="Target environment for security thresholds (default: development)"
    )
    
    parser.add_argument(
        "--pipeline-type",
        type=str,
        choices=["ci", "cd", "nightly", "release"],
        help="Pipeline type for automated scanning"
    )
    
    parser.add_argument(
        "--scanners",
        type=str,
        nargs="+",
        choices=["bandit", "safety", "semgrep", "trivy", "gitleaks"],
        help="Specific scanners to run (default: all enabled scanners)"
    )
    
    parser.add_argument(
        "--output-dir",
        type=str,
        default="security_reports",
        help="Output directory for reports (default: security_reports)"
    )
    
    parser.add_argument(
        "--generate-report",
        action="store_true",
        help="Generate comprehensive security reports"
    )
    
    parser.add_argument(
        "--upload-results",
        action="store_true",
        help="Upload results to configured endpoints"
    )
    
    parser.add_argument(
        "--fail-on-threshold",
        action="store_true",
        default=True,
        help="Fail if security thresholds are exceeded (default: True)"
    )
    
    parser.add_argument(
        "--config-file",
        type=str,
        help="Custom configuration file path"
    )
    
    parser.add_argument(
        "--exclude-patterns",
        type=str,
        nargs="+",
        help="File patterns to exclude from scanning"
    )
    
    parser.add_argument(
        "--include-patterns",
        type=str,
        nargs="+",
        help="File patterns to include in scanning"
    )
    
    parser.add_argument(
        "--verbosity",
        type=int,
        choices=[0, 1, 2],
        default=1,
        help="Verbosity level (0=warnings, 1=info, 2=debug)"
    )
    
    parser.add_argument(
        "--json-output",
        action="store_true",
        help="Output results in JSON format"
    )
    
    parser.add_argument(
        "--sarif-output",
        type=str,
        help="Output SARIF format to specified file"
    )
    
    parser.add_argument(
        "--version",
        action="version",
        version="SafeShipper Security Scanner 1.0.0"
    )
    
    args = parser.parse_args()
    
    # Setup logging
    setup_logging(args.verbosity)
    logger = logging.getLogger("security_cli")
    
    try:
        # Validate project path
        project_path = Path(args.project_path).resolve()
        if not project_path.exists():
            logger.error(f"Project path does not exist: {project_path}")
            return 1
        
        logger.info(f"Starting SafeShipper security scan")
        logger.info(f"Project path: {project_path}")
        logger.info(f"Environment: {args.environment}")
        
        # Run pipeline integration if specified
        if args.pipeline_type:
            logger.info(f"Running pipeline integration: {args.pipeline_type}")
            
            integrator = PipelineIntegrator(args.environment)
            results = integrator.run_pipeline_security_scan(
                str(project_path),
                args.pipeline_type
            )
            
            # Output results
            if args.json_output:
                import json
                print(json.dumps(results, indent=2, default=str))
            else:
                _print_summary(results)
            
            # Check pipeline status
            pipeline_status = results.get("pipeline_status", {})
            if not pipeline_status.get("passed", False) and args.fail_on_threshold:
                logger.error("Pipeline security gates failed")
                return 1
            
            return 0
        
        # Run standard security scan
        scanner = SecurityScanner(args.environment)
        
        logger.info("Running security scans...")
        scan_results = scanner.scan_project(
            str(project_path),
            scanner_names=args.scanners
        )
        
        # Aggregate results
        aggregated_results = scanner.aggregate_results(scan_results)
        
        # Generate reports if requested
        if args.generate_report:
            reporter = SecurityReporter(args.output_dir)
            report_paths = reporter.generate_pipeline_reports(aggregated_results)
            logger.info(f"Reports generated: {list(report_paths.values())}")
        
        # Generate SARIF output if requested
        if args.sarif_output:
            reporter = SecurityReporter()
            reporter._generate_sarif_report(aggregated_results, Path(args.sarif_output))
            logger.info(f"SARIF report generated: {args.sarif_output}")
        
        # Output results
        if args.json_output:
            import json
            print(json.dumps(aggregated_results, indent=2, default=str))
        else:
            _print_summary(aggregated_results)
        
        # Check thresholds
        if args.fail_on_threshold:
            config = SecurityConfig()
            severity_counts = aggregated_results["scan_summary"]["severity_breakdown"]
            
            if not config.validate_threshold_compliance(severity_counts, args.environment):
                logger.error("Security thresholds exceeded")
                return 1
        
        logger.info("Security scan completed successfully")
        return 0
        
    except KeyboardInterrupt:
        logger.info("Security scan interrupted by user")
        return 2
        
    except Exception as e:
        logger.error(f"Security scan failed: {str(e)}")
        if args.verbosity >= 2:
            import traceback
            traceback.print_exc()
        return 3


def _print_summary(results: dict):
    """Print human-readable summary of scan results."""
    print("\n" + "="*60)
    print("🔒 SafeShipper Security Scan Results")
    print("="*60)
    
    # Overall status
    compliance_status = results.get("compliance_status", "unknown")
    if compliance_status == "compliant":
        print("✅ Overall Status: COMPLIANT")
    else:
        print("❌ Overall Status: NON-COMPLIANT")
    
    # Summary statistics
    summary = results["scan_summary"]
    print(f"\n📊 Scan Summary:")
    print(f"   Total Scanners: {summary['total_scanners']}")
    print(f"   Successful: {summary['successful_scans']}")
    print(f"   Failed: {summary['failed_scans']}")
    print(f"   Total Vulnerabilities: {summary['total_vulnerabilities']}")
    
    # Severity breakdown
    severity = summary["severity_breakdown"]
    print(f"\n🚨 Vulnerability Breakdown:")
    print(f"   Critical: {severity['critical']}")
    print(f"   High:     {severity['high']}")
    print(f"   Medium:   {severity['medium']}")
    print(f"   Low:      {severity['low']}")
    print(f"   Info:     {severity['info']}")
    
    # Pipeline status if available
    pipeline_status = results.get("pipeline_status")
    if pipeline_status:
        print(f"\n🔧 Pipeline Status:")
        if pipeline_status.get("passed"):
            print("   ✅ PASSED")
        else:
            print("   ❌ FAILED")
            
        failed_checks = pipeline_status.get("failed_checks", [])
        if failed_checks:
            print("   Failed Checks:")
            for check in failed_checks:
                print(f"   - {check}")
    
    # Scanner results
    print(f"\n🔍 Scanner Results:")
    for scanner_name, scanner_result in results.get("scanner_results", {}).items():
        status = scanner_result.get("status", "unknown")
        duration = scanner_result.get("duration_seconds", 0)
        vuln_count = len(scanner_result.get("vulnerabilities", []))
        
        status_icon = "✅" if status == "completed" else "❌"
        print(f"   {status_icon} {scanner_name}: {vuln_count} issues ({duration:.1f}s)")
    
    # Recommendations
    recommendations = results.get("recommendations", [])
    if recommendations:
        print(f"\n💡 Recommendations:")
        for rec in recommendations[:5]:  # Show top 5
            print(f"   - {rec}")
    
    print("\n" + "="*60)


def generate_config_template():
    """Generate a configuration template file."""
    template = """
# SafeShipper Security Scanning Configuration
# Copy this file to .safeshipper-security.yaml and customize as needed

# Environment-specific thresholds
thresholds:
  production:
    critical: 0
    high: 0
    medium: 0
    low: 5
    info: 50
  
  staging:
    critical: 0
    high: 2
    medium: 10
    low: 30
    info: 100
  
  development:
    critical: 2
    high: 10
    medium: 25
    low: 50
    info: 200

# Scanner configuration
scanners:
  bandit:
    enabled: true
    timeout_minutes: 15
    custom_rules:
      - B201  # Flask debug mode
      - B501  # Request with no certificate validation
      - B608  # SQL injection
  
  safety:
    enabled: true
    timeout_minutes: 10
  
  semgrep:
    enabled: true
    timeout_minutes: 20
    custom_rules:
      - "python.django.security"
      - "python.flask.security"
  
  trivy:
    enabled: true
    timeout_minutes: 25
  
  gitleaks:
    enabled: true
    timeout_minutes: 10

# File patterns
include_patterns:
  - "**/*.py"
  - "**/*.js"
  - "**/*.ts"
  - "**/*.yaml"
  - "**/*.yml"
  - "**/*.json"
  - "**/requirements*.txt"

exclude_patterns:
  - "**/node_modules/**"
  - "**/venv/**"
  - "**/.git/**"
  - "**/build/**"
  - "**/dist/**"
  - "**/__pycache__/**"
  - "**/test_results/**"

# Pipeline integration
pipeline:
  fail_on_critical: true
  fail_on_high: true
  fail_on_medium: false
  generate_reports: true
  upload_results: false
  notify_security_team: true

# Notification settings
notifications:
  slack_webhook: "${SECURITY_SLACK_WEBHOOK}"
  email_recipients:
    - "security@safeshipper.com"
    - "devops@safeshipper.com"
"""
    
    with open(".safeshipper-security.yaml", "w") as f:
        f.write(template)
    
    print("Configuration template generated: .safeshipper-security.yaml")
    print("Customize the file according to your requirements.")


if __name__ == "__main__":
    exit_code = main()
    sys.exit(exit_code)