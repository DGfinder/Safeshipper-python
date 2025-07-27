#!/usr/bin/env python3
"""
S3 Security Configuration Checker
Validates security settings for your SafeShipper S3 bucket.
"""

import boto3
import json
import sys
from botocore.exceptions import ClientError

def check_bucket_encryption(s3_client, bucket_name):
    """Check if bucket has encryption enabled"""
    print("=== Bucket Encryption Check ===")
    
    try:
        response = s3_client.get_bucket_encryption(Bucket=bucket_name)
        rules = response['ServerSideEncryptionConfiguration']['Rules']
        
        for rule in rules:
            sse = rule['ApplyServerSideEncryptionByDefault']
            algorithm = sse['SSEAlgorithm']
            print(f"✓ Encryption enabled: {algorithm}")
            
            if algorithm == 'AES256':
                print("✓ Using AES-256 encryption (recommended)")
            elif algorithm == 'aws:kms':
                kms_key = sse.get('KMSMasterKeyID', 'AWS managed')
                print(f"✓ Using KMS encryption with key: {kms_key}")
        
        return True
        
    except ClientError as e:
        if e.response['Error']['Code'] == 'ServerSideEncryptionConfigurationNotFoundError':
            print("❌ Bucket encryption is NOT enabled")
            print("💡 Enable encryption in AWS Console: S3 → Bucket → Properties → Default encryption")
            return False
        else:
            print(f"❌ Error checking encryption: {e}")
            return False

def check_bucket_versioning(s3_client, bucket_name):
    """Check if bucket has versioning enabled"""
    print("\n=== Bucket Versioning Check ===")
    
    try:
        response = s3_client.get_bucket_versioning(Bucket=bucket_name)
        status = response.get('Status', 'Disabled')
        
        if status == 'Enabled':
            print("✓ Versioning is enabled")
            return True
        else:
            print("⚠️  Versioning is disabled")
            print("💡 Enable in AWS Console: S3 → Bucket → Properties → Bucket Versioning")
            return False
            
    except ClientError as e:
        print(f"❌ Error checking versioning: {e}")
        return False

def check_public_access(s3_client, bucket_name):
    """Check if bucket blocks public access"""
    print("\n=== Public Access Block Check ===")
    
    try:
        response = s3_client.get_public_access_block(Bucket=bucket_name)
        config = response['PublicAccessBlockConfiguration']
        
        checks = {
            'BlockPublicAcls': 'Block public ACLs',
            'IgnorePublicAcls': 'Ignore public ACLs', 
            'BlockPublicPolicy': 'Block public bucket policies',
            'RestrictPublicBuckets': 'Restrict public buckets'
        }
        
        all_blocked = True
        for setting, description in checks.items():
            is_blocked = config.get(setting, False)
            status = "✓" if is_blocked else "❌"
            print(f"{status} {description}: {is_blocked}")
            if not is_blocked:
                all_blocked = False
        
        if all_blocked:
            print("✓ All public access is properly blocked")
        else:
            print("⚠️  Some public access settings are not optimal")
            
        return all_blocked
        
    except ClientError as e:
        if e.response['Error']['Code'] == 'NoSuchPublicAccessBlockConfiguration':
            print("❌ No public access block configuration found")
            print("💡 Configure in AWS Console: S3 → Bucket → Permissions → Block public access")
            return False
        else:
            print(f"❌ Error checking public access: {e}")
            return False

def check_cors_configuration(s3_client, bucket_name):
    """Check CORS configuration"""
    print("\n=== CORS Configuration Check ===")
    
    try:
        response = s3_client.get_bucket_cors(Bucket=bucket_name)
        cors_rules = response['CORSRules']
        
        print(f"✓ CORS configured with {len(cors_rules)} rule(s)")
        
        for i, rule in enumerate(cors_rules, 1):
            print(f"  Rule {i}:")
            print(f"    Allowed origins: {rule.get('AllowedOrigins', [])}")
            print(f"    Allowed methods: {rule.get('AllowedMethods', [])}")
            print(f"    Allowed headers: {rule.get('AllowedHeaders', [])}")
        
        return True
        
    except ClientError as e:
        if e.response['Error']['Code'] == 'NoSuchCORSConfiguration':
            print("ℹ️  No CORS configuration (OK for backend-only usage)")
            print("💡 Add CORS if frontend uploads directly to S3")
            return True
        else:
            print(f"❌ Error checking CORS: {e}")
            return False

def check_bucket_policy(s3_client, bucket_name):
    """Check bucket policy"""
    print("\n=== Bucket Policy Check ===")
    
    try:
        response = s3_client.get_bucket_policy(Bucket=bucket_name)
        policy = json.loads(response['Policy'])
        
        print("ℹ️  Custom bucket policy found")
        print(f"  Statements: {len(policy.get('Statement', []))}")
        
        # Check for overly permissive policies
        for statement in policy.get('Statement', []):
            if statement.get('Effect') == 'Allow':
                principal = statement.get('Principal', {})
                if principal == '*' or principal.get('AWS') == '*':
                    print("⚠️  Policy allows access from any AWS account")
                    
        return True
        
    except ClientError as e:
        if e.response['Error']['Code'] == 'NoSuchBucketPolicy':
            print("✓ No custom bucket policy (good - using IAM only)")
            return True
        else:
            print(f"❌ Error checking bucket policy: {e}")
            return False

