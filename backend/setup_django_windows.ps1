# Setup Django Environment for SafeShipper on Windows
# Run this script in PowerShell as Administrator

Write-Host "=== Setting up Django Environment for SafeShipper (Windows) ===" -ForegroundColor Green
Write-Host ""

# Step 1: Check Python installation
Write-Host "Step 1: Checking Python installation..." -ForegroundColor Yellow
python --version
if ($LASTEXITCODE -ne 0) {
    Write-Host "Python not found. Using py launcher..." -ForegroundColor Red
    py -3 --version
}

# Step 2: Install pip if not present
Write-Host ""
Write-Host "Step 2: Installing/Upgrading pip..." -ForegroundColor Yellow
try {
    python -m ensurepip --upgrade
    python -m pip install --upgrade pip
} catch {
    py -3 -m ensurepip --upgrade
    py -3 -m pip install --upgrade pip
}

# Step 3: Create virtual environment (if not exists)
Write-Host ""
Write-Host "Step 3: Setting up virtual environment..." -ForegroundColor Yellow
if (Test-Path "venv") {
    Write-Host "Virtual environment already exists. Activating..." -ForegroundColor Cyan
    & .\venv\Scripts\Activate.ps1
} else {
    Write-Host "Creating new virtual environment..." -ForegroundColor Cyan
    python -m venv venv
    & .\venv\Scripts\Activate.ps1
}

# Step 4: Install requirements
Write-Host ""
Write-Host "Step 4: Installing project requirements..." -ForegroundColor Yellow
python -m pip install -r requirements.txt

# Step 5: Verify Django installation
Write-Host ""
Write-Host "Step 5: Verifying Django installation..." -ForegroundColor Yellow
python -c "import django; print(f'Django version: {django.get_version()}')"

# Step 6: Run Django checks
Write-Host ""
Write-Host "Step 6: Running Django system checks..." -ForegroundColor Yellow
python manage.py check

Write-Host ""
Write-Host "=== Setup Complete ===" -ForegroundColor Green
Write-Host ""
Write-Host "Your Django environment is ready!" -ForegroundColor Cyan
Write-Host "To activate the virtual environment in the future, run:" -ForegroundColor Yellow
Write-Host "  .\venv\Scripts\Activate.ps1" -ForegroundColor White
Write-Host ""
Write-Host "Common Django commands:" -ForegroundColor Yellow
Write-Host "  python manage.py runserver" -ForegroundColor White
Write-Host "  python manage.py migrate" -ForegroundColor White
Write-Host "  python manage.py createsuperuser" -ForegroundColor White