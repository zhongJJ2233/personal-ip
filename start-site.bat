@echo off
setlocal
cd /d "%~dp0"

set "SITE_URL=http://127.0.0.1:5173/"
echo Starting the personal IP site at %SITE_URL%
start "Personal IP Dev Server" cmd /k "cd /d ""%~dp0"" && npm run dev"

set "READY=0"
for /l %%N in (1,1,30) do (
  powershell -NoProfile -ExecutionPolicy Bypass -Command "try { $r=Invoke-WebRequest -UseBasicParsing -Uri '%SITE_URL%' -TimeoutSec 1; if ($r.StatusCode -eq 200) { exit 0 } } catch {}; exit 1" >nul 2>&1
  if not errorlevel 1 (
    set "READY=1"
    goto :ready
  )
  timeout /t 1 /nobreak >nul
)

:ready
if "%READY%"=="0" echo The server is still starting; opening the address anyway.

set "EDGE_EXE=%ProgramFiles(x86)%\Microsoft\Edge\Application\msedge.exe"
if not exist "%EDGE_EXE%" set "EDGE_EXE=%ProgramFiles%\Microsoft\Edge\Application\msedge.exe"
if not exist "%EDGE_EXE%" set "EDGE_EXE=%LOCALAPPDATA%\Microsoft\Edge\Application\msedge.exe"
if exist "%EDGE_EXE%" (
  start "" "%EDGE_EXE%" "%SITE_URL%"
) else (
  start "" "%SITE_URL%"
)

endlocal
