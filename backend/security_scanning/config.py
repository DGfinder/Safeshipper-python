# security_scanning/config.py
"""
Security scanning configuration for SafeShipper platform.
Defines security policies, thresholds, and scanning parameters.
"""

import os
from typing import Dict, List, Any
from dataclasses import dataclass
from enum import Enum


class SeverityLevel(Enum):
    """Security vulnerability severity levels."""
    CRITICAL = "critical"
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"
    INFO = "info"


class ScanType(Enum):
    """Types of security scans."""
    STATIC_CODE_ANALYSIS = "static_code_analysis"
    DEPENDENCY_VULNERABILITY = "dependency_vulnerability"
    CONTAINER_SECURITY = "container_security"
    INFRASTRUCTURE_SECURITY = "infrastructure_security"
    SECRETS_DETECTION = "secrets_detection"
    CODE_QUALITY = "code_quality"
    LICENSE_COMPLIANCE = "license_compliance"
    PENETRATION_TEST = "penetration_test"


@dataclass
class SecurityThreshold:
    """Security vulnerability thresholds for pipeline gates."""
    critical: int = 0      # No critical vulnerabilities allowed
    high: int = 0          # No high vulnerabilities allowed
    medium: int = 5        # Max 5 medium vulnerabilities
    low: int = 20          # Max 20 low vulnerabilities
    info: int = 100        # Max 100 info level issues


@dataclass
class ScannerConfig:
    """Configuration for individual security scanners."""
    name: str
    enabled: bool
    scan_types: List[ScanType]
    config_file: str = None
    timeout_minutes: int = 30
    retry_count: int = 2
    severity_threshold: SecurityThreshold = None
    custom_rules: List[str] = None


