#!/usr/bin/env python3
"""
Interactive S3 Setup Script for SafeShipper
This script guides you through the complete S3 setup process.
"""

import json
import os
import subprocess
import sys
from pathlib import Path
import re

def check_aws_cli():
    """Check if AWS CLI is installed"""
    try:
        result = subprocess.run(['aws', '--version'], capture_output=True, text=True)
        print(f"✓ AWS CLI installed: {result.stdout.strip()}")
        return True
    except FileNotFoundError:
        print("❌ AWS CLI not found")
        print("Install AWS CLI:")
        print("  - Windows: Download from https://aws.amazon.com/cli/")
        print("  - Linux/Mac: pip install awscli")
        return False

def check_aws_credentials():
    """Check if AWS credentials are configured"""
    try:
        result = subprocess.run(['aws', 'sts', 'get-caller-identity'], 
                              capture_output=True, text=True)
        if result.returncode == 0:
            identity = json.loads(result.stdout)
            print(f"✓ AWS credentials configured")
            print(f"  Account: {identity.get('Account', 'Unknown')}")
            print(f"  User: {identity.get('Arn', 'Unknown')}")
            return True, identity.get('Account')
        else:
            print("❌ AWS credentials not configured")
            return False, None
    except Exception as e:
        print(f"❌ Error checking credentials: {e}")
        return False, None

def configure_aws_cli():
    """Guide user through AWS CLI configuration"""
    print("\n=== AWS CLI Configuration ===")
    print("You need to configure AWS CLI with admin credentials.")
    print("Get these from AWS Console > IAM > Users > Security credentials")
    
    print("\nRun this command and follow the prompts:")
    print("aws configure")
    print("\nEnter:")
    print("  - AWS Access Key ID: [Your admin access key]")
    print("  - AWS Secret Access Key: [Your admin secret key]")
    print("  - Default region name: us-east-1")
    print("  - Default output format: json")
    
    input("\nPress Enter after you've run 'aws configure'...")
    return check_aws_credentials()

def get_account_id():
    """Get AWS account ID"""
    try:
        result = subprocess.run(['aws', 'sts', 'get-caller-identity', 
                               '--query', 'Account', '--output', 'text'], 
                              capture_output=True, text=True)
        if result.returncode == 0:
            account_id = result.stdout.strip()
            print(f"✓ Account ID: {account_id}")
            return account_id
        else:
            print("❌ Could not get account ID")
            return None
    except Exception as e:
        print(f"❌ Error getting account ID: {e}")
        return None

def create_iam_policy(bucket_name, account_id):
    """Create IAM policy for S3 access"""
    policy_name = "SafeShipperS3Policy"
    policy_file = "aws-setup/s3-policy.json"
    
    print(f"\n=== Creating IAM Policy: {policy_name} ===")
    
    try:
        result = subprocess.run([
            'aws', 'iam', 'create-policy',
            '--policy-name', policy_name,
            '--policy-document', f'file://{policy_file}',
            '--description', f'Policy for SafeShipper S3 access to {bucket_name}'
        ], capture_output=True, text=True)
        
        if result.returncode == 0:
            policy_data = json.loads(result.stdout)
            policy_arn = policy_data['Policy']['Arn']
            print(f"✓ Policy created: {policy_arn}")
            return policy_arn
        elif "EntityAlreadyExists" in result.stderr:
            # Policy already exists, get its ARN
            policy_arn = f"arn:aws:iam::{account_id}:policy/{policy_name}"
            print(f"✓ Policy already exists: {policy_arn}")
            return policy_arn
        else:
            print(f"❌ Failed to create policy: {result.stderr}")
            return None
    except Exception as e:
        print(f"❌ Error creating policy: {e}")
        return None

def create_iam_user():
    """Create IAM user for SafeShipper"""
    user_name = "safeshipper-backend"
    
    print(f"\n=== Creating IAM User: {user_name} ===")
    
    try:
        result = subprocess.run([
            'aws', 'iam', 'create-user',
            '--user-name', user_name,
            '--tags', 'Key=Project,Value=SafeShipper', 'Key=Purpose,Value=S3Access'
        ], capture_output=True, text=True)
        
        if result.returncode == 0:
            print(f"✓ User created: {user_name}")
            return user_name
        elif "EntityAlreadyExists" in result.stderr:
            print(f"✓ User already exists: {user_name}")
            return user_name
        else:
            print(f"❌ Failed to create user: {result.stderr}")
            return None
    except Exception as e:
        print(f"❌ Error creating user: {e}")
        return None

def attach_policy_to_user(user_name, policy_arn):
    """Attach policy to user"""
    print(f"\n=== Attaching Policy to User ===")
    
    try:
        result = subprocess.run([
            'aws', 'iam', 'attach-user-policy',
            '--user-name', user_name,
            '--policy-arn', policy_arn
        ], capture_output=True, text=True)
        
        if result.returncode == 0:
            print(f"✓ Policy attached to user")
            return True
        else:
            print(f"❌ Failed to attach policy: {result.stderr}")
            return False
    except Exception as e:
        print(f"❌ Error attaching policy: {e}")
        return False

