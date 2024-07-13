param (
  [switch]$DebugMode
)

# Logging Functions
function Write-Log {
  param (
    [string]$Message,
    [string]$Level = "INFO",
    [ConsoleColor]$Color = [ConsoleColor]::White
  )
  $formattedLevel = if ($Level -ne "INFO") { "[$Level] " } else { "" }
  if ($DebugMode -or $Level -ne "DEBUG") {
    if ($Level -eq "ERROR") {
      Write-Host "${formattedLevel}$Message" -ForegroundColor DarkRed
    }
    else {
      Write-Host "${formattedLevel}$Message" -ForegroundColor $Color
    }
  }
}


# Port Management Functions
function Test-PortAvailability {
  param ([int]$Port)
  try {
    $tcpConnection = Get-NetTCPConnection -LocalPort $Port -ErrorAction Stop
    $process = Get-Process -Id $tcpConnection.OwningProcess -ErrorAction Stop
    return @{
      ProcessId = $process.Id
      Name      = $process.Name
      Path      = $process.Path
    }
  }
  catch {
    return $null
  }
}

function Find-AvailablePort {
  $minPort = 8000
  $maxPort = 9000
  do {
    $port = Get-Random -Minimum $minPort -Maximum $maxPort
  } while (Test-PortAvailability -Port $port)
  return $port
}

# HTTP Listener Management
function Start-HttpListener {
  param ([int]$Port)

  $processInfo = Test-PortAvailability -Port $Port
  if ($processInfo) {
    Write-Log "Port $Port is in use by ProcessId $($processInfo.ProcessId)." "DEBUG"
    $Port = Find-AvailablePort
    Write-Log "Selected new port $Port." "DEBUG"
  }

  $listener = New-Object System.Net.HttpListener
  $listener.Prefixes.Add("http://localhost:$Port/")
  try {
    $listener.Start()
    Write-Log "HTTP Listener started on port $Port" "DEBUG"
  }
  catch {
    Write-Log "Failed to start HTTP listener on port $Port." "ERROR"
    return $null
  }
  return @{
    Listener = $listener
    Port     = $Port
  }
}

