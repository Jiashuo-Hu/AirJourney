param([string]$Executable='evidence/v0.4/installed-app/AirJourney.exe',[switch]$SkipV04)
$ErrorActionPreference='Stop'
$taskExe=(Resolve-Path -LiteralPath $Executable).Path
# All suites create their own synthetic profiles; never use the default profile.
if(!$SkipV04){
 node scripts/v04-regression.cjs $taskExe evidence/v0.4/verified-regression-final *> evidence/v0.4/regression-final.log
 if($LASTEXITCODE -ne 0){throw 'v0.4 regression failed; inspect regression-final.log'}
}
node scripts/v04-upgrade-display.cjs $taskExe evidence/v0.4/verified-upgrade *> evidence/v0.4/upgrade.log
if($LASTEXITCODE -ne 0){throw 'Upgrade/display regression failed; inspect upgrade.log'}
node scripts/v04-map-recovery.cjs $taskExe evidence/v0.4/verified-map *> evidence/v0.4/map.log
if($LASTEXITCODE -ne 0){throw 'Map regression failed; inspect map.log'}
$taskProfile=Join-Path (Get-Location) 'evidence/v0.4/verified-smoke'
New-Item -ItemType Directory -Path $taskProfile -Force | Out-Null
$env:AIRJOURNEY_TEST_DIR=$taskProfile
$env:AIRJOURNEY_SMOKE='1'
$env:AIRJOURNEY_BACKGROUND_TEST='1'
Remove-Item Env:AIRJOURNEY_UI_TEST -ErrorAction SilentlyContinue
Remove-Item Env:ELECTRON_RUN_AS_NODE -ErrorAction SilentlyContinue
$taskProcess=Start-Process -FilePath $taskExe -Wait -PassThru -WindowStyle Hidden
if($taskProcess.ExitCode -ne 0){throw 'Legacy smoke process failed'}
if(!(Test-Path -LiteralPath (Join-Path $taskProfile 'smoke-results.json'))){throw 'Legacy smoke report missing'}
Write-Output 'Completed installed regression, upgrade/display, map recovery and legacy smoke.'
