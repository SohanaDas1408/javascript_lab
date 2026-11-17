# ─────────────────────────────────────────────────
#  get-active-window.ps1  -  Persistent window monitor
#
#  Uses GetForegroundWindow Win32 API to detect the
#  currently active window. Outputs JSON every 2s.
#  Falls back to Get-Process enumeration if the API
#  returns handle 0 (non-interactive session).
# ─────────────────────────────────────────────────

Add-Type @"
using System;
using System.Runtime.InteropServices;
using System.Text;

public class WinAPI {
    [DllImport("user32.dll")]
    public static extern IntPtr GetForegroundWindow();

    [DllImport("user32.dll")]
    public static extern int GetWindowText(IntPtr hWnd, StringBuilder text, int count);

    [DllImport("user32.dll", SetLastError = true)]
    public static extern uint GetWindowThreadProcessId(IntPtr hWnd, out uint lpdwProcessId);
}
"@

$OutputEncoding = [System.Text.Encoding]::UTF8
$lastTitle = ""

while ($true) {
    try {
        $title = ""
        $procName = ""

        # --- Method 1: GetForegroundWindow ---
        $hwnd = [WinAPI]::GetForegroundWindow()

        if ($hwnd -ne [IntPtr]::Zero) {
            $tb = New-Object System.Text.StringBuilder 512
            [void][WinAPI]::GetWindowText($hwnd, $tb, 512)
            $title = $tb.ToString()

            $pid2 = [uint32]0
            [void][WinAPI]::GetWindowThreadProcessId($hwnd, [ref]$pid2)

            if ($pid2 -gt 0) {
                $proc = Get-Process -Id $pid2 -ErrorAction SilentlyContinue
                if ($proc) {
                    $procName = $proc.ProcessName
                }
            }
        }

        # --- Method 2 (fallback): Find process with largest window ---
        if (-not $title -or -not $procName -or $procName -eq "Idle") {
            $topProc = Get-Process |
                Where-Object { $_.MainWindowTitle -ne "" -and $_.ProcessName -ne "powershell" -and $_.ProcessName -ne "pwsh" -and $_.ProcessName -ne "conhost" -and $_.ProcessName -ne "Idle" } |
                Sort-Object -Property WorkingSet64 -Descending |
                Select-Object -First 1

            if ($topProc) {
                $title = $topProc.MainWindowTitle
                $procName = $topProc.ProcessName
            }
        }

        # Skip empty, self, and unchanged
        if ($title -and $procName -and $procName -ne "powershell" -and $procName -ne "pwsh") {
            $obj = @{ title = $title; process = $procName } | ConvertTo-Json -Compress
            [Console]::WriteLine($obj)
            [Console]::Out.Flush()
        }
    }
    catch {
        # Silently continue
    }

    Start-Sleep -Seconds 2
}
