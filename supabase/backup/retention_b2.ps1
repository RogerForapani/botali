param(
    [ValidateSet('Plan', 'Test', 'Apply')]
    [string]$Action = 'Plan'
)

$ErrorActionPreference = 'Stop'
$vaultDir = Join-Path $env:LOCALAPPDATA 'BotaliBackup'
$destination = Get-Content -LiteralPath (Join-Path $vaultDir 'object-storage-credentials.json') -Raw | ConvertFrom-Json
$lastRun = Get-Content -LiteralPath (Join-Path $vaultDir 'object-storage-last-run.json') -Raw | ConvertFrom-Json
if ($destination.provider -ne 'Other' -or $destination.endpoint -notmatch '^https://s3\.[a-z0-9-]+\.backblazeb2\.com$') {
    throw 'Esta rotina aceita somente o destino Backblaze B2 configurado.'
}
if ($destination.bucket -notmatch '^[a-z0-9][a-z0-9.-]{1,61}[a-z0-9]$') { throw 'Bucket inválido.' }
$rclone = (Get-Command rclone.exe -ErrorAction Stop).Source
function Reveal([string]$ciphertext) {
    $pointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR((ConvertTo-SecureString $ciphertext))
    try { [Runtime.InteropServices.Marshal]::PtrToStringBSTR($pointer) }
    finally { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($pointer) }
}
function RemoteFiles([switch]$Versions) {
    $args = @('--config', 'NUL', 'lsjson', $remoteRoot, '--files-only')
    if ($Versions) { $args += '--b2-versions' }
    $json = & $rclone @args
    if ($LASTEXITCODE -ne 0) { throw 'Falha ao listar arquivos no B2.' }
    @($json | ConvertFrom-Json)
}
$env:RCLONE_CONFIG_BOTALIRETENTION_TYPE = 'b2'
$env:RCLONE_CONFIG_BOTALIRETENTION_ACCOUNT = Reveal $destination.access_key_id
$env:RCLONE_CONFIG_BOTALIRETENTION_KEY = Reveal $destination.secret_access_key
$remoteRoot = "botaliretention:$($destination.bucket)"
try {
    if ($Action -eq 'Test') {
        $fixture = "botali-retention-test-$([guid]::NewGuid().ToString('N')).txt"
        $local = Join-Path $vaultDir $fixture
        [IO.File]::WriteAllText($local, 'Teste descartável sem dados pessoais.')
        try {
            & $rclone --config NUL copyto $local "$remoteRoot/$fixture" --immutable
            if ($LASTEXITCODE -ne 0) { throw 'Falha no envio da amostra.' }
            if (-not (@(RemoteFiles) | Where-Object Path -eq $fixture)) { throw 'A amostra enviada não apareceu no B2.' }
            & $rclone --config NUL deletefile "$remoteRoot/$fixture" --b2-hard-delete
            if ($LASTEXITCODE -ne 0) { throw 'Falha na exclusão permanente da amostra.' }
            if (@(RemoteFiles -Versions) | Where-Object Path -like "*$fixture*") { throw 'A amostra ainda possui versão no B2.' }
            'Teste: amostra enviada, excluída permanentemente e ausência de versões confirmada.'
        } finally {
            Remove-Item -LiteralPath $local -Force -ErrorAction SilentlyContinue
        }
        exit 0
    }

    $now = [DateTimeOffset]::UtcNow
    $localNow = Get-Date
    $backups = @(RemoteFiles | Where-Object { $_.Path -match '^\d{8}-\d{6}-homologacao-[A-Za-z0-9]+\.gpg$' } | ForEach-Object {
        [pscustomobject]@{ Name = $_.Path; CreatedLocal = [DateTime]::ParseExact($_.Path.Substring(0,15), 'yyyyMMdd-HHmmss', [Globalization.CultureInfo]::InvariantCulture); Bytes = [long]$_.Size }
    } | Sort-Object CreatedLocal -Descending)
    $recent = @($backups | Where-Object { ($localNow - $_.CreatedLocal).TotalDays -le 30 })
    $expired = @($backups | Where-Object { ($localNow - $_.CreatedLocal).TotalDays -gt 30 })
    $fresh = $lastRun.success -eq $true -and $lastRun.archive -eq $backups[0].Name -and
        ($now - [DateTimeOffset]::Parse($lastRun.finished_at)).TotalHours -le 24 -and
        -not [string]::IsNullOrWhiteSpace($lastRun.sha256)
    if ($Action -eq 'Plan') {
        [pscustomobject]@{ Backups=$backups.Count; Recent=$recent.Count; Expired=$expired.Count; FreshVerified=$fresh; Eligible=($recent.Count -ge 2 -and $fresh); ExpiredNames=@($expired | Select-Object -ExpandProperty Name) } | ConvertTo-Json -Depth 3
        exit 0
    }
    if (-not $fresh -or $recent.Count -lt 2) { throw 'Descarte suspenso: faltam backup recente conferido ou duas cópias recentes.' }
    foreach ($item in $expired) {
        & $rclone --config NUL deletefile "$remoteRoot/$($item.Name)" --b2-hard-delete
        if ($LASTEXITCODE -ne 0) { throw "Falha ao eliminar $($item.Name)." }
        if (@(RemoteFiles -Versions) | Where-Object { $_.Path -eq $item.Name -or $_.Path -like "$($item.Name.Substring(0,$item.Name.Length-4))-v*.gpg" }) {
            throw "Versão remanescente para $($item.Name)."
        }
    }
    "Cópias vencidas eliminadas e conferidas: $($expired.Count)."
} finally {
    Remove-Item Env:RCLONE_CONFIG_BOTALIRETENTION_TYPE,Env:RCLONE_CONFIG_BOTALIRETENTION_ACCOUNT,Env:RCLONE_CONFIG_BOTALIRETENTION_KEY -ErrorAction SilentlyContinue
}
