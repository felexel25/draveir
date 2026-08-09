@echo off
setlocal
rem Arranca Draveir Studio con el servidor OCULTO en segundo plano (sin ventana
rem de terminal) y abre el navegador. El servidor se apaga solo al cerrar la
rem pestana (o por inactividad), igual que Draveir Writer.
cd /d "%~dp0..\.."
set "URL=http://localhost:4477"
rem Reutiliza un servidor ya activo en el puerto.
powershell.exe -NoProfile -ExecutionPolicy Bypass -Command "try { $r=Invoke-WebRequest -UseBasicParsing -Uri '%URL%/api/ping' -TimeoutSec 1; if ($r.StatusCode -eq 200) { exit 0 } } catch {}; exit 1"
if not errorlevel 1 goto open_browser
for /f "delims=" %%P in ('powershell.exe -NoProfile -Command "$p=Start-Process -FilePath node -ArgumentList 'scripts\admin\server.mjs' -WorkingDirectory (Get-Location).Path -WindowStyle Hidden -PassThru; $p.Id" 2^>nul') do set "SERVER_PID=%%P"
if not defined SERVER_PID (
  echo No se pudo iniciar node scripts\admin\server.mjs.
  exit /b 1
)
powershell.exe -NoProfile -ExecutionPolicy Bypass -Command "$deadline=(Get-Date).AddSeconds(15); while ((Get-Date) -lt $deadline) { try { $r=Invoke-WebRequest -UseBasicParsing -Uri '%URL%/api/ping' -TimeoutSec 1; if ($r.StatusCode -eq 200) { exit 0 } } catch {} ; Start-Sleep -Milliseconds 250 }; exit 1"
if errorlevel 1 (
  echo El servidor no respondio en 15 segundos.
  taskkill /PID %SERVER_PID% /T /F >nul 2>&1
  exit /b 1
)
:open_browser
start "" "%URL%"
