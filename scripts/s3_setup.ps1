# SafeShipper S3 Setup Script for Windows PowerShell
# This script automates the S3 setup process

param(
    [string]$BucketName = "safeshipper-files-hayden-2025",
    [string]$UserName = "safeshipper-backend",
    [string]$PolicyName = "SafeShipperS3Policy"
)

Write-Host "SafeShipper S3 Setup for Windows" -ForegroundColor Green
Write-Host "=================================" -ForegroundColor Green
Write-Host "Bucket: $BucketName" -ForegroundColor Yellow

# Function to check if AWS CLI is installed
function Test-AwsCli {
    try {
        $version = aws --version 2>$null
        if ($LASTEXITCODE -eq 0) {
            Write-Host "✓ AWS CLI installed: $version" -ForegroundColor Green
            return $true
        }
    }
    catch {
        Write-Host "❌ AWS CLI not found" -ForegroundColor Red
        Write-Host "Install AWS CLI from: https://aws.amazon.com/cli/" -ForegroundColor Yellow
        return $false
    }
    return $false
}

# Function to check AWS credentials
function Test-AwsCredentials {
    try {
        $identity = aws sts get-caller-identity --output json | ConvertFrom-Json
        if ($LASTEXITCODE -eq 0) {
            Write-Host "✓ AWS credentials configured" -ForegroundColor Green
            Write-Host "  Account: $($identity.Account)" -ForegroundColor White
            Write-Host "  User: $($identity.Arn)" -ForegroundColor White
            return $identity.Account
        }
    }
    catch {
        Write-Host "❌ AWS credentials not configured" -ForegroundColor Red
        return $null
    }
    return $null
}

# Function to create IAM policy
function New-IamPolicy {
    param($BucketName, $PolicyName)
    
    Write-Host "`n=== Creating IAM Policy: $PolicyName ===" -ForegroundColor Cyan
    
    $policyDocument = @"
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
            "Resource": "arn:aws:s3:::$BucketName"
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
            "Resource": "arn:aws:s3:::$BucketName/*"
        },
        {
            "Sid": "MultipartUpload",
            "Effect": "Allow",
            "Action": [
                "s3:ListMultipartUploadParts",
                "s3:AbortMultipartUpload"
            ],
            "Resource": "arn:aws:s3:::$BucketName/*"
        }
    ]
}
"@

    # Save policy to temp file
    $policyFile = "s3-policy-temp.json"
    $policyDocument | Out-File -FilePath $policyFile -Encoding UTF8
    
    try {
        $result = aws iam create-policy --policy-name $PolicyName --policy-document file://$policyFile --description "Policy for SafeShipper S3 access to $BucketName" 2>&1
        
        if ($LASTEXITCODE -eq 0) {
            $policyData = $result | ConvertFrom-Json
            Write-Host "✓ Policy created: $($policyData.Policy.Arn)" -ForegroundColor Green
            Remove-Item $policyFile -ErrorAction SilentlyContinue
            return $policyData.Policy.Arn
        }
        elseif ($result -like "*EntityAlreadyExists*") {
            Write-Host "✓ Policy already exists" -ForegroundColor Yellow
            $accountId = aws sts get-caller-identity --query Account --output text
            $policyArn = "arn:aws:iam::${accountId}:policy/$PolicyName"
            Write-Host "  ARN: $policyArn" -ForegroundColor White
            Remove-Item $policyFile -ErrorAction SilentlyContinue
            return $policyArn
        }
        else {
            Write-Host "❌ Failed to create policy: $result" -ForegroundColor Red
            Remove-Item $policyFile -ErrorAction SilentlyContinue
            return $null
        }
    }
    catch {
        Write-Host "❌ Error creating policy: $_" -ForegroundColor Red
        Remove-Item $policyFile -ErrorAction SilentlyContinue
        return $null
    }
}

# Function to create IAM user
function New-IamUser {
    param($UserName)
    
    Write-Host "`n=== Creating IAM User: $UserName ===" -ForegroundColor Cyan
    
    try {
        $result = aws iam create-user --user-name $UserName --tags Key=Project,Value=SafeShipper Key=Purpose,Value=S3Access 2>&1
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host "✓ User created: $UserName" -ForegroundColor Green
            return $UserName
        }
        elseif ($result -like "*EntityAlreadyExists*") {
            Write-Host "✓ User already exists: $UserName" -ForegroundColor Yellow
            return $UserName
        }
        else {
            Write-Host "❌ Failed to create user: $result" -ForegroundColor Red
            return $null
        }
    }
    catch {
        Write-Host "❌ Error creating user: $_" -ForegroundColor Red
        return $null
    }
}

# Function to attach policy to user
function Add-PolicyToUser {
    param($UserName, $PolicyArn)
    
    Write-Host "`n=== Attaching Policy to User ===" -ForegroundColor Cyan
    
    try {
        aws iam attach-user-policy --user-name $UserName --policy-arn $PolicyArn
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host "✓ Policy attached to user" -ForegroundColor Green
            return $true
        }
        else {
            Write-Host "❌ Failed to attach policy" -ForegroundColor Red
            return $false
        }
    }
    catch {
        Write-Host "❌ Error attaching policy: $_" -ForegroundColor Red
        return $false
    }
}

