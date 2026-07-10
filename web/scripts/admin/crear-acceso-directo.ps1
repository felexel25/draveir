# Crea un acceso directo "Draveir Studio" en el Escritorio que arranca la app.
# Ejecutar una vez:  powershell -ExecutionPolicy Bypass -File crear-acceso-directo.ps1
$ErrorActionPreference = 'Stop'
$here    = Split-Path -Parent $MyInvocation.MyCommand.Path
$target  = Join-Path $here 'Draveir Studio.cmd'
$icon    = Join-Path $here 'draveir.ico'   # La Fuerza, el mismo emblema del favicon del sitio
$desktop = [Environment]::GetFolderPath('Desktop')
$lnkPath = Join-Path $desktop 'Draveir Studio.lnk'

$shell = New-Object -ComObject WScript.Shell
$lnk = $shell.CreateShortcut($lnkPath)
$lnk.TargetPath       = $target
$lnk.WorkingDirectory = $here
$lnk.Description       = 'Panel local de publicacion de Draveir'
$lnk.WindowStyle       = 7  # minimizado
if (Test-Path $icon) { $lnk.IconLocation = $icon }
$lnk.Save()

Write-Host "Acceso directo creado en: $lnkPath"
