param([string]$Executable='release/v0.4/AirJourney-v0.4-x64-setup.exe',[string]$OutDir='evidence/v0.4/installer-icons')
$ErrorActionPreference='Stop'
Add-Type -AssemblyName System.Drawing
Add-Type @'
using System;
using System.Runtime.InteropServices;
public static class AJInstallerIconProbe {
 [DllImport("shell32.dll",CharSet=CharSet.Unicode)] public static extern uint ExtractIconEx(string file,int index,IntPtr[] large,IntPtr[] small,uint count);
 [DllImport("user32.dll")] public static extern bool DestroyIcon(IntPtr handle);
}
'@
$taskPath=(Resolve-Path -LiteralPath $Executable).Path
[System.IO.Directory]::CreateDirectory((Join-Path (Get-Location) $OutDir)) | Out-Null
$taskLarge=New-Object IntPtr[] 1
$taskSmall=New-Object IntPtr[] 1
$taskFound=[AJInstallerIconProbe]::ExtractIconEx($taskPath,0,$taskLarge,$taskSmall,1)
if($taskFound -lt 1){throw 'Installer icon missing'}
$taskRows=@()
foreach($taskItem in @(@{name='installer-large';handle=$taskLarge[0]},@{name='installer-small';handle=$taskSmall[0]})){
 $taskIcon=[System.Drawing.Icon]::FromHandle($taskItem.handle).Clone()
 $taskImage=$taskIcon.ToBitmap()
 $taskImage.Save((Join-Path $OutDir ($taskItem.name+'.png')),[System.Drawing.Imaging.ImageFormat]::Png)
 $taskReference=[System.Drawing.Bitmap]::FromFile((Resolve-Path ('public/icons/app-'+$taskImage.Width+'.png')).Path)
 $taskCompared=0;$taskMismatch=0
 for($taskY=0;$taskY -lt $taskImage.Height;$taskY++){for($taskX=0;$taskX -lt $taskImage.Width;$taskX++){
   $taskExpected=$taskReference.GetPixel($taskX,$taskY);$taskActual=$taskImage.GetPixel($taskX,$taskY)
   if($taskExpected.A -gt 200){$taskCompared++;if([Math]::Abs([int]$taskExpected.R-[int]$taskActual.R) -gt 3 -or [Math]::Abs([int]$taskExpected.G-[int]$taskActual.G) -gt 3 -or [Math]::Abs([int]$taskExpected.B-[int]$taskActual.B) -gt 3){$taskMismatch++}}
 }}
 $taskRows+=[ordered]@{name=$taskItem.name;size=$taskImage.Width;cornerAlpha=$taskImage.GetPixel(0,0).A;opaqueCompared=$taskCompared;opaqueMismatched=$taskMismatch}
 $taskReference.Dispose();$taskImage.Dispose();$taskIcon.Dispose();[AJInstallerIconProbe]::DestroyIcon($taskItem.handle)|Out-Null
}
if(@($taskRows|Where-Object {$_.cornerAlpha -ne 0 -or $_.opaqueMismatched -ne 0}).Length -gt 0){throw 'Installer icon differs from canonical rendered PNG'}
[ordered]@{executable=$taskPath;status='PASS';method='Direct PE resource extraction; compare opaque pixels against derived source PNG, RGB tolerance 3; no shell cache';records=$taskRows} | ConvertTo-Json -Depth 5 | Set-Content -LiteralPath (Join-Path $OutDir 'installer-icon-report.json') -Encoding utf8
