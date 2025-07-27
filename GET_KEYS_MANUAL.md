# 🔑 Get S3 Access Keys - Manual Method (2 Minutes)

Since you already have your bucket `safeshipper-files-hayden-2025`, you just need to create the programmatic user and get the keys.

## Step 1: Create IAM User (30 seconds)

1. **Go to AWS Console** → IAM → Users → **Create User**
2. **User name**: `safeshipper-backend`
3. **Check**: ✅ "Provide user access to the AWS Management Console" - **UNCHECK THIS**
4. **Check**: ✅ "I want to create an IAM user" 
5. Click **Next**

## Step 2: Set Permissions (30 seconds)

1. Select **"Attach policies directly"**
2. Click **"Create policy"** (opens new tab)
3. Click **JSON** tab
4. **Delete everything** and paste this:

```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Action": [
                "s3:GetObject",
                "s3:PutObject",
                "s3:DeleteObject",
                "s3:ListBucket",
                "s3:GetBucketLocation"
            ],
            "Resource": [
                "arn:aws:s3:::safeshipper-files-hayden-2025",
                "arn:aws:s3:::safeshipper-files-hayden-2025/*"
            ]
        }
    ]
}
```

5. Click **Next** → **Next**
6. **Name**: `SafeShipperS3Access`
7. Click **Create policy**
8. **Go back to the user creation tab**
9. **Refresh** the policies list
10. **Search**: `SafeShipperS3Access`
11. **Check** ✅ the policy
12. Click **Next** → **Create user**

## Step 3: Create Access Keys (30 seconds)

1. **Click on the user** you just created (`safeshipper-backend`)
2. Go to **"Security credentials"** tab
3. Scroll down to **"Access keys"**
4. Click **"Create access key"**
5. Select **"Application running outside AWS"**
6. Click **Next** → **Create access key**

## Step 4: Copy the Keys! 🚨 IMPORTANT

**Copy these immediately** (you can't see the secret key again):

```
Access Key ID: AKIA...
Secret Access Key: ...
```

## Step 5: Update Your .env File (30 seconds)

Edit `backend/.env` and replace these lines:

```env
AWS_ACCESS_KEY_ID=AKIA...your-actual-access-key-id
AWS_SECRET_ACCESS_KEY=...your-actual-secret-access-key
```

## Step 6: Test It Works! (30 seconds)

```bash
cd backend
python3 test_s3_integration.py
```

You should see:
```
✓ AWS credentials configured
✓ Connected to S3 successfully
✓ Bucket 'safeshipper-files-hayden-2025' is accessible
🎉 All tests passed!
```

---

## ✅ That's it! 

Your SafeShipper app will now:
- Store uploaded files in S3
- Generate secure download URLs
- Encrypt files automatically
- Scale without storage limits

**Total time**: ~2 minutes if you follow the steps exactly! 🚀

---

## 🔧 If something goes wrong:

**"Access Denied"**: Make sure you attached the policy to the user
**"No Such Bucket"**: Check bucket name is exactly `safeshipper-files-hayden-2025`
**"Invalid Access Key"**: Double-check you copied the keys correctly