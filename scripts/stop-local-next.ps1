$root = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$escaped = [regex]::Escape($root.Replace("\", "/"))
$escapedWin = [regex]::Escape($root)

Get-CimInstance Win32_Process |
  Where-Object {
    $_.CommandLine -and
    ($_.CommandLine -match $escapedWin -or $_.CommandLine -match $escaped) -and
    (
      $_.CommandLine -match "next" -or
      $_.CommandLine -match 'npm-cli\.js" run dev' -or
      $_.CommandLine -match 'npm-cli\.js" run start'
    )
  } |
  ForEach-Object {
    Write-Host "Stopping local Next.js PID $($_.ProcessId)"
    Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue
  }

Start-Sleep -Seconds 1
