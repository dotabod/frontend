param (
  [switch]$DebugMode
)
try {
  function Write-Log {
    param (
      [string]$Message,
      [string]$Level = "INFO",
      [ConsoleColor]$Color = [ConsoleColor]::White
    )
    $time = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
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

  function Check-Port {
    param (
      [int]$Port
    )
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

  function Kill-Process {
    param (
      [int]$ProcessId
    )
    if ($ProcessId -eq 4) {
      Write-Log "Cannot kill system process with PID $ProcessId." "ERROR"
      return
    }

    $process = Get-Process -Id $ProcessId -ErrorAction SilentlyContinue
    if ($process) {
      try {
        $process | Stop-Process -Force
        Write-Log "Killed process $($process.Name) with ProcessId $ProcessId." "DEBUG"
      }
      catch {
        Write-Log "Failed to kill process $ProcessId. Access denied." "ERROR"
      }
    }
    else {
      Write-Log "No process found with ProcessId $ProcessId." "ERROR"
    }
  }

  function Get-AvailablePort {
    $minPort = 8000
    $maxPort = 9000
    do {
      $port = Get-Random -Minimum $minPort -Maximum $maxPort
    } while (Check-Port -Port $port)
    return $port
  }

  function Start-HttpListener {
    param (
      [int]$Port
    )

    $processInfo = Check-Port -Port $Port
    if ($processInfo) {
      Write-Log "Port $Port is in use by ProcessId $($processInfo.ProcessId)." "DEBUG"
      $Port = Get-AvailablePort
      Write-Log "Selected new port $Port." "DEBUG"
    }

    $listener = New-Object System.Net.HttpListener
    $listener.Prefixes.Add("http://localhost:$Port/")
    try {
      $listener.Start()
      Write-Log "HTTP Listener started on port $Port" "DEBUG"
    }
    catch {
      Write-Log "Failed to run Dotabod installer on port $Port." "ERROR"
      return $null
    }
    return @{
      Listener = $listener
      Port     = $Port
    }
  }

  function WaitForToken {
    param (
      [System.Net.HttpListener]$Listener
    )
    Write-Log "Waiting for authentication with Dotabod..."

    $timer = [Diagnostics.Stopwatch]::StartNew()
    while ($true) {
      if ($timer.Elapsed.Seconds -ge 7) {
        Write-Log "Have not authenticated with Dotabod yet..." "INFO" DarkYellow
        Read-Host -Prompt "Press Enter to open the authentication page manually"
        Start-Process $url
        $timer.Restart()
      }

      try {
        $result = $Listener.BeginGetContext($null, $null)
        $received = $result.AsyncWaitHandle.WaitOne(8000, $false)
        if ($received) {
          $context = $Listener.EndGetContext($result)
          Write-Log "Context received" "DEBUG"
        }
        else {
          Write-Log "GetContext timed out after 5 seconds" "DEBUG"
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
      if ($baseUrl -eq "http://localhost:3000") {
        $response.Headers.Add("Access-Control-Allow-Origin", "http://localhost:3000")
      }
      else {
        $response.Headers.Add("Access-Control-Allow-Origin", "https://dotabod.com")
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
          Write-Log "Token received: $token" "DEBUG"
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
      }
    }
  }

  function Test-Connection {
    param (
      [string]$Url
    )
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

  $listenerInfo = Start-HttpListener -Port 8089
  if ($listenerInfo -eq $null) {
    Write-Log "Failed to start Dotabod installer." "ERROR"
    return
  }
  else {
    Write-Log "Dotabod installer started successfully." "DEBUG"
  }

  $listener = $listenerInfo.Listener
  $port = $listenerInfo.Port

  # Determine the base URL based on connectivity check
  $localHostUrl = "http://localhost:3000"
  $remoteHostUrl = "https://dotabod.com"
  if ($DebugMode -eq $true) {
    $baseUrl = if (Test-Connection -Url "$localHostUrl") { $localHostUrl } else { $remoteHostUrl }
  }
  else {
    $baseUrl = $remoteHostUrl
  }

  # Initialize $url with $baseUrl
  $url = "$baseUrl/dashboard/?step=2"

  # Append the port query parameter only if the port is not 8089
  if ($port -ne 8089) {
    if ($url -like "*?*") {
      $url += "&port=$port"
    }
    else {
      $url += "?port=$port"
    }
    Start-Process $url
  }

  $Token = WaitForToken -Listener $listener
  Write-Log "Stopping the listener" "DEBUG"
  $listener.Stop()

  # Trim the $Token to remove any leading or trailing spaces
  $Token = $Token.Trim()

  # Check and timeout after 5 seconds if the URL is unreachable
  $fileUrl = "$baseUrl/api/install/$Token"
  Write-Log "Checking if the Dotabod config file is reachable at $fileUrl" "DEBUG"
  try {
    $webRequest = [System.Net.WebRequest]::Create($fileUrl)
    $webRequest.Timeout = 5000
    $response = $webRequest.GetResponse()
    $response.Close()
    Write-Log "URL is reachable." "DEBUG"
  }
  catch [System.Net.WebException] {
    # Handle 308 Permanent Redirect and 301 Moved Permanently
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

  # Check if the 'Content-Disposition' header is present and contains the filename
  if ($disposition -and $disposition.Contains('filename="')) {
    $startIndex = $disposition.IndexOf('filename="') + 10

    # Use a substring to find the end index by looking for the next double quote after the start index
    $restOfString = $disposition.Substring($startIndex)
    $endIndex = $restOfString.IndexOf('"')

    # Extract the filename
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

  # If filename is empty, quit
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
  $libfs = $null
  if ($null -ne $libraryFolders) {
    $libfs = $libraryFolders | Select-String -Pattern '\"path\".+\"(.+?)\"' | ForEach-Object { $_.Matches.Groups[1].Value } | ForEach-Object {
      $libfsPath = $_ -replace '\\\\', '\'
      if ((Test-Path "$libfsPath\steamapps\appmanifest_570.acf") -and (Test-Path "$libfsPath\steamapps\common\dota 2 beta\game\core\pak01_dir.vpk")) {
        $libfsPath
      }
    }
    Write-Log "Detected Dota 2 installation path: $libfs" "DEBUG"
  }

  # Assign Paths
  $steamapps = if ($null -ne $libfs) {
    $libfs = $libfs -replace '\\\\', '\'
    Join-Path $libfs 'steamapps'
  }
  else { Join-Path $steam 'steamapps' }
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
      Write-Log "Updated Dota 2 launch options with -gamestateintegration" "INFO" DarkGreen
    }
    elseif ($alreadyConfigured) {
      Write-Log "Dota 2 already has the -gamestateintegration launch option." "INFO" DarkGreen
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
  Read-Host -Prompt "Press Enter to exit"
}