class SecurityConfig:
    """
    Centralized security scanning configuration for SafeShipper.
    """
    
    # Security thresholds for different environments
    SECURITY_THRESHOLDS = {
        "production": SecurityThreshold(
            critical=0,
            high=0,
            medium=0,
            low=5,
            info=50
        ),
        "staging": SecurityThreshold(
            critical=0,
            high=2,
            medium=10,
            low=30,
            info=100
        ),
        "development": SecurityThreshold(
            critical=2,
            high=10,
            medium=25,
            low=50,
            info=200
        )
    }
    
    # Scanner configurations
    SCANNERS = {
        "bandit": ScannerConfig(
            name="Bandit",
            enabled=True,
            scan_types=[ScanType.STATIC_CODE_ANALYSIS, ScanType.SECRETS_DETECTION],
            config_file="security_scanning/configs/bandit.yaml",
            timeout_minutes=15,
            custom_rules=[
                "B201",  # Flask debug mode
                "B501",  # Request with no certificate validation
                "B502",  # SSL with bad version
                "B506",  # YAML load
                "B601",  # Shell injection
                "B602",  # Subprocess popen
                "B608",  # SQL injection
            ]
        ),
        "safety": ScannerConfig(
            name="Safety",
            enabled=True,
            scan_types=[ScanType.DEPENDENCY_VULNERABILITY],
            timeout_minutes=10
        ),
        "semgrep": ScannerConfig(
            name="Semgrep",
            enabled=True,
            scan_types=[ScanType.STATIC_CODE_ANALYSIS, ScanType.SECRETS_DETECTION],
            config_file="security_scanning/configs/semgrep.yaml",
            timeout_minutes=20,
            custom_rules=[
                "python.django.security.audit.django-sql-injection",
                "python.django.security.audit.django-xss",
                "python.flask.security.audit.flask-secret-key",
                "python.requests.security.disabled-cert-validation"
            ]
        ),
        "trivy": ScannerConfig(
            name="Trivy",
            enabled=True,
            scan_types=[ScanType.CONTAINER_SECURITY, ScanType.DEPENDENCY_VULNERABILITY],
            timeout_minutes=25
        ),
        "codeql": ScannerConfig(
            name="CodeQL",
            enabled=True,
            scan_types=[ScanType.STATIC_CODE_ANALYSIS],
            config_file="security_scanning/configs/codeql.yaml",
            timeout_minutes=45
        ),
        "snyk": ScannerConfig(
            name="Snyk",
            enabled=True,
            scan_types=[ScanType.DEPENDENCY_VULNERABILITY, ScanType.CONTAINER_SECURITY],
            timeout_minutes=20
        ),
        "sonarqube": ScannerConfig(
            name="SonarQube",
            enabled=True,
            scan_types=[ScanType.CODE_QUALITY, ScanType.STATIC_CODE_ANALYSIS],
            timeout_minutes=30
        ),
        "checkov": ScannerConfig(
            name="Checkov",
            enabled=True,
            scan_types=[ScanType.INFRASTRUCTURE_SECURITY],
            config_file="security_scanning/configs/checkov.yaml",
            timeout_minutes=15
        ),
        "gitleaks": ScannerConfig(
            name="GitLeaks",
            enabled=True,
            scan_types=[ScanType.SECRETS_DETECTION],
            config_file="security_scanning/configs/gitleaks.toml",
            timeout_minutes=10
        )
    }
    
    # Dangerous goods specific security rules
    DANGEROUS_GOODS_SECURITY_RULES = {
        "data_protection": [
            "Ensure dangerous goods data is encrypted at rest",
            "Verify secure transmission of hazardous material information",
            "Check access controls for dangerous goods database",
            "Validate audit logging for dangerous goods operations"
        ],
        "emergency_procedures": [
            "Verify emergency contact information is protected",
            "Check incident reporting system security",
            "Validate emergency procedure access controls",
            "Ensure emergency communication channels are secure"
        ],
        "compliance_requirements": [
            "Verify regulatory compliance data protection",
            "Check audit trail integrity and immutability",
            "Validate training record access controls",
            "Ensure compliance reporting system security"
        ],
        "mobile_security": [
            "Check mobile app certificate pinning",
            "Verify mobile data encryption",
            "Validate mobile authentication mechanisms",
            "Check mobile app permission model"
        ]
    }
    
    # File patterns to scan
    SCAN_PATTERNS = {
        "include": [
            "**/*.py",
            "**/*.js",
            "**/*.ts",
            "**/*.jsx",
            "**/*.tsx",
            "**/*.yaml",
            "**/*.yml",
            "**/*.json",
            "**/*.tf",
            "**/*.dockerfile",
            "**/Dockerfile*",
            "**/*.sql",
            "**/*.env*",
            "**/requirements*.txt",
            "**/package*.json",
            "**/poetry.lock",
            "**/Pipfile*"
        ],
        "exclude": [
            "**/node_modules/**",
            "**/venv/**",
            "**/env/**",
            "**/.git/**",
            "**/build/**",
            "**/dist/**",
            "**/__pycache__/**",
            "**/test_results/**",
            "**/coverage/**",
            "**/.*_cache/**"
        ]
    }
    
    # Critical files requiring extra security attention
    CRITICAL_FILES = [
        "settings/**/*.py",
        "config/**/*.py",
        "**/*secret*",
        "**/*key*",
        "**/*password*",
        "**/*token*",
        "**/dangerous_goods/**/*.py",
        "**/emergency_procedures/**/*.py",
        "**/compliance/**/*.py",
        "**/audit/**/*.py"
    ]
    
    # Pipeline integration settings
    PIPELINE_CONFIG = {
        "fail_on_critical": True,
        "fail_on_high": True,
        "fail_on_medium": False,  # Allow medium in development
        "generate_reports": True,
        "upload_results": True,
        "notify_security_team": True,
        "notification_channels": [
            "slack",
            "email",
            "webhook"
        ],
        "security_team_emails": [
            "security@safeshipper.com",
            "devops@safeshipper.com"
        ],
        "slack_webhook": os.getenv("SECURITY_SLACK_WEBHOOK"),
        "webhook_url": os.getenv("SECURITY_WEBHOOK_URL")
    }
    
    # Compliance requirements for dangerous goods transportation
    COMPLIANCE_REQUIREMENTS = {
        "encryption": {
            "data_at_rest": True,
            "data_in_transit": True,
            "key_management": "enterprise_grade",
            "algorithms": ["AES-256", "RSA-2048"]
        },
        "access_control": {
            "multi_factor_auth": True,
            "role_based_access": True,
            "principle_of_least_privilege": True,
            "session_management": "secure"
        },
        "audit_logging": {
            "comprehensive_logging": True,
            "log_integrity": True,
            "retention_period": "7_years",
            "real_time_monitoring": True
        },
        "incident_response": {
            "automated_detection": True,
            "rapid_response": True,
            "communication_protocols": True,
            "forensic_capabilities": True
        }
    }
    
    @classmethod
    def get_environment_config(cls, environment: str) -> Dict[str, Any]:
        """Get environment-specific security configuration."""
        return {
            "threshold": cls.SECURITY_THRESHOLDS.get(environment, cls.SECURITY_THRESHOLDS["development"]),
            "scanners": {name: config for name, config in cls.SCANNERS.items() if config.enabled},
            "compliance": cls.COMPLIANCE_REQUIREMENTS,
            "pipeline": cls.PIPELINE_CONFIG
        }
    
    @classmethod
    def get_scanner_config(cls, scanner_name: str) -> ScannerConfig:
        """Get configuration for specific scanner."""
        return cls.SCANNERS.get(scanner_name)
    
    @classmethod
    def get_critical_rules(cls) -> List[str]:
        """Get list of critical security rules."""
        critical_rules = []
        for category, rules in cls.DANGEROUS_GOODS_SECURITY_RULES.items():
            critical_rules.extend(rules)
        return critical_rules
    
    @classmethod
    def validate_threshold_compliance(cls, results: Dict[str, int], environment: str) -> bool:
        """Validate scan results against environment thresholds."""
        threshold = cls.SECURITY_THRESHOLDS.get(environment, cls.SECURITY_THRESHOLDS["development"])
        
        return (
            results.get("critical", 0) <= threshold.critical and
            results.get("high", 0) <= threshold.high and
            results.get("medium", 0) <= threshold.medium and
            results.get("low", 0) <= threshold.low and
            results.get("info", 0) <= threshold.info
        )


