#!/usr/bin/env python
"""
Environment validation script for SafeShipper.
Validates all environment variables and external service configurations.
"""

import os
import sys
import re
import json
import subprocess
from typing import Dict, List, Tuple, Optional
from dataclasses import dataclass
from enum import Enum

# Add the backend directory to the Python path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Colors for output
class Colors:
    RED = '\033[91m'
    GREEN = '\033[92m'
    YELLOW = '\033[93m'
    BLUE = '\033[94m'
    PURPLE = '\033[95m'
    CYAN = '\033[96m'
    WHITE = '\033[97m'
    BOLD = '\033[1m'
    UNDERLINE = '\033[4m'
    END = '\033[0m'

class ValidationLevel(Enum):
    REQUIRED = "REQUIRED"
    RECOMMENDED = "RECOMMENDED"
    OPTIONAL = "OPTIONAL"

@dataclass
class ValidationRule:
    name: str
    env_var: str
    level: ValidationLevel
    pattern: Optional[str] = None
    min_length: Optional[int] = None
    description: str = ""
    help_text: str = ""

class EnvironmentValidator:
    def __init__(self):
        self.validation_rules = self._define_validation_rules()
        self.results = {
            'passed': [],
            'failed': [],
            'warnings': [],
            'missing': []
        }
    
    def _define_validation_rules(self) -> List[ValidationRule]:
        """Define all validation rules for environment variables"""
        return [
            # Core Django Settings
            ValidationRule(
                name="Django Secret Key",
                env_var="SECRET_KEY",
                level=ValidationLevel.REQUIRED,
                min_length=50,
                description="Django secret key for cryptographic signing",
                help_text="Generate with: python -c 'from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())'"
            ),
            
            # Database Configuration
            ValidationRule(
                name="Database Engine",
                env_var="DB_ENGINE",
                level=ValidationLevel.RECOMMENDED,
                pattern=r"django\.(contrib\.)?gis\.db\.backends\.(postgis|postgresql)",
                description="Database engine (preferably PostGIS for GIS features)"
            ),
            ValidationRule(
                name="Database Name",
                env_var="DB_NAME",
                level=ValidationLevel.REQUIRED,
                min_length=1,
                description="Database name"
            ),
            ValidationRule(
                name="Database User",
                env_var="DB_USER",
                level=ValidationLevel.REQUIRED,
                min_length=1,
                description="Database username"
            ),
            ValidationRule(
                name="Database Password",
                env_var="DB_PASSWORD",
                level=ValidationLevel.REQUIRED,
                min_length=8,
                description="Database password (minimum 8 characters)"
            ),
            
            # Cache/Message Broker
            ValidationRule(
                name="Redis URL",
                env_var="REDIS_URL",
                level=ValidationLevel.RECOMMENDED,
                pattern=r"redis://.*",
                description="Redis connection URL for caching and task queue"
            ),
            
            # External Services
            
            # Stripe Payment Processing
            ValidationRule(
                name="Stripe Publishable Key",
                env_var="STRIPE_PUBLISHABLE_KEY",
                level=ValidationLevel.OPTIONAL,
                pattern=r"pk_(test|live)_[A-Za-z0-9]{99}",
                description="Stripe publishable key for frontend"
            ),
            ValidationRule(
                name="Stripe Secret Key",
                env_var="STRIPE_SECRET_KEY",
                level=ValidationLevel.OPTIONAL,
                pattern=r"sk_(test|live)_[A-Za-z0-9]{99}",
                description="Stripe secret key for backend"
            ),
            ValidationRule(
                name="Stripe Webhook Secret",
                env_var="STRIPE_WEBHOOK_SECRET",
                level=ValidationLevel.OPTIONAL,
                pattern=r"whsec_[A-Za-z0-9]+",
                description="Stripe webhook endpoint secret"
            ),
            
            # AWS S3 Storage
            ValidationRule(
                name="AWS Access Key ID",
                env_var="AWS_ACCESS_KEY_ID",
                level=ValidationLevel.OPTIONAL,
                pattern=r"AKIA[A-Z0-9]{16}",
                description="AWS access key for S3 storage"
            ),
            ValidationRule(
                name="AWS Secret Access Key",
                env_var="AWS_SECRET_ACCESS_KEY",
                level=ValidationLevel.OPTIONAL,
                min_length=40,
                description="AWS secret key for S3 storage"
            ),
            ValidationRule(
                name="AWS S3 Bucket Name",
                env_var="AWS_STORAGE_BUCKET_NAME",
                level=ValidationLevel.OPTIONAL,
                pattern=r"^[a-z0-9.-]{3,63}$",
                description="S3 bucket name (lowercase, 3-63 chars)"
            ),
            
            # Twilio SMS
            ValidationRule(
                name="Twilio Account SID",
                env_var="TWILIO_ACCOUNT_SID",
                level=ValidationLevel.OPTIONAL,
                pattern=r"^AC[a-z0-9]{32}$",
                description="Twilio account SID for SMS"
            ),
            ValidationRule(
                name="Twilio Auth Token",
                env_var="TWILIO_AUTH_TOKEN",
                level=ValidationLevel.OPTIONAL,
                min_length=32,
                description="Twilio auth token for SMS"
            ),
            ValidationRule(
                name="Twilio Phone Number",
                env_var="TWILIO_PHONE_NUMBER",
                level=ValidationLevel.OPTIONAL,
                pattern=r"^\+[1-9]\d{1,14}$",
                description="Twilio phone number in E.164 format"
            ),
            
            # Google OAuth
            ValidationRule(
                name="Google Client ID",
                env_var="GOOGLE_CLIENT_ID",
                level=ValidationLevel.OPTIONAL,
                pattern=r"^[0-9]+-[a-z0-9]{32}\.apps\.googleusercontent\.com$",
                description="Google OAuth client ID"
            ),
            ValidationRule(
                name="Google Client Secret",
                env_var="GOOGLE_CLIENT_SECRET",
                level=ValidationLevel.OPTIONAL,
                min_length=24,
                description="Google OAuth client secret"
            ),
            
            # Microsoft OAuth
            ValidationRule(
                name="Microsoft Client ID",
                env_var="MICROSOFT_CLIENT_ID",
                level=ValidationLevel.OPTIONAL,
                pattern=r"^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$",
                description="Microsoft OAuth client ID (UUID format)"
            ),
            ValidationRule(
                name="Microsoft Client Secret",
                env_var="MICROSOFT_CLIENT_SECRET",
                level=ValidationLevel.OPTIONAL,
                min_length=20,
                description="Microsoft OAuth client secret"
            ),
            
            # Email Configuration
            ValidationRule(
                name="Email Host",
                env_var="EMAIL_HOST",
                level=ValidationLevel.RECOMMENDED,
                description="SMTP server host for email sending"
            ),
            ValidationRule(
                name="Email Host User",
                env_var="EMAIL_HOST_USER",
                level=ValidationLevel.RECOMMENDED,
                description="SMTP username for email sending"
            ),
            ValidationRule(
                name="Email Host Password",
                env_var="EMAIL_HOST_PASSWORD",
                level=ValidationLevel.RECOMMENDED,
                min_length=8,
                description="SMTP password for email sending"
            ),
            
            # Security Settings
            ValidationRule(
                name="JWT Signing Key",
                env_var="JWT_SIGNING_KEY",
                level=ValidationLevel.RECOMMENDED,
                min_length=32,
                description="JWT signing key for token authentication"
            ),
            
            # Environment Configuration
            ValidationRule(
                name="Debug Mode",
                env_var="DEBUG",
                level=ValidationLevel.REQUIRED,
                pattern=r"^(True|False|true|false|1|0)$",
                description="Debug mode setting (should be False in production)"
            ),
            ValidationRule(
                name="Environment",
                env_var="ENVIRONMENT",
                level=ValidationLevel.RECOMMENDED,
                pattern=r"^(development|staging|production)$",
                description="Environment identifier"
            ),
        ]
    
    def validate_environment(self) -> Dict:
        """Run all validation checks"""
        print(f"{Colors.BOLD}{Colors.BLUE}SafeShipper Environment Validation{Colors.END}")
        print("=" * 50)
        
        for rule in self.validation_rules:
            self._validate_rule(rule)
        
        self._check_service_combinations()
        self._check_security_requirements()
        self._check_production_readiness()
        
        return self._generate_report()
    
    def _validate_rule(self, rule: ValidationRule):
        """Validate a single environment variable rule"""
        value = os.environ.get(rule.env_var)
        
        if value is None:
            if rule.level == ValidationLevel.REQUIRED:
                self.results['failed'].append({
                    'name': rule.name,
                    'env_var': rule.env_var,
                    'level': rule.level.value,
                    'error': 'Missing required environment variable',
                    'help': rule.help_text or f"Set {rule.env_var} in your .env file"
                })
            elif rule.level == ValidationLevel.RECOMMENDED:
                self.results['warnings'].append({
                    'name': rule.name,
                    'env_var': rule.env_var,
                    'level': rule.level.value,
                    'message': 'Recommended environment variable not set',
                    'description': rule.description
                })
            else:
                self.results['missing'].append({
                    'name': rule.name,
                    'env_var': rule.env_var,
                    'level': rule.level.value,
                    'description': rule.description
                })
            return
        
        # Validate pattern if specified
        if rule.pattern and not re.match(rule.pattern, value):
            self.results['failed'].append({
                'name': rule.name,
                'env_var': rule.env_var,
                'level': rule.level.value,
                'error': f'Value does not match expected format',
                'pattern': rule.pattern,
                'help': rule.help_text
            })
            return
        
        # Validate minimum length if specified
        if rule.min_length and len(value) < rule.min_length:
            self.results['failed'].append({
                'name': rule.name,
                'env_var': rule.env_var,
                'level': rule.level.value,
                'error': f'Value too short (minimum {rule.min_length} characters)',
                'help': rule.help_text
            })
            return
        
        # Validation passed
        self.results['passed'].append({
            'name': rule.name,
            'env_var': rule.env_var,
            'level': rule.level.value,
            'description': rule.description
        })
    
    def _check_service_combinations(self):
        """Check for valid service combinations"""
        print(f"\n{Colors.BOLD}Service Configuration Checks{Colors.END}")
        
        # Check Stripe configuration
        stripe_pub = os.environ.get('STRIPE_PUBLISHABLE_KEY', '')
        stripe_secret = os.environ.get('STRIPE_SECRET_KEY', '')
        
        if stripe_pub or stripe_secret:
            if not (stripe_pub and stripe_secret):
                print(f"{Colors.YELLOW}⚠️  Incomplete Stripe configuration{Colors.END}")
                print("   Both STRIPE_PUBLISHABLE_KEY and STRIPE_SECRET_KEY are required")
            elif stripe_pub.startswith('pk_test_') != stripe_secret.startswith('sk_test_'):
                print(f"{Colors.RED}❌ Stripe key mismatch{Colors.END}")
                print("   Publishable and secret keys must both be test or both be live")
            else:
                mode = "TEST" if stripe_pub.startswith('pk_test_') else "LIVE"
                print(f"{Colors.GREEN}✓ Stripe configured in {mode} mode{Colors.END}")
        
        # Check AWS S3 configuration
        aws_key = os.environ.get('AWS_ACCESS_KEY_ID', '')
        aws_secret = os.environ.get('AWS_SECRET_ACCESS_KEY', '')
        aws_bucket = os.environ.get('AWS_STORAGE_BUCKET_NAME', '')
        
        if aws_key or aws_secret or aws_bucket:
            missing_aws = []
            if not aws_key: missing_aws.append('AWS_ACCESS_KEY_ID')
            if not aws_secret: missing_aws.append('AWS_SECRET_ACCESS_KEY')
            if not aws_bucket: missing_aws.append('AWS_STORAGE_BUCKET_NAME')
            
            if missing_aws:
                print(f"{Colors.YELLOW}⚠️  Incomplete AWS S3 configuration{Colors.END}")
                print(f"   Missing: {', '.join(missing_aws)}")
            else:
                print(f"{Colors.GREEN}✓ AWS S3 fully configured{Colors.END}")
        
        # Check OAuth configuration
        google_id = os.environ.get('GOOGLE_CLIENT_ID', '')
        google_secret = os.environ.get('GOOGLE_CLIENT_SECRET', '')
        microsoft_id = os.environ.get('MICROSOFT_CLIENT_ID', '')
        microsoft_secret = os.environ.get('MICROSOFT_CLIENT_SECRET', '')
        
        oauth_providers = []
        if google_id and google_secret:
            oauth_providers.append('Google')
        elif google_id or google_secret:
            print(f"{Colors.YELLOW}⚠️  Incomplete Google OAuth configuration{Colors.END}")
        
        if microsoft_id and microsoft_secret:
            oauth_providers.append('Microsoft')
        elif microsoft_id or microsoft_secret:
            print(f"{Colors.YELLOW}⚠️  Incomplete Microsoft OAuth configuration{Colors.END}")
        
        if oauth_providers:
            print(f"{Colors.GREEN}✓ OAuth configured for: {', '.join(oauth_providers)}{Colors.END}")
    
    def _check_security_requirements(self):
        """Check security-related configuration"""
        print(f"\n{Colors.BOLD}Security Checks{Colors.END}")
        
        # Check DEBUG setting in production
        debug = os.environ.get('DEBUG', '').lower()
        environment = os.environ.get('ENVIRONMENT', '').lower()
        
        if environment == 'production' and debug in ('true', '1'):
            print(f"{Colors.RED}🚨 CRITICAL: DEBUG=True in production environment!{Colors.END}")
            print("   This exposes sensitive information and must be set to False")
        elif debug in ('false', '0'):
            print(f"{Colors.GREEN}✓ DEBUG properly disabled{Colors.END}")
        
        # Check for test keys in production
        if environment == 'production':
            test_keys_found = []
            
            for env_var, value in os.environ.items():
                if 'test' in value.lower() and any(key in env_var for key in ['STRIPE', 'KEY', 'SECRET']):
                    test_keys_found.append(env_var)
            
            if test_keys_found:
                print(f"{Colors.RED}🚨 CRITICAL: Test keys found in production!{Colors.END}")
                for key in test_keys_found:
                    print(f"   {key}")
            else:
                print(f"{Colors.GREEN}✓ No test keys detected in production{Colors.END}")
        
        # Check secret key strength
        secret_key = os.environ.get('SECRET_KEY', '')
        if secret_key:
            if len(secret_key) < 50:
                print(f"{Colors.YELLOW}⚠️  SECRET_KEY is shorter than recommended (50+ chars){Colors.END}")
            elif secret_key in ['your-secret-key', 'django-insecure-key']:
                print(f"{Colors.RED}❌ SECRET_KEY appears to be a default/example value{Colors.END}")
            else:
                print(f"{Colors.GREEN}✓ SECRET_KEY appears to be properly configured{Colors.END}")
    
    def _check_production_readiness(self):
        """Check if configuration is ready for production"""
        print(f"\n{Colors.BOLD}Production Readiness{Colors.END}")
        
        environment = os.environ.get('ENVIRONMENT', '').lower()
        if environment != 'production':
            print(f"{Colors.BLUE}ℹ️  Environment is set to '{environment}' (not production){Colors.END}")
            return
        
        production_requirements = [
            ('SECRET_KEY', 'Django secret key'),
            ('DB_PASSWORD', 'Database password'),
            ('EMAIL_HOST_USER', 'Email configuration'),
            ('REDIS_URL', 'Redis cache'),
        ]
        
        missing_prod_reqs = []
        for env_var, description in production_requirements:
            if not os.environ.get(env_var):
                missing_prod_reqs.append(f"{env_var} ({description})")
        
        if missing_prod_reqs:
            print(f"{Colors.RED}❌ Missing production requirements:{Colors.END}")
            for req in missing_prod_reqs:
                print(f"   - {req}")
        else:
            print(f"{Colors.GREEN}✓ Basic production requirements met{Colors.END}")
    
    def _generate_report(self) -> Dict:
        """Generate final validation report"""
        print(f"\n{Colors.BOLD}Validation Summary{Colors.END}")
        print("=" * 50)
        
        total_checks = len(self.results['passed']) + len(self.results['failed'])
        
        if self.results['passed']:
            print(f"{Colors.GREEN}✓ Passed: {len(self.results['passed'])} checks{Colors.END}")
        
        if self.results['failed']:
            print(f"{Colors.RED}❌ Failed: {len(self.results['failed'])} checks{Colors.END}")
            for failure in self.results['failed']:
                print(f"   {failure['name']}: {failure['error']}")
                if 'help' in failure and failure['help']:
                    print(f"      💡 {failure['help']}")
        
        if self.results['warnings']:
            print(f"{Colors.YELLOW}⚠️  Warnings: {len(self.results['warnings'])} checks{Colors.END}")
            for warning in self.results['warnings']:
                print(f"   {warning['name']}: {warning['message']}")
        
        if self.results['missing']:
            print(f"{Colors.BLUE}ℹ️  Optional services not configured: {len(self.results['missing'])}{Colors.END}")
            for missing in self.results['missing']:
                print(f"   {missing['name']}: {missing['description']}")
        
        # Overall status
        if self.results['failed']:
            print(f"\n{Colors.RED}{Colors.BOLD}❌ Validation FAILED{Colors.END}")
            print("Fix the failed checks above before proceeding.")
            return {'status': 'failed', 'details': self.results}
        elif self.results['warnings']:
            print(f"\n{Colors.YELLOW}{Colors.BOLD}⚠️  Validation PASSED with warnings{Colors.END}")
            print("Consider addressing the warnings for optimal setup.")
            return {'status': 'warning', 'details': self.results}
        else:
            print(f"\n{Colors.GREEN}{Colors.BOLD}✅ Validation PASSED{Colors.END}")
            print("All checks completed successfully!")
            return {'status': 'success', 'details': self.results}
    
    def check_dependencies(self):
        """Check if required dependencies are installed"""
        print(f"\n{Colors.BOLD}Dependency Checks{Colors.END}")
        
        dependencies = [
            ('django', 'Django web framework'),
            ('psycopg2', 'PostgreSQL adapter'),
            ('redis', 'Redis client'),
            ('boto3', 'AWS SDK (for S3)'),
            ('stripe', 'Stripe payment processing'),
            ('twilio', 'Twilio SMS service'),
        ]
        
        for package, description in dependencies:
            try:
                __import__(package)
                print(f"{Colors.GREEN}✓ {package}{Colors.END} - {description}")
            except ImportError:
                print(f"{Colors.YELLOW}⚠️  {package}{Colors.END} - {description} (not installed)")
    
    def suggest_improvements(self):
        """Suggest configuration improvements"""
        print(f"\n{Colors.BOLD}Improvement Suggestions{Colors.END}")
        
        suggestions = []
        
        # Check for common improvements
        if not os.environ.get('CORS_ALLOWED_ORIGINS'):
            suggestions.append("Set CORS_ALLOWED_ORIGINS for frontend security")
        
        if not os.environ.get('ALLOWED_HOSTS'):
            suggestions.append("Configure ALLOWED_HOSTS for production deployment")
        
        if not os.environ.get('SENTRY_DSN'):
            suggestions.append("Consider adding Sentry for error monitoring")
        
        if not os.environ.get('GOOGLE_MAPS_API_KEY'):
            suggestions.append("Add Google Maps API key for enhanced mapping features")
        
        if suggestions:
            for i, suggestion in enumerate(suggestions, 1):
                print(f"{Colors.CYAN}{i}. {suggestion}{Colors.END}")
        else:
            print(f"{Colors.GREEN}✓ No obvious improvements needed{Colors.END}")


def main():
    """Main validation function"""
    validator = EnvironmentValidator()
    
    # Run validation
    result = validator.validate_environment()
    
    # Check dependencies
    validator.check_dependencies()
    
    # Suggest improvements
    validator.suggest_improvements()
    
    # Final recommendations
    print(f"\n{Colors.BOLD}Next Steps{Colors.END}")
    
    if result['status'] == 'failed':
        print("1. Fix the failed validation checks above")
        print("2. Re-run this script to verify fixes")
        print("3. Review the setup guides in docs/external-services/")
        sys.exit(1)
    elif result['status'] == 'warning':
        print("1. Consider addressing the warnings above")
        print("2. Review optional service configurations")
        print("3. Test external service integrations")
        sys.exit(0)
    else:
        print("1. Test external service integrations:")
        print("   python backend/test_stripe_integration.py")
        print("   python backend/test_s3_integration.py")
        print("   python backend/test_sms_integration.py")
        print("   python backend/test_oauth_integration.py")
        print("2. Deploy to your target environment")
        sys.exit(0)


if __name__ == "__main__":
    main()