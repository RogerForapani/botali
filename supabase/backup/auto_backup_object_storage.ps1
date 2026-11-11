param(
    [ValidateSet('ConfigureFromStdin', 'Check', 'CheckRemote', 'PlanRetention', 'Run')]
    [string]$Action = 'Check'
)

$ErrorActionPreference = 'Stop'
Import-Module Microsoft.PowerShell.Security -ErrorAction Stop
$vaultDir = Join-Path $env:LOCALAPPDATA 'BotaliBackup'
$sourceVaultPath = Join-Path $vaultDir 'credentials.json'
$destinationVaultPath = Join-Path $vaultDir 'object-storage-credentials.json'
$statusPath = Join-Path $vaultDir 'object-storage-last-run.json'
$remoteName = 'botalioffsite'
$rcloneCommand = Get-Command rclone.exe -ErrorAction SilentlyContinue
if ($rcloneCommand) {
    $rcloneExe = $rcloneCommand.Source
} else {
    $packageRoot = Join-Path $env:LOCALAPPDATA 'Microsoft\WinGet\Packages'
    $rcloneExe = Get-ChildItem -LiteralPath $packageRoot -Directory -Filter 'Rclone.Rclone*' -ErrorAction SilentlyContinue |
        ForEach-Object { Get-ChildItem -LiteralPath $_.FullName -Recurse -Filter rclone.exe -File } |
        Select-Object -First 1 -ExpandProperty FullName
}

function Protect-Value([string]$Plaintext) {
    ConvertFrom-SecureString (ConvertTo-SecureString $Plaintext -AsPlainText -Force)
}

function Reveal-Value([string]$Ciphertext) {
    $secure = ConvertTo-SecureString -String $Ciphertext
    $pointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure)
    try { [Runtime.InteropServices.Marshal]::PtrToStringBSTR($pointer) }
    finally { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($pointer) }
}

function Set-RemoteEnvironment($Destination) {
    $settings = @{
        TYPE = 's3'
        PROVIDER = $Destination.provider
        ENDPOINT = $Destination.endpoint
        REGION = $Destination.region
        ENV_AUTH = 'false'
        NO_CHECK_BUCKET = 'true'
        ACCESS_KEY_ID = (Reveal-Value $Destination.access_key_id)
        SECRET_ACCESS_KEY = (Reveal-Value $Destination.secret_access_key)
    }
    foreach ($key in $settings.Keys) {
        [Environment]::SetEnvironmentVariable("RCLONE_CONFIG_BOTALIOFFSITE_$key", $settings[$key], 'Process')
    }
}

function Clear-RemoteEnvironment {
    foreach ($key in @('TYPE', 'PROVIDER', 'ENDPOINT', 'REGION', 'ENV_AUTH', 'NO_CHECK_BUCKET', 'ACCESS_KEY_ID', 'SECRET_ACCESS_KEY')) {
        [Environment]::SetEnvironmentVariable("RCLONE_CONFIG_BOTALIOFFSITE_$key", $null, 'Process')
    }
}

if ($Action -eq 'ConfigureFromStdin') {
    $submitted = [Console]::In.ReadToEnd() | ConvertFrom-Json
    if ($submitted.provider -notin @('GCS', 'Other')) { throw 'Provedor inválido.' }
    if ($submitted.provider -eq 'GCS' -and $submitted.endpoint -ne 'https://storage.googleapis.com') {
        throw 'Endpoint do Google Cloud Storage inválido.'
    }
    if ($submitted.provider -eq 'Other' -and $submitted.endpoint -notmatch '^https://s3\.[a-z0-9-]+\.backblazeb2\.com$') {
        throw 'Endpoint do Backblaze B2 inválido.'
    }
    if ($submitted.bucket -notmatch '^[a-z0-9][a-z0-9.-]{1,61}[a-z0-9]$') { throw 'Nome do bucket inválido.' }
    if ($submitted.region -notmatch '^[a-z0-9-]{2,32}$') { throw 'Região inválida.' }
    if (-not $submitted.access_key_id -or -not $submitted.secret_access_key) { throw 'Chave do destino ausente.' }
    $limitBytes = [long]$submitted.limit_bytes
    if ($limitBytes -lt 10485760 -or $limitBytes -gt 10737418240) { throw 'Limite de espaço inválido.' }
    New-Item -ItemType Directory -Path $vaultDir -Force | Out-Null
    $saved = [ordered]@{
        provider = $submitted.provider
        endpoint = $submitted.endpoint
        bucket = $submitted.bucket
        region = $submitted.region
        limit_bytes = $limitBytes
        access_key_id = Protect-Value $submitted.access_key_id
        secret_access_key = Protect-Value $submitted.secret_access_key
    }
    $partial = "$destinationVaultPath.partial"
    $saved | ConvertTo-Json | Set-Content -LiteralPath $partial -Encoding UTF8
    Move-Item -LiteralPath $partial -Destination $destinationVaultPath -Force
    Write-Host 'Destino externo protegido pela conta Windows.'
    exit 0
}

