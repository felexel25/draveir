@echo off
rem Arranca Draveir Studio (servidor en su propia ventana) y abre el navegador.
cd /d "%~dp0..\.."
start "Draveir Studio" /min cmd /c "node scripts\admin\server.mjs"
ping -n 3 127.0.0.1 >nul
start "" http://localhost:4477
