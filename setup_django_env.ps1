# Setup Django Environment for SafeShipper (Windows PowerShell)
# Run this script as Administrator if needed

Write-Host "=== Setting up Django Environment for SafeShipper ===" -ForegroundColor Green
Write-Host ""

# Step 1: Check Python installation
Write-Host "Step 1: Checking Python installation..." -ForegroundColor Yellow
try {
    $pythonVersion = py -3 --version
    Write-Host "Python found: $pythonVersion" -ForegroundColor Green
} catch {
    Write-Host "Python not found. Please install Python 3.11+ from https://www.python.org/downloads/" -ForegroundColor Red
    exit 1
}

# Step 2: Navigate to backend directory
Write-Host ""
Write-Host "Step 2: Navigating to backend directory..." -ForegroundColor Yellow
Set-Location "C:\Users\Hayden\Desktop\Safeshipper Home\backend"

# Step 3: Create virtual environment
Write-Host ""
Write-Host "Step 3: Creating Python virtual environment..." -ForegroundColor Yellow
if (Test-Path "venv") {
    Write-Host "Virtual environment already exists. Skipping creation." -ForegroundColor Yellow
} else {
    py -3 -m venv venv
    Write-Host "Virtual environment created successfully." -ForegroundColor Green
}

# Step 4: Activate virtual environment
Write-Host ""
Write-Host "Step 4: Activating virtual environment..." -ForegroundColor Yellow
& ".\venv\Scripts\Activate.ps1"

# Step 5: Upgrade pip
Write-Host ""
Write-Host "Step 5: Upgrading pip..." -ForegroundColor Yellow
py -3 -m pip install --upgrade pip

# Step 6: Install requirements
Write-Host ""
Write-Host "Step 6: Installing project requirements..." -ForegroundColor Yellow
py -3 -m pip install -r requirements.txt

# Step 7: Check Django
Write-Host ""
Write-Host "Step 7: Verifying Django installation..." -ForegroundColor Yellow
try {
    $djangoVersion = py -3 -c "import django; print(django.get_version())"
    Write-Host "Django found: $djangoVersion" -ForegroundColor Green
} catch {
    Write-Host "Django installation failed." -ForegroundColor Red
    exit 1
}

# Step 8: Run Django checks
Write-Host ""
Write-Host "Step 8: Running Django system checks..." -ForegroundColor Yellow
py -3 manage.py check

# Step 9: Run migrations
Write-Host ""
Write-Host "Step 9: Running database migrations..." -ForegroundColor Yellow
py -3 manage.py migrate

Write-Host ""
Write-Host "=== Setup Complete ===" -ForegroundColor Green
Write-Host ""
Write-Host "To activate the virtual environment, run:" -ForegroundColor Cyan
Write-Host "  cd 'C:\Users\Hayden\Desktop\Safeshipper Home\backend'" -ForegroundColor White
Write-Host "  .\venv\Scripts\Activate.ps1" -ForegroundColor White
Write-Host ""
Write-Host "Then you can run Django commands like:" -ForegroundColor Cyan
Write-Host "  py -3 manage.py runserver" -ForegroundColor White
Write-Host "  py -3 manage.py createsuperuser" -ForegroundColor White
Write-Host ""
Write-Host "Django server will be available at: http://localhost:8000" -ForegroundColor Green 