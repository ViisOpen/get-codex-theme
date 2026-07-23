[CmdletBinding()]
param([string]$Library = (Join-Path $HOME '.codex\get-codex-theme'))
$ErrorActionPreference = 'Stop'

Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing

$script:Library = [IO.Path]::GetFullPath($Library)
$script:Controller = Join-Path $script:Library 'runtime\theme-control.mjs'
$script:Node = (Get-Command node -ErrorAction Stop).Source
if (-not (Test-Path -LiteralPath $script:Controller)) {
  throw "Theme controller not installed: $script:Controller"
}

function Invoke-ThemeController([string[]]$Arguments) {
  $output = & $script:Node $script:Controller --library $script:Library @Arguments 2>$null
  if ($LASTEXITCODE -ne 0) { return $null }
  try { return ($output | Out-String | ConvertFrom-Json) } catch { return $null }
}

function Add-ThemeMenuItem(
  [System.Windows.Forms.ContextMenuStrip]$Menu,
  [string]$Text,
  [scriptblock]$Action,
  [bool]$Enabled = $true
) {
  $item = [System.Windows.Forms.ToolStripMenuItem]::new($Text)
  $item.Enabled = $Enabled
  if ($Action) { $item.Add_Click($Action) }
  [void]$Menu.Items.Add($item)
  return $item
}

$script:Menu = [System.Windows.Forms.ContextMenuStrip]::new()
$script:Tray = [System.Windows.Forms.NotifyIcon]::new()
$script:Tray.Icon = [System.Drawing.SystemIcons]::Application
$script:Tray.Text = 'Get Codex Theme'
$script:Tray.ContextMenuStrip = $script:Menu
$script:Tray.Visible = $true

function Update-ThemeMenu {
  $snapshot = Invoke-ThemeController @('status')
  $script:Menu.Items.Clear()

  $title = Add-ThemeMenuItem $script:Menu 'Get Codex Theme' $null $false
  $title.Font = [System.Drawing.Font]::new($title.Font, [System.Drawing.FontStyle]::Bold)
  [void]$script:Menu.Items.Add([System.Windows.Forms.ToolStripSeparator]::new())

  if ($null -eq $snapshot) {
    [void](Add-ThemeMenuItem $script:Menu 'Theme controller unavailable' $null $false)
  } elseif (@($snapshot.themes).Count -eq 0) {
    [void](Add-ThemeMenuItem $script:Menu 'No installed themes' $null $false)
  } else {
    foreach ($theme in @($snapshot.themes)) {
      $themeId = [string]$theme.id
      $themeItem = Add-ThemeMenuItem $script:Menu ([string]$theme.name) {
        param($sender, $eventArgs)
        [void](Invoke-ThemeController @('switch', [string]$sender.Tag))
        Update-ThemeMenu
      }
      $themeItem.Tag = $themeId
      $themeItem.Checked = ($themeId -eq [string]$snapshot.activeThemeId -and -not [bool]$snapshot.paused)
      $themeItem.ToolTipText = "$( [string]$theme.mode ) · $( [string]$theme.version )"
    }
  }

  [void]$script:Menu.Items.Add([System.Windows.Forms.ToolStripSeparator]::new())
  if ($snapshot -and [bool]$snapshot.paused) {
    [void](Add-ThemeMenuItem $script:Menu 'Resume Selected Theme' {
      [void](Invoke-ThemeController @('resume'))
      Update-ThemeMenu
    } ([bool]$snapshot.activeThemeId))
  } else {
    [void](Add-ThemeMenuItem $script:Menu 'Pause Theme' {
      [void](Invoke-ThemeController @('pause'))
      Update-ThemeMenu
    } ($snapshot -and [bool]$snapshot.activeThemeId))
  }
  [void](Add-ThemeMenuItem $script:Menu 'Open Theme Gallery' {
    Start-Process 'https://getcodextheme.com'
  })
  [void]$script:Menu.Items.Add([System.Windows.Forms.ToolStripSeparator]::new())
  [void](Add-ThemeMenuItem $script:Menu 'Quit Tray' {
    $script:Tray.Visible = $false
    $script:Tray.Dispose()
    [System.Windows.Forms.Application]::Exit()
  })

  $script:Tray.Text = if ($snapshot -and [bool]$snapshot.paused) { 'Get Codex Theme — Paused' } else { 'Get Codex Theme' }
}

$script:Menu.Add_Opening({ Update-ThemeMenu })
$timer = [System.Windows.Forms.Timer]::new()
$timer.Interval = 5000
$timer.Add_Tick({ Update-ThemeMenu })
$timer.Start()
Update-ThemeMenu

try {
  [System.Windows.Forms.Application]::Run()
} finally {
  $timer.Stop()
  $timer.Dispose()
  $script:Tray.Visible = $false
  $script:Tray.Dispose()
  $script:Menu.Dispose()
}
