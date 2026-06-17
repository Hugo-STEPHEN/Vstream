@echo off
setlocal
cd /d "%~dp0"

echo ============================================
echo   vStream - Value Stream Intelligence Suite
echo ============================================
echo.

rem --- Check Node.js is available ---
where node >nul 2>nul
if errorlevel 1 (
    echo [ERROR] Node.js was not found on this PC.
    echo.
    echo   1. Download the LTS installer from https://nodejs.org
    echo   2. Run it ^(accept the defaults^)
    echo   3. Close this window, reopen start.bat
    echo.
    pause
    exit /b 1
)

for /f "tokens=*" %%v in ('node -v') do echo Using Node.js %%v
echo.

rem --- Install dependencies on first run (or after an update) ---
if not exist "node_modules" (
    echo Installing dependencies - first run only, this can take a minute...
    echo.
    call npm install
    if errorlevel 1 (
        echo.
        echo [ERROR] npm install failed. Read the messages above for the cause.
        pause
        exit /b 1
    )
    echo.
)

echo Starting the dev server. The app will open in your browser at
echo http://localhost:5173
echo.
echo Keep this window open while you use vStream.
echo Press Ctrl+C or close the window to stop the server.
echo.

call npm run dev -- --open

rem --- If the server exits (or fails to start), keep the window open ---
echo.
echo The dev server has stopped.
pause