# Function to create access keys
function New-AccessKeys {
    param($UserName)
    
    Write-Host "`n=== Creating Access Keys ===" -ForegroundColor Cyan
    
    try {
        $result = aws iam create-access-key --user-name $UserName --output json
        
        if ($LASTEXITCODE -eq 0) {
            $keyData = $result | ConvertFrom-Json
            $accessKey = $keyData.AccessKey
            
            Write-Host "✓ Access keys created successfully!" -ForegroundColor Green
            Write-Host "  Access Key ID: $($accessKey.AccessKeyId)" -ForegroundColor White
            Write-Host "  Secret Access Key: $($accessKey.SecretAccessKey)" -ForegroundColor White
            
            return @{
                AccessKeyId = $accessKey.AccessKeyId
                SecretAccessKey = $accessKey.SecretAccessKey
            }
        }
        else {
            Write-Host "❌ Failed to create access keys" -ForegroundColor Red
            return $null
        }
    }
    catch {
        Write-Host "❌ Error creating access keys: $_" -ForegroundColor Red
        return $null
    }
}

# Function to update .env file
function Update-EnvFile {
    param($AccessKeyId, $SecretAccessKey, $BucketName)
    
    Write-Host "`n=== Updating .env File ===" -ForegroundColor Cyan
    
    $envFile = "backend\.env"
    
    if (!(Test-Path $envFile)) {
        Write-Host "❌ .env file not found at $envFile" -ForegroundColor Red
        Write-Host "Copy from backend\env.example first" -ForegroundColor Yellow
        return $false
    }
    
    try {
        $content = Get-Content $envFile -Raw
        
        # Update AWS credentials
        $patterns = @{
            'AWS_ACCESS_KEY_ID' = $AccessKeyId
            'AWS_SECRET_ACCESS_KEY' = $SecretAccessKey
            'AWS_STORAGE_BUCKET_NAME' = $BucketName
            'AWS_S3_REGION_NAME' = 'us-east-1'
        }
        
        foreach ($key in $patterns.Keys) {
            $value = $patterns[$key]
            $pattern = "$key=.*"
            $replacement = "$key=$value"
            
            if ($content -match $pattern) {
                $content = $content -replace $pattern, $replacement
            }
            else {
                $content += "`n$replacement"
            }
        }
        
        $content | Out-File -FilePath $envFile -Encoding UTF8 -NoNewline
        Write-Host "✓ Updated .env file with S3 credentials" -ForegroundColor Green
        return $true
    }
    catch {
        Write-Host "❌ Error updating .env file: $_" -ForegroundColor Red
        return $false
    }
}

# Main execution
try {
    # Check AWS CLI
    if (!(Test-AwsCli)) {
        Write-Host "`nPlease install AWS CLI and run this script again." -ForegroundColor Red
        exit 1
    }
    
    # Check AWS credentials
    $accountId = Test-AwsCredentials
    if (!$accountId) {
        Write-Host "`nPlease configure AWS CLI first:" -ForegroundColor Yellow
        Write-Host "aws configure" -ForegroundColor White
        exit 1
    }
    
    # Create IAM policy
    $policyArn = New-IamPolicy -BucketName $BucketName -PolicyName $PolicyName
    if (!$policyArn) {
        Write-Host "❌ Failed to create IAM policy" -ForegroundColor Red
        exit 1
    }
    
    # Create IAM user
    $userName = New-IamUser -UserName $UserName
    if (!$userName) {
        Write-Host "❌ Failed to create IAM user" -ForegroundColor Red
        exit 1
    }
    
    # Attach policy to user
    if (!(Add-PolicyToUser -UserName $userName -PolicyArn $policyArn)) {
        Write-Host "❌ Failed to attach policy to user" -ForegroundColor Red
        exit 1
    }
    
    # Create access keys
    $accessKeys = New-AccessKeys -UserName $userName
    if (!$accessKeys) {
        Write-Host "❌ Failed to create access keys" -ForegroundColor Red
        exit 1
    }
    
    # Update .env file
    if (!(Update-EnvFile -AccessKeyId $accessKeys.AccessKeyId -SecretAccessKey $accessKeys.SecretAccessKey -BucketName $BucketName)) {
        Write-Host "❌ Failed to update .env file" -ForegroundColor Red
        exit 1
    }
    
    # Success summary
    Write-Host "`n" + "=" * 50 -ForegroundColor Green
    Write-Host "SETUP COMPLETE!" -ForegroundColor Green
    Write-Host "=" * 50 -ForegroundColor Green
    
    Write-Host "✓ IAM Policy: $policyArn" -ForegroundColor White
    Write-Host "✓ IAM User: $userName" -ForegroundColor White
    Write-Host "✓ Access Key ID: $($accessKeys.AccessKeyId)" -ForegroundColor White
    Write-Host "✓ Secret Key: $($accessKeys.SecretAccessKey.Substring(0,8))..." -ForegroundColor White
    Write-Host "✓ Bucket: $BucketName" -ForegroundColor White
    Write-Host "✓ .env file updated" -ForegroundColor White
    
    # Offer to run test
    $runTest = Read-Host "`nRun S3 integration test now? (y/n)"
    if ($runTest -eq 'y') {
        Write-Host "`nRunning S3 integration test..." -ForegroundColor Cyan
        Set-Location backend
        python test_s3_integration.py
        Set-Location ..
    }
    
    Write-Host "`n🎉 S3 setup complete! Your SafeShipper project can now use AWS S3." -ForegroundColor Green
    Write-Host "`nNext steps:" -ForegroundColor Yellow
    Write-Host "- Your Django app will automatically use S3 for file storage" -ForegroundColor White
    Write-Host "- Upload some files to test the integration" -ForegroundColor White
    Write-Host "- Monitor your AWS costs in the AWS Console" -ForegroundColor White
}
catch {
    Write-Host "❌ Setup failed: $_" -ForegroundColor Red
    exit 1
}