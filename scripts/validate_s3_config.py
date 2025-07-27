#!/usr/bin/env python3
"""
Quick S3 Configuration Validator
Checks if your .env file has the necessary S3 configuration.
"""

import os
import re
from pathlib import Path

def check_env_file():
    """Check if .env file exists and has S3 configuration"""
    env_file = Path("backend/.env")
    
    if not env_file.exists():
        print("❌ .env file not found at backend/.env")
        print("💡 Copy from backend/env.example:")
        print("   cp backend/env.example backend/.env")
        return False
    
    print("✓ .env file found")
    
    # Read .env content
    content = env_file.read_text()
    
    # Check required S3 variables
    required_vars = {
        'AWS_ACCESS_KEY_ID': r'AWS_ACCESS_KEY_ID=(.+)',
        'AWS_SECRET_ACCESS_KEY': r'AWS_SECRET_ACCESS_KEY=(.+)',
        'AWS_STORAGE_BUCKET_NAME': r'AWS_STORAGE_BUCKET_NAME=(.+)',
        'AWS_S3_REGION_NAME': r'AWS_S3_REGION_NAME=(.+)'
    }
    
    config_status = {}
    
    for var_name, pattern in required_vars.items():
        match = re.search(pattern, content)
        if match:
            value = match.group(1).strip()
            if value and value != 'your-aws-access-key-id' and value != 'your-aws-secret-access-key':
                config_status[var_name] = value
                print(f"✓ {var_name} = {value[:8]}..." if 'SECRET' in var_name else f"✓ {var_name} = {value}")
            else:
                config_status[var_name] = None
                print(f"❌ {var_name} = (empty or placeholder)")
        else:
            config_status[var_name] = None
            print(f"❌ {var_name} = (not found)")
    
    # Check if all required vars are configured
    missing_vars = [var for var, value in config_status.items() if not value]
    
    if missing_vars:
        print(f"\n❌ Missing configuration: {', '.join(missing_vars)}")
        return False
    else:
        print("\n✓ All S3 configuration variables are set")
        return True

def generate_env_template():
    """Generate template .env lines for S3"""
    print("\n" + "=" * 50)
    print("COPY THESE LINES TO YOUR .env FILE:")
    print("=" * 50)
    print("# AWS S3 Configuration")
    print("AWS_ACCESS_KEY_ID=AKIA...your-access-key-id")
    print("AWS_SECRET_ACCESS_KEY=...your-secret-access-key")
    print("AWS_STORAGE_BUCKET_NAME=safeshipper-files-hayden-2025")
    print("AWS_S3_REGION_NAME=us-east-1")
    print("=" * 50)

def main():
    print("SafeShipper S3 Configuration Validator")
    print("=" * 40)
    
    if check_env_file():
        print("\n🎉 Your S3 configuration looks good!")
        print("\nNext step: Test the connection")
        print("cd backend && python3 test_s3_integration.py")
    else:
        print("\n💡 Configuration needed:")
        print("1. Get your AWS access keys (see GET_S3_KEYS_NOW.md)")
        print("2. Add them to your .env file")
        generate_env_template()

if __name__ == "__main__":
    main()