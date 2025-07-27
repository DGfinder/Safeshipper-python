#!/usr/bin/env python
"""
Test script for AWS S3 integration.
Run this script to test S3 connectivity, file operations, and security.
"""

import os
import sys
import django
import json
import tempfile
import uuid
from datetime import datetime

# Add the backend directory to the Python path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'safeshipper_core.settings')
django.setup()

import boto3
from botocore.exceptions import ClientError, NoCredentialsError
from django.conf import settings
from django.core.files.base import ContentFile

# Test data
TEST_BUCKET_PREFIX = "test-safeshipper-integration"
TEST_FILE_CONTENT = b"This is a test file for SafeShipper S3 integration"
TEST_FOLDER = "test/"


def check_s3_configuration():
    """Check if S3 is properly configured"""
    print("=== S3 Configuration Check ===")
    
    # Check AWS credentials
    aws_access_key = getattr(settings, 'AWS_ACCESS_KEY_ID', None)
    aws_secret_key = getattr(settings, 'AWS_SECRET_ACCESS_KEY', None)
    bucket_name = getattr(settings, 'AWS_STORAGE_BUCKET_NAME', None)
    region = getattr(settings, 'AWS_S3_REGION_NAME', 'us-east-1')
    
    if not aws_access_key:
        print("❌ AWS_ACCESS_KEY_ID not configured")
        return False, None
    
    if not aws_secret_key:
        print("❌ AWS_SECRET_ACCESS_KEY not configured")
        return False, None
    
    if not bucket_name:
        print("❌ AWS_STORAGE_BUCKET_NAME not configured")
        return False, None
    
    print(f"✓ AWS credentials configured")
    print(f"  Access Key: {aws_access_key[:8]}...")
    print(f"  Bucket: {bucket_name}")
    print(f"  Region: {region}")
    
    # Create S3 client
    try:
        s3_client = boto3.client(
            's3',
            aws_access_key_id=aws_access_key,
            aws_secret_access_key=aws_secret_key,
            region_name=region
        )
        return True, s3_client
    except Exception as e:
        print(f"❌ Failed to create S3 client: {e}")
        return False, None


def test_s3_connectivity(s3_client):
    """Test basic S3 connectivity"""
    print("\n=== S3 Connectivity Test ===")
    
    try:
        # List buckets to test connectivity
        response = s3_client.list_buckets()
        buckets = [bucket['Name'] for bucket in response['Buckets']]
        print(f"✓ Connected to S3 successfully")
        print(f"  Found {len(buckets)} buckets")
        
        for bucket in buckets[:5]:  # Show first 5 buckets
            print(f"    - {bucket}")
        
        if len(buckets) > 5:
            print(f"    ... and {len(buckets) - 5} more")
        
        return True
        
    except NoCredentialsError:
        print("❌ AWS credentials not found or invalid")
        return False
    except ClientError as e:
        error_code = e.response['Error']['Code']
        if error_code == 'AccessDenied':
            print("❌ Access denied - check IAM permissions")
        else:
            print(f"❌ AWS error: {error_code}")
        return False
    except Exception as e:
        print(f"❌ Unexpected error: {e}")
        return False


def test_bucket_access(s3_client):
    """Test access to configured bucket"""
    print("\n=== Bucket Access Test ===")
    
    bucket_name = settings.AWS_STORAGE_BUCKET_NAME
    
    try:
        # Check if bucket exists and is accessible
        s3_client.head_bucket(Bucket=bucket_name)
        print(f"✓ Bucket '{bucket_name}' is accessible")
        
        # Get bucket location
        try:
            location = s3_client.get_bucket_location(Bucket=bucket_name)
            region = location['LocationConstraint'] or 'us-east-1'
            print(f"  Location: {region}")
        except Exception:
            print("  Location: Could not determine")
        
        # Check bucket encryption
        try:
            encryption = s3_client.get_bucket_encryption(Bucket=bucket_name)
            print(f"✓ Bucket encryption enabled")
            for rule in encryption['ServerSideEncryptionConfiguration']['Rules']:
                sse = rule['ApplyServerSideEncryptionByDefault']
                print(f"  Algorithm: {sse['SSEAlgorithm']}")
        except ClientError as e:
            if e.response['Error']['Code'] == 'ServerSideEncryptionConfigurationNotFoundError':
                print("⚠️  Bucket encryption not configured")
            else:
                print(f"⚠️  Could not check encryption: {e}")
        
        # Check bucket versioning
        try:
            versioning = s3_client.get_bucket_versioning(Bucket=bucket_name)
            status = versioning.get('Status', 'Disabled')
            print(f"  Versioning: {status}")
        except Exception as e:
            print(f"  Versioning: Could not check ({e})")
        
        return True
        
    except ClientError as e:
        error_code = e.response['Error']['Code']
        if error_code == 'NoSuchBucket':
            print(f"❌ Bucket '{bucket_name}' does not exist")
        elif error_code == 'AccessDenied':
            print(f"❌ Access denied to bucket '{bucket_name}'")
        else:
            print(f"❌ Error accessing bucket: {error_code}")
        return False
    except Exception as e:
        print(f"❌ Unexpected error: {e}")
        return False


