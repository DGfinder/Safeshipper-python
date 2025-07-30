# security_scanning/reporting.py
"""
Security scanning reporting and visualization for SafeShipper.
Generates comprehensive security reports with dangerous goods context.
"""

import os
import json
import csv
from typing import Dict, List, Any, Optional
from pathlib import Path
from datetime import datetime
from jinja2 import Template, Environment, FileSystemLoader


class SecurityReporter:
    """
    Generate comprehensive security reports for SafeShipper platform.
    """
    
    def __init__(self, output_dir: str = "security_reports"):
        self.output_dir = Path(output_dir)
        self.output_dir.mkdir(exist_ok=True)
        
        # Setup Jinja2 environment for templates
        template_dir = Path(__file__).parent / "templates"
        self.jinja_env = Environment(
            loader=FileSystemLoader(str(template_dir)) if template_dir.exists() else None,
            autoescape=True
        )
    
    def generate_pipeline_reports(self, scan_results: Dict[str, Any]) -> Dict[str, str]:
        """Generate all pipeline reports and return file paths."""
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        
        report_paths = {}
        
        try:
            # Generate JSON summary
            json_path = self.output_dir / f"security_summary_{timestamp}.json"
            self._generate_json_report(scan_results, json_path)
            report_paths["json"] = str(json_path)
            
            # Generate HTML report
            html_path = self.output_dir / f"security_report_{timestamp}.html"
            self._generate_html_report(scan_results, html_path)
            report_paths["html"] = str(html_path)
            
            # Generate CSV export
            csv_path = self.output_dir / f"vulnerabilities_{timestamp}.csv"
            self._generate_csv_report(scan_results, csv_path)
            report_paths["csv"] = str(csv_path)
            
            # Generate SARIF format for GitHub
            sarif_path = self.output_dir / f"security_scan_{timestamp}.sarif"
            self._generate_sarif_report(scan_results, sarif_path)
            report_paths["sarif"] = str(sarif_path)
            
            # Generate executive summary
            exec_path = self.output_dir / f"executive_summary_{timestamp}.json"
            self._generate_executive_summary(scan_results, exec_path)
            report_paths["executive"] = str(exec_path)
            
            # Copy latest reports without timestamp for CI/CD
            self._copy_latest_reports(report_paths)
            
        except Exception as e:
            print(f"Error generating reports: {e}")
        
        return report_paths
    
    def _generate_json_report(self, scan_results: Dict[str, Any], output_path: Path):
        """Generate comprehensive JSON report."""
        with open(output_path, 'w') as f:
            json.dump(scan_results, f, indent=2, default=str)
    
    def _generate_html_report(self, scan_results: Dict[str, Any], output_path: Path):
        """Generate interactive HTML report."""
        html_template = self._get_html_template()
        
        # Prepare data for template
        template_data = {
            "scan_results": scan_results,
            "generated_at": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
            "total_vulnerabilities": scan_results["scan_summary"]["total_vulnerabilities"],
            "severity_breakdown": scan_results["scan_summary"]["severity_breakdown"],
            "compliance_status": scan_results.get("compliance_status", "unknown"),
            "pipeline_metadata": scan_results.get("pipeline_metadata", {}),
            "scanner_results": scan_results.get("scanner_results", {}),
            "recommendations": scan_results.get("recommendations", [])
        }
        
        # Render template
        html_content = html_template.render(**template_data)
        
        with open(output_path, 'w') as f:
            f.write(html_content)
    
    def _generate_csv_report(self, scan_results: Dict[str, Any], output_path: Path):
        """Generate CSV export of vulnerabilities."""
        vulnerabilities = []
        
        # Collect all vulnerabilities from all scanners
        for scanner_name, scanner_result in scan_results.get("scanner_results", {}).items():
            for vuln in scanner_result.get("vulnerabilities", []):
                vulnerabilities.append({
                    "scanner": scanner_name,
                    "id": vuln.get("id", ""),
                    "title": vuln.get("title", ""),
                    "severity": vuln.get("severity", ""),
                    "description": vuln.get("description", ""),
                    "file": vuln.get("file", ""),
                    "line": vuln.get("line", ""),
                    "category": vuln.get("category", ""),
                    "cve": vuln.get("cve", ""),
                    "package": vuln.get("package", ""),
                    "version": vuln.get("version", ""),
                    "fixed_version": vuln.get("fixed_version", "")
                })
        
        if vulnerabilities:
            fieldnames = vulnerabilities[0].keys()
            
            with open(output_path, 'w', newline='') as f:
                writer = csv.DictWriter(f, fieldnames=fieldnames)
                writer.writeheader()
                writer.writerows(vulnerabilities)
    
    def _generate_sarif_report(self, scan_results: Dict[str, Any], output_path: Path):
        """Generate SARIF format report for GitHub Security tab."""
        sarif_report = {
            "$schema": "https://json.schemastore.org/sarif-2.1.0.json",
            "version": "2.1.0",
            "runs": []
        }
        
        for scanner_name, scanner_result in scan_results.get("scanner_results", {}).items():
            if scanner_result.get("status") != "completed":
                continue
            
            run = {
                "tool": {
                    "driver": {
                        "name": scanner_name,
                        "version": "1.0.0",
                        "informationUri": "https://safeshipper.com/security",
                        "rules": []
                    }
                },
                "results": []
            }
            
            # Convert vulnerabilities to SARIF format
            for vuln in scanner_result.get("vulnerabilities", []):
                # Create rule if not exists
                rule_id = vuln.get("id", f"{scanner_name}_rule")
                
                if not any(rule["id"] == rule_id for rule in run["tool"]["driver"]["rules"]):
                    run["tool"]["driver"]["rules"].append({
                        "id": rule_id,
                        "name": vuln.get("title", "Security Issue"),
                        "shortDescription": {
                            "text": vuln.get("title", "Security Issue")
                        },
                        "fullDescription": {
                            "text": vuln.get("description", "")
                        },
                        "defaultConfiguration": {
                            "level": self._severity_to_sarif_level(vuln.get("severity", "info"))
                        }
                    })
                
                # Create result
                result = {
                    "ruleId": rule_id,
                    "message": {
                        "text": vuln.get("description", vuln.get("title", "Security Issue"))
                    },
                    "level": self._severity_to_sarif_level(vuln.get("severity", "info"))
                }
                
                # Add location if available
                if vuln.get("file"):
                    result["locations"] = [{
                        "physicalLocation": {
                            "artifactLocation": {
                                "uri": vuln["file"]
                            }
                        }
                    }]
                    
                    if vuln.get("line"):
                        result["locations"][0]["physicalLocation"]["region"] = {
                            "startLine": int(vuln["line"])
                        }
                
                run["results"].append(result)
            
            sarif_report["runs"].append(run)
        
        with open(output_path, 'w') as f:
            json.dump(sarif_report, f, indent=2)
    
    def _generate_executive_summary(self, scan_results: Dict[str, Any], output_path: Path):
        """Generate executive summary for management."""
        summary = {
            "executive_summary": {
                "scan_date": datetime.now().isoformat(),
                "overall_security_posture": self._assess_security_posture(scan_results),
                "critical_issues": scan_results["scan_summary"]["severity_breakdown"]["critical"],
                "high_issues": scan_results["scan_summary"]["severity_breakdown"]["high"],
                "compliance_status": scan_results.get("compliance_status", "unknown"),
                "pipeline_status": scan_results.get("pipeline_status", {}).get("passed", False),
                "total_scanners_run": scan_results["scan_summary"]["total_scanners"],
                "successful_scans": scan_results["scan_summary"]["successful_scans"],
                "failed_scans": scan_results["scan_summary"]["failed_scans"]
            },
            "key_findings": self._extract_key_findings(scan_results),
            "dangerous_goods_specific_issues": self._extract_dg_specific_issues(scan_results),
            "recommendations": scan_results.get("recommendations", []),
            "risk_assessment": self._perform_risk_assessment(scan_results),
            "compliance_implications": self._assess_compliance_implications(scan_results)
        }
        
        with open(output_path, 'w') as f:
            json.dump(summary, f, indent=2, default=str)
    
    def _copy_latest_reports(self, report_paths: Dict[str, str]):
        """Copy reports to 'latest' versions for CI/CD consumption."""
        latest_mappings = {
            "json": "summary.json",
            "html": "security_report.html", 
            "csv": "vulnerabilities.csv",
            "sarif": "security_scan.sarif",
            "executive": "executive_summary.json"
        }
        
        for report_type, source_path in report_paths.items():
            if report_type in latest_mappings:
                latest_path = self.output_dir / latest_mappings[report_type]
                try:
                    import shutil
                    shutil.copy2(source_path, latest_path)
                except Exception as e:
                    print(f"Warning: Could not copy {source_path} to {latest_path}: {e}")
    
    def _get_html_template(self) -> Template:
        """Get or create HTML template for reports."""
        try:
            return self.jinja_env.get_template("security_report.html")
        except:
            # Fallback to inline template
            return Template(self._get_default_html_template())
    
    def _get_default_html_template(self) -> str:
        """Default HTML template for security reports."""
        return """
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>SafeShipper Security Scan Report</title>
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; background-color: #f5f5f5; }
        .container { max-width: 1200px; margin: 0 auto; background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .header { text-align: center; border-bottom: 2px solid #e0e0e0; padding-bottom: 20px; margin-bottom: 20px; }
        .status-badge { padding: 5px 15px; border-radius: 20px; color: white; font-weight: bold; display: inline-block; margin: 5px; }
        .status-passed { background-color: #28a745; }
        .status-failed { background-color: #dc3545; }
        .status-warning { background-color: #ffc107; color: black; }
        .severity-critical { color: #dc3545; font-weight: bold; }
        .severity-high { color: #fd7e14; font-weight: bold; }
        .severity-medium { color: #ffc107; }
        .severity-low { color: #28a745; }
        .charts-container { display: flex; justify-content: space-around; margin: 20px 0; }
        .chart-container { width: 45%; }
        .vulnerability-table { width: 100%; border-collapse: collapse; margin-top: 20px; }
        .vulnerability-table th, .vulnerability-table td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        .vulnerability-table th { background-color: #f2f2f2; }
        .scanner-section { margin: 20px 0; padding: 15px; border: 1px solid #ddd; border-radius: 5px; }
        .recommendations { background-color: #e3f2fd; padding: 15px; border-radius: 5px; margin: 20px 0; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🔒 SafeShipper Security Scan Report</h1>
            <p>Generated on: {{ generated_at }}</p>
            <p>Environment: {{ pipeline_metadata.environment|default('Unknown') }}</p>
            <div>
                {% if compliance_status == 'compliant' %}
                    <span class="status-badge status-passed">✅ COMPLIANT</span>
                {% else %}
                    <span class="status-badge status-failed">❌ NON-COMPLIANT</span>
                {% endif %}
                
                {% if scan_results.pipeline_status.passed %}
                    <span class="status-badge status-passed">✅ PIPELINE PASSED</span>
                {% else %}
                    <span class="status-badge status-failed">❌ PIPELINE FAILED</span>
                {% endif %}
            </div>
        </div>
        
        <div class="summary">
            <h2>📊 Security Summary</h2>
            <div class="charts-container">
                <div class="chart-container">
                    <canvas id="severityChart"></canvas>
                </div>
                <div class="chart-container">
                    <canvas id="scannerChart"></canvas>
                </div>
            </div>
            
            <table class="vulnerability-table">
                <tr>
                    <th>Severity</th>
                    <th>Count</th>
                    <th>Status</th>
                </tr>
                <tr>
                    <td class="severity-critical">Critical</td>
                    <td>{{ severity_breakdown.critical }}</td>
                    <td>{% if severity_breakdown.critical == 0 %}✅{% else %}❌{% endif %}</td>
                </tr>
                <tr>
                    <td class="severity-high">High</td>
                    <td>{{ severity_breakdown.high }}</td>
                    <td>{% if severity_breakdown.high <= 2 %}✅{% else %}⚠️{% endif %}</td>
                </tr>
                <tr>
                    <td class="severity-medium">Medium</td>
                    <td>{{ severity_breakdown.medium }}</td>
                    <td>{% if severity_breakdown.medium <= 10 %}✅{% else %}⚠️{% endif %}</td>
                </tr>
                <tr>
                    <td class="severity-low">Low</td>
                    <td>{{ severity_breakdown.low }}</td>
                    <td>✅</td>
                </tr>
            </table>
        </div>
        
        {% if scan_results.pipeline_status.failed_checks %}
        <div class="scanner-section">
            <h3>❌ Pipeline Gate Failures</h3>
            <ul>
                {% for check in scan_results.pipeline_status.failed_checks %}
                <li>{{ check }}</li>
                {% endfor %}
            </ul>
        </div>
        {% endif %}
        
        {% for scanner_name, scanner_result in scanner_results.items() %}
        <div class="scanner-section">
            <h3>🔍 {{ scanner_name|title }} Scanner Results</h3>
            <p><strong>Status:</strong> {{ scanner_result.status }}</p>
            <p><strong>Duration:</strong> {{ scanner_result.duration_seconds|round(2) }} seconds</p>
            
            {% if scanner_result.vulnerabilities %}
            <table class="vulnerability-table">
                <tr>
                    <th>Severity</th>
                    <th>Title</th>
                    <th>File</th>
                    <th>Line</th>
                    <th>Description</th>
                </tr>
                {% for vuln in scanner_result.vulnerabilities[:20] %}
                <tr>
                    <td class="severity-{{ vuln.severity }}">{{ vuln.severity|title }}</td>
                    <td>{{ vuln.title }}</td>
                    <td>{{ vuln.file|default('N/A') }}</td>
                    <td>{{ vuln.line|default('N/A') }}</td>
                    <td>{{ vuln.description[:100] }}{% if vuln.description|length > 100 %}...{% endif %}</td>
                </tr>
                {% endfor %}
            </table>
            {% if scanner_result.vulnerabilities|length > 20 %}
            <p><em>Showing first 20 of {{ scanner_result.vulnerabilities|length }} vulnerabilities. See full report for complete list.</em></p>
            {% endif %}
            {% else %}
            <p>✅ No vulnerabilities found by this scanner.</p>
            {% endif %}
        </div>
        {% endfor %}
        
        {% if recommendations %}
        <div class="recommendations">
            <h3>💡 Recommendations</h3>
            <ul>
                {% for rec in recommendations %}
                <li>{{ rec }}</li>
                {% endfor %}
            </ul>
        </div>
        {% endif %}
        
        <div class="scanner-section">
            <h3>📋 Pipeline Metadata</h3>
            <ul>
                <li><strong>Git Commit:</strong> {{ pipeline_metadata.git_commit|default('Unknown') }}</li>
                <li><strong>Git Branch:</strong> {{ pipeline_metadata.git_branch|default('Unknown') }}</li>
                <li><strong>Build Number:</strong> {{ pipeline_metadata.build_number|default('Unknown') }}</li>
                <li><strong>Pipeline URL:</strong> <a href="{{ pipeline_metadata.pipeline_url|default('#') }}">{{ pipeline_metadata.pipeline_url|default('Not Available') }}</a></li>
            </ul>
        </div>
    </div>
    
    <script>
        // Severity breakdown chart
        const severityCtx = document.getElementById('severityChart').getContext('2d');
        new Chart(severityCtx, {
            type: 'doughnut',
            data: {
                labels: ['Critical', 'High', 'Medium', 'Low'],
                datasets: [{
                    data: [
                        {{ severity_breakdown.critical }},
                        {{ severity_breakdown.high }},
                        {{ severity_breakdown.medium }},
                        {{ severity_breakdown.low }}
                    ],
                    backgroundColor: ['#dc3545', '#fd7e14', '#ffc107', '#28a745']
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    title: {
                        display: true,
                        text: 'Vulnerabilities by Severity'
                    },
                    legend: {
                        position: 'bottom'
                    }
                }
            }
        });
        
        // Scanner results chart
        const scannerCtx = document.getElementById('scannerChart').getContext('2d');
        const scannerData = {
            {% for scanner_name, scanner_result in scanner_results.items() %}
            '{{ scanner_name }}': {{ scanner_result.vulnerabilities|length }},
            {% endfor %}
        };
        
        new Chart(scannerCtx, {
            type: 'bar',
            data: {
                labels: Object.keys(scannerData),
                datasets: [{
                    label: 'Vulnerabilities Found',
                    data: Object.values(scannerData),
                    backgroundColor: '#007bff'
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    title: {
                        display: true,
                        text: 'Vulnerabilities by Scanner'
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true
                    }
                }
            }
        });
    </script>
</body>
</html>
        """
    
    def _severity_to_sarif_level(self, severity: str) -> str:
        """Convert severity to SARIF level."""
        mapping = {
            "critical": "error",
            "high": "error", 
            "medium": "warning",
            "low": "note",
            "info": "note"
        }
        return mapping.get(severity.lower(), "note")
    
    def _assess_security_posture(self, scan_results: Dict[str, Any]) -> str:
        """Assess overall security posture."""
        severity_counts = scan_results["scan_summary"]["severity_breakdown"]
        
        if severity_counts["critical"] > 0:
            return "CRITICAL - Immediate action required"
        elif severity_counts["high"] > 5:
            return "HIGH RISK - Significant vulnerabilities present"
        elif severity_counts["high"] > 0 or severity_counts["medium"] > 20:
            return "MODERATE RISK - Some vulnerabilities to address"
        elif severity_counts["medium"] > 0 or severity_counts["low"] > 10:
            return "LOW RISK - Minor issues present"
        else:
            return "GOOD - No significant security issues detected"
    
    def _extract_key_findings(self, scan_results: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Extract key security findings."""
        findings = []
        
        # Critical and high severity issues
        for scanner_name, scanner_result in scan_results.get("scanner_results", {}).items():
            for vuln in scanner_result.get("vulnerabilities", []):
                if vuln.get("severity") in ["critical", "high"]:
                    findings.append({
                        "severity": vuln.get("severity"),
                        "title": vuln.get("title"),
                        "scanner": scanner_name,
                        "file": vuln.get("file"),
                        "category": vuln.get("category")
                    })
        
        # Sort by severity (critical first)
        severity_order = {"critical": 0, "high": 1, "medium": 2, "low": 3, "info": 4}
        findings.sort(key=lambda x: severity_order.get(x.get("severity", "info"), 4))
        
        return findings[:10]  # Top 10 findings
    
    def _extract_dg_specific_issues(self, scan_results: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Extract dangerous goods specific security issues."""
        dg_issues = []
        
        dg_keywords = [
            "dangerous_goods", "emergency", "incident", "compliance",
            "audit", "hazmat", "transport", "safety", "training"
        ]
        
        for scanner_name, scanner_result in scan_results.get("scanner_results", {}).items():
            for vuln in scanner_result.get("vulnerabilities", []):
                file_path = vuln.get("file", "").lower()
                title = vuln.get("title", "").lower()
                description = vuln.get("description", "").lower()
                
                if any(keyword in file_path or keyword in title or keyword in description 
                       for keyword in dg_keywords):
                    dg_issues.append({
                        "severity": vuln.get("severity"),
                        "title": vuln.get("title"),
                        "scanner": scanner_name,
                        "file": vuln.get("file"),
                        "relevance": "dangerous_goods_specific"
                    })
        
        return dg_issues
    
    def _perform_risk_assessment(self, scan_results: Dict[str, Any]) -> Dict[str, Any]:
        """Perform risk assessment based on scan results."""
        severity_counts = scan_results["scan_summary"]["severity_breakdown"]
        
        # Calculate risk score (0-100)
        risk_score = (
            severity_counts["critical"] * 25 +
            severity_counts["high"] * 10 +
            severity_counts["medium"] * 3 +
            severity_counts["low"] * 1
        )
        
        # Cap at 100
        risk_score = min(risk_score, 100)
        
        # Determine risk level
        if risk_score >= 75:
            risk_level = "CRITICAL"
        elif risk_score >= 50:
            risk_level = "HIGH"
        elif risk_score >= 25:
            risk_level = "MEDIUM"
        else:
            risk_level = "LOW"
        
        return {
            "risk_score": risk_score,
            "risk_level": risk_level,
            "factors": {
                "critical_vulnerabilities": severity_counts["critical"],
                "high_vulnerabilities": severity_counts["high"],
                "failed_scans": scan_results["scan_summary"]["failed_scans"],
                "compliance_status": scan_results.get("compliance_status")
            }
        }
    
    def _assess_compliance_implications(self, scan_results: Dict[str, Any]) -> Dict[str, Any]:
        """Assess compliance implications for dangerous goods transportation."""
        implications = {
            "regulatory_compliance": "unknown",
            "audit_readiness": "unknown",
            "data_protection": "unknown",
            "safety_protocols": "unknown",
            "concerns": []
        }
        
        severity_counts = scan_results["scan_summary"]["severity_breakdown"]
        
        # Regulatory compliance
        if severity_counts["critical"] == 0 and severity_counts["high"] <= 2:
            implications["regulatory_compliance"] = "compliant"
        else:
            implications["regulatory_compliance"] = "at_risk"
            implications["concerns"].append("High/critical vulnerabilities may impact regulatory compliance")
        
        # Audit readiness
        if scan_results.get("compliance_status") == "compliant":
            implications["audit_readiness"] = "ready"
        else:
            implications["audit_readiness"] = "needs_attention"
            implications["concerns"].append("Security posture may not meet audit requirements")
        
        # Data protection (critical for dangerous goods)
        dg_specific_issues = self._extract_dg_specific_issues(scan_results)
        if not dg_specific_issues:
            implications["data_protection"] = "adequate"
        else:
            implications["data_protection"] = "at_risk"
            implications["concerns"].append("Dangerous goods data protection issues detected")
        
        # Safety protocols
        safety_keywords = ["emergency", "incident", "safety", "procedure"]
        has_safety_issues = any(
            any(keyword in str(vuln).lower() for keyword in safety_keywords)
            for scanner_result in scan_results.get("scanner_results", {}).values()
            for vuln in scanner_result.get("vulnerabilities", [])
        )
        
        implications["safety_protocols"] = "at_risk" if has_safety_issues else "adequate"
        if has_safety_issues:
            implications["concerns"].append("Safety protocol related vulnerabilities detected")
        
        return implications