#!/usr/bin/env python3
"""
S3 IAM Policy Generator for SafeShipper
Generates the exact IAM policy needed for your S3 bucket.
"""

import json
import sys
from pathlib import Path

def generate_s3_policy(bucket_name):
    """Generate IAM policy for S3 bucket access"""
    
    policy = {
        "Version": "2012-10-17",
        "Statement": [
            {
                "Sid": "ListBucket",
                "Effect": "Allow",
                "Action": [
                    "s3:ListBucket",
                    "s3:GetBucketLocation",
                    "s3:ListBucketMultipartUploads"
                ],
                "Resource": f"arn:aws:s3:::{bucket_name}"
            },
            {
                "Sid": "ReadWriteObjects",
                "Effect": "Allow",
                "Action": [
                    "s3:GetObject",
                    "s3:GetObjectVersion",
                    "s3:PutObject",
                    "s3:PutObjectAcl",
                    "s3:DeleteObject",
                    "s3:DeleteObjectVersion"
                ],
                "Resource": f"arn:aws:s3:::{bucket_name}/*"
            },
            {
                "Sid": "MultipartUpload",
                "Effect": "Allow",
                "Action": [
                    "s3:ListMultipartUploadParts",
                    "s3:AbortMultipartUpload"
                ],
                "Resource": f"arn:aws:s3:::{bucket_name}/*"
            }
        ]
    }
    
    return policy

def save_policy_to_file(policy, filename):
    """Save policy to JSON file"""
    with open(filename, 'w') as f:
        json.dump(policy, f, indent=2)
    print(f"✓ Policy saved to: {filename}")

def generate_aws_cli_commands(bucket_name, policy_file):
    """Generate AWS CLI commands for setup"""
    
    user_name = "safeshipper-backend"
    policy_name = "SafeShipperS3Policy"
    
    commands = f"""
# SafeShipper S3 Setup - AWS CLI Commands
# Copy and paste these commands into your terminal

# 1. Create IAM policy
aws iam create-policy \\
    --policy-name {policy_name} \\
    --policy-document file://{policy_file} \\
    --description "Policy for SafeShipper S3 access to {bucket_name}"

# 2. Create IAM user
aws iam create-user \\
    --user-name {user_name} \\
    --tags Key=Project,Value=SafeShipper Key=Purpose,Value=S3Access

# 3. Get the policy ARN (you'll need this for the next command)
# Replace YOUR_ACCOUNT_ID with your actual AWS account ID
POLICY_ARN="arn:aws:iam::YOUR_ACCOUNT_ID:policy/{policy_name}"

# 4. Attach policy to user
aws iam attach-user-policy \\
    --user-name {user_name} \\
    --policy-arn $POLICY_ARN

# 5. Create access keys
aws iam create-access-key \\
    --user-name {user_name}

# 6. List attached policies to verify
aws iam list-attached-user-policies \\
    --user-name {user_name}
"""
    
    return commands

def get_account_id_command():
    """Generate command to get AWS account ID"""
    return """
# Get your AWS Account ID
aws sts get-caller-identity --query Account --output text
"""

def main():
    # Your bucket name
    bucket_name = "safeshipper-files-hayden-2025"
    
    print("SafeShipper S3 IAM Policy Generator")
    print("=" * 50)
    print(f"Bucket: {bucket_name}")
    
    # Generate policy
    policy = generate_s3_policy(bucket_name)
    
    # Create output directory
    output_dir = Path("aws-setup")
    output_dir.mkdir(exist_ok=True)
    
    # Save policy to file
    policy_file = output_dir / "s3-policy.json"
    save_policy_to_file(policy, policy_file)
    
    # Generate CLI commands
    cli_commands = generate_aws_cli_commands(bucket_name, policy_file)
    commands_file = output_dir / "setup-commands.sh"
    
    with open(commands_file, 'w') as f:
        f.write(cli_commands)
    
    print(f"✓ CLI commands saved to: {commands_file}")
    
    # Generate account ID command
    account_id_file = output_dir / "get-account-id.sh"
    with open(account_id_file, 'w') as f:
        f.write(get_account_id_command())
    
    print(f"✓ Account ID command saved to: {account_id_file}")
    
    # Display next steps
    print("\n" + "=" * 50)
    print("NEXT STEPS:")
    print("=" * 50)
    
    print("\n1. Install AWS CLI (if not already installed):")
    print("   - Download from: https://aws.amazon.com/cli/")
    print("   - Or: pip install awscli")
    
    print("\n2. Configure AWS CLI with your root account or admin credentials:")
    print("   aws configure")
    print("   - Enter your Access Key ID")
    print("   - Enter your Secret Access Key")
    print("   - Enter region: us-east-1")
    print("   - Enter output format: json")
    
    print("\n3. Get your AWS Account ID:")
    print(f"   bash {account_id_file}")
    
    print("\n4. Update the policy ARN in setup commands:")
    print(f"   - Edit {commands_file}")
    print("   - Replace YOUR_ACCOUNT_ID with your actual account ID")
    
    print("\n5. Run the setup commands:")
    print(f"   bash {commands_file}")
    
    print("\n6. Copy the generated access keys to your .env file")
    
    print(f"\n📁 All files saved in: {output_dir.absolute()}")
    
    # Display policy for reference
    print("\n" + "=" * 50)
    print("GENERATED IAM POLICY:")
    print("=" * 50)
    print(json.dumps(policy, indent=2))

if __name__ == "__main__":
    main()