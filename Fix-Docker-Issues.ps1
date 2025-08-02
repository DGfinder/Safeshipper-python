# SafeShipper Docker Troubleshooting Script
# Run this if you're having issues with Docker

Write-Host "====================================" -ForegroundColor Cyan
Write-Host "  SafeShipper Docker Troubleshooter" -ForegroundColor Cyan
Write-Host "====================================" -ForegroundColor Cyan
Write-Host ""

# Function to check Docker status
function Test-Docker {
    try {
        docker version *>&1 | Out-Null
        return $true
    } catch {
        return $false
    }
}

# Main menu
function Show-Menu {
    Write-Host "What issue are you experiencing?" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "1. Docker is not starting" -ForegroundColor White
    Write-Host "2. 'No such host' or network errors" -ForegroundColor White
    Write-Host "3. Services won't start" -ForegroundColor White
    Write-Host "4. Reset everything and start fresh" -ForegroundColor White
    Write-Host "5. Check service status" -ForegroundColor White
    Write-Host "6. Exit" -ForegroundColor White
    Write-Host ""
}

# Fix network issues
function Fix-NetworkIssues {
    Write-Host "Fixing Docker network issues..." -ForegroundColor Yellow
    
    # Reset Docker DNS
    Write-Host "Resetting Docker DNS settings..." -ForegroundColor Cyan
    docker system prune -f
    
    # Restart Docker service
    Write-Host "Restarting Docker service..." -ForegroundColor Cyan
    Restart-Service docker -ErrorAction SilentlyContinue
    
    Start-Sleep -Seconds 5
    
    Write-Host "Network issues should be resolved!" -ForegroundColor Green
    Write-Host "Try running START_SAFESHIPPER.bat again." -ForegroundColor Yellow
}

# Reset everything
function Reset-Everything {
    Write-Host "This will remove all Docker containers and data!" -ForegroundColor Red
    $confirm = Read-Host "Are you sure? (yes/no)"
    
    if ($confirm -eq "yes") {
        Write-Host "Stopping all containers..." -ForegroundColor Yellow
        docker-compose down -v
        
        Write-Host "Removing all Docker data..." -ForegroundColor Yellow
        docker system prune -a -f --volumes
        
        Write-Host "Reset complete!" -ForegroundColor Green
        Write-Host "Run START_SAFESHIPPER.bat to start fresh." -ForegroundColor Yellow
    }
}

# Check service status
function Check-ServiceStatus {
    Write-Host "Checking SafeShipper services..." -ForegroundColor Yellow
    Write-Host ""
    
    docker-compose ps
    
    Write-Host ""
    Write-Host "Service URLs:" -ForegroundColor Cyan
    Write-Host "Frontend: http://localhost:3000" -ForegroundColor White
    Write-Host "Backend: http://localhost:8000" -ForegroundColor White
    Write-Host "Elasticsearch: http://localhost:9200" -ForegroundColor White
    Write-Host "pgAdmin: http://localhost:5050" -ForegroundColor White
}

# Main script
Clear-Host

if (-not (Test-Docker)) {
    Write-Host "Docker is not running!" -ForegroundColor Red
    Write-Host ""
    Write-Host "Starting Docker Desktop..." -ForegroundColor Yellow
    Start-Process "C:\Program Files\Docker\Docker\Docker Desktop.exe"
    
    Write-Host "Waiting for Docker to start (30 seconds)..." -ForegroundColor Yellow
    Start-Sleep -Seconds 30
    
    if (-not (Test-Docker)) {
        Write-Host "Docker still not running. Please start Docker Desktop manually." -ForegroundColor Red
        Read-Host "Press Enter to exit"
        exit
    }
}

Write-Host "Docker is running!" -ForegroundColor Green
Write-Host ""

# Change to SafeShipper directory
Set-Location $PSScriptRoot

# Main loop
do {
    Show-Menu
    $choice = Read-Host "Enter your choice (1-6)"
    
    switch ($choice) {
        "1" {
            Write-Host ""
            Write-Host "Please ensure Docker Desktop is running." -ForegroundColor Yellow
            Write-Host "If it's not starting, try:" -ForegroundColor Yellow
            Write-Host "1. Restart your computer" -ForegroundColor White
            Write-Host "2. Reinstall Docker Desktop" -ForegroundColor White
            Write-Host ""
        }
        "2" {
            Fix-NetworkIssues
        }
        "3" {
            Write-Host ""
            Write-Host "Restarting all services..." -ForegroundColor Yellow
            docker-compose down
            docker-compose up -d
            Write-Host "Services restarted!" -ForegroundColor Green
            Write-Host ""
        }
        "4" {
            Reset-Everything
        }
        "5" {
            Check-ServiceStatus
        }
        "6" {
            Write-Host "Goodbye!" -ForegroundColor Green
            exit
        }
        default {
            Write-Host "Invalid choice. Please try again." -ForegroundColor Red
        }
    }
    
    Write-Host ""
    Read-Host "Press Enter to continue"
    Clear-Host
    
} while ($true)