if (-not (Test-Path -LiteralPath $sourceVaultPath)) { throw 'Cofre do backup de origem ausente.' }
if (-not (Test-Path -LiteralPath $destinationVaultPath)) { throw 'Destino externo ainda não configurado.' }
if (-not $rcloneExe) { throw 'rclone não está instalado.' }
$source = Get-Content -LiteralPath $sourceVaultPath -Raw | ConvertFrom-Json
$destination = Get-Content -LiteralPath $destinationVaultPath -Raw | ConvertFrom-Json
foreach ($name in @('database_password', 'archive_passphrase', 's3_key_id', 's3_secret', 's3_region')) {
    if (-not $source.$name) { throw "Credencial de origem ausente: $name" }
}
if ($Action -eq 'Check') {
    Write-Host "Origem e destino configurados. Provedor: $($destination.provider); bucket: $($destination.bucket)."
    exit 0
}
if ($Action -eq 'CheckRemote') {
    Set-RemoteEnvironment $destination
    try {
        $remoteRoot = "${remoteName}:$($destination.bucket)"
        $usage = & $rcloneExe --config NUL size $remoteRoot --json | ConvertFrom-Json
        if ($LASTEXITCODE -ne 0 -or -not $usage) { throw 'Não foi possível listar o bucket externo.' }
        Write-Host "Bucket externo acessível. Arquivos: $($usage.count); bytes: $($usage.bytes)."
    } finally {
        Clear-RemoteEnvironment
    }
    exit 0
}
if ($Action -eq 'PlanRetention') {
    Set-RemoteEnvironment $destination
    try {
        $remoteRoot = "${remoteName}:$($destination.bucket)"
        $listing = & $rcloneExe --config NUL lsjson $remoteRoot --files-only | ConvertFrom-Json
        if ($LASTEXITCODE -ne 0) { throw 'Não foi possível listar os backups externos.' }
        $now = [DateTimeOffset]::UtcNow
        $backups = @($listing | Where-Object { $_.Path -match '^\d{8}-\d{6}-homologacao-[A-Za-z0-9]+\.gpg$' } | ForEach-Object {
            [pscustomobject]@{ Name = $_.Path; UploadedAt = [DateTimeOffset]::Parse($_.ModTime); Bytes = [long]$_.Size }
        } | Sort-Object UploadedAt -Descending)
        $recent = @($backups | Where-Object { ($now - $_.UploadedAt).TotalDays -le 30 })
        $expired = @($backups | Where-Object { ($now - $_.UploadedAt).TotalDays -gt 30 })
        [pscustomobject]@{
            checked_at_utc = $now.ToString('o')
            backup_count = $backups.Count
            recent_count = $recent.Count
            expired_count = $expired.Count
            expired_bytes = ($expired | Measure-Object -Property Bytes -Sum).Sum
            eligible_for_cleanup = ($recent.Count -ge 2)
            expired_names = @($expired | Select-Object -ExpandProperty Name)
            action = 'dry-run; nenhum arquivo removido'
        } | ConvertTo-Json -Depth 3
    } finally {
        Clear-RemoteEnvironment
    }
    exit 0
}

