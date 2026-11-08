$ErrorActionPreference = 'Stop'
$runner = Join-Path $PSScriptRoot 'auto_backup_object_storage.ps1'
& $runner -Action Check
if ($LASTEXITCODE -ne 0) { throw 'Destino externo não está pronto.' }

$statusPath = Join-Path $env:LOCALAPPDATA 'BotaliBackup\object-storage-last-run.json'
if (-not (Test-Path -LiteralPath $statusPath)) { throw 'Teste completo do destino ainda não executado.' }
$status = Get-Content -LiteralPath $statusPath -Raw | ConvertFrom-Json
$destinationPath = Join-Path $env:LOCALAPPDATA 'BotaliBackup\object-storage-credentials.json'
$destination = Get-Content -LiteralPath $destinationPath -Raw | ConvertFrom-Json
if (-not $status.success -or -not $status.sha256 -or
    $status.provider -ne $destination.provider -or $status.bucket -ne $destination.bucket -or
    [datetimeoffset]$status.finished_at -lt (Get-Date).AddHours(-4)) {
    throw 'Execute e confirme um teste completo recente antes de trocar a tarefa diária.'
}

$taskName = 'Botali - backup diario criptografado'
$action = New-ScheduledTaskAction -Execute 'powershell.exe' -Argument (
    '-NoProfile -NonInteractive -ExecutionPolicy Bypass -File "' + $runner + '" -Action Run'
)
$trigger = New-ScheduledTaskTrigger -Daily -At '10:00'
$settings = New-ScheduledTaskSettingsSet -StartWhenAvailable -RunOnlyIfNetworkAvailable `
    -ExecutionTimeLimit (New-TimeSpan -Hours 2) -MultipleInstances IgnoreNew
$principal = New-ScheduledTaskPrincipal -UserId ([Security.Principal.WindowsIdentity]::GetCurrent().Name) `
    -LogonType Interactive -RunLevel Limited
Register-ScheduledTask -TaskName $taskName -Action $action -Trigger $trigger `
    -Settings $settings -Principal $principal -Description 'Backup do Botali: banco, Storage, GPG e verificação no destino externo' -Force | Out-Null
Write-Host "Tarefa diária configurada para $($status.provider): $($status.bucket)."
