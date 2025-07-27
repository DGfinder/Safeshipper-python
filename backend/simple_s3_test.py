#!/usr/bin/env python
"""
Simple S3 Test Script for SafeShipper
This script tests basic S3 connectivity without requiring full Django setup.
"""

import os
import sys
import boto3
from botocore.exceptions import ClientError, NoCredentialsError
from decouple import config

def test_s3_setup():
    """Test S3 configuration and connectivity"""
    print("🚀 SafeShipper S3 Setup Test")
    print("=" * 50)
    
    # Check environment variables
    print("\n📋 Checking Environment Variables:")
    
    aws_access_key = config('AWS_ACCESS_KEY_ID', default='')
    aws_secret_key = config('AWS_SECRET_ACCESS_KEY', default='')
    bucket_name = config('AWS_STORAGE_BUCKET_NAME', default='')
    region = config('AWS_S3_REGION_NAME', default='us-east-1')
    
    if not aws_access_key:
        print("❌ AWS_ACCESS_KEY_ID not found in .env file")
        print("   Please add: AWS_ACCESS_KEY_ID=your-access-key")
        return False
    
    if not aws_secret_key:
        print("❌ AWS_SECRET_ACCESS_KEY not found in .env file")
        print("   Please add: AWS_SECRET_ACCESS_KEY=your-secret-key")
        return False
    
    if not bucket_name:
        print("❌ AWS_STORAGE_BUCKET_NAME not found in .env file")
        print("   Please add: AWS_STORAGE_BUCKET_NAME=your-bucket-name")
        return False
    
    print(f"✓ AWS_ACCESS_KEY_ID: {aws_access_key[:8]}...")
    print(f"✓ AWS_SECRET_ACCESS_KEY: [CONFIGURED]")
    print(f"✓ AWS_STORAGE_BUCKET_NAME: {bucket_name}")
    print(f"✓ AWS_S3_REGION_NAME: {region}")
    
    # Test S3 connectivity
    print("\n🔗 Testing S3 Connectivity:")
    
    try:
        s3_client = boto3.client(
            's3',
            aws_access_key_id=aws_access_key,
            aws_secret_access_key=aws_secret_key,
            region_name=region
        )
        
        # List buckets to test connectivity
        response = s3_client.list_buckets()
        buckets = [bucket['Name'] for bucket in response['Buckets']]
        print(f"✓ Successfully connected to AWS S3")
        print(f"  Found {len(buckets)} buckets in your account")
        
        # Check if our bucket exists
        if bucket_name in buckets:
            print(f"✓ Target bucket '{bucket_name}' found")
        else:
            print(f"⚠️  Target bucket '{bucket_name}' not found")
            print(f"  Available buckets: {buckets[:5]}{'...' if len(buckets) > 5 else ''}")
            return False
        
        # Test bucket access
        print("\n🔐 Testing Bucket Access:")
        try:
            s3_client.head_bucket(Bucket=bucket_name)
            print(f"✓ Bucket '{bucket_name}' is accessible")
            
            # Check bucket encryption
            try:
                encryption = s3_client.get_bucket_encryption(Bucket=bucket_name)
                print(f"✓ Bucket encryption enabled")
                for rule in encryption['ServerSideEncryptionConfiguration']['Rules']:
                    sse = rule['ApplyServerSideEncryptionByDefault']
                    print(f"  Algorithm: {sse['SSEAlgorithm']}")
            except ClientError as e:
                if e.response['Error']['Code'] == 'ServerSideEncryptionConfigurationNotFoundError':
                    print("⚠️  Bucket encryption not configured (recommended for production)")
                else:
                    print(f"⚠️  Could not check encryption: {e}")
            
        except ClientError as e:
            error_code = e.response['Error']['Code']
            if error_code == 'AccessDenied':
                print(f"❌ Access denied to bucket '{bucket_name}'")
                print("   Check IAM permissions for your user")
                return False
            else:
                print(f"❌ Error accessing bucket: {error_code}")
                return False
        
        # Test file upload
        print("\n📤 Testing File Upload:")
        test_key = f"test/safeshipper-test-{os.getpid()}.txt"
        test_content = b"This is a test file for SafeShipper S3 integration"
        
        try:
            s3_client.put_object(
                Bucket=bucket_name,
                Key=test_key,
                Body=test_content,
                ContentType='text/plain',
                ServerSideEncryption='AES256',
                Metadata={
                    'test': 'true',
                    'platform': 'safeshipper',
                    'uploaded_by': 'setup_test'
                }
            )
            print(f"✓ Successfully uploaded test file: {test_key}")
            
            # Verify file exists
            response = s3_client.head_object(Bucket=bucket_name, Key=test_key)
            print(f"  File size: {response['ContentLength']} bytes")
            print(f"  ETag: {response['ETag']}")
            print(f"  Encryption: {response.get('ServerSideEncryption', 'None')}")
            
            # Clean up test file
            s3_client.delete_object(Bucket=bucket_name, Key=test_key)
            print(f"✓ Cleaned up test file")
            
        except ClientError as e:
            print(f"❌ File upload failed: {e.response['Error']['Code']}")
            return False
        
        print("\n🎉 S3 Setup Test PASSED!")
        print("Your SafeShipper project is ready to use S3 for file storage.")
        return True
        
    except NoCredentialsError:
        print("❌ AWS credentials not found or invalid")
        print("   Please check your .env file configuration")
        return False
    except ClientError as e:
        error_code = e.response['Error']['Code']
        if error_code == 'AccessDenied':
            print("❌ Access denied - check IAM permissions")
            print("   Ensure your IAM user has S3 permissions")
        else:
            print(f"❌ AWS error: {error_code}")
        return False
    except Exception as e:
        print(f"❌ Unexpected error: {e}")
        return False

