# security_scanning/pipeline_integration.py
"""
CI/CD pipeline integration for SafeShipper security scanning.
Provides seamless integration with GitHub Actions, Jenkins, and other CI/CD systems.
"""

import os
import json
import yaml
import requests
from typing import Dict, List, Any, Optional
from pathlib import Path
from datetime import datetime

from .config import SecurityConfig
from .scanners import SecurityScanner, SecurityScanResult
from .reporting import SecurityReporter


class PipelineIntegrator:
    """
    Integrates security scanning into CI/CD pipelines.
    """
    
    def __init__(self, environment: str = "development"):
        self.environment = environment
        self.config = SecurityConfig()
        self.scanner = SecurityScanner(environment)
        self.reporter = SecurityReporter()
        self.pipeline_config = self.config.PIPELINE_CONFIG
    
    def run_pipeline_security_scan(self, 
                                 project_path: str, 
                                 pipeline_type: str = "ci",
                                 **kwargs) -> Dict[str, Any]:
        """
        Run complete security scan for CI/CD pipeline.
        
        Args:
            project_path: Path to project source code
            pipeline_type: Type of pipeline (ci, cd, nightly, release)
            **kwargs: Additional pipeline-specific parameters
        """
        scan_config = self._get_pipeline_scan_config(pipeline_type)
        
        # Run security scans
        scan_results = self.scanner.scan_project(
            project_path, 
            scanner_names=scan_config["scanners"]
        )
        
        # Aggregate results
        aggregated_results = self.scanner.aggregate_results(scan_results)
        
        # Add pipeline metadata
        aggregated_results["pipeline_metadata"] = {
            "pipeline_type": pipeline_type,
            "environment": self.environment,
            "scan_timestamp": datetime.now().isoformat(),
            "project_path": project_path,
            "git_commit": os.getenv("GITHUB_SHA", os.getenv("GIT_COMMIT", "unknown")),
            "git_branch": os.getenv("GITHUB_REF_NAME", os.getenv("GIT_BRANCH", "unknown")),
            "build_number": os.getenv("GITHUB_RUN_NUMBER", os.getenv("BUILD_NUMBER", "unknown")),
            "pipeline_url": self._get_pipeline_url()
        }
        
        # Generate reports
        if self.pipeline_config["generate_reports"]:
            report_paths = self.reporter.generate_pipeline_reports(aggregated_results)
            aggregated_results["report_paths"] = report_paths
        
        # Upload results if configured
        if self.pipeline_config["upload_results"]:
            self._upload_results(aggregated_results)
        
        # Send notifications
        if self.pipeline_config["notify_security_team"]:
            self._send_notifications(aggregated_results)
        
        # Check pipeline gates
        pipeline_status = self._check_pipeline_gates(aggregated_results)
        aggregated_results["pipeline_status"] = pipeline_status
        
        return aggregated_results
    
    def _get_pipeline_scan_config(self, pipeline_type: str) -> Dict[str, Any]:
        """Get scan configuration based on pipeline type."""
        configs = {
            "ci": {
                "scanners": ["bandit", "safety", "gitleaks"],
                "fail_fast": True,
                "generate_reports": True
            },
            "cd": {
                "scanners": ["bandit", "safety", "semgrep", "trivy"],
                "fail_fast": True,
                "generate_reports": True
            },
            "nightly": {
                "scanners": ["bandit", "safety", "semgrep", "trivy", "gitleaks"],
                "fail_fast": False,
                "generate_reports": True
            },
            "release": {
                "scanners": ["bandit", "safety", "semgrep", "trivy", "gitleaks"],
                "fail_fast": True,
                "generate_reports": True,
                "comprehensive": True
            }
        }
        
        return configs.get(pipeline_type, configs["ci"])
    
    def _check_pipeline_gates(self, results: Dict[str, Any]) -> Dict[str, Any]:
        """Check if results pass pipeline security gates."""
        severity_counts = results["scan_summary"]["severity_breakdown"]
        
        # Check against thresholds
        threshold = self.config.SECURITY_THRESHOLDS[self.environment]
        
        gate_status = {
            "passed": True,
            "failed_checks": [],
            "warnings": []
        }
        
        # Critical vulnerabilities check
        if severity_counts["critical"] > threshold.critical:
            gate_status["passed"] = False
            gate_status["failed_checks"].append(
                f"Critical vulnerabilities: {severity_counts['critical']} > {threshold.critical}"
            )
        
        # High vulnerabilities check
        if severity_counts["high"] > threshold.high:
            if self.pipeline_config["fail_on_high"]:
                gate_status["passed"] = False
                gate_status["failed_checks"].append(
                    f"High vulnerabilities: {severity_counts['high']} > {threshold.high}"
                )
            else:
                gate_status["warnings"].append(
                    f"High vulnerabilities: {severity_counts['high']} > {threshold.high}"
                )
        
        # Medium vulnerabilities check
        if severity_counts["medium"] > threshold.medium:
            if self.pipeline_config["fail_on_medium"]:
                gate_status["passed"] = False
                gate_status["failed_checks"].append(
                    f"Medium vulnerabilities: {severity_counts['medium']} > {threshold.medium}"
                )
            else:
                gate_status["warnings"].append(
                    f"Medium vulnerabilities: {severity_counts['medium']} > {threshold.medium}"
                )
        
        # Check for failed scans
        if results["scan_summary"]["failed_scans"] > 0:
            gate_status["passed"] = False
            gate_status["failed_checks"].append(
                f"Failed security scans: {results['scan_summary']['failed_scans']}"
            )
        
        return gate_status
    
    def _upload_results(self, results: Dict[str, Any]):
        """Upload scan results to external systems."""
        try:
            # Upload to security dashboard if configured
            dashboard_url = os.getenv("SECURITY_DASHBOARD_URL")
            if dashboard_url:
                self._upload_to_dashboard(dashboard_url, results)
            
            # Upload to artifact storage
            artifact_url = os.getenv("ARTIFACT_STORAGE_URL")
            if artifact_url:
                self._upload_to_artifacts(artifact_url, results)
            
        except Exception as e:
            print(f"Warning: Failed to upload results: {e}")
    
    def _send_notifications(self, results: Dict[str, Any]):
        """Send security scan notifications."""
        try:
            severity_counts = results["scan_summary"]["severity_breakdown"]
            pipeline_status = results.get("pipeline_status", {})
            
            # Only notify if there are significant issues
            if (severity_counts["critical"] > 0 or 
                severity_counts["high"] > 5 or
                not pipeline_status.get("passed", True)):
                
                # Send Slack notification
                if "slack" in self.pipeline_config["notification_channels"]:
                    self._send_slack_notification(results)
                
                # Send email notification
                if "email" in self.pipeline_config["notification_channels"]:
                    self._send_email_notification(results)
                
                # Send webhook notification
                if "webhook" in self.pipeline_config["notification_channels"]:
                    self._send_webhook_notification(results)
                    
        except Exception as e:
            print(f"Warning: Failed to send notifications: {e}")
    
    def _send_slack_notification(self, results: Dict[str, Any]):
        """Send Slack notification about security scan results."""
        webhook_url = self.pipeline_config.get("slack_webhook")
        if not webhook_url:
            return
        
        severity_counts = results["scan_summary"]["severity_breakdown"]
        pipeline_status = results.get("pipeline_status", {})
        
        # Determine color based on severity
        if severity_counts["critical"] > 0:
            color = "danger"
            status_icon = "🚨"
        elif severity_counts["high"] > 0:
            color = "warning"
            status_icon = "⚠️"
        else:
            color = "good"
            status_icon = "✅"
        
        message = {
            "attachments": [
                {
                    "color": color,
                    "title": f"{status_icon} SafeShipper Security Scan Results",
                    "fields": [
                        {
                            "title": "Environment",
                            "value": self.environment,
                            "short": True
                        },
                        {
                            "title": "Pipeline Status",
                            "value": "PASSED" if pipeline_status.get("passed") else "FAILED",
                            "short": True
                        },
                        {
                            "title": "Critical",
                            "value": str(severity_counts["critical"]),
                            "short": True
                        },
                        {
                            "title": "High",
                            "value": str(severity_counts["high"]),
                            "short": True
                        },
                        {
                            "title": "Medium", 
                            "value": str(severity_counts["medium"]),
                            "short": True
                        },
                        {
                            "title": "Low",
                            "value": str(severity_counts["low"]),
                            "short": True
                        }
                    ],
                    "footer": "SafeShipper Security Scanner",
                    "ts": int(datetime.now().timestamp())
                }
            ]
        }
        
        # Add failed checks if any
        if pipeline_status.get("failed_checks"):
            message["attachments"][0]["fields"].append({
                "title": "Failed Checks",
                "value": "\n".join(pipeline_status["failed_checks"]),
                "short": False
            })
        
        requests.post(webhook_url, json=message)
    
    def _send_email_notification(self, results: Dict[str, Any]):
        """Send email notification about security scan results."""
        # This would integrate with your email service
        # For now, just log the notification
        severity_counts = results["scan_summary"]["severity_breakdown"]
        
        if severity_counts["critical"] > 0 or severity_counts["high"] > 0:
            print(f"🚨 Security Alert: {severity_counts['critical']} critical, {severity_counts['high']} high vulnerabilities found")
    
    def _send_webhook_notification(self, results: Dict[str, Any]):
        """Send webhook notification with full results."""
        webhook_url = self.pipeline_config.get("webhook_url")
        if not webhook_url:
            return
        
        payload = {
            "event": "security_scan_completed",
            "timestamp": datetime.now().isoformat(),
            "environment": self.environment,
            "results": results
        }
        
        requests.post(webhook_url, json=payload)
    
    def _get_pipeline_url(self) -> str:
        """Get current pipeline URL."""
        # GitHub Actions
        if os.getenv("GITHUB_ACTIONS"):
            repo = os.getenv("GITHUB_REPOSITORY")
            run_id = os.getenv("GITHUB_RUN_ID")
            if repo and run_id:
                return f"https://github.com/{repo}/actions/runs/{run_id}"
        
        # Jenkins
        if os.getenv("JENKINS_URL"):
            jenkins_url = os.getenv("JENKINS_URL")
            job_name = os.getenv("JOB_NAME")
            build_number = os.getenv("BUILD_NUMBER")
            if job_name and build_number:
                return f"{jenkins_url}/job/{job_name}/{build_number}/"
        
        return "unknown"
    
    def _upload_to_dashboard(self, dashboard_url: str, results: Dict[str, Any]):
        """Upload results to security dashboard."""
        api_token = os.getenv("SECURITY_DASHBOARD_TOKEN")
        if not api_token:
            return
        
        headers = {
            "Authorization": f"Bearer {api_token}",
            "Content-Type": "application/json"
        }
        
        payload = {
            "scan_results": results,
            "project": "safeshipper",
            "environment": self.environment
        }
        
        response = requests.post(f"{dashboard_url}/api/scan-results", json=payload, headers=headers)
        response.raise_for_status()
    
    def _upload_to_artifacts(self, artifact_url: str, results: Dict[str, Any]):
        """Upload results to artifact storage."""
        # Implementation depends on your artifact storage system
        pass


