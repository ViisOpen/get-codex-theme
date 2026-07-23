[CmdletBinding()]
param([string]$Library = (Join-Path $HOME '.codex\get-codex-theme'))
$ErrorActionPreference = 'Stop'

$Library = [IO.Path]::GetFullPath($Library)
$Tray = Join-Path $Library 'bin\tray-windows.ps1'
$State = Join-Path $Library 'tray-state.json'
if (-not (Test-Path -LiteralPath $Tray)) { throw "Tray surface is not installed: $Tray" }

if (Test-Path -LiteralPath $State) {
  try {
    $saved = Get-Content -Raw -LiteralPath $State | ConvertFrom-Json
    $existing = Get-CimInstance Win32_Process -Filter "ProcessId = $([int]$saved.pid)" -ErrorAction SilentlyContinue
    if ($existing -and ([string]$existing.CommandLine).Contains($Tray)) {
      Write-Host "Get Codex Theme tray is already running (PID $($saved.pid))."
      exit 0
    }
  } catch {}
}

$PowerShell = (Get-Command powershell.exe -ErrorAction Stop).Source
$arguments = @('-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', "`"$Tray`"", '-Library', "`"$Library`"")
$process = Start-Process -FilePath $PowerShell -ArgumentList $arguments -WindowStyle Hidden -PassThru
@{ schemaVersion = 1; pid = $process.Id; startedAt = (Get-Date).ToUniversalTime().ToString('o') } |
  ConvertTo-Json | Set-Content -LiteralPath $State -Encoding utf8
Write-Host "Get Codex Theme tray started (PID $($process.Id))."
