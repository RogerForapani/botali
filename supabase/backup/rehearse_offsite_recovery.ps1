$ErrorActionPreference = 'Stop'
Import-Module Microsoft.PowerShell.Security -ErrorAction Stop
$vaultDir = Join-Path $env:LOCALAPPDATA 'BotaliBackup'
$source = Get-Content -LiteralPath (Join-Path $vaultDir 'credentials.json') -Raw | ConvertFrom-Json
$destination = Get-Content -LiteralPath (Join-Path $vaultDir 'object-storage-credentials.json') -Raw | ConvertFrom-Json
$lastRun = Get-Content -LiteralPath (Join-Path $vaultDir 'object-storage-last-run.json') -Raw | ConvertFrom-Json
if (-not $lastRun.success -or $lastRun.bucket -ne $destination.bucket -or
    $lastRun.archive -notmatch '^\d{8}-\d{6}-homologacao-[A-Za-z0-9]+\.gpg$' -or
    $lastRun.sha256 -notmatch '^[0-9a-fA-F]{64}$') {
    throw 'Último backup externo sem comprovante válido.'
}
$rcloneCommand = Get-Command rclone.exe -ErrorAction SilentlyContinue
if ($rcloneCommand) {
    $rcloneExe = $rcloneCommand.Source
} else {
    $packageRoot = Join-Path $env:LOCALAPPDATA 'Microsoft\WinGet\Packages'
    $rcloneExe = Get-ChildItem -LiteralPath $packageRoot -Directory -Filter 'Rclone.Rclone*' -ErrorAction SilentlyContinue |
        ForEach-Object { Get-ChildItem -LiteralPath $_.FullName -Recurse -Filter rclone.exe -File } |
        Select-Object -First 1 -ExpandProperty FullName
}
if (-not $rcloneExe) { throw 'rclone não está instalado.' }

