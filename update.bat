@echo off
setlocal
cd /d "%~dp0"

echo Pulling the latest version of vStream...
echo.

where git >nul 2>nul
if errorlevel 1 (
    echo [ERROR] Git was not found. Install it from https://git-scm.com
    pause
    exit /b 1
)

call git pull
if errorlevel 1 (
    echo.
    echo [ERROR] git pull failed. Read the messages above for the cause.
    pause
    exit /b 1
)

echo.
echo Refreshing dependencies...
call npm install

echo.
echo Done. Run start.bat to launch the updated app.
pause
