@echo off
rem Omnibus bouwen en naar Docker Hub zetten. Zet dit bestand in de hoofdmap van de bouwmap.
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0hosting\container\uitrol.ps1"
echo.
pause