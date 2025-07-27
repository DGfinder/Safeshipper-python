# 🚀 Get Your S3 Access Keys NOW - Simple 5-Minute Setup

You have your bucket `safeshipper-files-hayden-2025` and need the programmatic access keys. Here's the fastest way:

## Option 1: Automated Setup (Recommended)

### Step 1: Install AWS CLI
```bash
# Download and install AWS CLI from:
# https://aws.amazon.com/cli/
```

### Step 2: Configure AWS CLI
```bash
aws configure
```
Enter your AWS console access key (the one you use to log into AWS Console):
- **Access Key ID**: Your admin access key
- **Secret Access Key**: Your admin secret key  
- **Region**: `us-east-1`
- **Output**: `json`

### Step 3: Run the Automated Setup
```bash
# For Windows PowerShell:
powershell -ExecutionPolicy Bypass -File scripts/s3_setup.ps1

# For Linux/Mac/WSL:
python3 scripts/s3_setup_interactive.py
```

This will:
- ✅ Create the IAM user `safeshipper-backend`
- ✅ Create the IAM policy with correct permissions
- ✅ Generate access keys
- ✅ Update your `.env` file automatically
- ✅ Test the connection

---

## Option 2: Manual Setup (5 minutes)

### Step 1: Create IAM Policy
1. Go to AWS Console → IAM → Policies → Create Policy
2. Click JSON tab and paste this policy:

```json
{
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
      "Resource": "arn:aws:s3:::safeshipper-files-hayden-2025"
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
      "Resource": "arn:aws:s3:::safeshipper-files-hayden-2025/*"
    }
  ]
}
```

3. Name it: `SafeShipperS3Policy`
4. Create policy

### Step 2: Create IAM User
1. Go to IAM → Users → Create User
2. Username: `safeshipper-backend`
3. **Select "Programmatic access"** ✅
4. Next: Permissions
5. Attach existing policy: `SafeShipperS3Policy`
6. Next → Next → Create User

### Step 3: Copy Access Keys
**IMPORTANT**: Copy these keys immediately (you can't see the secret key again):
- Access Key ID: `AKIA...`
- Secret Access Key: `...`

### Step 4: Update .env File
Edit `backend/.env` and add:
```env
AWS_ACCESS_KEY_ID=AKIA...your-access-key-id
AWS_SECRET_ACCESS_KEY=...your-secret-access-key
AWS_STORAGE_BUCKET_NAME=safeshipper-files-hayden-2025
AWS_S3_REGION_NAME=us-east-1
```

---

## Step 5: Test It Works

```bash
cd backend
python3 test_s3_integration.py
```

You should see:
```
✓ AWS credentials configured
✓ Connected to S3 successfully
✓ Bucket 'safeshipper-files-hayden-2025' is accessible
✓ Uploaded test file
✓ Downloaded and verified file content
🎉 All tests passed! S3 integration is working correctly.
```

---

## 🔧 Troubleshooting

### "Access Denied" Error
- Check that you attached the policy to the user
- Verify the bucket name is exactly: `safeshipper-files-hayden-2025`

### "NoSuchBucket" Error  
- Verify the bucket exists in your AWS Console
- Check the region is `us-east-1`

### "InvalidAccessKeyId" Error
- Double-check you copied the access keys correctly
- Make sure there are no extra spaces

### Missing .env File
```bash
cp backend/env.example backend/.env
```

---

## 🎯 What This Gives You

Once set up, your SafeShipper app will:
- ✅ Store all uploaded files in S3 instead of local disk
- ✅ Generate secure signed URLs for file access  
- ✅ Encrypt files at rest (AES-256)
- ✅ Handle large file uploads efficiently
- ✅ Scale automatically as your app grows

The integration is already built into SafeShipper - you just need the keys!

---

## 💰 Cost Estimate

For development/testing:
- **Storage**: ~$0.50/month for 20GB
- **Requests**: ~$0.10/month for normal usage
- **Total**: **Less than $1/month**

---

## 🚨 Security Notes

- ✅ Your access keys only work with your specific bucket
- ✅ Keys have minimal permissions (no billing, no other AWS services)
- ✅ Files are encrypted and private by default
- ✅ You can revoke keys anytime in IAM

---

**Need help?** Run the automated script - it handles everything for you! 🚀