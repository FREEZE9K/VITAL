@echo off
cd /d "%~dp0"
title VITAL Windows Game Detector
echo Installing/checking VITAL requirements...
py -m pip install -r requirements.txt
if errorlevel 1 (
  echo.
  echo Could not install requirements. Make sure Python is installed and try again.
  pause
  exit /b 1
)
echo.
echo Starting VITAL website and VALORANT detector...
py helper.py
pause