def generate_github_actions_workflow() -> str:
    """Generate GitHub Actions workflow for SafeShipper security scanning."""
    
    workflow = """
name: SafeShipper Security Scan

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main ]
  schedule:
    - cron: '0 2 * * *'  # Daily at 2 AM

jobs:
  security-scan:
    name: Security Scanning
    runs-on: ubuntu-latest
    
    strategy:
      matrix:
        python-version: [3.11]
    
    steps:
    - name: Checkout code
      uses: actions/checkout@v4
      with:
        fetch-depth: 0  # Full history for better analysis
    
    - name: Set up Python
      uses: actions/setup-python@v4
      with:
        python-version: ${{ matrix.python-version }}
    
    - name: Install security scanning tools
      run: |
        python -m pip install --upgrade pip
        pip install bandit safety semgrep
        
        # Install Trivy
        sudo apt-get update
        sudo apt-get install wget apt-transport-https gnupg lsb-release
        wget -qO - https://aquasecurity.github.io/trivy-repo/deb/public.key | sudo apt-key add -
        echo "deb https://aquasecurity.github.io/trivy-repo/deb $(lsb_release -sc) main" | sudo tee -a /etc/apt/sources.list.d/trivy.list
        sudo apt-get update
        sudo apt-get install trivy
        
        # Install GitLeaks
        wget https://github.com/zricethezav/gitleaks/releases/latest/download/gitleaks_linux_x64.tar.gz
        tar -xzf gitleaks_linux_x64.tar.gz
        sudo mv gitleaks /usr/local/bin/
    
    - name: Install project dependencies
      run: |
        cd backend
        pip install -r requirements.txt
        pip install -r security_scanning/requirements.txt
    
    - name: Run security scans
      env:
        SECURITY_ENVIRONMENT: ${{ github.ref == 'refs/heads/main' && 'production' || 'development' }}
        GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        SECURITY_SLACK_WEBHOOK: ${{ secrets.SECURITY_SLACK_WEBHOOK }}
      run: |
        cd backend
        python -m security_scanning.cli --pipeline-type ci --environment $SECURITY_ENVIRONMENT
    
    - name: Upload security reports
      uses: actions/upload-artifact@v3
      if: always()
      with:
        name: security-reports
        path: backend/security_reports/
        retention-days: 30
    
    - name: Comment PR with security results
      if: github.event_name == 'pull_request'
      uses: actions/github-script@v6
      with:
        script: |
          const fs = require('fs');
          const path = 'backend/security_reports/summary.json';
          
          if (fs.existsSync(path)) {
            const results = JSON.parse(fs.readFileSync(path, 'utf8'));
            
            const comment = `## 🔒 Security Scan Results
            
            | Severity | Count |
            |----------|-------|
            | Critical | ${results.scan_summary.severity_breakdown.critical} |
            | High     | ${results.scan_summary.severity_breakdown.high} |
            | Medium   | ${results.scan_summary.severity_breakdown.medium} |
            | Low      | ${results.scan_summary.severity_breakdown.low} |
            
            **Status:** ${results.pipeline_status.passed ? '✅ PASSED' : '❌ FAILED'}
            
            ${results.pipeline_status.failed_checks.length > 0 ? 
              '**Failed Checks:**\\n' + results.pipeline_status.failed_checks.map(check => `- ${check}`).join('\\n') : ''}
            `;
            
            github.rest.issues.createComment({
              issue_number: context.issue.number,
              owner: context.repo.owner,
              repo: context.repo.repo,
              body: comment
            });
          }
    
    - name: Fail on security violations
      if: failure()
      run: |
        echo "Security scan failed. Check the reports for details."
        exit 1

  # Separate job for container scanning
  container-security:
    name: Container Security Scan
    runs-on: ubuntu-latest
    needs: security-scan
    if: github.ref == 'refs/heads/main'
    
    steps:
    - name: Checkout code
      uses: actions/checkout@v4
    
    - name: Build Docker image
      run: |
        docker build -t safeshipper:${{ github.sha }} .
    
    - name: Run Trivy container scan
      run: |
        trivy image --format json --output container-scan.json safeshipper:${{ github.sha }}
    
    - name: Upload container scan results
      uses: actions/upload-artifact@v3
      with:
        name: container-security-reports
        path: container-scan.json
"""
    
    return workflow