function Wait-ForToken {
  param (
    [System.Net.HttpListener]$Listener
  )
  Write-Log "Waiting for authentication with Dotabod..."

  $timer = [Diagnostics.Stopwatch]::StartNew()
  $authPageTimer = $null
  $timerTriggered = $false
  $authenticated = $false

  while ($true) {
    if (-not $authenticated -and -not $timerTriggered -and $timer.Elapsed.Seconds -ge 7) {
      $timerTriggered = $true
      Write-Log "Have not authenticated with Dotabod yet..." "INFO" DarkYellow
      Read-Host -Prompt "Press Enter to open the authentication page manually"
      Start-Process $url
      Write-Log "Waiting for authentication again..."
      if ($null -eq $authPageTimer) {
        $authPageTimer = [Diagnostics.Stopwatch]::StartNew()
      }
    }

    if (-not $authenticated -and $null -ne $authPageTimer -and $authPageTimer.Elapsed.Seconds -ge 15) {
      return
    }

    try {
      $result = $Listener.BeginGetContext($null, $null)
      $received = $result.AsyncWaitHandle.WaitOne(8000, $false)
      if ($received) {
        $context = $Listener.EndGetContext($result)
        Write-Log "Context received" "DEBUG"
      }
      else {
        Write-Log "GetContext timed out after 8 seconds" "DEBUG"
        continue
      }
    }
    catch {
      Write-Log "An unexpected exception occurred: $($_.Exception.Message)" "ERROR"
      return
    }

    if ($null -eq $context) {
      Write-Log "Context is null, continuing loop" "DEBUG"
      continue
    }

    $request = $context.Request
    $response = $context.Response
    $origin = $request.Headers["Origin"]

    if ($origin -eq "http://localhost:3000" -or $origin -eq "https://dotabod.com") {
      $response.Headers.Add("Access-Control-Allow-Origin", $origin)
    }
    else {
      $response.Headers.Add("Access-Control-Allow-Origin", "https://dotabod.com") # default if no match
    }

    $response.Headers.Add("Access-Control-Allow-Methods", "GET, OPTIONS")
    $response.Headers.Add("Access-Control-Allow-Headers", "Content-Type")
    if ($request.HttpMethod -eq "OPTIONS") {
      $response.StatusCode = 204
      $response.OutputStream.Close()
      continue
    }
    if ($request.HttpMethod -eq "GET" -and $request.Url.AbsolutePath -eq "/token") {
      Write-Log "Received token request." "DEBUG"
      $token = $request.QueryString["token"].Trim()
      if ($token -ne "") {
        $responseString = "<html><body>Token received. You can close this window.</body></html>"
        $buffer = [System.Text.Encoding]::UTF8.GetBytes($responseString)
        $response.ContentLength64 = $buffer.Length
        $response.OutputStream.Write($buffer, 0, $buffer.Length)
        $response.OutputStream.Close()
        Write-Log "Token received: '$token'" "DEBUG"
        $authenticated = $true
        return $token
      }
      else {
        Write-Log "Token is empty after trimming." "DEBUG"
      }
    }
    elseif ($request.HttpMethod -eq "GET" -and $request.Url.AbsolutePath -eq "/status") {
      $responseString = "OK"
      $buffer = [System.Text.Encoding]::UTF8.GetBytes($responseString)
      $response.ContentLength64 = $buffer.Length
      $response.OutputStream.Write($buffer, 0, $buffer.Length)
      $response.OutputStream.Close()
      Write-Log "Status check responded with OK" "DEBUG"
      $authenticated = $true
    }
  }
}

# Configuration Setup
function Test-NetworkConnection {
  param ([string]$Url)
  try {
    Write-Log "Checking connectivity to $Url" "DEBUG"
    $response = Invoke-WebRequest -Uri $Url -TimeoutSec 5
    if ($response.StatusCode -eq 200) {
      Write-Log "Successfully connected to $Url" "DEBUG"
      return $true
    }
    else {
      Write-Log "Received non-success status code $($response.StatusCode) from $Url" "DEBUG"
      return $false
    }
  }
  catch {
    Write-Log "Failed to connect to $Url : $($_.Exception.Message)" "DEBUG"
    return $false
  }
}

function Get-BaseUri {
  $localHostUrl = "http://localhost:3000"
  $remoteHostUrl = "https://dotabod.com"
  if ($DebugMode -eq $true) {
    $baseUrl = if (Test-NetworkConnection -Url "$localHostUrl") { $localHostUrl } else { $remoteHostUrl }
  }
  else {
    $baseUrl = $remoteHostUrl
  }
  return $baseUrl
}

function Clear-ResourceAllocation {
  if ($null -ne $global:listener -and $global:listener.IsListening) {
    Write-Log "Stopping the listener due to process exit." "DEBUG"
    $global:listener.Stop()
    $global:listener.Close()
  }
}

# Main Logic
Register-ObjectEvent -InputObject ([AppDomain]::CurrentDomain) -EventName "ProcessExit" -Action { Clear-ResourceAllocation } | Out-Null

