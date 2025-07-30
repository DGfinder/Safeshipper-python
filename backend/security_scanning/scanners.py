# security_scanning/scanners.py
"""
Security scanner implementations for SafeShipper platform.
Provides unified interface for multiple security scanning tools.
"""

import os
import json
import subprocess
import tempfile
import logging
from abc import ABC, abstractmethod
from typing import Dict, List, Any, Optional
from pathlib import Path
from datetime import datetime

from .config import SecurityConfig, ScanType, SeverityLevel

logger = logging.getLogger(__name__)


class SecurityScanResult:
    """Represents the result of a security scan."""
    
    def __init__(self, scanner_name: str, scan_type: ScanType):
        self.scanner_name = scanner_name
        self.scan_type = scan_type
        self.start_time = datetime.now()
        self.end_time = None
        self.duration_seconds = 0
        self.status = "running"
        self.vulnerabilities = []
        self.summary = {
            "critical": 0,
            "high": 0,
            "medium": 0,
            "low": 0,
            "info": 0
        }
        self.metadata = {}
        self.raw_output = ""
        self.errors = []
    
    def add_vulnerability(self, vulnerability: Dict[str, Any]):
        """Add a vulnerability to the scan results."""
        self.vulnerabilities.append(vulnerability)
        severity = vulnerability.get("severity", "info").lower()
        if severity in self.summary:
            self.summary[severity] += 1
    
    def complete(self, status: str = "completed"):
        """Mark scan as completed."""
        self.end_time = datetime.now()
        self.duration_seconds = (self.end_time - self.start_time).total_seconds()
        self.status = status
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert result to dictionary."""
        return {
            "scanner_name": self.scanner_name,
            "scan_type": self.scan_type.value,
            "start_time": self.start_time.isoformat(),
            "end_time": self.end_time.isoformat() if self.end_time else None,
            "duration_seconds": self.duration_seconds,
            "status": self.status,
            "summary": self.summary,
            "vulnerabilities": self.vulnerabilities,
            "metadata": self.metadata,
            "errors": self.errors
        }


class BaseSecurityScanner(ABC):
    """Base class for security scanners."""
    
    def __init__(self, config: SecurityConfig):
        self.config = config
        self.logger = logging.getLogger(f"scanner.{self.__class__.__name__}")
    
    @abstractmethod
    def scan(self, target_path: str, **kwargs) -> SecurityScanResult:
        """Execute security scan on target path."""
        pass
    
    def _run_command(self, command: List[str], working_dir: str = None, timeout: int = 300) -> Dict[str, Any]:
        """Execute command and return result."""
        try:
            self.logger.info(f"Executing: {' '.join(command)}")
            
            result = subprocess.run(
                command,
                cwd=working_dir,
                capture_output=True,
                text=True,
                timeout=timeout
            )
            
            return {
                "returncode": result.returncode,
                "stdout": result.stdout,
                "stderr": result.stderr,
                "success": result.returncode == 0
            }
            
        except subprocess.TimeoutExpired:
            self.logger.error(f"Command timed out after {timeout} seconds")
            return {
                "returncode": -1,
                "stdout": "",
                "stderr": f"Command timed out after {timeout} seconds",
                "success": False
            }
        except Exception as e:
            self.logger.error(f"Command execution failed: {str(e)}")
            return {
                "returncode": -1,
                "stdout": "",
                "stderr": str(e),
                "success": False
            }


class BanditScanner(BaseSecurityScanner):
    """Bandit static analysis security scanner for Python."""
    
    def scan(self, target_path: str, **kwargs) -> SecurityScanResult:
        """Run Bandit security scan."""
        result = SecurityScanResult("bandit", ScanType.STATIC_CODE_ANALYSIS)
        
        try:
            # Prepare command
            command = [
                "bandit",
                "-r", target_path,
                "-f", "json",
                "-ll"  # Low confidence, low severity minimum
            ]
            
            # Add custom configuration if available
            bandit_config = self.config.get_scanner_config("bandit")
            if bandit_config and bandit_config.config_file:
                command.extend(["-c", bandit_config.config_file])
            
            # Add exclusions for SafeShipper
            exclusions = [
                "*/test*",
                "*/migrations/*",
                "*/venv/*",
                "*/env/*"
            ]
            for exclusion in exclusions:
                command.extend(["-x", exclusion])
            
            # Execute scan
            cmd_result = self._run_command(command, timeout=900)  # 15 minutes
            result.raw_output = cmd_result["stdout"]
            
            if cmd_result["success"] or cmd_result["returncode"] == 1:  # Bandit returns 1 when issues found
                try:
                    bandit_output = json.loads(cmd_result["stdout"])
                    
                    # Process results
                    for issue in bandit_output.get("results", []):
                        vulnerability = {
                            "id": issue.get("test_id"),
                            "title": issue.get("test_name"),
                            "description": issue.get("issue_text"),
                            "severity": self._map_bandit_severity(issue.get("issue_severity")),
                            "confidence": issue.get("issue_confidence"),
                            "file": issue.get("filename"),
                            "line": issue.get("line_number"),
                            "code": issue.get("code"),
                            "cwe": issue.get("issue_cwe", {}).get("id"),
                            "scanner": "bandit",
                            "category": "static_analysis"
                        }
                        result.add_vulnerability(vulnerability)
                    
                    # Add metadata
                    result.metadata = {
                        "total_lines_scanned": bandit_output.get("metrics", {}).get("_totals", {}).get("loc", 0),
                        "files_scanned": len(bandit_output.get("metrics", {}).get("_totals", {}).get("nosec", [])),
                        "bandit_version": bandit_output.get("generated_at")
                    }
                    
                except json.JSONDecodeError:
                    result.errors.append("Failed to parse Bandit JSON output")
                    
                result.complete("completed")
            else:
                result.errors.append(f"Bandit scan failed: {cmd_result['stderr']}")
                result.complete("failed")
                
        except Exception as e:
            result.errors.append(f"Bandit scanner error: {str(e)}")
            result.complete("failed")
        
        return result
    
    def _map_bandit_severity(self, bandit_severity: str) -> str:
        """Map Bandit severity to standard severity levels."""
        mapping = {
            "HIGH": "high",
            "MEDIUM": "medium", 
            "LOW": "low"
        }
        return mapping.get(bandit_severity, "info")


class SafetyScanner(BaseSecurityScanner):
    """Safety dependency vulnerability scanner."""
    
    def scan(self, target_path: str, **kwargs) -> SecurityScanResult:
        """Run Safety dependency scan."""
        result = SecurityScanResult("safety", ScanType.DEPENDENCY_VULNERABILITY)
        
        try:
            # Find requirements files
            requirements_files = []
            for pattern in ["requirements*.txt", "Pipfile", "poetry.lock"]:
                requirements_files.extend(Path(target_path).glob(pattern))
            
            if not requirements_files:
                result.errors.append("No requirements files found")
                result.complete("skipped")
                return result
            
            # Scan each requirements file
            all_vulnerabilities = []
            
            for req_file in requirements_files:
                command = [
                    "safety", "check",
                    "--file", str(req_file),
                    "--json",
                    "--ignore", "70612"  # Ignore specific false positive if needed
                ]
                
                cmd_result = self._run_command(command, timeout=300)
                
                if cmd_result["success"] or "found vulnerabilities" in cmd_result["stderr"]:
                    try:
                        if cmd_result["stdout"].strip():
                            safety_output = json.loads(cmd_result["stdout"])
                            
                            for vuln in safety_output:
                                vulnerability = {
                                    "id": vuln.get("id"),
                                    "title": f"Vulnerability in {vuln.get('package_name')}",
                                    "description": vuln.get("advisory"),
                                    "severity": self._map_safety_severity(vuln.get("vulnerability_id")),
                                    "package": vuln.get("package_name"),
                                    "version": vuln.get("installed_version"),
                                    "patched_versions": vuln.get("specs"),
                                    "cve": vuln.get("vulnerability_id"),
                                    "scanner": "safety",
                                    "category": "dependency",
                                    "requirements_file": str(req_file)
                                }
                                all_vulnerabilities.append(vulnerability)
                                result.add_vulnerability(vulnerability)
                                
                    except json.JSONDecodeError:
                        # Safety might not return JSON in all cases
                        if "vulnerabilities found" in cmd_result["stderr"]:
                            # Parse text output
                            lines = cmd_result["stderr"].split('\n')
                            for line in lines:
                                if "vulnerability" in line.lower():
                                    vulnerability = {
                                        "title": "Dependency vulnerability detected",
                                        "description": line.strip(),
                                        "severity": "medium",
                                        "scanner": "safety",
                                        "category": "dependency"
                                    }
                                    result.add_vulnerability(vulnerability)
            
            result.metadata = {
                "requirements_files_scanned": len(requirements_files),
                "total_vulnerabilities": len(all_vulnerabilities)
            }
            
            result.complete("completed")
            
        except Exception as e:
            result.errors.append(f"Safety scanner error: {str(e)}")
            result.complete("failed")
        
        return result
    
    def _map_safety_severity(self, vulnerability_id: str) -> str:
        """Map Safety vulnerability to severity level."""
        # In practice, you'd use CVSS scores or vulnerability databases
        # For now, use heuristics based on vulnerability ID patterns
        if not vulnerability_id:
            return "medium"
        
        critical_patterns = ["CVE-202", "CRITICAL"]
        high_patterns = ["HIGH", "SEVERE"]
        
        vuln_upper = vulnerability_id.upper()
        
        if any(pattern in vuln_upper for pattern in critical_patterns):
            return "critical"
        elif any(pattern in vuln_upper for pattern in high_patterns):
            return "high"
        else:
            return "medium"


class SemgrepScanner(BaseSecurityScanner):
    """Semgrep static analysis scanner."""
    
    def scan(self, target_path: str, **kwargs) -> SecurityScanResult:
        """Run Semgrep security scan."""
        result = SecurityScanResult("semgrep", ScanType.STATIC_CODE_ANALYSIS)
        
        try:
            command = [
                "semgrep",
                "--config=auto",
                "--json",
                "--verbose",
                target_path
            ]
            
            # Add SafeShipper specific rules
            semgrep_config = self.config.get_scanner_config("semgrep")
            if semgrep_config and semgrep_config.custom_rules:
                for rule in semgrep_config.custom_rules:
                    command.extend(["--config", rule])
            
            cmd_result = self._run_command(command, timeout=1200)  # 20 minutes
            result.raw_output = cmd_result["stdout"]
            
            if cmd_result["success"] or cmd_result["returncode"] == 1:
                try:
                    semgrep_output = json.loads(cmd_result["stdout"])
                    
                    for finding in semgrep_output.get("results", []):
                        vulnerability = {
                            "id": finding.get("check_id"),
                            "title": finding.get("extra", {}).get("message", "Semgrep finding"),
                            "description": finding.get("extra", {}).get("message"),
                            "severity": self._map_semgrep_severity(finding.get("extra", {}).get("severity")),
                            "file": finding.get("path"),
                            "line": finding.get("start", {}).get("line"),
                            "column": finding.get("start", {}).get("col"),
                            "end_line": finding.get("end", {}).get("line"),
                            "code": finding.get("extra", {}).get("lines"),
                            "rule_id": finding.get("check_id"),
                            "scanner": "semgrep",
                            "category": "static_analysis",
                            "metadata": finding.get("extra", {}).get("metadata", {})
                        }
                        result.add_vulnerability(vulnerability)
                    
                    result.metadata = {
                        "rules_run": len(semgrep_output.get("results", [])),
                        "files_scanned": len(set(r.get("path") for r in semgrep_output.get("results", []))),
                        "semgrep_version": semgrep_output.get("version")
                    }
                    
                except json.JSONDecodeError:
                    result.errors.append("Failed to parse Semgrep JSON output")
                
                result.complete("completed")
            else:
                result.errors.append(f"Semgrep scan failed: {cmd_result['stderr']}")
                result.complete("failed")
                
        except Exception as e:
            result.errors.append(f"Semgrep scanner error: {str(e)}")
            result.complete("failed")
        
        return result
    
    def _map_semgrep_severity(self, semgrep_severity: str) -> str:
        """Map Semgrep severity to standard levels."""
        mapping = {
            "ERROR": "high",
            "WARNING": "medium",
            "INFO": "low"
        }
        return mapping.get(semgrep_severity, "info")


class TrivyScanner(BaseSecurityScanner):
    """Trivy container and dependency vulnerability scanner."""
    
    def scan(self, target_path: str, **kwargs) -> SecurityScanResult:
        """Run Trivy security scan."""
        result = SecurityScanResult("trivy", ScanType.CONTAINER_SECURITY)
        
        try:
            # Scan filesystem for vulnerabilities
            command = [
                "trivy", "fs",
                "--format", "json",
                "--exit-code", "0",  # Don't fail on vulnerabilities
                target_path
            ]
            
            cmd_result = self._run_command(command, timeout=600)  # 10 minutes
            result.raw_output = cmd_result["stdout"]
            
            if cmd_result["success"]:
                try:
                    trivy_output = json.loads(cmd_result["stdout"])
                    
                    for trivy_result in trivy_output.get("Results", []):
                        target = trivy_result.get("Target", "")
                        
                        for vuln in trivy_result.get("Vulnerabilities", []):
                            vulnerability = {
                                "id": vuln.get("VulnerabilityID"),
                                "title": vuln.get("Title"),
                                "description": vuln.get("Description"),
                                "severity": vuln.get("Severity", "").lower(),
                                "package": vuln.get("PkgName"),
                                "version": vuln.get("InstalledVersion"),
                                "fixed_version": vuln.get("FixedVersion"),
                                "cve": vuln.get("VulnerabilityID"),
                                "cvss_score": vuln.get("CVSS", {}).get("nvd", {}).get("V3Score"),
                                "references": vuln.get("References", []),
                                "scanner": "trivy",
                                "category": "dependency",
                                "target": target
                            }
                            result.add_vulnerability(vulnerability)
                    
                    result.metadata = {
                        "targets_scanned": len(trivy_output.get("Results", [])),
                        "trivy_version": trivy_output.get("SchemaVersion")
                    }
                    
                except json.JSONDecodeError:
                    result.errors.append("Failed to parse Trivy JSON output")
                
                result.complete("completed")
            else:
                result.errors.append(f"Trivy scan failed: {cmd_result['stderr']}")
                result.complete("failed")
                
        except Exception as e:
            result.errors.append(f"Trivy scanner error: {str(e)}")
            result.complete("failed")
        
        return result


class GitLeaksScanner(BaseSecurityScanner):
    """GitLeaks secrets detection scanner."""
    
    def scan(self, target_path: str, **kwargs) -> SecurityScanResult:
        """Run GitLeaks secrets scan."""
        result = SecurityScanResult("gitleaks", ScanType.SECRETS_DETECTION)
        
        try:
            # Check if it's a git repository
            git_dir = Path(target_path) / ".git"
            if git_dir.exists():
                command = ["gitleaks", "detect", "--report-format", "json", "--source", target_path]
            else:
                # Scan files directly
                command = ["gitleaks", "detect", "--report-format", "json", "--no-git", "--source", target_path]
            
            # Create temporary file for output
            with tempfile.NamedTemporaryFile(mode='w', suffix='.json', delete=False) as temp_file:
                temp_path = temp_file.name
                command.extend(["--report-path", temp_path])
            
            try:
                cmd_result = self._run_command(command, timeout=300)
                
                # GitLeaks returns 1 when secrets are found
                if cmd_result["returncode"] in [0, 1]:
                    try:
                        with open(temp_path, 'r') as f:
                            content = f.read().strip()
                            if content:
                                gitleaks_output = json.loads(content)
                                
                                if isinstance(gitleaks_output, list):
                                    for secret in gitleaks_output:
                                        vulnerability = {
                                            "id": secret.get("RuleID"),
                                            "title": f"Secret detected: {secret.get('Description')}",
                                            "description": secret.get("Description"),
                                            "severity": "high",  # Secrets are always high severity
                                            "file": secret.get("File"),
                                            "line": secret.get("StartLine"),
                                            "end_line": secret.get("EndLine"),
                                            "commit": secret.get("Commit"),
                                            "author": secret.get("Author"),
                                            "email": secret.get("Email"),
                                            "date": secret.get("Date"),
                                            "rule_id": secret.get("RuleID"),
                                            "scanner": "gitleaks",
                                            "category": "secrets"
                                        }
                                        result.add_vulnerability(vulnerability)
                        
                        result.metadata = {
                            "repository_scanned": str(target_path),
                            "scan_type": "git" if git_dir.exists() else "filesystem"
                        }
                        
                    except (json.JSONDecodeError, FileNotFoundError):
                        # No secrets found or empty result
                        pass
                    
                    result.complete("completed")
                else:
                    result.errors.append(f"GitLeaks scan failed: {cmd_result['stderr']}")
                    result.complete("failed")
                    
            finally:
                # Clean up temporary file
                try:
                    os.unlink(temp_path)
                except:
                    pass
                    
        except Exception as e:
            result.errors.append(f"GitLeaks scanner error: {str(e)}")
            result.complete("failed")
        
        return result


class SecurityScanner:
    """
    Main security scanner orchestrator for SafeShipper.
    Coordinates multiple security scanners and aggregates results.
    """
    
    def __init__(self, environment: str = "development"):
        self.environment = environment
        self.config = SecurityConfig()
        self.env_config = self.config.get_environment_config(environment)
        self.scanners = self._initialize_scanners()
        self.logger = logging.getLogger("security_scanner")
    
    def _initialize_scanners(self) -> Dict[str, BaseSecurityScanner]:
        """Initialize all enabled scanners."""
        scanners = {}
        
        scanner_classes = {
            "bandit": BanditScanner,
            "safety": SafetyScanner,
            "semgrep": SemgrepScanner,
            "trivy": TrivyScanner,
            "gitleaks": GitLeaksScanner
        }
        
        for scanner_name, scanner_config in self.env_config["scanners"].items():
            if scanner_config.enabled and scanner_name in scanner_classes:
                try:
                    scanners[scanner_name] = scanner_classes[scanner_name](self.config)
                    self.logger.info(f"Initialized {scanner_name} scanner")
                except Exception as e:
                    self.logger.error(f"Failed to initialize {scanner_name} scanner: {e}")
        
        return scanners
    
    def scan_project(self, project_path: str, scanner_names: List[str] = None) -> Dict[str, SecurityScanResult]:
        """Run security scans on the project."""
        results = {}
        
        # Determine which scanners to run
        scanners_to_run = scanner_names or list(self.scanners.keys())
        
        self.logger.info(f"Starting security scan of {project_path}")
        self.logger.info(f"Running scanners: {', '.join(scanners_to_run)}")
        
        for scanner_name in scanners_to_run:
            if scanner_name in self.scanners:
                self.logger.info(f"Running {scanner_name} scanner...")
                try:
                    result = self.scanners[scanner_name].scan(project_path)
                    results[scanner_name] = result
                    
                    self.logger.info(
                        f"{scanner_name} completed: {result.summary['critical']} critical, "
                        f"{result.summary['high']} high, {result.summary['medium']} medium vulnerabilities"
                    )
                    
                except Exception as e:
                    self.logger.error(f"{scanner_name} scanner failed: {e}")
                    # Create failed result
                    failed_result = SecurityScanResult(scanner_name, ScanType.STATIC_CODE_ANALYSIS)
                    failed_result.errors.append(str(e))
                    failed_result.complete("failed")
                    results[scanner_name] = failed_result
            else:
                self.logger.warning(f"Scanner {scanner_name} not available")
        
        return results
    
    def aggregate_results(self, scan_results: Dict[str, SecurityScanResult]) -> Dict[str, Any]:
        """Aggregate results from multiple scanners."""
        aggregated = {
            "scan_summary": {
                "total_scanners": len(scan_results),
                "successful_scans": 0,
                "failed_scans": 0,
                "total_vulnerabilities": 0,
                "severity_breakdown": {
                    "critical": 0,
                    "high": 0,
                    "medium": 0,
                    "low": 0,
                    "info": 0
                }
            },
            "scanner_results": {},
            "compliance_status": "unknown",
            "recommendations": []
        }
        
        all_vulnerabilities = []
        
        for scanner_name, result in scan_results.items():
            aggregated["scanner_results"][scanner_name] = result.to_dict()
            
            if result.status == "completed":
                aggregated["scan_summary"]["successful_scans"] += 1
                
                # Aggregate severity counts
                for severity, count in result.summary.items():
                    aggregated["scan_summary"]["severity_breakdown"][severity] += count
                
                # Collect all vulnerabilities
                all_vulnerabilities.extend(result.vulnerabilities)
            else:
                aggregated["scan_summary"]["failed_scans"] += 1
        
        aggregated["scan_summary"]["total_vulnerabilities"] = len(all_vulnerabilities)
        
        # Check compliance against thresholds
        severity_counts = aggregated["scan_summary"]["severity_breakdown"]
        is_compliant = self.config.validate_threshold_compliance(severity_counts, self.environment)
        aggregated["compliance_status"] = "compliant" if is_compliant else "non_compliant"
        
        # Generate recommendations
        aggregated["recommendations"] = self._generate_recommendations(aggregated)
        
        return aggregated
    
    def _generate_recommendations(self, aggregated_results: Dict[str, Any]) -> List[str]:
        """Generate security recommendations based on scan results."""
        recommendations = []
        severity_counts = aggregated_results["scan_summary"]["severity_breakdown"]
        
        if severity_counts["critical"] > 0:
            recommendations.append("URGENT: Address critical vulnerabilities immediately before deployment")
        
        if severity_counts["high"] > 5:
            recommendations.append("High priority: Review and fix high-severity vulnerabilities")
        
        if severity_counts["medium"] > 20:
            recommendations.append("Consider addressing medium-severity vulnerabilities to improve security posture")
        
        if aggregated_results["scan_summary"]["failed_scans"] > 0:
            recommendations.append("Review failed security scans and ensure all scanners are properly configured")
        
        # SafeShipper specific recommendations
        if any("django" in str(vuln).lower() for vuln in aggregated_results.get("vulnerabilities", [])):
            recommendations.append("Review Django-specific security vulnerabilities for dangerous goods compliance")
        
        if any("sql" in str(vuln).lower() for vuln in aggregated_results.get("vulnerabilities", [])):
            recommendations.append("SQL injection vulnerabilities detected - critical for dangerous goods data protection")
        
        return recommendations