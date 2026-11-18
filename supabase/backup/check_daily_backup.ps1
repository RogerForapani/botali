param(
    [string]$StatusPath = (Join-Path $env:LOCALAPPDATA 'BotaliBackup\object-storage-last-run.json'),
    [string]$HealthPath = (Join-Path $env:LOCALAPPDATA 'BotaliBackup\backup-health.json'),
    [string]$AlertPath = (Join-Path ([Environment]::GetFolderPath('Desktop')) 'ALERTA-Botali-backup.txt'),
    [switch]$NoNotify
)

$ErrorActionPreference = 'Stop'
$now = Get-Date
$taskName = 'Botali - backup diario criptografado'
$reason = $null
$pending = $false
$archive = $null
$finishedAt = $null
$lastRun = $null

try {
    $task = Get-ScheduledTask -TaskName $taskName
    $taskInfo = Get-ScheduledTaskInfo -TaskName $taskName
    $lastRun = $taskInfo.LastRunTime
    if ($task.State -eq 'Running') {
        $pending = $true
    } elseif ($lastRun.Date -ne $now.Date) {
        $reason = 'O backup diario nao foi executado hoje.'
    } elseif ($taskInfo.LastTaskResult -ne 0) {
        $reason = "O agendador terminou com o codigo $($taskInfo.LastTaskResult)."
    } elseif (-not (Test-Path -LiteralPath $StatusPath)) {
        $reason = 'O comprovante do backup nao foi encontrado.'
    } else {
        $status = Get-Content -LiteralPath $StatusPath -Raw | ConvertFrom-Json
        $archive = $status.archive
        if ($status.finished_at) { $finishedAt = [DateTimeOffset]::Parse($status.finished_at).LocalDateTime }
        if ($status.success -ne $true -or -not $archive -or -not $status.sha256) {
            $reason = 'A ultima copia nao foi confirmada como integra.'
        } elseif (-not $finishedAt -or $finishedAt -lt $lastRun) {
            $reason = 'O comprovante e anterior a ultima execucao agendada.'
        }
    }
} catch {
    $reason = 'Nao foi possivel consultar o agendador ou o comprovante do backup.'
}

$health = [ordered]@{
    checked_at = $now.ToString('o')
    healthy = (-not $reason -and -not $pending)
    pending = $pending
    reason = $reason
    last_run = if ($lastRun) { $lastRun.ToString('o') } else { $null }
    backup_finished_at = if ($finishedAt) { $finishedAt.ToString('o') } else { $null }
    archive = $archive
}
New-Item -ItemType Directory -Path (Split-Path -Parent $HealthPath) -Force | Out-Null
$health | ConvertTo-Json | Set-Content -LiteralPath $HealthPath -Encoding UTF8

if ($pending) {
    Write-Host 'Backup em andamento; a verificacao sera repetida no proximo horario.'
    exit 0
}
if ($reason) {
    $message = "Botali: backup automatico precisa de atencao. $reason Verifique o arquivo backup-health.json em BotaliBackup."
    New-Item -ItemType Directory -Path (Split-Path -Parent $AlertPath) -Force | Out-Null
    $message | Set-Content -LiteralPath $AlertPath -Encoding UTF8
    if (-not $NoNotify) {
        try { & msg.exe $env:USERNAME /TIME:60 $message 2>$null | Out-Null } catch { }
    }
    Write-Host $message
    exit 1
}

if (Test-Path -LiteralPath $AlertPath) { Remove-Item -LiteralPath $AlertPath -Force }
Write-Host "Backup automatico conferido: $archive"
