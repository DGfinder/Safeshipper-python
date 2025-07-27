# 🚀 AWS S3 Setup Guide for SafeShipper

This guide will walk you through setting up Amazon S3 for file storage in your SafeShipper project.

## 📋 Prerequisites

- An AWS account (or willingness to create one)
- Basic familiarity with AWS Console
- Your SafeShipper project ready for configuration

## 🎯 What We'll Set Up

1. **AWS Account & S3 Bucket**
2. **IAM User with Proper Permissions**
3. **Django Configuration**
4. **Testing & Verification**

---

## Step 1: AWS Account Setup

### 1.1 Create AWS Account (if you don't have one)

1. Go to [AWS Console](https://aws.amazon.com/)
2. Click "Create an AWS Account"
3. Follow the registration process:
   - Email and password
   - Account name: "SafeShipper"
   - Contact information
   - Payment method (credit card required)
   - Identity verification

### 1.2 Secure Your Root Account

1. **Enable MFA (Multi-Factor Authentication)**:
   - Go to IAM → Security credentials
   - Activate MFA device
   - Use Google Authenticator or similar app

2. **Create IAM Admin User** (for daily operations):
   - Go to IAM → Users → Create user
   - Username: `safeshipper-admin`
   - Attach `AdministratorAccess` policy (temporarily)

---

## Step 2: Create S3 Bucket

### 2.1 Navigate to S3

1. Go to AWS Console → S3
2. Click "Create bucket"

### 2.2 Configure Bucket

```
Bucket name: safeshipper-files-[your-unique-id]
Region: us-east-1 (or your preferred region)
Block all public access: ✓ (Keep checked for security)
Bucket versioning: Enable
Default encryption: Enable (AES-256)
```

**Important**: The bucket name must be globally unique across all AWS accounts.

### 2.3 Advanced Settings

1. **Enable Versioning**:
   - Properties → Bucket Versioning → Enable
   - This protects against accidental deletion

2. **Configure Lifecycle Rules** (optional for cost optimization):
   - Management → Lifecycle rules → Create rule
   - Rule name: `archive-old-files`
   - Move to Standard-IA after 30 days
   - Move to Glacier after 90 days

---

## Step 3: Create IAM User for SafeShipper

### 3.1 Create IAM User

1. Go to IAM → Users → Create user
2. Username: `safeshipper-backend`
3. Access type: Programmatic access
4. **Save the Access Key ID and Secret Access Key** (you'll need these)

### 3.2 Create Custom Policy

1. Go to IAM → Policies → Create policy
2. Use JSON editor and paste this policy:

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
            "Resource": "arn:aws:s3:::safeshipper-files-[your-bucket-name]"
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
            "Resource": "arn:aws:s3:::safeshipper-files-[your-bucket-name]/*"
        },
        {
            "Sid": "MultipartUpload",
            "Effect": "Allow",
            "Action": [
                "s3:ListMultipartUploadParts",
                "s3:AbortMultipartUpload"
            ],
            "Resource": "arn:aws:s3:::safeshipper-files-[your-bucket-name]/*"
        }
    ]
}
```

**Replace `[your-bucket-name]` with your actual bucket name.**

### 3.3 Attach Policy to User

1. Go back to your IAM user
2. Add permissions → Attach policies
3. Search for and select your custom policy
4. Review and attach

---

## Step 4: Configure Django Settings

### 4.1 Install Required Packages

The required packages are already in your `requirements.txt`:
- `boto3==1.38.25`
- `django-storages==1.14.6`

### 4.2 Create Environment File

1. Copy the example environment file:
```bash
cp backend/env.example backend/.env
```

2. Edit `backend/.env` and add your AWS credentials:

```env
# AWS S3 Configuration
AWS_ACCESS_KEY_ID=AKIA...your-access-key-id
AWS_SECRET_ACCESS_KEY=...your-secret-access-key
AWS_STORAGE_BUCKET_NAME=safeshipper-files-[your-bucket-name]
AWS_S3_REGION_NAME=us-east-1
AWS_S3_CUSTOM_DOMAIN=
```

### 4.3 Update Django Settings

The SafeShipper project already has S3 configuration in `backend/safeshipper_core/settings.py`. The settings will automatically use S3 when the environment variables are set.

Key settings that are already configured:
- `DEFAULT_FILE_STORAGE` will automatically use S3
- Server-side encryption is enabled
- Signed URLs are configured
- File overwrite protection is enabled

---

## Step 5: Test Your Setup

### 5.1 Set Up Python Environment

```bash
# Navigate to backend directory
cd backend

# Create virtual environment (if not exists)
python -m venv venv

# Activate virtual environment
# On Windows:
venv\Scripts\activate
# On macOS/Linux:
source venv/bin/activate

