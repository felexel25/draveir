@echo off
rem Arranca Draveir Studio y abre el navegador.
cd /d "%~dp0..\.."
start "" http://localhost:4477
node scripts\admin\server.mjs