# Check if running as administrator
if (!([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
  Write-Log "This script must be run as an administrator. Reopening as admin." "ERROR"
  # Restart the script with administrator privileges
  Start-Process powershell -ArgumentList "-NoProfile -ExecutionPolicy Bypass -File `"$PSCommandPath`"" -Verb RunAs
  Read-Host -Prompt "Press Enter to exit"
  return
}

try {
  $listenerInfo = Start-HttpListener -Port 8089
  if ($null -eq $listenerInfo) {
    Write-Log "Failed to start Dotabod installer." "ERROR"
    return
  }
  else {
    Write-Log "Dotabod installer started successfully." "DEBUG"
  }

  $global:listener = $listenerInfo.Listener
  $port = $listenerInfo.Port

  $baseUrl = Get-BaseUri
  $url = "$baseUrl/dashboard/?step=2"
  if ($port -ne 8089) {
    $url += if ($url -like "*?*") { "&port=$port" } else { "?port=$port" }
    Start-Process $url
  }

  $Token = Wait-ForToken -Listener $global:listener
  $Token = $Token -replace '\s', ''
  if ([string]::IsNullOrEmpty($Token)) {
    Write-Log "Failed to authenticate with Dotabod." "ERROR"
    return
  }
  Clear-ResourceAllocation

  $fileUrl = "https://dotabod.com/api/install/$Token"

  Write-Log "Checking if the Dotabod config file is reachable at $fileUrl" "DEBUG"

  try {
    $webRequest = [System.Net.WebRequest]::Create($fileUrl)
    $webRequest.Timeout = 5000
    $response = $webRequest.GetResponse()
    $response.Close()
    Write-Log "URL is reachable." "DEBUG"
  }
  catch [System.Net.WebException] {
    if ($_.Exception.Response.StatusCode -eq 308 -or $_.Exception.Response.StatusCode -eq 301) {
      $redirectUrl = $_.Exception.Response.Headers["Location"]
      Write-Log "Following redirect to $baseUrl$redirectUrl" "DEBUG"
      $fileUrl = "$baseUrl$redirectUrl/$Token"
    }
    else {
      Write-Log "Failed to access the Dotabod config file at $fileUrl : $($_.Exception.Message)" "ERROR"
      return
    }
  }

  Write-Log "FileUrl: $fileUrl" "DEBUG"

  $response = Invoke-WebRequest -Uri $fileUrl -Method Head
  if ($null -eq $response) {
    Write-Log "Failed to get a response from $fileUrl" "ERROR"
    return
  }

  $disposition = [string]$response.Headers['Content-Disposition']
  Write-Log "Response headers: $disposition" "DEBUG"

  if ($disposition -and $disposition.Contains('filename="')) {
    $startIndex = $disposition.IndexOf('filename="') + 10
    $restOfString = $disposition.Substring($startIndex)
    $endIndex = $restOfString.IndexOf('"')

    if ($endIndex -gt 0) {
      $filename = $restOfString.Substring(0, $endIndex)
    }
    else {
      Write-Log "Failed to understand config filename (closing quote not found)" "ERROR"
    }
  }
  else {
    Write-Log "Failed to understand config filename (missing header data)" "ERROR"
  }

  if (-not $fileName) {
    Write-Log "Failed to retrieve Dotabod config filename." "ERROR"
    return
  }

  # Detect STEAM Path from registry
  $steamRegistryPath = 'HKCU:\SOFTWARE\Valve\Steam'
  if (Test-Path -Path $steamRegistryPath) {
    $steamRegistry = Get-ItemProperty -Path $steamRegistryPath -Name 'SteamPath'
    if ($null -ne $steamRegistry) {
      $steam = $steamRegistry.SteamPath -replace '/', '\'
      if (-not (Test-Path "$steam\steamapps\libraryfolders.vdf")) {
        $steam = (Get-Item -LiteralPath $steam).FullName
      }
      Write-Log "Detected Steam installation path: $steam" "DEBUG"
    }
    else {
      Write-Log "Failed to find path to Steam." "ERROR"
      return
    }
  }
  else {
    Write-Log "Failed to find path to Steam. Please ensure Steam is installed correctly." "ERROR"
    return
  }

  # Detect DOTA2 Path from Steam library folders
  $libraryFolders = Get-Content "$steam\steamapps\libraryfolders.vdf" -Raw
  $content = Get-Content "$steam\steamapps\libraryfolders.vdf"

  # Match the pattern in the VDF content
  $pattern = '(?s)"(\d+)"\s*{\s*"path"\s*"([^"]+)"(?:.*?"apps"\s*{\s*(.*?)\s*})?'
  $matchesList = [regex]::Matches($libraryFolders, $pattern)
  Write-Log "Number of game folders found: $($matchesList.Count)" "DEBUG"

  # Initialize the variable to store the path containing app ID 570
  $appPath = ""

  foreach ($match in $matchesList) {
    $path = $match.Groups[2].Value
    $apps = $match.Groups[3].Value

    if ($apps -match '"570"') {
      $appPath = $path
      $appPath = $path -replace '\\\\', '\'
      Write-Log "Found app 570 in path: $appPath" "DEBUG"
      break
    }
  }

  Write-Log "Detected Dota 2 installation path: $appPath" "DEBUG"

  # Assign Paths
  $steamapps = if ($null -ne $appPath) {
    Write-Log "Assigned Dota 2 library folder: $appPath" "DEBUG"
    Join-Path $appPath 'steamapps'
  }
  else {
    Write-Log "Assigned default Steam library folder." "DEBUG"
    Join-Path $steam 'steamapps'
  }
  $dota2 = Join-Path $steamapps 'common\dota 2 beta'
  $gsi = Join-Path $dota2 'game\dota\cfg\gamestate_integration'
  Write-Log "Assigned Dota 2 game path: $dota2" "DEBUG"
  Write-Log "Assigned gamestate_integration path: $gsi" "DEBUG"

  # Create the gamestate_integration folder if it doesn't exist
  if (-not (Test-Path -Path $gsi)) {
    New-Item -Path $gsi -ItemType Directory
    Write-Log "Created the gamestate_integration folder in the Dota 2 directory." "DEBUG"
  }
  else {
    Write-Log "The gamestate_integration folder already exists in the Dota 2 directory." "DEBUG"
  }

  # Before saving the new file, check for existing .cfg files with "dotabod" in the filename, excluding the current filename
  $existingDotabodFiles = Get-ChildItem -Path $gsi -Filter "*dotabod*.cfg" | Where-Object { $_.Name -ne $filename }

  if ($existingDotabodFiles.Count -gt 0) {
    $usernames = ($existingDotabodFiles.Name | ForEach-Object { "• " + ($_ -replace 'gamestate_integration_dotabod-(.+)\.cfg', '$1') }) -join "`n"
    Write-Log "Dotabod should only be used with one cfg at a time. The other are for Twitch users:`n$usernames" "INFO" DarkYellow
    $userResponse = Read-Host "Delete the others and continue? (y/n)"

    if ($userResponse -ieq "y") {
      $existingDotabodFiles | ForEach-Object {
        Remove-Item -Path $_.FullName
        $username = $_.Name -replace 'gamestate_integration_dotabod-(.+)\.cfg', '$1'
        Write-Log "Deleted the existing Dotabod config file for user: $username"
      }
      Write-Log "If you were using an OBS overlay, you may need to update the browser source URL."
    }
    else {
      Write-Log "Exiting Dotabod setup."
      return
    }
  }

  # Continue with the logic to save the new file
  $response = Invoke-WebRequest -Uri $fileUrl -Method Get
  if ($null -eq $response) {
    Write-Log "Failed to get a response from $fileUrl" "ERROR"
    return
  }

  # Save the downloaded file into the gamestate_integration folder
  $outputPath = Join-Path $gsi $filename
  $response.Content | Out-File -FilePath $outputPath -Force -Encoding UTF8
  Write-Log "Downloaded Dotabod config file to the Dota 2 directory."

  # Locate the localconfig.vdf file
  $localConfigFile = Get-ChildItem -Path (Join-Path $steam 'userdata') -Recurse -Filter 'localconfig.vdf' | Select-Object -First 1

  if ($localConfigFile) {
    Write-Log "Found localconfig.vdf file at $($localConfigFile.FullName)." "DEBUG"
    $content = Get-Content $localConfigFile.FullName
    $modified = $false
    $alreadyConfigured = $true

    for ($i = 0; $i -lt $content.Count; $i++) {
      if ($content[$i] -match '"570"') {
        Write-Log "Found app 570 at line $i." "DEBUG"

        # Ensure the next non-empty line is an opening bracket
        $j = $i + 1
        while ($j -lt $content.Count -and $content[$j].Trim() -eq '') {
          $j++
        }

        if ($content[$j] -match '^\s*{\s*$') {
          Write-Log "Found opening bracket for app 570 at line $j." "DEBUG"
          $i = $j + 1 # Move to the line after the opening bracket

          # Process the lines within the 570 section
          $braceCount = 1
          while ($braceCount -gt 0 -and $i -lt $content.Count) {
            if ($content[$i] -match '^\s*{\s*$') {
              $braceCount++
            }
            elseif ($content[$i] -match '^\s*}\s*$') {
              $braceCount--
            }
            elseif ($braceCount -eq 1 -and $content[$i] -match '"LaunchOptions"') {
              Write-Log "Found LaunchOptions at line $i." "DEBUG"
              Write-Log "LaunchOptions: $($content[$i])" "DEBUG"

              if ($content[$i] -notmatch '-gamestateintegration') {
                if ($content[$i] -match '"LaunchOptions"\s*""') {
                  $content[$i] = $content[$i] -replace '""', '"-gamestateintegration"'
                }
                else {
                  $content[$i] = $content[$i] -replace '(?<=LaunchOptions"\s*").*', '$& -gamestateintegration"'
                }
                $modified = $true
                $alreadyConfigured = $false
                Write-Log "Added -gamestateintegration to LaunchOptions for app 570." "DEBUG"
              }
              else {
                Write-Log "LaunchOptions for app 570 already contains -gamestateintegration." "DEBUG"
              }
            }
            $i++
          }
          Write-Log "Finished processing app 570 section." "DEBUG"
        }
      }
    }

    if ($modified) {
      Write-Log "Saving modified localconfig.vdf." "DEBUG"
      $content | Set-Content -Path $localConfigFile.FullName
      Write-Log "Updated Dota 2 launch options with -gamestateintegration" "INFO"
    }
    elseif ($alreadyConfigured) {
      Write-Log "Dota 2 already has the -gamestateintegration launch option." "INFO"
    }
    else {
      Write-Log "Failed to find launch option configuration." "ERROR"
    }
  }
  else {
    Write-Log "Failed to find Dota 2 config file." "ERROR"
  }

  Write-Log "Setup complete! Dota 2 is now configured with Dotabod." "INFO" DarkGreen
}
catch {
  Write-Log "An error occurred: $_"
}
finally {
  Clear-ResourceAllocation

  # Attempt to close Dota 2 if it's running
  $dota2Process = Get-Process -Name "dota2" -ErrorAction SilentlyContinue
  if ($null -ne $dota2Process) {
    # Prompt to restart Dota 2
    Read-Host -Prompt "Press Enter to restart the Dota 2 client, or Ctrl + C to exit"
    Write-Log "Restarting the Dota 2 client..." "INFO"

    $dota2Process | Stop-Process -Force
    Start-Sleep -Seconds 5 # Wait for the process to fully exit

    # Assuming Steam is installed in the default location on Windows
    $steamPath = "C:\Program Files (x86)\Steam\steam.exe"
    $dota2AppId = 570

    # Start Dota 2 via Steam
    if (Test-Path $steamPath) {
      Start-Process $steamPath -ArgumentList "-applaunch $dota2AppId"
      Write-Log "Dota 2 client is opening." "INFO"
    }
    else {
      Write-Log "Steam not found. Please start Dota 2 manually." "ERROR"
    }
  }

  Read-Host -Prompt "Press Enter to exit"
}