def test_file_upload(s3_client):
    """Test file upload operations"""
    print("\n=== File Upload Test ===")
    
    bucket_name = settings.AWS_STORAGE_BUCKET_NAME
    test_key = f"{TEST_FOLDER}test-upload-{uuid.uuid4().hex[:8]}.txt"
    
    try:
        # Upload test file
        s3_client.put_object(
            Bucket=bucket_name,
            Key=test_key,
            Body=TEST_FILE_CONTENT,
            ContentType='text/plain',
            ServerSideEncryption='AES256',
            Metadata={
                'test': 'true',
                'platform': 'safeshipper',
                'uploaded_at': datetime.now().isoformat()
            }
        )
        print(f"✓ Uploaded test file: {test_key}")
        
        # Verify file exists
        response = s3_client.head_object(Bucket=bucket_name, Key=test_key)
        print(f"  Size: {response['ContentLength']} bytes")
        print(f"  ETag: {response['ETag']}")
        print(f"  Encryption: {response.get('ServerSideEncryption', 'None')}")
        
        return test_key
        
    except ClientError as e:
        error_code = e.response['Error']['Code']
        print(f"❌ Upload failed: {error_code}")
        return None
    except Exception as e:
        print(f"❌ Unexpected upload error: {e}")
        return None


def test_file_download(s3_client, test_key):
    """Test file download operations"""
    print("\n=== File Download Test ===")
    
    if not test_key:
        print("⏭️  Skipped - no test file available")
        return False
    
    bucket_name = settings.AWS_STORAGE_BUCKET_NAME
    
    try:
        # Download file
        response = s3_client.get_object(Bucket=bucket_name, Key=test_key)
        downloaded_content = response['Body'].read()
        
        # Verify content
        if downloaded_content == TEST_FILE_CONTENT:
            print(f"✓ Downloaded and verified file content")
            print(f"  Content length: {len(downloaded_content)} bytes")
        else:
            print(f"❌ Content mismatch")
            return False
        
        # Check metadata
        metadata = response.get('Metadata', {})
        print(f"  Metadata: {len(metadata)} items")
        for key, value in metadata.items():
            print(f"    {key}: {value}")
        
        return True
        
    except ClientError as e:
        error_code = e.response['Error']['Code']
        print(f"❌ Download failed: {error_code}")
        return False
    except Exception as e:
        print(f"❌ Unexpected download error: {e}")
        return False