function Reveal-Value([string]$Ciphertext) {
    $secure = ConvertTo-SecureString -String $Ciphertext
    $pointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure)
    try { [Runtime.InteropServices.Marshal]::PtrToStringBSTR($pointer) }
    finally { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($pointer) }
}
function Wsl-Path([string]$WindowsPath) {
    $resolved = [IO.Path]::GetFullPath($WindowsPath)
    return '/mnt/' + $resolved.Substring(0, 1).ToLower() + $resolved.Substring(2).Replace('\', '/')
}
function Clear-RemoteEnvironment {
    foreach ($key in @('TYPE', 'PROVIDER', 'ENDPOINT', 'REGION', 'ENV_AUTH', 'NO_CHECK_BUCKET', 'ACCESS_KEY_ID', 'SECRET_ACCESS_KEY')) {
        [Environment]::SetEnvironmentVariable("RCLONE_CONFIG_BOTALIOFFSITE_$key", $null, 'Process')
    }
}

$runId = (Get-Date).ToString('yyyyMMdd-HHmmss')
$drillDir = Join-Path $vaultDir "recovery-drills\$runId"
New-Item -ItemType Directory -Path $drillDir -Force | Out-Null
$download = Join-Path $drillDir $lastRun.archive
$wslDrillDir = "/home/ningas/botali-backups/recovery-drills/$runId"
$bundleName = $lastRun.archive.Substring(0, $lastRun.archive.Length - 4)
$startedUtc = [datetimeoffset]::UtcNow
$total = [Diagnostics.Stopwatch]::StartNew()
try {
    $settings = @{
        TYPE = 's3'; PROVIDER = $destination.provider; ENDPOINT = $destination.endpoint
        REGION = $destination.region; ENV_AUTH = 'false'; NO_CHECK_BUCKET = 'true'
        ACCESS_KEY_ID = (Reveal-Value $destination.access_key_id)
        SECRET_ACCESS_KEY = (Reveal-Value $destination.secret_access_key)
    }
    foreach ($key in $settings.Keys) {
        [Environment]::SetEnvironmentVariable("RCLONE_CONFIG_BOTALIOFFSITE_$key", $settings[$key], 'Process')
    }
    $remote = "botalioffsite:$($destination.bucket)/$($lastRun.archive)"
    $stage = [Diagnostics.Stopwatch]::StartNew()
    & $rcloneExe --config NUL copyto $remote $download
    if ($LASTEXITCODE -ne 0) { throw 'Download do B2 falhou.' }
    $downloadSeconds = [math]::Round($stage.Elapsed.TotalSeconds, 3)
    if ((Get-FileHash -LiteralPath $download -Algorithm SHA256).Hash.ToLowerInvariant() -ne $lastRun.sha256.ToLowerInvariant()) {
        throw 'SHA-256 do arquivo baixado diverge do backup registrado.'
    }
    Clear-RemoteEnvironment

    $passphrase = Reveal-Value $source.archive_passphrase
    $unpacker = Wsl-Path (Join-Path $PSScriptRoot 'unpack_offsite_backup.py')
    $wslDownload = Wsl-Path $download
    $stage.Restart()
    $unpackOutput = $passphrase | wsl.exe -d Ubuntu --user ningas --exec python3 $unpacker $wslDownload $wslDrillDir $bundleName
    $passphrase = $null
    if ($LASTEXITCODE -ne 0) { throw 'Descriptografia ou verificação do pacote falhou.' }
    $unpacked = $unpackOutput | Select-Object -Last 1 | ConvertFrom-Json
    if (-not $unpacked.bundle -or $unpacked.backup_latest_migration -ne '202610270001') {
        throw 'Inventário do pacote externo inesperado.'
    }
    $unpackSeconds = [math]::Round($stage.Elapsed.TotalSeconds, 3)

    $restoreScript = Wsl-Path (Join-Path $PSScriptRoot 'restore_offsite_bundle_local.sh')
    $stage.Restart()
    wsl.exe -d Ubuntu --user ningas --exec bash $restoreScript $unpacked.bundle "$wslDrillDir/restored-db"
    if ($LASTEXITCODE -ne 0) { throw 'Restauro local do pacote baixado falhou.' }
    $restoreSeconds = [math]::Round($stage.Elapsed.TotalSeconds, 3)

    $stage.Restart()
    $sourceCheck = & powershell.exe -NoProfile -NonInteractive -File (Join-Path $PSScriptRoot 'reconcile_migration_history_live.ps1') -Action Check
    if ($LASTEXITCODE -ne 0 -or ($sourceCheck -join ' ') -notmatch '202610270001') {
        throw 'Não foi possível confirmar o retorno ao banco original.'
    }
    $returnSeconds = [math]::Round($stage.Elapsed.TotalSeconds, 3)
    $total.Stop()
    $age = $startedUtc - [datetimeoffset]::Parse($unpacked.backup_checked_at)
    $report = [ordered]@{
        started_utc = $startedUtc.ToString('o')
        finished_utc = [datetimeoffset]::UtcNow.ToString('o')
        archive = $lastRun.archive
        sha256 = $lastRun.sha256.ToLowerInvariant()
        backup_age_minutes_at_start = [math]::Round($age.TotalMinutes, 1)
        download_seconds = $downloadSeconds
        unpack_and_verify_seconds = $unpackSeconds
        restore_and_query_seconds = $restoreSeconds
        original_database_check_seconds = $returnSeconds
        total_seconds = [math]::Round($total.Elapsed.TotalSeconds, 3)
        database_ready = $true
        original_database_available = $true
        storage_objects_verified = $unpacked.storage_objects
        local_result = "$wslDrillDir/restored-db/local-verification.json"
        scope = 'local isolated PostgreSQL; no app routing or Supabase Auth cutover'
    }
    $report | ConvertTo-Json | Set-Content -LiteralPath (Join-Path $drillDir 'result.json') -Encoding UTF8
    Write-Host "Ensaio local concluído em $($report.total_seconds) s: download $downloadSeconds s, pacote $unpackSeconds s, banco $restoreSeconds s, conferência da origem $returnSeconds s."
    Write-Host "Registro: $(Join-Path $drillDir 'result.json')"
} finally {
    $passphrase = $null
    Clear-RemoteEnvironment
}
