# ☁️ AWS S3 File Storage Setup Guide

This comprehensive guide covers setting up AWS S3 for file storage in the SafeShipper platform, including document uploads, manifest storage, and static asset hosting.

## 📋 Table of Contents

1. [Overview](#overview)
2. [AWS Account Setup](#aws-account-setup)
3. [S3 Bucket Configuration](#s3-bucket-configuration)
4. [IAM Security Setup](#iam-security-setup)
5. [CORS Configuration](#cors-configuration)
6. [Backend Integration](#backend-integration)
7. [Frontend Upload Integration](#frontend-upload-integration)
8. [CDN Setup with CloudFront](#cdn-setup-with-cloudfront)
9. [Cost Optimization](#cost-optimization)
10. [Backup & Disaster Recovery](#backup--disaster-recovery)
11. [Production Deployment](#production-deployment)
12. [Troubleshooting](#troubleshooting)

---

## Overview

SafeShipper uses AWS S3 for:
- **Document Storage**: Manifests, invoices, shipping documents
- **Safety Data Sheets**: SDS/MSDS document repository
- **Media Files**: Vehicle images, inspection photos
- **Report Storage**: Generated PDF reports and analytics
- **Backup Storage**: Database backups and archives

### Storage Structure

```
safeshipper-production/
├── documents/
│   ├── manifests/
│   ├── invoices/
│   ├── reports/
│   └── contracts/
├── sds/
│   ├── chemicals/
│   └── products/
├── media/
│   ├── vehicles/
│   ├── inspections/
│   └── incidents/
├── temp/
│   └── uploads/
└── backups/
    ├── database/
    └── configs/
```

---

## AWS Account Setup

### Step 1: Create AWS Account

1. Visit [AWS Console](https://aws.amazon.com/)
2. Click "Create an AWS Account"
3. Provide required information:
   - Email address
   - Password
   - Account name: "SafeShipper Production"
4. Choose account type: "Professional" (for business use)
5. Complete payment information
6. Verify phone number
7. Select support plan (Basic is free)

### Step 2: Secure Root Account

1. Enable MFA on root account:
   - IAM → Security credentials
   - Activate MFA device
   - Use authenticator app (recommended)
2. Create IAM admin user for daily operations
3. Never use root account for regular access

### Step 3: Set Billing Alerts

1. Navigate to "Billing & Cost Management"
2. Set up billing alerts:
   - Preferences → Billing preferences
   - ✓ Receive Billing Alerts
3. Create CloudWatch alarm:
   - Set threshold (e.g., $100/month)
   - Configure email notifications

---

## S3 Bucket Configuration

### Step 1: Create S3 Buckets

Navigate to S3 service and create buckets:

#### Production Bucket
```
Bucket name: safeshipper-production
Region: us-east-1 (or your preferred region)
Block all public access: Yes (initially)
Versioning: Enable
Server-side encryption: Enable (AES-256)
```

#### Development Bucket
```
Bucket name: safeshipper-development
Region: Same as production
Block all public access: Yes
Versioning: Disable (save costs)
```

### Step 2: Configure Bucket Settings

#### Versioning (Production only)
```
Properties → Versioning → Enable
Reason: Protect against accidental deletion
```

#### Lifecycle Rules
```
Management → Lifecycle rules → Create rule
Rule name: archive-old-files
Status: Enabled

Transitions:
- Standard → Standard-IA after 30 days
- Standard-IA → Glacier after 90 days
- Delete after 365 days (optional)

Apply to: temp/* and backups/database/*
```

#### Server-side Encryption
```
Properties → Default encryption
Encryption type: SSE-S3 (AES-256)
Bucket Key: Enable (reduces costs)
```

### Step 3: Bucket Policies

Create bucket policy for controlled access:

```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Sid": "DenyUnencryptedObjectUploads",
            "Effect": "Deny",
            "Principal": "*",
            "Action": "s3:PutObject",
            "Resource": "arn:aws:s3:::safeshipper-production/*",
            "Condition": {
                "StringNotEquals": {
                    "s3:x-amz-server-side-encryption": "AES256"
                }
            }
        },
        {
            "Sid": "DenyInsecureConnections",
            "Effect": "Deny",
            "Principal": "*",
            "Action": "s3:*",
            "Resource": [
                "arn:aws:s3:::safeshipper-production",
                "arn:aws:s3:::safeshipper-production/*"
            ],
            "Condition": {
                "Bool": {
                    "aws:SecureTransport": "false"
                }
            }
        }
    ]
}
```

---

## IAM Security Setup

### Step 1: Create IAM User

1. Navigate to IAM → Users → Add user
2. User name: `safeshipper-backend-prod`
3. Access type: ✓ Programmatic access
4. Skip permissions (will add via policy)
5. Create user and save credentials

### Step 2: Create Custom Policy

Create policy with minimal required permissions:

```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Sid": "ListBucket",
            "Effect": "Allow",
            "Action": [
                "s3:ListBucket",
                "s3:GetBucketLocation"
            ],
            "Resource": "arn:aws:s3:::safeshipper-production"
        },
        {
            "Sid": "ReadWriteObjects",
            "Effect": "Allow",
            "Action": [
                "s3:GetObject",
                "s3:PutObject",
                "s3:DeleteObject",
                "s3:GetObjectVersion"
            ],
            "Resource": "arn:aws:s3:::safeshipper-production/*"
        },
        {
            "Sid": "MultipartUpload",
            "Effect": "Allow",
            "Action": [
                "s3:ListMultipartUploadParts",
                "s3:AbortMultipartUpload"
            ],
            "Resource": "arn:aws:s3:::safeshipper-production/*"
        }
    ]
}
```

### Step 3: Attach Policy to User

1. IAM → Users → safeshipper-backend-prod
2. Add permissions → Attach policies
3. Select your custom policy
4. Review and attach

### Step 4: Create Frontend Upload Policy

For secure browser uploads, create a more restrictive policy:

```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Sid": "UploadToTempOnly",
            "Effect": "Allow",
            "Action": [
                "s3:PutObject",
                "s3:PutObjectAcl"
            ],
            "Resource": "arn:aws:s3:::safeshipper-production/temp/*",
            "Condition": {
                "StringEquals": {
                    "s3:x-amz-acl": "private"
                }
            }
        }
    ]
}
```

---

## CORS Configuration

### Configure CORS for Browser Uploads

1. S3 Bucket → Permissions → CORS
2. Add CORS configuration:

```json
[
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
            "https://yourdomain.com",
            "https://app.yourdomain.com"
        ],
        "ExposeHeaders": [
            "ETag",
            "x-amz-server-side-encryption",
            "x-amz-request-id"
        ],
        "MaxAgeSeconds": 3000
    }
]
```

---

## Backend Integration

### Step 1: Configure Django Storage

Install required package:
```bash
pip install django-storages boto3
```

### Step 2: Update Settings

```python
# settings.py

# AWS Configuration
AWS_ACCESS_KEY_ID = config('AWS_ACCESS_KEY_ID')
AWS_SECRET_ACCESS_KEY = config('AWS_SECRET_ACCESS_KEY')
AWS_STORAGE_BUCKET_NAME = config('AWS_STORAGE_BUCKET_NAME', default='safeshipper-production')
AWS_S3_REGION_NAME = config('AWS_S3_REGION_NAME', default='us-east-1')

# S3 Storage Configuration
AWS_S3_OBJECT_PARAMETERS = {
    'CacheControl': 'max-age=86400',  # 1 day
    'ServerSideEncryption': 'AES256',
}
AWS_S3_FILE_OVERWRITE = False
AWS_DEFAULT_ACL = None  # Use bucket default
AWS_S3_VERIFY = True
AWS_QUERYSTRING_AUTH = True  # Signed URLs
AWS_QUERYSTRING_EXPIRE = 3600  # 1 hour

# Use S3 for media files
DEFAULT_FILE_STORAGE = 'storages.backends.s3boto3.S3Boto3Storage'

# Optional: Separate bucket for static files
STATICFILES_STORAGE = 'storages.backends.s3boto3.S3StaticStorage'
AWS_STATIC_LOCATION = 'static'
STATIC_URL = f'https://{AWS_STORAGE_BUCKET_NAME}.s3.amazonaws.com/{AWS_STATIC_LOCATION}/'
```

### Step 3: Create Storage Service

```python
# backend/storage/s3_service.py
import boto3
from botocore.exceptions import ClientError
from django.conf import settings
import uuid
from typing import Dict, Optional


class S3Service:
    """Handles S3 operations for SafeShipper"""
    
    def __init__(self):
        self.s3_client = boto3.client(
            's3',
            aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
            aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
            region_name=settings.AWS_S3_REGION_NAME
        )
        self.bucket_name = settings.AWS_STORAGE_BUCKET_NAME
    
    def generate_presigned_upload_url(
        self, 
        file_name: str, 
        file_type: str,
        folder: str = 'temp',
        expires_in: int = 3600
    ) -> Dict:
        """Generate presigned URL for direct browser upload"""
        key = f"{folder}/{uuid.uuid4()}/{file_name}"
        
        try:
            response = self.s3_client.generate_presigned_post(
                Bucket=self.bucket_name,
                Key=key,
                Fields={
                    'Content-Type': file_type,
                    'x-amz-server-side-encryption': 'AES256'
                },
                Conditions=[
                    {'Content-Type': file_type},
                    ['content-length-range', 0, 52428800],  # 50MB max
                    {'x-amz-server-side-encryption': 'AES256'}
                ],
                ExpiresIn=expires_in
            )
            
            return {
                'upload_url': response['url'],
                'fields': response['fields'],
                'key': key
            }
        except ClientError as e:
            raise Exception(f"Failed to generate upload URL: {e}")
    
    def move_file(self, source_key: str, dest_key: str) -> bool:
        """Move file from temp to permanent location"""
        try:
            # Copy object
            self.s3_client.copy_object(
                Bucket=self.bucket_name,
                CopySource={'Bucket': self.bucket_name, 'Key': source_key},
                Key=dest_key,
                ServerSideEncryption='AES256'
            )
            
            # Delete original
            self.s3_client.delete_object(
                Bucket=self.bucket_name,
                Key=source_key
            )
            
            return True
        except ClientError:
            return False
    
    def generate_download_url(
        self, 
        key: str, 
        expires_in: int = 3600,
        filename: Optional[str] = None
    ) -> str:
        """Generate signed URL for secure download"""
        params = {
            'Bucket': self.bucket_name,
            'Key': key,
        }
        
        if filename:
            params['ResponseContentDisposition'] = f'attachment; filename="{filename}"'
        
        return self.s3_client.generate_presigned_url(
            'get_object',
            Params=params,
            ExpiresIn=expires_in
        )
    
    def delete_file(self, key: str) -> bool:
        """Delete file from S3"""
        try:
            self.s3_client.delete_object(
                Bucket=self.bucket_name,
                Key=key
            )
            return True
        except ClientError:
            return False
    
    def list_files(self, prefix: str, max_keys: int = 1000) -> list:
        """List files with prefix"""
        try:
            response = self.s3_client.list_objects_v2(
                Bucket=self.bucket_name,
                Prefix=prefix,
                MaxKeys=max_keys
            )
            
            if 'Contents' not in response:
                return []
            
            return [
                {
                    'key': obj['Key'],
                    'size': obj['Size'],
                    'last_modified': obj['LastModified']
                }
                for obj in response['Contents']
            ]
        except ClientError:
            return []


s3_service = S3Service()
```

---

## Frontend Upload Integration

### Step 1: Create Upload Hook

```typescript
// hooks/useS3Upload.ts
import { useState } from 'react';
import axios from 'axios';

export function useS3Upload() {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);

  const uploadFile = async (file: File, folder: string = 'temp') => {
    setUploading(true);
    setProgress(0);

    try {
      // Get presigned URL from backend
      const { data } = await axios.post('/api/v1/storage/presigned-upload/', {
        file_name: file.name,
        file_type: file.type,
        folder: folder
      });

      // Create form data
      const formData = new FormData();
      Object.entries(data.fields).forEach(([key, value]) => {
        formData.append(key, value as string);
      });
      formData.append('file', file);

      // Upload to S3
      await axios.post(data.upload_url, formData, {
        onUploadProgress: (progressEvent) => {
          const percentCompleted = Math.round(
            (progressEvent.loaded * 100) / progressEvent.total!
          );
          setProgress(percentCompleted);
        }
      });

      setUploading(false);
      return { success: true, key: data.key };
    } catch (error) {
      setUploading(false);
      return { success: false, error };
    }
  };

  return { uploadFile, uploading, progress };
}
```

### Step 2: Create Upload Component

```typescript
// components/upload/FileUpload.tsx
import { useDropzone } from 'react-dropzone';
import { useS3Upload } from '@/hooks/useS3Upload';

export function FileUpload({ 
  onUploadComplete, 
  acceptedFileTypes = '*',
  maxFileSize = 50 * 1024 * 1024 // 50MB
}) {
  const { uploadFile, uploading, progress } = useS3Upload();

  const onDrop = async (acceptedFiles: File[]) => {
    for (const file of acceptedFiles) {
      const result = await uploadFile(file);
      if (result.success) {
        onUploadComplete(result.key, file);
      }
    }
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: acceptedFileTypes,
    maxSize: maxFileSize,
    multiple: true
  });

  return (
    <div
      {...getRootProps()}
      className={`upload-zone ${isDragActive ? 'active' : ''}`}
    >
      <input {...getInputProps()} />
      {uploading ? (
        <div className="upload-progress">
          <p>Uploading... {progress}%</p>
          <div className="progress-bar">
            <div className="progress-fill" style={{ width: `${progress}%` }} />
          </div>
        </div>
      ) : (
        <div className="upload-prompt">
          <p>Drag & drop files here, or click to select</p>
          <p className="upload-info">Maximum file size: 50MB</p>
        </div>
      )}
    </div>
  );
}
```

---

## CDN Setup with CloudFront

### Step 1: Create CloudFront Distribution

1. Navigate to CloudFront → Create Distribution
2. Origin Settings:
   ```
   Origin Domain: safeshipper-production.s3.amazonaws.com
   Origin Path: /
   Restrict Bucket Access: Yes
   Origin Access Identity: Create new
   Grant Read Permissions: Yes, update bucket policy
   ```

3. Default Cache Behavior:
   ```
   Viewer Protocol Policy: Redirect HTTP to HTTPS
   Allowed HTTP Methods: GET, HEAD, OPTIONS
   Cache Policy: CachingOptimized
   Origin Request Policy: CORS-S3Origin
   ```

4. Distribution Settings:
   ```
   Price Class: Use all edge locations
   Alternate Domain Names: cdn.yourdomain.com
   SSL Certificate: Request ACM certificate
   ```

### Step 2: Configure Caching

Create cache behaviors for different content types:

#### Static Assets (images, CSS, JS)
```
Path Pattern: /static/*
TTL: 86400 (1 day)
Compress: Yes
```

#### Documents (private)
```
Path Pattern: /documents/*
TTL: 0 (no cache)
Forward Headers: Authorization
```

### Step 3: Update Django Settings

```python
# Use CloudFront for static files
AWS_S3_CUSTOM_DOMAIN = 'cdn.yourdomain.com'
STATIC_URL = f'https://{AWS_S3_CUSTOM_DOMAIN}/static/'
MEDIA_URL = f'https://{AWS_S3_CUSTOM_DOMAIN}/media/'
```

---

## Cost Optimization

### Storage Class Strategy

1. **Standard**: Frequently accessed files (< 30 days)
2. **Standard-IA**: Infrequent access (30-90 days)
3. **Glacier Instant**: Archives (> 90 days)
4. **Intelligent-Tiering**: Let AWS optimize automatically

### Lifecycle Rules

```xml
<LifecycleConfiguration>
    <Rule>
        <ID>TransitionOldFiles</ID>
        <Status>Enabled</Status>
        <Transition>
            <Days>30</Days>
            <StorageClass>STANDARD_IA</StorageClass>
        </Transition>
        <Transition>
            <Days>90</Days>
            <StorageClass>GLACIER_IR</StorageClass>
        </Transition>
    </Rule>
    <Rule>
        <ID>DeleteTempFiles</ID>
        <Status>Enabled</Status>
        <Prefix>temp/</Prefix>
        <Expiration>
            <Days>7</Days>
        </Expiration>
    </Rule>
</LifecycleConfiguration>
```

### Cost Monitoring

1. **S3 Storage Lens**: Enable for usage insights
2. **Cost Explorer**: Track S3 costs by tag
3. **Budgets**: Set monthly spending limits

### Optimization Tips

1. **Enable S3 Transfer Acceleration** for global users
2. **Use multipart uploads** for files > 100MB
3. **Compress files** before upload when possible
4. **Delete old versions** regularly
5. **Use S3 Batch Operations** for bulk actions

---

## Backup & Disaster Recovery

### Backup Strategy

1. **Cross-Region Replication**:
   ```
   Management → Replication rules
   Destination: Different AWS region
   Storage class: STANDARD_IA
   Replication Time Control: Disabled (save costs)
   ```

2. **Point-in-Time Recovery**:
   - Enable versioning
   - Set lifecycle rules for versions
   - Regular snapshots to Glacier

3. **Disaster Recovery Plan**:
   ```python
   # Automated backup script
   def backup_critical_data():
       critical_prefixes = ['documents/', 'sds/', 'contracts/']
       backup_bucket = 'safeshipper-backup'
       
       for prefix in critical_prefixes:
           sync_to_backup(prefix, backup_bucket)
   ```

---

## Production Deployment

### Pre-Production Checklist

- [ ] IAM users created with minimal permissions
- [ ] S3 buckets configured with encryption
- [ ] CORS rules configured
- [ ] Lifecycle rules implemented
- [ ] CloudFront distribution created
- [ ] Backup strategy implemented
- [ ] Monitoring and alerts configured
- [ ] Cost budgets set

### Security Hardening

1. **Enable S3 Block Public Access**:
   ```
   Account level: Block all public access
   Bucket level: Block all public access
   ```

2. **Enable CloudTrail Logging**:
   ```
   Services → CloudTrail
   Create trail: safeshipper-s3-audit
   Log S3 data events: Yes
   ```

3. **Configure S3 Access Logging**:
   ```
   Bucket → Properties → Server access logging
   Target bucket: safeshipper-logs
   Target prefix: s3-access/
   ```

4. **Set up AWS Config Rules**:
   - s3-bucket-public-read-prohibited
   - s3-bucket-public-write-prohibited
   - s3-bucket-ssl-requests-only

### Performance Optimization

1. **Enable Transfer Acceleration**:
   ```
   Properties → Transfer acceleration → Enable
   Use endpoint: safeshipper-production.s3-accelerate.amazonaws.com
   ```

2. **Configure Request Metrics**:
   ```
   Metrics → Request metrics → Create filter
   Monitor all requests
   ```

---

## Troubleshooting

### Common Issues and Solutions

#### 1. "Access Denied" Errors

**Problem**: 403 Forbidden when accessing objects.

**Solution**:
- Check IAM permissions
- Verify bucket policy
- Ensure object ACL allows access
- Check if using correct AWS credentials

#### 2. CORS Errors

**Problem**: Browser blocks S3 requests.

**Solution**:
- Verify CORS configuration includes origin
- Check preflight OPTIONS requests
- Ensure headers are exposed

#### 3. Slow Upload Speeds

**Problem**: Large file uploads are slow.

**Solution**:
```javascript
// Use multipart upload for large files
const uploadLargeFile = async (file) => {
  const chunkSize = 10 * 1024 * 1024; // 10MB chunks
  const chunks = Math.ceil(file.size / chunkSize);
  
  // Initiate multipart upload
  // Upload chunks in parallel
  // Complete multipart upload
};
```

#### 4. Signature Mismatch

**Problem**: "The request signature we calculated does not match..."

**Solution**:
- Verify system time is synchronized
- Check for special characters in keys
- Ensure credentials are correct
- Verify region settings

### Debug Tools

1. **AWS CLI Testing**:
   ```bash
   # Test credentials
   aws s3 ls s3://safeshipper-production/
   
   # Test upload
   aws s3 cp test.txt s3://safeshipper-production/test/
   
   # Check CORS
   curl -X OPTIONS https://safeshipper-production.s3.amazonaws.com/ \
     -H "Origin: https://yourdomain.com" \
     -H "Access-Control-Request-Method: GET"
   ```

2. **CloudWatch Logs**:
   - Enable S3 request logging
   - Monitor 4xx/5xx errors
   - Track request patterns

---

## Next Steps

1. Create AWS account and set up billing alerts
2. Create S3 buckets with proper configuration
3. Set up IAM users and policies
4. Configure CORS for browser uploads
5. Implement backend storage service
6. Test file upload/download flows
7. Set up CloudFront CDN
8. Implement backup strategy
9. Deploy to production

---

**Last Updated**: 2025-07-27  
**Version**: 1.0.0