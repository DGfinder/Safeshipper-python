@echo off
echo ===============================================
echo   Safeshipper Development Environment
echo ===============================================
echo.
echo Starting Django backend and Next.js frontend...
echo.

REM Create new command windows for each service
start "Django Backend" cmd /k "cd backend && .venv\Scripts\activate && python manage.py runserver"
start "Next.js Frontend" cmd /k "cd frontend && npm run dev"

echo.
echo ===============================================
echo   Development servers starting...
echo ===============================================
echo.
echo Django Backend: http://localhost:8000
echo Next.js Frontend: http://localhost:3000
echo.
echo Press any key to exit this window...
pause > nul 