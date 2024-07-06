param (
  [parameter(mandatory = $true)] [ValidateNotNullOrEmpty()] [string]$Token,
  [switch]$DebugMode
)

function Write-Log {
  param (
    [string]$Message,
    [string]$Level = "INFO"
  )
  $time = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
  if ($DebugMode -or $Level -ne "DEBUG") {
    Write-Host "[$time] [$Level] $Message"
  }
}
# Craft the file URL from the token
$fileUrl = "https://dotabod.com/api/download/$Token"
Write-Log "Crafted file URL: $fileUrl"

# Modify debug mode host if DebugMode is enabled
if ($DebugMode) {
  $fileUrl = "http://localhost:3000/api/download/$Token"
  Write-Log "Modified file URL for debug mode: $fileUrl"
}

# Check and timeout after 5 seconds if the URL is unreachable
try {
  $webRequest = [System.Net.WebRequest]::Create($fileUrl)
  $webRequest.Timeout = 5000
  $response = $webRequest.GetResponse()
  $response.Close()
  Write-Log "URL is reachable."
}
catch [System.Net.WebException] {
  # Log the error
  Write-Log "URL is unreachable. Error: $($_.Exception.Message)" "ERROR"
  exit 1
}

$response = Invoke-WebRequest -Uri $fileUrl -Method Head
$disposition = $response.Headers['Content-Disposition']

# Check if the 'Content-Disposition' header is present and contains the filename
if ($disposition) {
  $dispositionValue = $disposition[0]

  if ($dispositionValue -and $dispositionValue.Contains('filename="')) {
    $startIndex = $dispositionValue.IndexOf('filename="') + 10

    # Use a substring to find the end index by looking for the next double quote after the start index
    $restOfString = $dispositionValue.Substring($startIndex)
    $endIndex = $restOfString.IndexOf('"')

    # Extract the filename
    if ($endIndex -gt 0) {
      $filename = $restOfString.Substring(0, $endIndex)
      Write-Output $filename
    }
    else {
      Write-Error "Failed to extract filename: Closing quote not found."
    }
  }
  else {
    Write-Error "Failed to extract filename: 'Content-Disposition' header does not contain a filename."
  }
}
else {
  Write-Error "Failed to extract filename: 'Content-Disposition' header not found."
}

Write-Log "Response headers: $disposition" "DEBUG"

# If filename is empty, quit
if (-not $fileName) {
  Write-Log "Filename is empty. Exiting script." "ERROR"
  exit 1
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
    Write-Log "Detected Steam installation path: $steam"
  }
  else {
    Write-Log "Steam path is null. Exiting script." "ERROR"
    exit 1
  }
}
else {
  Write-Log "Steam registry path not found. Please ensure Steam is installed correctly." "ERROR"
  exit 1
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
  Write-Log "Detected Dota 2 installation path: $libfs"
}

# Assign Paths
$steamapps = if ($null -ne $libfs) {
  $libfs = $libfs -replace '\\\\', '\'
  Join-Path $libfs 'steamapps'
}
else { Join-Path $steam 'steamapps' }
$dota2 = Join-Path $steamapps 'common\dota 2 beta'
$gsi = Join-Path $dota2 'game\dota\cfg\gamestate_integration'
Write-Log "Assigned Dota 2 game path: $dota2"
Write-Log "Assigned gamestate_integration path: $gsi"

# Create the gamestate_integration folder if it doesn't exist
if (-not (Test-Path -Path $gsi)) {
  New-Item -Path $gsi -ItemType Directory
  Write-Log "Created gamestate_integration folder."
}
else {
  Write-Log "gamestate_integration folder already exists."
}

# Save the downloaded file into the gamestate_integration folder
$outputPath = Join-Path $gsi $filename
$response.Content | Set-Content -Path $outputPath -Force
Write-Log "Downloaded file to $outputPath."

# Locate the localconfig.vdf file
$localConfigFile = Get-ChildItem -Path (Join-Path $steam 'userdata') -Recurse -Filter 'localconfig.vdf' | Select-Object -First 1

if ($localConfigFile) {
  Write-Log "Found localconfig.vdf file at $($localConfigFile.FullName)."
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
    Write-Log "Updated localconfig.vdf with new LaunchOptions."
    Write-Log "Launch Options: Added -gamestateintegration to all relevant instances." -f DarkGreen
  }
  elseif ($alreadyConfigured) {
    Write-Log "Launch Options: Already configured correctly." -f DarkGreen
  }
  else {
    Write-Log "Launch Options: Unable to locate any instances to modify. Please verify your configuration." -f DarkRed
  }
}
else {
  Write-Log "Launch Options: Unable to locate localconfig.vdf, please verify that you have -gamestateintegration in your launch options." -f DarkRed
}

Write-Log "Setup complete! Dota 2 is now configured with gamestate integration."
