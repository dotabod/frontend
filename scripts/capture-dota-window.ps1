<#
.SYNOPSIS
  Captures the running Dota 2 client as a 1920x1080 PNG.

.DESCRIPTION
  Feeds scripts/update-finding-match-overlay.mjs, which crops the bottom-right
  840x355 of a native 1080p client. Everything here exists to hand that script a
  frame with exactly that geometry, whatever resolution Dota is actually running.

  Hard-won details, each of which silently produces a wrong or black image:

  * Get-Process().MainWindowHandle goes stale and starts returning 0 while the
    client is still running. Enumerate the process's top-level windows instead.
  * PrintWindow, even with PW_RENDERFULLCONTENT, returns an all-black bitmap for
    Dota's D3D swapchain, so the capture has to come off the composited desktop
    via CopyFromScreen -- which in turn needs the window visible and unoccluded.
  * SetForegroundWindow is refused for a process that is not already foreground.
    Clearing SPI_SETFOREGROUNDLOCKTIMEOUT and attaching to the current
    foreground thread's input queue is the documented way to be allowed. The
    original timeout is restored before returning.
  * GetWindowRect includes invisible resize borders (a maximized client reports
    roughly 22px larger than it draws). Panorama lays the menu out in the CLIENT
    box, so every coordinate here comes from GetClientRect + ClientToScreen.
  * The client origin is not (0,0) on a multi-monitor desktop; a second monitor
    to the left gives negative screen coordinates.
#>
[CmdletBinding()]
param(
  [Parameter(Mandatory = $true)][string] $Output,
  [int] $TargetWidth = 1920,
  [int] $TargetHeight = 1080,
  [int] $SettleMs = 900,
  [int] $FocusAttempts = 5
)

$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing

if (-not ('DotaCapture' -as [type])) {
  Add-Type -Path (Join-Path $PSScriptRoot 'lib/DotaCapture.cs')
}

# Without this the capture is sampled in virtualized coordinates on any display
# above 100% scaling, which crops and rescales the frame silently.
[void][DotaCapture]::SetProcessDPIAware()

function Get-DotaProcess {
  $process = Get-Process -Name dota2 -ErrorAction SilentlyContinue | Select-Object -First 1
  if (-not $process) {
    throw 'Dota 2 is not running. Start the client and leave it on the main menu.'
  }
  return $process
}

function Get-DotaWindow($process) {
  foreach ($hwnd in [DotaCapture]::WindowsForProcess([uint32] $process.Id)) {
    if ([DotaCapture]::ClassName($hwnd) -ne 'SDL_app') { continue }
    $rect = New-Object DotaCapture+RECT
    if (-not [DotaCapture]::GetClientRect($hwnd, [ref] $rect)) { continue }
    if (($rect.Right - $rect.Left) -lt 640) { continue }
    return $hwnd
  }

  throw "Found dota2.exe (pid $($process.Id)) but none of its windows look like the game window."
}

function Measure-MeanBrightness($bitmap) {
  $total = 0.0
  $samples = 0
  for ($y = 8; $y -lt $bitmap.Height; $y += 97) {
    for ($x = 8; $x -lt $bitmap.Width; $x += 97) {
      $pixel = $bitmap.GetPixel($x, $y)
      $total += ($pixel.R + $pixel.G + $pixel.B) / 3.0
      $samples++
    }
  }
  if ($samples -eq 0) { return 0 }
  return $total / $samples
}

function Get-DotaBuildId($process) {
  # ...\steamapps\common\dota 2 beta\game\bin\win64\dota2.exe -> ...\steamapps
  $steamapps = Split-Path $process.Path -Parent
  for ($level = 0; $level -lt 5; $level++) { $steamapps = Split-Path $steamapps -Parent }
  $manifest = Join-Path $steamapps 'appmanifest_570.acf'
  if (-not (Test-Path $manifest)) { return 'unknown' }

  $match = Select-String -Path $manifest -Pattern '"buildid"\s+"(\d+)"' | Select-Object -First 1
  if (-not $match) { return 'unknown' }
  return $match.Matches[0].Groups[1].Value
}

$process = Get-DotaProcess
$hwnd = Get-DotaWindow $process

