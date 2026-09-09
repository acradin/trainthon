@echo off
setlocal
cd /d "%~dp0"

echo DeepTracer — local debugger
echo Opening http://localhost:3000
echo Logs are read from this PC (~/.claude, ~/.codex).
echo.

start "" "http://localhost:3000"

netstat -ano | findstr /R /C:":3000 .*LISTENING" >nul
if %ERRORLEVEL%==0 (
  echo Already running on port 3000.
  exit /b 0
)

if not exist "node_modules" (
  echo Installing dependencies...
  call npm install
  if errorlevel 1 (
    echo npm install failed. Install Node.js first: https://nodejs.org
    pause
    exit /b 1
  )
)

call npm run dev
pause
