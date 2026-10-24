param([string]$BuildDirectory='release')
$ErrorActionPreference='Stop'
$projectRoot = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
$buildRoot = [IO.Path]::GetFullPath((Join-Path $projectRoot $BuildDirectory))
$appFolder = [IO.Path]::GetFullPath((Join-Path $buildRoot 'auto-proshow-studio-win32-x64'))
$archiveFile = [IO.Path]::GetFullPath((Join-Path $projectRoot 'release\AutoProShowStudio-Windows-x64.zip'))
if (!$appFolder.StartsWith($projectRoot+[IO.Path]::DirectorySeparatorChar)) {throw 'Invalid application folder'}
if (!(Test-Path -LiteralPath (Join-Path $appFolder 'auto-proshow-studio.exe'))) {throw 'Packaged EXE not found'}
Compress-Archive -LiteralPath $appFolder -DestinationPath $archiveFile -Force -CompressionLevel Optimal
Get-Item -LiteralPath $archiveFile | Select-Object FullName,Length