def test_presigned_urls(s3_client):
    """Test presigned URL generation"""
    print("\n=== Presigned URL Test ===")
    
    bucket_name = settings.AWS_STORAGE_BUCKET_NAME
    test_key = f"{TEST_FOLDER}presigned-test-{uuid.uuid4().hex[:8]}.txt"
    
    try:
        # Generate presigned URL for upload
        upload_url = s3_client.generate_presigned_post(
            Bucket=bucket_name,
            Key=test_key,
            Fields={
                'Content-Type': 'text/plain',
                'x-amz-server-side-encryption': 'AES256'
            },
            Conditions=[
                {'Content-Type': 'text/plain'},
                {'x-amz-server-side-encryption': 'AES256'},
                ['content-length-range', 1, 1024]
            ],
            ExpiresIn=3600
        )
        print(f"✓ Generated presigned upload URL")
        print(f"  URL: {upload_url['url'][:50]}...")
        print(f"  Fields: {len(upload_url['fields'])} required fields")
        
        # Upload a test file first for download test
        s3_client.put_object(
            Bucket=bucket_name,
            Key=test_key,
            Body=b"Presigned URL test content",
            ServerSideEncryption='AES256'
        )
        
        # Generate presigned URL for download
        download_url = s3_client.generate_presigned_url(
            'get_object',
            Params={'Bucket': bucket_name, 'Key': test_key},
            ExpiresIn=3600
        )
        print(f"✓ Generated presigned download URL")
        print(f"  URL: {download_url[:50]}...")
        
        return test_key
        
    except Exception as e:
        print(f"❌ Presigned URL generation failed: {e}")
        return None


def test_list_operations(s3_client):
    """Test file listing operations"""
    print("\n=== List Operations Test ===")
    
    bucket_name = settings.AWS_STORAGE_BUCKET_NAME
    
    try:
        # List objects in test folder
        response = s3_client.list_objects_v2(
            Bucket=bucket_name,
            Prefix=TEST_FOLDER,
            MaxKeys=10
        )
        
        if 'Contents' in response:
            objects = response['Contents']
            print(f"✓ Found {len(objects)} objects in {TEST_FOLDER}")
            
            for obj in objects[:5]:  # Show first 5 objects
                size_kb = obj['Size'] / 1024
                print(f"  - {obj['Key']} ({size_kb:.1f} KB)")
            
            if len(objects) > 5:
                print(f"  ... and {len(objects) - 5} more objects")
        else:
            print(f"✓ No objects found in {TEST_FOLDER} (empty folder)")
        
        # Test pagination
        if response.get('IsTruncated'):
            print("  📄 Results are paginated")
            continuation_token = response.get('NextContinuationToken')
            print(f"  Next token: {continuation_token[:20]}...")
        
        return True
        
    except Exception as e:
        print(f"❌ List operations failed: {e}")
        return False


def test_permissions(s3_client):
    """Test IAM permissions and security"""
    print("\n=== Permissions Test ===")
    
    bucket_name = settings.AWS_STORAGE_BUCKET_NAME
    permissions_tested = {}
    
    # Test GetObject permission
    try:
        test_key = f"{TEST_FOLDER}permission-test.txt"
        s3_client.put_object(Bucket=bucket_name, Key=test_key, Body=b"test")
        s3_client.get_object(Bucket=bucket_name, Key=test_key)
        permissions_tested['GetObject'] = True
        s3_client.delete_object(Bucket=bucket_name, Key=test_key)  # cleanup
    except ClientError:
        permissions_tested['GetObject'] = False
    
    # Test PutObject permission
    try:
        test_key = f"{TEST_FOLDER}put-test-{uuid.uuid4().hex[:8]}.txt"
        s3_client.put_object(Bucket=bucket_name, Key=test_key, Body=b"put test")
        permissions_tested['PutObject'] = True
    except ClientError:
        permissions_tested['PutObject'] = False
        test_key = None
    
    # Test DeleteObject permission
    if test_key:
        try:
            s3_client.delete_object(Bucket=bucket_name, Key=test_key)
            permissions_tested['DeleteObject'] = True
        except ClientError:
            permissions_tested['DeleteObject'] = False
    else:
        permissions_tested['DeleteObject'] = False
    
    # Test ListBucket permission
    try:
        s3_client.list_objects_v2(Bucket=bucket_name, MaxKeys=1)
        permissions_tested['ListBucket'] = True
    except ClientError:
        permissions_tested['ListBucket'] = False
    
    # Display results
    for permission, has_access in permissions_tested.items():
        status = "✓" if has_access else "❌"
        print(f"  {status} {permission}")
    
    # Check for minimum required permissions
    required_permissions = ['GetObject', 'PutObject', 'ListBucket']
    has_required = all(permissions_tested.get(perm, False) for perm in required_permissions)
    
    if has_required:
        print("✓ Has minimum required permissions")
    else:
        print("❌ Missing required permissions")
        missing = [perm for perm in required_permissions if not permissions_tested.get(perm)]
        print(f"  Missing: {', '.join(missing)}")
    
    return has_required


