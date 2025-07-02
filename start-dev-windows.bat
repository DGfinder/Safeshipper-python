@echo off
echo Starting Safeshipper Development Servers...

REM Start backend server
echo Starting Django backend server...
start "Django Backend" cmd /k "cd backend && python manage.py runserver --settings=safeshipper_core.dev_settings"

REM Wait a bit for backend to start
timeout /t 3 /nobreak >nul

REM Start frontend server
echo Starting Next.js frontend server...
start "Next.js Frontend" cmd /k "cd frontend && npm run dev"

echo Both servers starting...
echo Frontend: http://localhost:3000
echo Backend: http://localhost:8000
echo.
echo Press any key to close this window...
pause >nul 