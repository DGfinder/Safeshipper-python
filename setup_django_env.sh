#!/bin/bash
# Setup Django Environment for SafeShipper

set -e

echo "=== Setting up Django Environment for SafeShipper ==="
echo ""

# Step 1: Install Python pip
echo "Step 1: Installing pip..."
sudo apt update
sudo apt install -y python3-pip python3-venv python3-dev

# Step 2: Install system dependencies
echo ""
echo "Step 2: Installing system dependencies..."
sudo apt install -y \
    build-essential \
    libpq-dev \
    postgresql-client \
    libgdal-dev \
    gdal-bin \
    python3-gdal

# Step 3: Create virtual environment
echo ""
echo "Step 3: Creating Python virtual environment..."
cd /mnt/c/Users/Hayden/Desktop/Safeshipper\ Home/backend
python3 -m venv venv_linux

# Step 4: Activate and upgrade pip
echo ""
echo "Step 4: Upgrading pip..."
source venv_linux/bin/activate
python -m pip install --upgrade pip

# Step 5: Install requirements
echo ""
echo "Step 5: Installing project requirements..."
pip install -r requirements.txt

# Step 6: Check Django
echo ""
echo "Step 6: Verifying Django installation..."
python -m django --version

# Step 7: Run Django checks
echo ""
echo "Step 7: Running Django system checks..."
python manage.py check

echo ""
echo "=== Setup Complete ==="
echo ""
echo "To activate the virtual environment, run:"
echo "  cd /mnt/c/Users/Hayden/Desktop/Safeshipper\ Home/backend"
echo "  source venv_linux/bin/activate"
echo ""
echo "Then you can run Django commands like:"
echo "  python manage.py runserver"
echo "  python manage.py migrate"