def test_django_storage_integration():
    """Test Django file storage integration"""
    print("\n=== Django Storage Integration Test ===")
    
    try:
        from django.core.files.storage import default_storage
        
        # Check if using S3 storage
        storage_class = default_storage.__class__.__name__
        print(f"  Storage backend: {storage_class}")
        
        if 'S3' not in storage_class:
            print("ℹ️  Not using S3 storage backend - using local storage")
            return True
        
        # Test file save
        test_content = ContentFile(b"Django storage test content")
        test_filename = f"django-test-{uuid.uuid4().hex[:8]}.txt"
        
        saved_name = default_storage.save(test_filename, test_content)
        print(f"✓ Saved file via Django storage: {saved_name}")
        
        # Test file exists
        if default_storage.exists(saved_name):
            print(f"✓ File exists check passed")
        else:
            print(f"❌ File exists check failed")
            return False
        
        # Test file URL
        file_url = default_storage.url(saved_name)
        print(f"✓ Generated file URL: {file_url[:50]}...")
        
        # Test file size
        file_size = default_storage.size(saved_name)
        print(f"  File size: {file_size} bytes")
        
        # Test file deletion
        default_storage.delete(saved_name)
        print(f"✓ Deleted file via Django storage")
        
        return True
        
    except Exception as e:
        print(f"❌ Django storage integration failed: {e}")
        return False


def test_error_handling(s3_client):
    """Test error handling scenarios"""
    print("\n=== Error Handling Test ===")
    
    bucket_name = settings.AWS_STORAGE_BUCKET_NAME
    test_results = []
    
    # Test non-existent object
    try:
        s3_client.get_object(Bucket=bucket_name, Key='non-existent-file.txt')
        test_results.append("❌ Should have failed for non-existent file")
    except ClientError as e:
        if e.response['Error']['Code'] == 'NoSuchKey':
            test_results.append("✓ Correctly handled non-existent file")
        else:
            test_results.append(f"❌ Unexpected error: {e.response['Error']['Code']}")
    
    # Test invalid bucket name (if we had permission to test this)
    # This test is commented out as it would require additional permissions
    # and might affect other operations
    
    # Test invalid key name
    try:
        # Keys with certain characters might be problematic
        invalid_key = "test/\x00invalid\x01key.txt"
        s3_client.put_object(Bucket=bucket_name, Key=invalid_key, Body=b"test")
        test_results.append("⚠️  Allowed potentially problematic key name")
    except Exception:
        test_results.append("✓ Rejected invalid key name")
    
    for result in test_results:
        print(f"  {result}")
    
    return all("✓" in result or "⚠️" in result for result in test_results)


def cleanup_test_files(s3_client):
    """Clean up test files created during testing"""
    print("\n=== Cleanup Test Files ===")
    
    bucket_name = settings.AWS_STORAGE_BUCKET_NAME
    
    try:
        # List all test files
        response = s3_client.list_objects_v2(
            Bucket=bucket_name,
            Prefix=TEST_FOLDER
        )
        
        if 'Contents' not in response:
            print("✓ No test files to clean up")
            return True
        
        # Delete test files
        objects_to_delete = [{'Key': obj['Key']} for obj in response['Contents']]
        
        if objects_to_delete:
            delete_response = s3_client.delete_objects(
                Bucket=bucket_name,
                Delete={'Objects': objects_to_delete}
            )
            
            deleted_count = len(delete_response.get('Deleted', []))
            error_count = len(delete_response.get('Errors', []))
            
            print(f"🧹 Deleted {deleted_count} test files")
            
            if error_count > 0:
                print(f"⚠️  {error_count} files could not be deleted")
                for error in delete_response.get('Errors', []):
                    print(f"    {error['Key']}: {error['Code']}")
        
        return True
        
    except Exception as e:
        print(f"⚠️  Cleanup failed: {e}")
        return False