# Install requirements
pip install -r requirements.txt
```

### 5.2 Run S3 Test Script

```bash
python test_s3_integration.py
```

This script will:
- Check your AWS credentials
- Test S3 connectivity
- Verify bucket access
- Test file upload/download
- Display setup instructions if needed

### 5.3 Expected Output

If everything is configured correctly, you should see:
```
=== S3 Configuration Check ===
✓ AWS credentials configured
  Access Key: AKIA1234...
  Bucket: safeshipper-files-[your-bucket]
  Region: us-east-1

=== S3 Connectivity Test ===
✓ Connected to S3 successfully
  Found X buckets

=== Bucket Access Test ===
✓ Bucket 'safeshipper-files-[your-bucket]' is accessible
✓ Bucket encryption enabled
  Algorithm: AES256

=== File Upload Test ===
✓ Uploaded test file: test/test-upload-abc123.txt
  Size: 67 bytes
  ETag: "abc123..."
  Encryption: AES256
```

---

## Step 6: Configure CORS (for Frontend Uploads)

If you plan to upload files directly from the frontend:

### 6.1 Add CORS Configuration

1. Go to your S3 bucket → Permissions → CORS
2. Add this configuration:

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
            "https://yourdomain.com"
        ],
        "ExposeHeaders": [
            "ETag",
            "x-amz-server-side-encryption"
        ],
        "MaxAgeSeconds": 3000
    }
]
```

---

## Step 7: Security Best Practices

### 7.1 Enable CloudTrail Logging

1. Go to CloudTrail → Create trail
2. Trail name: `safeshipper-s3-audit`
3. Log S3 data events: Yes
4. This will log all S3 operations for audit purposes

### 7.2 Set Up Billing Alerts

1. Go to Billing & Cost Management
2. Set up billing alerts to monitor costs
3. Recommended: $50/month threshold

### 7.3 Enable S3 Access Logging

1. Go to your S3 bucket → Properties → Server access logging
2. Target bucket: Create a separate logging bucket
3. Target prefix: `s3-access/`

---

## Step 8: Production Considerations

### 8.1 Use IAM Roles (Recommended for Production)

Instead of access keys, use IAM roles when deploying to EC2 or ECS:

```python
# In production settings
import boto3

# Use IAM role instead of access keys
s3_client = boto3.client('s3')  # No credentials needed
```

### 8.2 Set Up CloudFront CDN

For better performance:
1. Create CloudFront distribution
2. Origin: Your S3 bucket
3. Update `AWS_S3_CUSTOM_DOMAIN` in settings

### 8.3 Configure Backup Strategy

1. Enable cross-region replication
2. Set up automated backups
3. Test disaster recovery procedures

---

## 🚨 Troubleshooting

### Common Issues

**1. "Access Denied" Error**
- Check IAM permissions
- Verify bucket name in policy
- Ensure access keys are correct

**2. "NoSuchBucket" Error**
- Verify bucket name spelling
- Check region configuration
- Ensure bucket exists

**3. "InvalidAccessKeyId" Error**
- Check access key format
- Verify secret key
- Ensure keys are not expired

**4. "SignatureDoesNotMatch" Error**
- Check secret key
- Verify region configuration
- Ensure clock is synchronized

### Getting Help

1. Check AWS CloudTrail for detailed error logs
2. Review IAM policy permissions
3. Test with AWS CLI: `aws s3 ls s3://your-bucket-name`
4. Check Django logs for detailed error messages

---

## 📊 Cost Estimation

**Typical monthly costs for SafeShipper:**
- Storage: ~$0.023/GB/month
- Requests: ~$0.0004 per 1,000 requests
- Data transfer: ~$0.09/GB (outbound)

**For 100GB storage with moderate usage:**
- Storage: $2.30/month
- Requests: $1-5/month
- **Total: ~$5-10/month**

---

## ✅ Verification Checklist

- [ ] AWS account created and secured
- [ ] S3 bucket created with encryption
- [ ] IAM user created with proper permissions
- [ ] Environment variables configured
- [ ] Django settings updated
- [ ] S3 test script passes
- [ ] CORS configured (if needed)
- [ ] CloudTrail logging enabled
- [ ] Billing alerts set up
- [ ] Backup strategy planned

---

## 🎉 You're Ready!

Your SafeShipper project is now configured to use AWS S3 for file storage. The system will automatically:

- Store uploaded files securely in S3
- Generate signed URLs for secure access
- Encrypt files at rest
- Handle file versioning
- Optimize costs with lifecycle rules

**Next Steps:**
1. Test file uploads in your application
2. Monitor costs and usage
3. Set up monitoring and alerting
4. Plan for production deployment

Need help? Check the troubleshooting section or run the test script again! 