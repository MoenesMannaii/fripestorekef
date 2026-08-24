@echo off
SETLOCAL
cd /d %~dp0

echo ==============================
echo Starting AEVE Frontend + Backend
echo ==============================

:: Check Node.js
where node >nul 2>&1
IF %ERRORLEVEL% NEQ 0 (
    echo Node.js not found. Install from nodejs.org
    pause
    exit /b 1
)

:: Kill processes on ports
echo Clearing ports 3000, 4000...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":3000"') do taskkill /F /PID %%a >nul 2>&1
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":4000"') do taskkill /F /PID %%a >nul 2>&1

echo Ready! Backend: http://localhost:4000 Frontend: http://localhost:3000

:: Start backend (port 4000) - keeps window open
start "AEVE Backend" cmd /k "cd back && node index.js"

:: Start frontend (port 3000) - keeps window open  
start "AEVE Frontend" cmd /k "node_modules\.bin\serve.cmd fr/out -p 3000"

:: Open browser
timeout /t 3 >nul
start "" "http://localhost:3000"

:: Close THIS window immediately
exit /b 0