def display_setup_instructions():
    """Display S3 setup instructions"""
    print("\n=== AWS S3 Setup Instructions ===")
    
    print("\n🔧 AWS Account Setup:")
    print("1. Create AWS account at https://aws.amazon.com/")
    print("2. Go to S3 console and create a bucket")
    print("3. Create IAM user with S3 permissions")
    print("4. Generate access keys for the IAM user")
    
    print("\n🔑 Required IAM Permissions:")
    print("```json")
    print("""{
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
}""")
    print("```")
    
    print("\n🌍 Environment Variables:")
    print("Set these in your .env file:")
    print("```")
    print("AWS_ACCESS_KEY_ID=AKIA...")
    print("AWS_SECRET_ACCESS_KEY=...")
    print("AWS_STORAGE_BUCKET_NAME=your-bucket-name")
    print("AWS_S3_REGION_NAME=us-east-1")
    print("```")
    
    print("\n🔒 Security Best Practices:")
    print("- Enable bucket encryption (AES-256)")
    print("- Enable versioning for production")
    print("- Set up lifecycle rules for cost optimization")
    print("- Use IAM roles instead of keys when possible")
    print("- Enable CloudTrail for audit logging")
    
    print("\n📊 Django Integration:")
    print("Add to settings.py:")
    print("```python")
    print("DEFAULT_FILE_STORAGE = 'storages.backends.s3boto3.S3Boto3Storage'")
    print("AWS_S3_FILE_OVERWRITE = False")
    print("AWS_DEFAULT_ACL = None")
    print("AWS_S3_OBJECT_PARAMETERS = {'ServerSideEncryption': 'AES256'}")
    print("```")


def main():
    """Main test function"""
    print("SafeShipper AWS S3 Integration Test")
    print("=" * 50)
    
    # Check configuration
    is_configured, s3_client = check_s3_configuration()
    if not is_configured:
        print("\n❌ S3 not configured properly")
        display_setup_instructions()
        return
    
    test_results = {}
    test_key = None
    presigned_key = None
    
    # Run tests
    test_results['connectivity'] = test_s3_connectivity(s3_client)
    test_results['bucket_access'] = test_bucket_access(s3_client)
    
    if test_results['bucket_access']:
        test_key = test_file_upload(s3_client)
        test_results['file_upload'] = test_key is not None
        test_results['file_download'] = test_file_download(s3_client, test_key)
        presigned_key = test_presigned_urls(s3_client)
        test_results['presigned_urls'] = presigned_key is not None
        test_results['list_operations'] = test_list_operations(s3_client)
        test_results['permissions'] = test_permissions(s3_client)
        test_results['django_integration'] = test_django_storage_integration()
        test_results['error_handling'] = test_error_handling(s3_client)
        
        # Cleanup
        cleanup_test_files(s3_client)
    else:
        # Skip dependent tests if bucket access failed
        for test_name in ['file_upload', 'file_download', 'presigned_urls', 
                         'list_operations', 'permissions', 'django_integration', 
                         'error_handling']:
            test_results[test_name] = False
    
    # Summary
    print("\n" + "=" * 50)
    print("S3 INTEGRATION TEST SUMMARY")
    print("=" * 50)
    
    passed_tests = sum(test_results.values())
    total_tests = len(test_results)
    
    for test_name, result in test_results.items():
        status = "✓ PASS" if result else "❌ FAIL"
        print(f"{status} {test_name.replace('_', ' ').title()}")
    
    print(f"\nOverall: {passed_tests}/{total_tests} tests passed")
    
    if passed_tests == total_tests:
        print("🎉 All tests passed! S3 integration is working correctly.")
    elif passed_tests >= total_tests * 0.7:
        print("⚠️  Most tests passed. Check failed tests above.")
    else:
        print("❌ Multiple test failures. Check configuration and setup.")
    
    if not test_results.get('connectivity'):
        print("\n💡 If connectivity failed:")
        print("   - Verify AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY")
        print("   - Check internet connection")
        print("   - Ensure IAM user has S3 permissions")
    
    if not test_results.get('bucket_access'):
        print("\n💡 If bucket access failed:")
        print("   - Verify AWS_STORAGE_BUCKET_NAME exists")
        print("   - Check bucket permissions and policies")
        print("   - Ensure bucket is in correct region")
    
    print(f"\n📖 For detailed setup instructions, see:")
    print(f"   docs/external-services/aws_s3_setup.md")


if __name__ == "__main__":
    main()