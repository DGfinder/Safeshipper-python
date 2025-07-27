
# SafeShipper S3 Setup - AWS CLI Commands
# Copy and paste these commands into your terminal

# 1. Create IAM policy
aws iam create-policy \
    --policy-name SafeShipperS3Policy \
    --policy-document file://aws-setup/s3-policy.json \
    --description "Policy for SafeShipper S3 access to safeshipper-files-hayden-2025"

# 2. Create IAM user
aws iam create-user \
    --user-name safeshipper-backend \
    --tags Key=Project,Value=SafeShipper Key=Purpose,Value=S3Access

# 3. Get the policy ARN (you'll need this for the next command)
# Replace YOUR_ACCOUNT_ID with your actual AWS account ID
POLICY_ARN="arn:aws:iam::YOUR_ACCOUNT_ID:policy/SafeShipperS3Policy"

# 4. Attach policy to user
aws iam attach-user-policy \
    --user-name safeshipper-backend \
    --policy-arn $POLICY_ARN

# 5. Create access keys
aws iam create-access-key \
    --user-name safeshipper-backend

# 6. List attached policies to verify
aws iam list-attached-user-policies \
    --user-name safeshipper-backend
