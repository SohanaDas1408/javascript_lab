Add-Type @"
using System;
using System.Runtime.InteropServices;
using System.Text;

public class WinDebug {
    [DllImport("user32.dll")]
    public static extern IntPtr GetForegroundWindow();

    [DllImport("user32.dll")]
    public static extern int GetWindowText(IntPtr hWnd, StringBuilder text, int count);

    [DllImport("user32.dll", SetLastError = true)]
    public static extern uint GetWindowThreadProcessId(IntPtr hWnd, out uint lpdwProcessId);
}
"@

$hwnd = [WinDebug]::GetForegroundWindow()
Write-Host "Handle: $hwnd"

$tb = New-Object System.Text.StringBuilder 512
$ret = [WinDebug]::GetWindowText($hwnd, $tb, 512)
Write-Host "GetWindowText returned: $ret"
Write-Host "Title: '$($tb.ToString())'"

$pid2 = [uint32]0
$tid = [WinDebug]::GetWindowThreadProcessId($hwnd, [ref]$pid2)
Write-Host "Thread ID: $tid"
Write-Host "Process ID: $pid2"

if ($pid2 -gt 0) {
    $proc = Get-Process -Id $pid2 -ErrorAction SilentlyContinue
    if ($proc) {
        Write-Host "Process Name: $($proc.ProcessName)"
        Write-Host "Main Window Title: $($proc.MainWindowTitle)"
    } else {
        Write-Host "Could not get process for PID $pid2"
    }
} else {
    Write-Host "PID is 0 - trying alternative method..."
    # Alternative: list all processes with a window
    Get-Process | Where-Object { $_.MainWindowTitle -ne "" } |
        Select-Object ProcessName, Id, MainWindowTitle |
        Format-Table -AutoSize
}
