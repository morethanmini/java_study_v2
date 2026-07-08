@echo off
setlocal enabledelayedexpansion
cd /d "%~dp0"

set FOUND=0
set KILLED=,
for /f "tokens=5" %%p in ('netstat -ano ^| findstr :3000 ^| findstr LISTENING') do (
    echo !KILLED! | findstr /c:",%%p," >nul
    if errorlevel 1 (
        echo Stopping grading server... PID %%p
        taskkill /F /PID %%p >nul 2>&1
        set KILLED=!KILLED!%%p,
        set FOUND=1
    )
)
if !FOUND!==0 (
    echo No server is running.
) else (
    echo Stopped.
)

echo Starting grading server...
cscript //nologo start-server-hidden.vbs
ping -n 2 127.0.0.1 >nul
netstat -ano | findstr :3000 | findstr LISTENING >nul
if errorlevel 1 (
    echo Failed to start server. Check server-startup.log
) else (
    echo Server started at http://localhost:3000
)
