@echo off
REM ===================================================================
REM SafeShipper Port Conflict Resolver
REM Run this if you get "port already allocated" errors
REM ===================================================================

echo.
echo ====================================
echo    FIXING PORT CONFLICTS
echo ====================================
echo.

REM Stop all Docker containers that might be using the ports
echo Stopping any running SafeShipper containers...
docker-compose down 2>nul

REM Stop individual containers that might conflict
echo Stopping individual containers...
docker stop safeshipper-elasticsearch 2>nul
docker stop safeshipper-postgres 2>nul
docker stop safeshipper-redis 2>nul
docker stop safeshipper-backend 2>nul
docker stop safeshipper-frontend 2>nul

REM Remove any created but not running containers
echo Removing unused containers...
docker container prune -f

REM Check for conflicting services on common ports
echo.
echo Checking for conflicting services...

REM Check port 9200 (Elasticsearch)
netstat -an | findstr :9200 >nul
if %errorlevel% equ 0 (
    echo WARNING: Port 9200 is still in use!
    echo This might be a system Elasticsearch service.
    echo You may need to stop it manually.
    echo.
)

REM Check port 5432 (PostgreSQL)
netstat -an | findstr :5432 >nul
if %errorlevel% equ 0 (
    echo WARNING: Port 5432 is still in use!
    echo This might be a system PostgreSQL service.
    echo.
)

REM Check port 6379 (Redis)
netstat -an | findstr :6379 >nul
if %errorlevel% equ 0 (
    echo WARNING: Port 6379 is still in use!
    echo This might be a system Redis service.
    echo.
)

echo.
echo Port conflict resolution complete!
echo.
echo You can now run START_SAFESHIPPER.bat again.
echo.
pause