$status = [ordered]@{
    started_at = (Get-Date).ToString('o')
    finished_at = $null
    success = $false
    provider = $destination.provider
    bucket = $destination.bucket
    archive = $null
    sha256 = $null
}
$localArchive = $null
$tempCopy = $null
try {
    $payload = @{
        database_password = Reveal-Value $source.database_password
        archive_passphrase = Reveal-Value $source.archive_passphrase
        s3_key_id = Reveal-Value $source.s3_key_id
        s3_secret = Reveal-Value $source.s3_secret
        s3_region = $source.s3_region
    } | ConvertTo-Json -Compress
    $runner = Join-Path $PSScriptRoot 'run_automatic_backup.py'
    $wslRunner = '/mnt/' + $runner.Substring(0, 1).ToLower() + $runner.Substring(2).Replace('\', '/')
    $result = $payload | wsl.exe -d Ubuntu --exec /home/ningas/.local/share/botali-backup-venv/bin/python $wslRunner 2>&1
    if ($LASTEXITCODE -ne 0) { throw 'Exportação local falhou; nada foi enviado.' }
    $record = $result | Where-Object { $_ -match '^\{"archive":' } | Select-Object -Last 1 | ConvertFrom-Json
    if (-not $record) { throw 'Exportação local sem comprovante.' }
    $fileName = [IO.Path]::GetFileName($record.archive)
    $status.archive = $fileName
    $localArchive = Join-Path $vaultDir $fileName
    $tempCopy = "$localArchive.check"
    $wslTarget = '/mnt/' + $localArchive.Substring(0, 1).ToLower() + $localArchive.Substring(2).Replace('\', '/')
    wsl.exe -d Ubuntu --exec cp -- $record.archive $wslTarget
    if ($LASTEXITCODE -ne 0) { throw 'Cópia temporária do arquivo criptografado falhou.' }
    if ((Get-FileHash -LiteralPath $localArchive -Algorithm SHA256).Hash.ToLowerInvariant() -ne $record.sha256) {
        throw 'Arquivo temporário diverge do original.'
    }
    Set-RemoteEnvironment $destination
    $remoteRoot = "${remoteName}:$($destination.bucket)"
    $remoteArchive = "$remoteRoot/$fileName"
    $usage = & $rcloneExe --config NUL size $remoteRoot --json | ConvertFrom-Json
    if ($LASTEXITCODE -ne 0 -or -not $usage) { throw 'Não foi possível conferir o espaço já ocupado no destino.' }
    if ([long]$usage.bytes + (Get-Item -LiteralPath $localArchive).Length -gt [long]$destination.limit_bytes) {
        throw 'Limite preventivo de armazenamento atingido; upload interrompido.'
    }
    & $rcloneExe --config NUL copyto $localArchive $remoteArchive --immutable
    if ($LASTEXITCODE -ne 0) { throw 'Upload do arquivo criptografado falhou.' }
    & $rcloneExe --config NUL copyto $remoteArchive $tempCopy
    if ($LASTEXITCODE -ne 0) { throw 'Download de verificação falhou.' }
    $remoteHash = (Get-FileHash -LiteralPath $tempCopy -Algorithm SHA256).Hash.ToLowerInvariant()
    if ($remoteHash -ne $record.sha256) { throw 'Arquivo recuperado não corresponde ao original.' }
    $status.success = $true
    $status.sha256 = $remoteHash
    Write-Host "Backup recuperado do destino externo: $fileName SHA-256 $remoteHash"
} finally {
    $status.finished_at = (Get-Date).ToString('o')
    New-Item -ItemType Directory -Path $vaultDir -Force | Out-Null
    $status | ConvertTo-Json | Set-Content -LiteralPath $statusPath -Encoding UTF8
    if ($tempCopy) { Remove-Item -LiteralPath $tempCopy -Force -ErrorAction SilentlyContinue }
    if ($localArchive) { Remove-Item -LiteralPath $localArchive -Force -ErrorAction SilentlyContinue }
    Clear-RemoteEnvironment
    $payload = $null
}
