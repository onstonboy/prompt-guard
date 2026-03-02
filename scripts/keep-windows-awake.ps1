<#
  keep-windows-awake.ps1

  Giữ cho Windows không sleep trong khi script đang chạy.
  Mặc định: cũng giữ màn hình không tắt.

  Tham số:
    -AllowDisplayOff : cho phép màn hình tắt, chỉ giữ máy không sleep.

  Cách dùng (PowerShell):

    cd "C:\Users\onsto\.openclaw\workspace\scripts"
    powershell -ExecutionPolicy Bypass -File .\keep-windows-awake.ps1
    powershell -ExecutionPolicy Bypass -File .\keep-windows-awake.ps1 -AllowDisplayOff

  Để dừng: nhấn Ctrl + C trong cửa sổ PowerShell.
#>

param(
  [switch]$AllowDisplayOff
)

Add-Type @"
using System;
using System.Runtime.InteropServices;

public static class NoSleep
{
    [DllImport("kernel32.dll", SetLastError = true)]
    public static extern uint SetThreadExecutionState(uint esFlags);
}
"@

# Flags cho SetThreadExecutionState (dung gia tri uint32 truc tiep)
[uint32]$ES_CONTINUOUS       = 2147483648  # 0x80000000
[uint32]$ES_SYSTEM_REQUIRED  = 1          # 0x00000001
[uint32]$ES_DISPLAY_REQUIRED = 2          # 0x00000002

if ($AllowDisplayOff) {
    # Chỉ giữ máy không sleep, cho phép màn hình tắt
    [NoSleep]::SetThreadExecutionState(
        $ES_CONTINUOUS -bor $ES_SYSTEM_REQUIRED
    ) | Out-Null
    Write-Host "Keep-awake: GIU MAY KHONG SLEEP, cho phep tat man hinh." -ForegroundColor Green
} else {
    # Giữ máy không sleep và không tắt màn hình
    [NoSleep]::SetThreadExecutionState(
        $ES_CONTINUOUS -bor $ES_SYSTEM_REQUIRED -bor $ES_DISPLAY_REQUIRED
    ) | Out-Null
    Write-Host "Keep-awake: GIU MAY KHONG SLEEP / KHONG TAT MAN HINH." -ForegroundColor Green
}

Write-Host "Để dừng và trả lại hành vi bình thường: nhấn Ctrl + C trong cửa sổ này." -ForegroundColor Yellow

try {
    while ($true) {
        Start-Sleep -Seconds 60
    }
}
finally {
    # Trả trạng thái về bình thường
    [NoSleep]::SetThreadExecutionState($ES_CONTINUOUS) | Out-Null
    Write-Host "Keep-awake đã tắt. Windows trở lại chế độ power bình thường." -ForegroundColor Gray
}

