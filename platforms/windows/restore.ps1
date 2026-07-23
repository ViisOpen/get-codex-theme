[CmdletBinding()]
param(
  [string]$Library = (Join-Path $HOME '.codex\get-codex-theme'),
  [Nullable[int]]$Port = $null
)
$ErrorActionPreference = 'Stop'
$Injector = Join-Path $Library 'runtime\injector.mjs'
$State = Join-Path $Library 'runtime-state.json'
$Node = (Get-Command node -ErrorAction SilentlyContinue).Source
if ($null -eq $Port -and (Test-Path -LiteralPath $State)) {
  try {
    $savedState = Get-Content -Raw -LiteralPath $State | ConvertFrom-Json
    if ([int]$savedState.port -ge 1024 -and [int]$savedState.port -le 65535) { $Port = [int]$savedState.port }
  } catch {}
}
if ($null -eq $Port) { $Port = 9341 }
if ($Port -lt 1024 -or $Port -gt 65535) { throw "Invalid port: $Port" }
if ($Node -and (Test-Path -LiteralPath $Injector)) {
  & $Node $Injector --remove --port $Port --timeout-ms 1800 *> $null
}
if (Test-Path -LiteralPath $State) {
  try {
    $stateValue = Get-Content -Raw -LiteralPath $State | ConvertFrom-Json
    $process = Get-CimInstance Win32_Process -Filter "ProcessId = $([int]$stateValue.injectorPid)" -ErrorAction SilentlyContinue
    if ($process -and ([string]$process.CommandLine).Contains('runtime\injector.mjs')) {
      Stop-Process -Id ([int]$stateValue.injectorPid) -Force -ErrorAction SilentlyContinue
    }
  } catch {}
  Remove-Item -LiteralPath $State -Force -ErrorAction SilentlyContinue
}
Write-Host 'GetCodexTheme injection removed. Quit and reopen Codex normally to close the debug port.'
