@echo off
REM ===================================================================
REM SafeShipper - Easy Start Script
REM Just double-click this file to start SafeShipper!
REM ===================================================================

echo.
echo ====================================
echo    STARTING SAFESHIPPER
echo ====================================
echo.

REM Check if Docker is running
docker version >nul 2>&1
if %errorlevel% neq 0 (
    echo Docker is not running. Starting Docker Desktop...
    echo.
    
    REM Try to start Docker Desktop
    start "" "C:\Program Files\Docker\Docker\Docker Desktop.exe"
    
    echo Waiting for Docker to start (this may take 30-60 seconds)...
    timeout /t 30 /nobreak >nul
    
    REM Check again
    docker version >nul 2>&1
    if %errorlevel% neq 0 (
        echo.
        echo ERROR: Docker Desktop is not running!
        echo Please start Docker Desktop manually and try again.
        echo.
        pause
        exit /b 1
    )
)

echo Docker is running!
echo.

REM Navigate to SafeShipper directory
cd /d "%~dp0"

REM Check for port conflicts first
echo Checking for port conflicts...
netstat -an | findstr :9200 >nul 2>&1
if %errorlevel% equ 0 (
    echo.
    echo WARNING: Port 9200 is already in use!
    echo This will cause Elasticsearch to fail.
    echo.
    echo Running port conflict resolver...
    call Fix-Port-Conflicts.bat
)

REM Start all services
echo Starting SafeShipper services...
echo This may take a few minutes on first run.
echo.

docker-compose up -d

if %errorlevel% neq 0 (
    echo.
    echo ERROR: Failed to start services!
    echo.
    echo Possible solutions:
    echo 1. Make sure Docker Desktop is running
    echo 2. Try running: docker-compose down
    echo 3. Then run this script again
    echo.
    pause
    exit /b 1
)

echo.
echo Waiting for services to be ready...
timeout /t 10 /nobreak >nul

echo.
echo ====================================
echo    SAFESHIPPER IS STARTING!
echo ====================================
echo.
echo Frontend: http://localhost:3000
echo Backend API: http://localhost:8000
echo.
echo Other services:
echo - pgAdmin (Database): http://localhost:5050
echo - Flower (Task Monitor): http://localhost:5555
echo - MinIO (File Storage): http://localhost:9001
echo.
echo Press any key to open SafeShipper in your browser...
pause >nul

REM Open the frontend in default browser
start http://localhost:3000

echo.
echo SafeShipper is running!
echo.
echo To stop SafeShipper, press Ctrl+C or run: docker-compose down
echo.
pause