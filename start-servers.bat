@echo off
echo Starting Safeshipper Development Servers...
echo.

echo Starting Django Backend...
start "Django Backend" cmd /k "cd backend && python manage.py runserver --settings=safeshipper_core.dev_settings"

echo Waiting 3 seconds for backend to start...
timeout /t 3 /nobreak > nul

echo Starting Next.js Frontend...
start "Next.js Frontend" cmd /k "cd frontend-new && npm run dev"

echo.
echo Servers are starting...
echo Backend: http://localhost:8000
echo Frontend: http://localhost:3000
echo.
echo Press any key to exit this window...
pause > nul 