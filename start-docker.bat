@echo off
echo Starting SafeShipper with Docker...
echo.

echo Building and starting containers...
docker-compose up --build

echo.
echo SafeShipper is now running!
echo Frontend: http://localhost:3000
echo Backend API: http://localhost:8000
echo Database: localhost:5432
echo Redis: localhost:6379
echo.
echo Press Ctrl+C to stop all services 