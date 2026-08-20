@echo off
chcp 65001 > nul
title Zenith Atlas - Sync
color 0b

echo [*] Starting Zenith Atlas sync engine...
echo.

if exist "scripts\sync.py" (
    python scripts\sync.py
) else if exist "src\scripts\sync.py" (
    python src\scripts\sync.py
) else (
    python sync.py
)

echo.
if %ERRORLEVEL% EQU 0 (
    echo [V] Sync completed successfully. Refresh your browser (F5).
) else (
    echo [X] Error: Please verify Python and dependencies (pip install -r requirements.txt).
)
echo.
pause
