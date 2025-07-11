@echo off
echo =======================================================
echo  Intel Classroom Assistant - Server Startup Script
echo =======================================================
echo.

REM Create logs directory if it doesn't exist
if not exist "logs" mkdir logs

echo [%date% %time%] Starting Intel Classroom Assistant Backend Servers... >> logs\startup.log

REM Check if Python is available
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Python is not installed or not in PATH
    echo [%date% %time%] ERROR: Python not found >> logs\startup.log
    pause
    exit /b 1
)

REM Check if Node.js is available
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Node.js is not installed or not in PATH
    echo [%date% %time%] ERROR: Node.js not found >> logs\startup.log
    pause
    exit /b 1
)

echo Prerequisites check passed
echo [%date% %time%] Prerequisites check passed >> logs\startup.log

echo.
echo Starting Node.js Backend Server (Port 8080)...
echo [%date% %time%] Starting Node.js backend server >> logs\startup.log
start "Node.js Backend" cmd /k "node server.js"

echo.
echo Waiting 5 seconds for Node.js server to initialize...
timeout /t 5 /nobreak

echo.
echo Starting Python AI Server (Port 8000)...
echo [%date% %time%] Starting Python AI server >> logs\startup.log
start "Python AI Server" cmd /k "cd servers && python ultra_optimized_server.py"

echo.
echo Both servers are starting up!
echo.
echo 📊 Server Status:
echo   - Node.js Backend: http://localhost:8080
echo   - Python AI Server: http://localhost:8000
echo   - Health Check: http://localhost:8000/api/health
echo.
echo 📝 Logs are being written to:
echo   - Backend logs: logs\server.log
echo   - AI server logs: servers\logs\ultra_optimized.log
echo   - Startup log: logs\startup.log
echo.
echo ⏰ Waiting additional 10 seconds for full initialization...
timeout /t 10 /nobreak

echo.
echo 🔍 Testing server connectivity...

REM Test Node.js server
curl -s http://localhost:8080/ >nul 2>&1
if %errorlevel% equ 0 (
    echo ✅ Node.js backend server is responding
    echo [%date% %time%] Node.js server responding OK >> logs\startup.log
) else (
    echo ⚠️ Node.js backend server may not be ready yet
    echo [%date% %time%] Node.js server not responding >> logs\startup.log
)

REM Test Python server
curl -s http://localhost:8000/api/health >nul 2>&1
if %errorlevel% equ 0 (
    echo ✅ Python AI server is responding
    echo [%date% %time%] Python AI server responding OK >> logs\startup.log
) else (
    echo ⚠️ Python AI server may not be ready yet
    echo [%date% %time%] Python AI server not responding >> logs\startup.log
)

echo.
echo 🎉 Startup process completed!
echo.
echo 💡 Tips:
echo   - Check the server windows for any error messages
echo   - Visit http://localhost:8000/api/health for AI server status
echo   - Press Ctrl+C in either window to stop the respective server
echo.
echo [%date% %time%] Startup script completed >> logs\startup.log

pause
