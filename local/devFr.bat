@echo off
SETLOCAL

cd /d %~dp0

echo ==============================
echo Starting French Frontend + Backend
echo ==============================

:: Check if Node.js is installed
where node >nul 2>&1
IF %ERRORLEVEL% NEQ 0 (
    echo Node.js is not installed or not in PATH.
    pause
    exit /b 1
)

:: Kill any process using port 3000 (frontend)
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":3000"') do (
    echo Killing process on port 3000 with PID %%a
    taskkill /F /PID %%a >nul 2>&1
)

:: Kill any process using port 4000 (backend)
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":4000"') do (
    echo Killing process on port 4000 with PID %%a
    taskkill /F /PID %%a >nul 2>&1
)

:: Start backend using node index.js
echo Starting backend...
start /min cmd /c "cd back && node index.js"

:: Start frontend using npx serve out
echo Starting French frontend...
start /min cmd /c "cd fr && npx serve out"

:: Give frontend a few seconds to start
timeout /t 5 >nul

:: Open browser at localhost:3000
echo Opening browser at http://localhost:3000
start "" "http://localhost:3000"

echo ==============================
echo All processes launched. Press any key to exit this window.
ENDLOCAL