# Environment-specific overrides
ENVIRONMENT_OVERRIDES = {
    "production": {
        "scanners": {
            "bandit": {"severity_threshold": SecurityThreshold(0, 0, 0, 2, 10)},
            "safety": {"severity_threshold": SecurityThreshold(0, 0, 1, 5, 20)},
            "semgrep": {"severity_threshold": SecurityThreshold(0, 0, 0, 3, 15)}
        }
    },
    "staging": {
        "scanners": {
            "bandit": {"severity_threshold": SecurityThreshold(0, 1, 5, 10, 25)},
            "safety": {"severity_threshold": SecurityThreshold(0, 2, 8, 15, 40)}
        }
    }
}


# Security scanning schedule
SCAN_SCHEDULE = {
    "continuous": [
        "bandit",
        "gitleaks",
        "safety"
    ],
    "daily": [
        "semgrep",
        "trivy",
        "checkov"
    ],
    "weekly": [
        "codeql",
        "snyk",
        "sonarqube"
    ],
    "monthly": [
        "penetration_test",
        "infrastructure_audit"
    ]
}


# Integration endpoints
INTEGRATION_ENDPOINTS = {
    "github_security_advisories": "https://api.github.com/advisories",
    "cve_database": "https://cve.mitre.org/cgi-bin/cvename.cgi",
    "nvd_database": "https://nvd.nist.gov/vuln/detail",
    "sonarqube_server": os.getenv("SONARQUBE_URL", "http://localhost:9000"),
    "snyk_api": "https://api.snyk.io/v1",
    "trivy_db": "https://github.com/aquasecurity/trivy-db"
}