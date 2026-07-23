[CmdletBinding()]
param(
  [string]$Library = (Join-Path $HOME '.codex\get-codex-theme'),
  [Nullable[int]]$Port = $null,
  [switch]$Restart
)
$ErrorActionPreference = 'Stop'
if ($null -ne $Port -and ($Port -lt 1024 -or $Port -gt 65535)) { throw "Invalid port: $Port" }
$Injector = Join-Path $Library 'runtime\injector.mjs'
$State = Join-Path $Library 'runtime-state.json'
$Log = Join-Path $Library 'runtime.log'
$ErrorLog = Join-Path $Library 'runtime-error.log'
$Node = (Get-Command node -ErrorAction Stop).Source
if (-not (Test-Path -LiteralPath $Injector)) { throw 'Runtime not installed. Run platforms/windows/install.ps1 first.' }
& $Node $Injector --validate --library $Library *> $null
if ($LASTEXITCODE -ne 0) { throw 'The active theme pack failed validation.' }

function Test-CodexCdp([int]$CandidatePort) {
  try {
    $connection = Get-NetTCPConnection -LocalPort $CandidatePort -State Listen -ErrorAction Stop |
      Where-Object { $_.LocalAddress -in @('127.0.0.1', '::1') } |
      Select-Object -First 1
    if (-not $connection) { return $false }
    $owner = Get-CimInstance Win32_Process -Filter "ProcessId = $([int]$connection.OwningProcess)" -ErrorAction Stop
    $ownerPath = [string]$owner.ExecutablePath
    if ($ownerPath -notmatch '[\\/]OpenAI\.Codex_[^\\/]+[\\/].*[\\/]ChatGPT\.exe$') { return $false }
    $targets = Invoke-RestMethod "http://127.0.0.1:$CandidatePort/json/list" -TimeoutSec 1
    return [bool]($targets | Where-Object { $_.type -eq 'page' -and $_.url -like 'app://-/index.html*' -and $_.url -notmatch 'initialRoute=' })
  } catch { return $false }
}

function Test-PortFree([int]$CandidatePort) {
  return -not [bool](Get-NetTCPConnection -LocalPort $CandidatePort -State Listen -ErrorAction SilentlyContinue | Select-Object -First 1)
}

if ($null -eq $Port) {
  $statePort = $null
  if (Test-Path -LiteralPath $State) {
    try {
      $savedState = Get-Content -Raw -LiteralPath $State | ConvertFrom-Json
      if ([int]$savedState.port -ge 1024 -and [int]$savedState.port -le 65535) { $statePort = [int]$savedState.port }
    } catch {}
  }
  if ($null -ne $statePort -and ((Test-CodexCdp $statePort) -or (Test-PortFree $statePort))) {
    $Port = $statePort
  } else {
    foreach ($candidate in 9341..9399) {
      if (Test-CodexCdp $candidate) { $Port = $candidate; break }
    }
    if ($null -eq $Port) {
      foreach ($candidate in 9341..9399) {
        if (Test-PortFree $candidate) { $Port = $candidate; break }
      }
    }
  }
  if ($null -eq $Port) { throw 'No free loopback CDP port was found in 9341-9399.' }
}
$Port = [int]$Port

if (-not (Test-CodexCdp $Port)) {
  $package = Get-AppxPackage OpenAI.Codex | Sort-Object Version -Descending | Select-Object -First 1
  if (-not $package) { throw 'The OpenAI Codex Windows package is not installed.' }
  $executable = Join-Path $package.InstallLocation 'app\ChatGPT.exe'
  if (-not (Test-Path -LiteralPath $executable)) { throw "Codex executable not found: $executable" }

  function Get-CodexProcesses {
    $packageRoot = [System.IO.Path]::GetFullPath($package.InstallLocation).TrimEnd('\') + '\'
    return @(Get-CimInstance Win32_Process -Filter "Name = 'ChatGPT.exe'" -ErrorAction SilentlyContinue |
      Where-Object {
        $candidate = [string]$_.ExecutablePath
        $candidate -and [System.IO.Path]::GetFullPath($candidate).StartsWith($packageRoot, [System.StringComparison]::OrdinalIgnoreCase)
      })
  }

  $running = @(Get-CodexProcesses)
  if ($running.Count -gt 0) {
    if (-not $Restart) { throw 'Codex is already running without the theme debug endpoint. Close it or rerun with -Restart.' }
    $running | ForEach-Object {
      $process = Get-Process -Id ([int]$_.ProcessId) -ErrorAction SilentlyContinue
      if ($process) { [void]$process.CloseMainWindow() }
    }
    Start-Sleep -Seconds 2
    Get-CodexProcesses | ForEach-Object {
      Stop-Process -Id ([int]$_.ProcessId) -Force -ErrorAction SilentlyContinue
    }
  }

  if (-not (Get-Command Invoke-CommandInDesktopPackage -ErrorAction SilentlyContinue)) {
    throw 'Invoke-CommandInDesktopPackage is unavailable. Run from Windows PowerShell 5.1 or a shell with the Appx module.'
  }
  Invoke-CommandInDesktopPackage -PackageFamilyName $package.PackageFamilyName -AppId 'App' -Command $executable -Args "--remote-debugging-address=127.0.0.1 --remote-debugging-port=$Port"
  $deadline = (Get-Date).AddSeconds(45)
  while (-not (Test-CodexCdp $Port)) {
    if ((Get-Date) -ge $deadline) { throw "Codex did not expose loopback CDP on port $Port." }
    Start-Sleep -Milliseconds 350
  }
}

if (Test-Path -LiteralPath $State) {
  try {
    $old = Get-Content -Raw -LiteralPath $State | ConvertFrom-Json
    $oldProcess = Get-CimInstance Win32_Process -Filter "ProcessId = $([int]$old.injectorPid)" -ErrorAction SilentlyContinue
    if ($oldProcess -and ([string]$oldProcess.CommandLine).Contains('runtime\injector.mjs')) {
      Stop-Process -Id ([int]$old.injectorPid) -Force -ErrorAction SilentlyContinue
    }
  } catch {}
}

$arguments = @("`"$Injector`"", '--watch', '--port', "$Port", '--library', "`"$Library`"")
$watcher = Start-Process -FilePath $Node -ArgumentList $arguments -WindowStyle Hidden -PassThru -RedirectStandardOutput $Log -RedirectStandardError $ErrorLog
@{ port = $Port; injectorPid = $watcher.Id; startedAt = (Get-Date).ToUniversalTime().ToString('o') } |
  ConvertTo-Json | Set-Content -LiteralPath $State -Encoding utf8

$verified = $false
for ($attempt = 0; $attempt -lt 40; $attempt++) {
  Start-Sleep -Milliseconds 400
  $watcher.Refresh()
  if ($watcher.HasExited) { throw "Runtime exited. See $ErrorLog" }
  & $Node $Injector --verify --port $Port --timeout-ms 1000 *> $null
  if ($LASTEXITCODE -eq 0) { $verified = $true; break }
}
if (-not $verified) {
  & (Join-Path $PSScriptRoot 'restore-windows.ps1') -Library $Library -Port $Port
  throw "Theme injection could not be verified. See $ErrorLog"
}
Write-Host "GetCodexTheme is active. Runtime PID: $($watcher.Id)"
Write-Host 'The effect is unofficial CDP injection and is not listed in Codex Appearance.'