def check_lifecycle_configuration(s3_client, bucket_name):
    """Check lifecycle configuration for cost optimization"""
    print("\n=== Lifecycle Configuration Check ===")
    
    try:
        response = s3_client.get_bucket_lifecycle_configuration(Bucket=bucket_name)
        rules = response['Rules']
        
        print(f"✓ Lifecycle rules configured: {len(rules)} rule(s)")
        
        for rule in rules:
            print(f"  Rule: {rule.get('ID', 'Unnamed')}")
            print(f"    Status: {rule.get('Status')}")
            
            if 'Transitions' in rule:
                for transition in rule['Transitions']:
                    days = transition.get('Days', 'N/A')
                    storage_class = transition.get('StorageClass')
                    print(f"    Transition to {storage_class} after {days} days")
        
        return True
        
    except ClientError as e:
        if e.response['Error']['Code'] == 'NoSuchLifecycleConfiguration':
            print("ℹ️  No lifecycle rules configured")
            print("💡 Consider adding rules to reduce costs:")
            print("   - Move to Standard-IA after 30 days")
            print("   - Move to Glacier after 90 days")
            return True
        else:
            print(f"❌ Error checking lifecycle: {e}")
            return False

def suggest_cors_config(bucket_name):
    """Suggest CORS configuration for frontend uploads"""
    cors_config = {
        "CORSRules": [
            {
                "AllowedHeaders": [
                    "Authorization",
                    "Content-Type",
                    "x-amz-content-sha256",
                    "x-amz-date"
                ],
                "AllowedMethods": [
                    "GET",
                    "PUT",
                    "POST",
                    "DELETE"
                ],
                "AllowedOrigins": [
                    "http://localhost:3000",
                    "https://yourdomain.com"
                ],
                "ExposeHeaders": [
                    "ETag",
                    "x-amz-server-side-encryption"
                ],
                "MaxAgeSeconds": 3000
            }
        ]
    }
    
    print("\n=== Suggested CORS Configuration ===")
    print("If your frontend uploads directly to S3, add this CORS configuration:")
    print(json.dumps(cors_config, indent=2))

def main():
    """Main security check function"""
    from django.conf import settings
    import os
    import django
    
    # Setup Django
    os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'safeshipper_core.settings')
    django.setup()
    
    print("SafeShipper S3 Security Check")
    print("=" * 40)
    
    # Get S3 configuration
    access_key = getattr(settings, 'AWS_ACCESS_KEY_ID', None)
    secret_key = getattr(settings, 'AWS_SECRET_ACCESS_KEY', None)
    bucket_name = getattr(settings, 'AWS_STORAGE_BUCKET_NAME', None)
    region = getattr(settings, 'AWS_S3_REGION_NAME', 'us-east-1')
    
    if not all([access_key, secret_key, bucket_name]):
        print("❌ S3 not configured in settings")
        print("Run: python3 scripts/validate_s3_config.py")
        return
    
    print(f"Checking bucket: {bucket_name}")
    print(f"Region: {region}")
    
    # Create S3 client
    try:
        s3_client = boto3.client(
            's3',
            aws_access_key_id=access_key,
            aws_secret_access_key=secret_key,
            region_name=region
        )
    except Exception as e:
        print(f"❌ Failed to create S3 client: {e}")
        return
    
    # Run security checks
    checks = [
        ('Encryption', check_bucket_encryption(s3_client, bucket_name)),
        ('Versioning', check_bucket_versioning(s3_client, bucket_name)),
        ('Public Access Block', check_public_access(s3_client, bucket_name)),
        ('CORS Configuration', check_cors_configuration(s3_client, bucket_name)),
        ('Bucket Policy', check_bucket_policy(s3_client, bucket_name)),
        ('Lifecycle Rules', check_lifecycle_configuration(s3_client, bucket_name))
    ]
    
    # Summary
    print("\n" + "=" * 40)
    print("SECURITY CHECK SUMMARY")
    print("=" * 40)
    
    passed_checks = sum(1 for _, passed in checks if passed)
    total_checks = len(checks)
    
    for check_name, passed in checks:
        status = "✓ PASS" if passed else "⚠️  REVIEW"
        print(f"{status} {check_name}")
    
    print(f"\nScore: {passed_checks}/{total_checks} checks passed")
    
    if passed_checks == total_checks:
        print("🔒 Excellent! Your S3 bucket is well secured.")
    elif passed_checks >= total_checks * 0.8:
        print("🟡 Good security. Consider addressing the items above.")
    else:
        print("🔴 Security improvements needed. Please review the recommendations.")
    
    # Suggestions
    print("\n=== Security Recommendations ===")
    print("1. Enable bucket encryption (AES-256 minimum)")
    print("2. Enable versioning for data protection")
    print("3. Block all public access unless specifically needed")
    print("4. Set up lifecycle rules to reduce costs")
    print("5. Monitor access with CloudTrail")
    print("6. Use IAM roles instead of access keys in production")
    
    suggest_cors_config(bucket_name)

if __name__ == "__main__":
    # Change to backend directory
    import sys
    import os
    
    backend_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'backend')
    if os.path.exists(backend_dir):
        sys.path.insert(0, backend_dir)
        os.chdir(backend_dir)
    
    main()