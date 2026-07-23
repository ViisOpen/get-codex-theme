[CmdletBinding()]
param([string]$Library = (Join-Path $HOME '.codex\get-codex-theme'))
$ErrorActionPreference = 'Stop'

$Library = [IO.Path]::GetFullPath($Library)
$Tray = Join-Path $Library 'bin\tray-windows.ps1'
$State = Join-Path $Library 'tray-state.json'
if (-not (Test-Path -LiteralPath $State)) {
  Write-Host 'Get Codex Theme tray is not running.'
  exit 0
}

try {
  $saved = Get-Content -Raw -LiteralPath $State | ConvertFrom-Json
  $process = Get-CimInstance Win32_Process -Filter "ProcessId = $([int]$saved.pid)" -ErrorAction SilentlyContinue
  if ($process -and ([string]$process.CommandLine).Contains($Tray)) {
    Stop-Process -Id ([int]$saved.pid) -Force -ErrorAction Stop
  }
} finally {
  Remove-Item -LiteralPath $State -Force -ErrorAction SilentlyContinue
}
Write-Host 'Get Codex Theme tray stopped.'
