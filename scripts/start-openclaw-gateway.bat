@echo off
REM Chay OpenClaw gateway khi Windows startup hoac khi anh tu chay.
REM Duong dan openclaw-atom: C:\Users\onsto\node_modules\openclaw-atom

set "OPENCLAW_ATOM_DIR=C:\Users\onsto\node_modules\openclaw-atom"
if not exist "%OPENCLAW_ATOM_DIR%\openclaw.mjs" (
  echo [start-openclaw-gateway] Khong tim thay openclaw.mjs trong: %OPENCLAW_ATOM_DIR%
  echo Kiem tra lai viec cai dat openclaw-atom (npm/yarn/pnpm).
  pause
  exit /b 1
)

REM Chay script giu may khong sleep (cho phep tat man hinh)
REM Script nay chay o workspace scripts:
REM   C:\Users\onsto\.openclaw\workspace\scripts\keep-windows-awake.ps1
start "" powershell -ExecutionPolicy Bypass -File "C:\Users\onsto\.openclaw\workspace\scripts\keep-windows-awake.ps1" -AllowDisplayOff

cd /d "%OPENCLAW_ATOM_DIR%"
echo [start-openclaw-gateway] Dang chay OpenClaw gateway tai: %CD%
node openclaw.mjs gateway --allow-unconfigured
echo.
echo [start-openclaw-gateway] Gateway da thoat, ma loi: %errorlevel%
echo Nhan phim bat ky de dong cua so nay...
pause >nul
