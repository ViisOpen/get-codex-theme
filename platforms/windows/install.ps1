[CmdletBinding()]
param(
  [string]$Library = (Join-Path $HOME '.codex\get-codex-theme'),
  [switch]$PassThru
)
$ErrorActionPreference = 'Stop'
$PlatformRoot = Split-Path -Parent $PSScriptRoot
$SourceRoot = Split-Path -Parent $PlatformRoot
$Node = (Get-Command node -ErrorAction Stop).Source
$NodeMajor = [int]((& $Node -p 'process.versions.node.split(".")[0]').Trim())
if ($NodeMajor -lt 22) { throw 'Node.js 22 or later is required.' }

$TransactionId = '{0}-{1}-{2}' -f (Get-Date -Format 'yyyyMMddHHmmss'), $PID, ([guid]::NewGuid().ToString('N').Substring(0, 8))
$StageRoot = Join-Path $Library ".runtime-install-$TransactionId"
$BackupRoot = Join-Path $Library "backups\runtime-$TransactionId"
$RuntimeDestination = Join-Path $Library 'runtime'
$BinDestination = Join-Path $Library 'bin'
$Mutex = [Threading.Mutex]::new($false, 'Local\GetCodexThemeRuntimeInstall')
$LockHeld = $false
$RuntimeMoved = $false
$BinMoved = $false
$RuntimeInstalled = $false
$BinInstalled = $false

function Test-PowerShellFile([string]$Path) {
  $Errors = $null
  [void][System.Management.Automation.Language.Parser]::ParseFile($Path, [ref]$null, [ref]$Errors)
  if ($Errors.Count -gt 0) { throw "PowerShell syntax validation failed for $Path`: $($Errors[0].Message)" }
}

try {
  New-Item -ItemType Directory -Force -Path $Library, $StageRoot, (Join-Path $StageRoot 'runtime'), (Join-Path $StageRoot 'bin') | Out-Null
  Copy-Item -Recurse -Force (Join-Path $SourceRoot 'runtime\*') (Join-Path $StageRoot 'runtime')
  foreach ($Name in @('start', 'restore', 'tray', 'tray-start', 'tray-stop')) {
    Copy-Item -Force (Join-Path $PSScriptRoot "$Name.ps1") (Join-Path $StageRoot "bin\$Name-windows.ps1")
  }

  foreach ($File in Get-ChildItem (Join-Path $StageRoot 'runtime') -Recurse -File -Filter '*.mjs') {
    & $Node --check $File.FullName
    if ($LASTEXITCODE -ne 0) { throw "Node.js syntax validation failed for $($File.FullName)" }
  }
  foreach ($File in Get-ChildItem (Join-Path $StageRoot 'bin') -File -Filter '*.ps1') { Test-PowerShellFile $File.FullName }

  $LockHeld = $Mutex.WaitOne([TimeSpan]::FromSeconds(30))
  if (-not $LockHeld) { throw 'Timed out waiting for another GetCodexTheme runtime installation to finish.' }
  New-Item -ItemType Directory -Force -Path $BackupRoot | Out-Null

  if (Test-Path -LiteralPath $RuntimeDestination) {
    Move-Item -LiteralPath $RuntimeDestination -Destination (Join-Path $BackupRoot 'runtime')
    $RuntimeMoved = $true
  }
  Move-Item -LiteralPath (Join-Path $StageRoot 'runtime') -Destination $RuntimeDestination
  $RuntimeInstalled = $true

  if (Test-Path -LiteralPath $BinDestination) {
    Move-Item -LiteralPath $BinDestination -Destination (Join-Path $BackupRoot 'bin')
    $BinMoved = $true
  }
  Move-Item -LiteralPath (Join-Path $StageRoot 'bin') -Destination $BinDestination
  $BinInstalled = $true

  & $Node --check (Join-Path $RuntimeDestination 'injector.mjs')
  if ($LASTEXITCODE -ne 0) { throw 'Installed runtime validation failed.' }

  Get-ChildItem (Join-Path $Library 'backups') -Directory -Filter 'runtime-*' -ErrorAction SilentlyContinue |
    Sort-Object LastWriteTime -Descending |
    Select-Object -Skip 2 |
    Remove-Item -Recurse -Force
} catch {
  if ($BinInstalled -and (Test-Path -LiteralPath $BinDestination)) { Remove-Item -LiteralPath $BinDestination -Recurse -Force }
  if ($BinMoved -and (Test-Path -LiteralPath (Join-Path $BackupRoot 'bin'))) { Move-Item -LiteralPath (Join-Path $BackupRoot 'bin') -Destination $BinDestination }
  if ($RuntimeInstalled -and (Test-Path -LiteralPath $RuntimeDestination)) { Remove-Item -LiteralPath $RuntimeDestination -Recurse -Force }
  if ($RuntimeMoved -and (Test-Path -LiteralPath (Join-Path $BackupRoot 'runtime'))) { Move-Item -LiteralPath (Join-Path $BackupRoot 'runtime') -Destination $RuntimeDestination }
  throw
} finally {
  if ($LockHeld) { [void]$Mutex.ReleaseMutex() }
  $Mutex.Dispose()
  Remove-Item -LiteralPath $StageRoot -Recurse -Force -ErrorAction SilentlyContinue
}

$Result = [pscustomobject]@{
  library = $Library
  backupRoot = $BackupRoot
  hadRuntime = $RuntimeMoved
  hadBin = $BinMoved
}
if ($PassThru) { $Result }
else {
  Write-Host "GetCodexTheme runtime installed transactionally at $Library"
  Write-Host "Rollback copy: $BackupRoot"
  Write-Host "Validate: node `"$Library\runtime\injector.mjs`" --validate --library `"$Library`""
  Write-Host "Start:    & `"$Library\bin\start-windows.ps1`""
  Write-Host "Restore:  & `"$Library\bin\restore-windows.ps1`""
  Write-Host 'Tray:     get-codex-theme tray start'
  Write-Host 'Unofficial: visual themes use loopback DevTools/CDP and do not appear in Codex Appearance.'
}
