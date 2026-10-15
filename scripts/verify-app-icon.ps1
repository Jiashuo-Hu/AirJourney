param([Parameter(Mandatory=$true)][string]$Executable,[Parameter(Mandatory=$true)][string]$WindowHandle,[Parameter(Mandatory=$true)][string]$OutDir)
$ErrorActionPreference='Stop'
Add-Type -AssemblyName System.Drawing
Add-Type @'
using System;
using System.Runtime.InteropServices;
public static class AJIconProbe {
 [DllImport("shell32.dll",CharSet=CharSet.Unicode)] public static extern uint ExtractIconEx(string file,int index,IntPtr[] large,IntPtr[] small,uint count);
 [DllImport("user32.dll")] public static extern IntPtr SendMessage(IntPtr hwnd,uint msg,IntPtr wParam,IntPtr lParam);
 [DllImport("user32.dll",EntryPoint="GetClassLongPtrW")] public static extern IntPtr GetClassLongPtr(IntPtr hwnd,int index);
 [DllImport("user32.dll")] public static extern bool DestroyIcon(IntPtr handle);
}
'@
[System.IO.Directory]::CreateDirectory($OutDir) | Out-Null
$records=@()
function Save-Icon([IntPtr]$iconHandle,[string]$name) {
 if($iconHandle -eq [IntPtr]::Zero){throw "Icon missing: $name"}
 $taskIcon=[System.Drawing.Icon]::FromHandle($iconHandle).Clone()
 $taskBitmap=$taskIcon.ToBitmap()
 $taskBitmap.Save((Join-Path $OutDir ($name+'.png')),[System.Drawing.Imaging.ImageFormat]::Png)
 $taskRecord=[ordered]@{name=$name;width=$taskBitmap.Width;height=$taskBitmap.Height;cornerAlpha=$taskBitmap.GetPixel(0,0).A}
 $taskBitmap.Dispose();$taskIcon.Dispose()
 return $taskRecord
}
$large=New-Object IntPtr[] 1;$small=New-Object IntPtr[] 1
$found=[AJIconProbe]::ExtractIconEx($Executable,0,$large,$small,1)
if($found -lt 1){throw "Executable icon resource missing (ExtractIconEx returned $found)"}
$records+=Save-Icon $large[0] 'executable-large'
$records+=Save-Icon $small[0] 'executable-small'
[AJIconProbe]::DestroyIcon($large[0]) | Out-Null
[AJIconProbe]::DestroyIcon($small[0]) | Out-Null
$hwnd=[IntPtr]::new([long]::Parse($WindowHandle))
foreach($taskKind in @(0,1)) {
 $h=[AJIconProbe]::SendMessage($hwnd,0x007F,[IntPtr]::new($taskKind),[IntPtr]::Zero)
 if($h -eq [IntPtr]::Zero){$h=[AJIconProbe]::GetClassLongPtr($hwnd, $(if($taskKind -eq 0){-34}else{-14}))}
 $records+=Save-Icon $h ('window-'+$taskKind)
}
$info=[System.Diagnostics.FileVersionInfo]::GetVersionInfo($Executable)
[ordered]@{executable=$Executable;fileVersion=$info.FileVersion;productVersion=$info.ProductVersion;windowHandle=$WindowHandle;records=$records;method='Direct PE icon extraction plus WM_GETICON from the running packaged window; no Explorer thumbnail cache';taskbarSeparateScreenshot=$false} | ConvertTo-Json -Depth 8 | Set-Content -LiteralPath (Join-Path $OutDir 'native-icon-report.json') -Encoding utf8
