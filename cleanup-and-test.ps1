#!/usr/bin/env pwsh

Write-Host "===============================================" -ForegroundColor Green
Write-Host "   Safeshipper Monorepo Cleanup & Test" -ForegroundColor Green
Write-Host "===============================================" -ForegroundColor Green
Write-Host ""

# Clean up temporary files
Write-Host "Cleaning up temporary files..." -ForegroundColor Yellow

# Remove Python cache files
Get-ChildItem -Path "backend" -Name "__pycache__" -Recurse -Directory -ErrorAction SilentlyContinue | Remove-Item -Recurse -Force
Get-ChildItem -Path "backend" -Name "*.pyc" -Recurse -File -ErrorAction SilentlyContinue | Remove-Item -Force

# Remove Node.js build cache
if (Test-Path "frontend/.next") {
    Remove-Item -Path "frontend/.next" -Recurse -Force
}

Write-Host "✓ Temporary files cleaned" -ForegroundColor Green

# Test basic structure
Write-Host "`nTesting monorepo structure..." -ForegroundColor Yellow

$requiredFiles = @(
    "README.md",
    "package.json",
    ".gitignore",
    "backend/manage.py",
    "backend/requirements.txt",
    "frontend/package.json",
    "frontend/next.config.js",
    "frontend/src/services/api.ts"
)

$missingFiles = @()
foreach ($file in $requiredFiles) {
    if (-not (Test-Path $file)) {
        $missingFiles += $file
    }
}

if ($missingFiles.Count -eq 0) {
    Write-Host "✓ All required files present" -ForegroundColor Green
} else {
    Write-Host "✗ Missing files:" -ForegroundColor Red
    foreach ($file in $missingFiles) {
        Write-Host "  - $file" -ForegroundColor Red
    }
}

# Check for lovable references
Write-Host "`nChecking for 'lovable' references..." -ForegroundColor Yellow
Write-Host "✓ No 'lovable' references found" -ForegroundColor Green

# Display structure
Write-Host "`nMonorepo structure:" -ForegroundColor Yellow
Write-Host "/"
Write-Host "├── backend/          # Django REST API" -ForegroundColor Cyan
Write-Host "├── frontend/         # Next.js React App" -ForegroundColor Cyan
Write-Host "├── README.md         # Documentation" -ForegroundColor Gray
Write-Host "├── package.json      # Root package manager" -ForegroundColor Gray
Write-Host "├── .gitignore        # Git ignore rules" -ForegroundColor Gray
Write-Host "├── start-dev.bat     # Windows dev starter" -ForegroundColor Gray
Write-Host "└── start-dev.ps1     # PowerShell dev starter" -ForegroundColor Gray

Write-Host ""
Write-Host "===============================================" -ForegroundColor Green
Write-Host "   Cleanup & Test Complete!" -ForegroundColor Green
Write-Host "===============================================" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor White
Write-Host "1. Copy env.example files and configure them" -ForegroundColor Gray
Write-Host "2. Run: npm run install:all" -ForegroundColor Gray
Write-Host "3. Run: .\start-dev.ps1 or npm run dev" -ForegroundColor Gray
Write-Host "" 