def create_access_keys(user_name):
    """Create access keys for user"""
    print(f"\n=== Creating Access Keys ===")
    
    try:
        result = subprocess.run([
            'aws', 'iam', 'create-access-key',
            '--user-name', user_name
        ], capture_output=True, text=True)
        
        if result.returncode == 0:
            key_data = json.loads(result.stdout)
            access_key = key_data['AccessKey']
            
            print(f"✓ Access keys created successfully!")
            print(f"  Access Key ID: {access_key['AccessKeyId']}")
            print(f"  Secret Access Key: {access_key['SecretAccessKey']}")
            
            return access_key['AccessKeyId'], access_key['SecretAccessKey']
        else:
            print(f"❌ Failed to create access keys: {result.stderr}")
            return None, None
    except Exception as e:
        print(f"❌ Error creating access keys: {e}")
        return None, None

def update_env_file(access_key_id, secret_access_key, bucket_name):
    """Update .env file with S3 credentials"""
    print(f"\n=== Updating .env File ===")
    
    env_file = Path("backend/.env")
    
    if not env_file.exists():
        print("❌ .env file not found at backend/.env")
        print("Copy from backend/env.example first")
        return False
    
    # Read current .env content
    content = env_file.read_text()
    
    # Update AWS credentials
    patterns = {
        'AWS_ACCESS_KEY_ID': access_key_id,
        'AWS_SECRET_ACCESS_KEY': secret_access_key,
        'AWS_STORAGE_BUCKET_NAME': bucket_name,
        'AWS_S3_REGION_NAME': 'us-east-1'
    }
    
    for key, value in patterns.items():
        pattern = f'{key}=.*'
        replacement = f'{key}={value}'
        
        if re.search(pattern, content):
            content = re.sub(pattern, replacement, content)
        else:
            # Add if not found
            content += f'\n{replacement}'
    
    # Write updated content
    env_file.write_text(content)
    print(f"✓ Updated .env file with S3 credentials")
    return True

def test_s3_integration():
    """Run S3 integration test"""
    print(f"\n=== Testing S3 Integration ===")
    
    try:
        # Change to backend directory for the test
        original_cwd = os.getcwd()
        os.chdir("backend")
        
        result = subprocess.run([
            sys.executable, "test_s3_integration.py"
        ], capture_output=True, text=True)
        
        os.chdir(original_cwd)
        
        if result.returncode == 0:
            print("✓ S3 integration test completed")
            print("\nTest output:")
            print(result.stdout)
        else:
            print("❌ S3 integration test failed")
            print(result.stderr)
            
        return result.returncode == 0
    except Exception as e:
        print(f"❌ Error running test: {e}")
        return False

def main():
    """Main interactive setup function"""
    print("SafeShipper S3 Interactive Setup")
    print("=" * 50)
    
    bucket_name = "safeshipper-files-hayden-2025"
    print(f"Setting up S3 for bucket: {bucket_name}")
    
    # Step 1: Check AWS CLI
    if not check_aws_cli():
        print("\nPlease install AWS CLI and run this script again.")
        return
    
    # Step 2: Check/configure AWS credentials
    has_creds, account_id = check_aws_credentials()
    if not has_creds:
        has_creds, account_id = configure_aws_cli()
        if not has_creds:
            print("❌ Could not configure AWS credentials")
            return
    
    # Step 3: Get account ID if not available
    if not account_id:
        account_id = get_account_id()
        if not account_id:
            print("❌ Could not get AWS account ID")
            return
    
    # Step 4: Create IAM policy
    policy_arn = create_iam_policy(bucket_name, account_id)
    if not policy_arn:
        print("❌ Failed to create IAM policy")
        return
    
    # Step 5: Create IAM user
    user_name = create_iam_user()
    if not user_name:
        print("❌ Failed to create IAM user")
        return
    
    # Step 6: Attach policy to user
    if not attach_policy_to_user(user_name, policy_arn):
        print("❌ Failed to attach policy to user")
        return
    
    # Step 7: Create access keys
    access_key_id, secret_access_key = create_access_keys(user_name)
    if not access_key_id:
        print("❌ Failed to create access keys")
        return
    
    # Step 8: Update .env file
    if not update_env_file(access_key_id, secret_access_key, bucket_name):
        print("❌ Failed to update .env file")
        return
    
    # Step 9: Test integration
    print("\n" + "=" * 50)
    print("SETUP COMPLETE!")
    print("=" * 50)
    
    print(f"✓ IAM Policy: {policy_arn}")
    print(f"✓ IAM User: {user_name}")
    print(f"✓ Access Key ID: {access_key_id}")
    print(f"✓ Secret Key: {secret_access_key[:8]}...")
    print(f"✓ Bucket: {bucket_name}")
    print(f"✓ .env file updated")
    
    # Offer to run test
    run_test = input("\nRun S3 integration test now? (y/n): ").lower().strip()
    if run_test == 'y':
        test_s3_integration()
    
    print("\n🎉 S3 setup complete! Your SafeShipper project can now use AWS S3.")
    print("\nNext steps:")
    print("- Your Django app will automatically use S3 for file storage")
    print("- Upload some files to test the integration")
    print("- Monitor your AWS costs in the AWS Console")

if __name__ == "__main__":
    main()