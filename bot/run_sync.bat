@echo off
cd /d "%~dp0"
set LOG=%~dp0sync.log
echo ===== %date% %time% =====>> "%LOG%"
call .venv\Scripts\activate.bat
python open_chrome.py >> "%LOG%" 2>&1
echo Exit code: %ERRORLEVEL%>> "%LOG%"
echo.>> "%LOG%"
