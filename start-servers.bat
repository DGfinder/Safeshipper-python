@echo off
echo Starting Safeshipper Development Servers...
echo.

REM Start backend server
echo Starting Django backend server on http://localhost:8000...
start "Django Backend" cmd /k "cd backend && python manage.py runserver --settings=safeshipper_core.dev_settings"

REM Wait a bit for backend to start
timeout /t 3 /nobreak >nul

REM Start frontend server  
echo Starting Next.js frontend server on http://localhost:3000...
start "Next.js Frontend" cmd /k "cd frontend && npm run dev"

echo.
echo Both servers are starting...
echo Frontend: http://localhost:3000
echo Backend API: http://localhost:8000
echo.
echo Press any key to close this window...
pause >nul 