$focused = $false
for ($attempt = 1; $attempt -le $FocusAttempts; $attempt++) {
  if ([DotaCapture]::Reveal($hwnd)) { $focused = $true; break }
  Start-Sleep -Milliseconds 250
}
if (-not $focused) {
  throw 'Could not bring Dota 2 to the foreground. Click the client once, then re-run.'
}

# Let Panorama finish drawing the menu it was not rendering while backgrounded.
Start-Sleep -Milliseconds $SettleMs

if ([DotaCapture]::GetForegroundWindow() -ne $hwnd) {
  throw 'Dota 2 lost the foreground before the capture. Close whatever stole focus and re-run.'
}

$clientRect = New-Object DotaCapture+RECT
[void][DotaCapture]::GetClientRect($hwnd, [ref] $clientRect)
$origin = New-Object DotaCapture+POINT
[void][DotaCapture]::ClientToScreen($hwnd, [ref] $origin)

$sourceWidth = $clientRect.Right - $clientRect.Left
$sourceHeight = $clientRect.Bottom - $clientRect.Top

# The 840x355 crop is expressed in 16:9 1080p coordinates. Panorama scales its
# layout uniformly with the client box, so any 16:9 client rescales exactly --
# but a 16:10 or ultrawide client moves the menu and would crop the wrong pixels.
$aspect = $sourceWidth / $sourceHeight
$targetAspect = $TargetWidth / $TargetHeight
if ([math]::Abs($aspect - $targetAspect) -gt 0.01) {
  throw ("Dota 2 is running at ${sourceWidth}x${sourceHeight}, aspect $([math]::Round($aspect, 3)). " +
    'The overlay crop is only valid for a 16:9 client -- switch Dota to a 16:9 resolution and re-run.')
}

$capture = New-Object System.Drawing.Bitmap $sourceWidth, $sourceHeight
$graphics = [System.Drawing.Graphics]::FromImage($capture)
$graphics.CopyFromScreen($origin.X, $origin.Y, 0, 0, $capture.Size)
$graphics.Dispose()

if ((Measure-MeanBrightness $capture) -lt 1.0) {
  $capture.Dispose()
  throw 'Captured an all-black frame. Dota 2 is likely in exclusive fullscreen; switch it to Borderless Window and re-run.'
}

if ($sourceWidth -eq $TargetWidth -and $sourceHeight -eq $TargetHeight) {
  $frame = $capture
} else {
  $frame = New-Object System.Drawing.Bitmap $TargetWidth, $TargetHeight
  $resize = [System.Drawing.Graphics]::FromImage($frame)
  $resize.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
  $resize.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
  $resize.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
  # TileFlipXY stops the resampler reaching past the edges of the source, which
  # otherwise leaves a faint halo along all four borders of the crop.
  $attributes = New-Object System.Drawing.Imaging.ImageAttributes
  $attributes.SetWrapMode([System.Drawing.Drawing2D.WrapMode]::TileFlipXY)
  $destination = New-Object System.Drawing.Rectangle 0, 0, $TargetWidth, $TargetHeight
  $resize.DrawImage($capture, $destination, 0, 0, $sourceWidth, $sourceHeight,
    [System.Drawing.GraphicsUnit]::Pixel, $attributes)
  $resize.Dispose()
  $attributes.Dispose()
  $capture.Dispose()
}

# Path.Combine, not Join-Path: the caller usually passes an absolute temp path,
# and Join-Path would happily concatenate it onto the working directory.
$outputPath = [System.IO.Path]::GetFullPath([System.IO.Path]::Combine((Get-Location).Path, $Output))
$outputDirectory = [System.IO.Path]::GetDirectoryName($outputPath)
if (-not (Test-Path $outputDirectory)) {
  New-Item -ItemType Directory -Path $outputDirectory -Force | Out-Null
}
$frame.Save($outputPath, [System.Drawing.Imaging.ImageFormat]::Png)
$frame.Dispose()

[ordered]@{
  buildId      = Get-DotaBuildId $process
  capturedAt   = (Get-Date).ToUniversalTime().ToString('o')
  output       = $outputPath
  resolution   = "${TargetWidth}x${TargetHeight}"
  sourceOrigin = "$($origin.X),$($origin.Y)"
  sourceSize   = "${sourceWidth}x${sourceHeight}"
} | ConvertTo-Json -Compress
