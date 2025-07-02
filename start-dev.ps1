#!/usr/bin/env pwsh

Write-Host "===============================================" -ForegroundColor Green
Write-Host "   Safeshipper Development Environment" -ForegroundColor Green
Write-Host "===============================================" -ForegroundColor Green
Write-Host ""

Write-Host "Starting Django backend and Next.js frontend..." -ForegroundColor Yellow
Write-Host ""

# Start Django backend in a new PowerShell window
Start-Process powershell -ArgumentList @(
    "-NoExit",
    "-Command",
    "cd backend; .\.venv\Scripts\Activate.ps1; python manage.py runserver"
) -WindowStyle Normal

# Start Next.js frontend in a new PowerShell window  
Start-Process powershell -ArgumentList @(
    "-NoExit", 
    "-Command",
    "cd frontend; npm run dev"
) -WindowStyle Normal

Write-Host "===============================================" -ForegroundColor Green
Write-Host "   Development servers starting..." -ForegroundColor Green
Write-Host "===============================================" -ForegroundColor Green
Write-Host ""
Write-Host "Django Backend: " -NoNewline -ForegroundColor White
Write-Host "http://localhost:8000" -ForegroundColor Cyan
Write-Host "Next.js Frontend: " -NoNewline -ForegroundColor White  
Write-Host "http://localhost:3000" -ForegroundColor Cyan
Write-Host ""
Write-Host "Press any key to exit..." -ForegroundColor Gray
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown") 