# Them OpenClaw gateway vao Windows Startup (chay khi dang nhap).
# Chay: powershell -ExecutionPolicy Bypass -File "scripts\add-openclaw-to-startup.ps1"

$batPath = Join-Path $PSScriptRoot "start-openclaw-gateway.bat"
$startupFolder = [Environment]::GetFolderPath("Startup")
$shortcutPath = Join-Path $startupFolder "OpenClaw Gateway.lnk"

if (-not (Test-Path $batPath)) {
  Write-Host "Khong tim thay: $batPath" -ForegroundColor Red
  exit 1
}

$WshShell = New-Object -ComObject WScript.Shell
$Shortcut = $WshShell.CreateShortcut($shortcutPath)
$Shortcut.TargetPath = $batPath
$Shortcut.WorkingDirectory = Split-Path $batPath
$Shortcut.WindowStyle = 7   # 7 = Minimized
$Shortcut.Save()
[System.Runtime.Interopservices.Marshal]::ReleaseComObject($WshShell) | Out-Null

Write-Host "Da tao shortcut tai: $shortcutPath" -ForegroundColor Green
Write-Host "OpenClaw gateway se chay khi anh dang nhap Windows (cua so se mo minimized)." -ForegroundColor Gray
Write-Host "De go: xoa file shortcut trong thu muc Startup." -ForegroundColor Gray
