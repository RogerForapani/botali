$ErrorActionPreference = 'Stop'
$runner = Join-Path $PSScriptRoot 'auto_backup_windows.ps1'
& $runner -Action Check

# DPAPI is bound to this Windows account; run only in an interactive session.
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
    -Settings $settings -Principal $principal -Description 'Backup do Botali: banco, Storage, GPG e verificação no Google Drive' -Force | Out-Null
Write-Host "Tarefa criada: $taskName (diariamente às 10:00, quando esta conta estiver conectada)."