def show_setup_instructions():
    """Show setup instructions if test fails"""
    print("\n" + "=" * 50)
    print("📚 S3 Setup Instructions")
    print("=" * 50)
    
    print("\n1. Create AWS Account:")
    print("   - Go to https://aws.amazon.com/")
    print("   - Click 'Create an AWS Account'")
    print("   - Follow the registration process")
    
    print("\n2. Create S3 Bucket:")
    print("   - Go to AWS Console → S3")
    print("   - Click 'Create bucket'")
    print("   - Bucket name: safeshipper-files-[your-unique-id]")
    print("   - Region: us-east-1 (or your preferred)")
    print("   - Enable encryption: AES-256")
    print("   - Block all public access: Yes")
    
    print("\n3. Create IAM User:")
    print("   - Go to IAM → Users → Create user")
    print("   - Username: safeshipper-backend")
    print("   - Access type: Programmatic access")
    print("   - Save the Access Key ID and Secret Access Key")
    
    print("\n4. Create IAM Policy:")
    print("   - Go to IAM → Policies → Create policy")
    print("   - Use JSON editor with this policy:")
    print("""
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Action": [
                "s3:GetObject",
                "s3:PutObject",
                "s3:DeleteObject",
                "s3:ListBucket"
            ],
            "Resource": [
                "arn:aws:s3:::your-bucket-name",
                "arn:aws:s3:::your-bucket-name/*"
            ]
        }
    ]
}
""")
    
    print("\n5. Update .env file:")
    print("   Add these lines to backend/.env:")
    print("""
AWS_ACCESS_KEY_ID=AKIA...your-access-key-id
AWS_SECRET_ACCESS_KEY=...your-secret-access-key
AWS_STORAGE_BUCKET_NAME=safeshipper-files-[your-bucket-name]
AWS_S3_REGION_NAME=us-east-1
""")
    
    print("\n6. Run this test again:")
    print("   python simple_s3_test.py")

if __name__ == "__main__":
    success = test_s3_setup()
    
    if not success:
        show_setup_instructions()
    else:
        print("\n✅ Next Steps:")
        print("1. Your S3 setup is working correctly!")
        print("2. The SafeShipper Django app will automatically use S3")
        print("3. Files uploaded through the app will be stored in S3")
        print("4. Monitor your AWS costs and usage") 