def generate_jenkins_pipeline() -> str:
    """Generate Jenkins pipeline for SafeShipper security scanning."""
    
    pipeline = """
pipeline {
    agent any
    
    options {
        timeout(time: 60, unit: 'MINUTES')
        retry(2)
    }
    
    environment {
        SECURITY_ENVIRONMENT = "${env.BRANCH_NAME == 'main' ? 'production' : 'development'}"
        SECURITY_SLACK_WEBHOOK = credentials('security-slack-webhook')
    }
    
    stages {
        stage('Checkout') {
            steps {
                checkout scm
            }
        }
        
        stage('Setup Security Tools') {
            steps {
                script {
                    sh '''
                        # Install Python dependencies
                        cd backend
                        python -m pip install --upgrade pip
                        pip install -r requirements.txt
                        pip install -r security_scanning/requirements.txt
                        
                        # Install security tools
                        pip install bandit safety semgrep
                        
                        # Install Trivy
                        wget https://github.com/aquasecurity/trivy/releases/latest/download/trivy_Linux-64bit.tar.gz
                        tar zxvf trivy_Linux-64bit.tar.gz
                        sudo mv trivy /usr/local/bin/
                        
                        # Install GitLeaks
                        wget https://github.com/zricethezav/gitleaks/releases/latest/download/gitleaks_linux_x64.tar.gz
                        tar -xzf gitleaks_linux_x64.tar.gz
                        sudo mv gitleaks /usr/local/bin/
                    '''
                }
            }
        }
        
        stage('Security Scan') {
            parallel {
                stage('Static Analysis') {
                    steps {
                        script {
                            sh '''
                                cd backend
                                python -m security_scanning.cli \\
                                    --pipeline-type ci \\
                                    --environment $SECURITY_ENVIRONMENT \\
                                    --scanners bandit,semgrep
                            '''
                        }
                    }
                }
                
                stage('Dependency Scan') {
                    steps {
                        script {
                            sh '''
                                cd backend
                                python -m security_scanning.cli \\
                                    --pipeline-type ci \\
                                    --environment $SECURITY_ENVIRONMENT \\
                                    --scanners safety,trivy
                            '''
                        }
                    }
                }
                
                stage('Secrets Detection') {
                    steps {
                        script {
                            sh '''
                                cd backend
                                python -m security_scanning.cli \\
                                    --pipeline-type ci \\
                                    --environment $SECURITY_ENVIRONMENT \\
                                    --scanners gitleaks
                            '''
                        }
                    }
                }
            }
        }
        
        stage('Security Report') {
            steps {
                script {
                    sh '''
                        cd backend
                        python -m security_scanning.cli \\
                            --generate-report \\
                            --upload-results
                    '''
                }
            }
        }
    }
    
    post {
        always {
            archiveArtifacts artifacts: 'backend/security_reports/**/*', fingerprint: true
            publishHTML([
                allowMissing: false,
                alwaysLinkToLastBuild: true,
                keepAll: true,
                reportDir: 'backend/security_reports',
                reportFiles: 'security_report.html',
                reportName: 'Security Scan Report'
            ])
        }
        
        failure {
            script {
                // Send notification on security failures
                slackSend(
                    channel: '#security-alerts',
                    color: 'danger',
                    message: "🚨 SafeShipper security scan failed for branch ${env.BRANCH_NAME}. Check ${env.BUILD_URL} for details."
                )
            }
        }
        
        success {
            script {
                if (env.BRANCH_NAME == 'main') {
                    slackSend(
                        channel: '#security-alerts',
                        color: 'good',
                        message: "✅ SafeShipper security scan passed for production deployment."
                    )
                }
            }
        }
    }
}
"""
    
    return pipeline