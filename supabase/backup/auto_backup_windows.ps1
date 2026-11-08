param(
    [ValidateSet('Configure', 'ConfigureFromStdin', 'StoreS3FromStdin', 'CheckS3', 'SetupDrive', 'ReconnectDrive', 'Run', 'Check')]
    [string]$Action = 'Check'
)

$ErrorActionPreference = 'Stop'
Import-Module Microsoft.PowerShell.Security -ErrorAction Stop
$vaultDir = Join-Path $env:LOCALAPPDATA 'BotaliBackup'
$vaultPath = Join-Path $vaultDir 'credentials.json'
$s3VaultPath = Join-Path $vaultDir 's3-credentials.json'
$rcloneConfig = Join-Path $vaultDir 'rclone.conf'
$oauthIdPath = Join-Path $vaultDir 'oauth-client-id.txt'
$oauthSecretPath = Join-Path $vaultDir 'oauth-client-secret.dpapi'
$scriptPath = $MyInvocation.MyCommand.Path
$rcloneCommand = Get-Command rclone.exe -ErrorAction SilentlyContinue
if ($rcloneCommand) {
    $rcloneExe = $rcloneCommand.Source
} else {
    $packageRoot = Join-Path $env:LOCALAPPDATA 'Microsoft\WinGet\Packages'
    $rcloneExe = Get-ChildItem -LiteralPath $packageRoot -Directory -Filter 'Rclone.Rclone*' -ErrorAction SilentlyContinue |
        ForEach-Object { Get-ChildItem -LiteralPath $_.FullName -Recurse -Filter rclone.exe -File } |
        Select-Object -First 1 -ExpandProperty FullName
}

function Read-Secret([string]$Prompt) {
    $secret = Read-Host -Prompt $Prompt -AsSecureString
    if ($secret.Length -eq 0) { throw 'Campo obrigatório vazio' }
    return ConvertFrom-SecureString -SecureString $secret
}

function Reveal-Secret([string]$Ciphertext) {
    $secure = ConvertTo-SecureString -String $Ciphertext
    $pointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure)
    try { return [Runtime.InteropServices.Marshal]::PtrToStringBSTR($pointer) }
    finally { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($pointer) }
}

function Set-DriveClientEnvironment {
    if (-not (Test-Path -LiteralPath $oauthIdPath) -or -not (Test-Path -LiteralPath $oauthSecretPath)) {
        throw 'Cliente OAuth próprio ainda não está protegido no cofre local.'
    }
    $clientId = (Get-Content -LiteralPath $oauthIdPath -Raw).Trim()
    $clientSecret = Reveal-Secret (Get-Content -LiteralPath $oauthSecretPath -Raw)
    [Environment]::SetEnvironmentVariable('RCLONE_CONFIG_BOTALI-DRIVE_CLIENT_ID', $clientId, 'Process')
    [Environment]::SetEnvironmentVariable('RCLONE_CONFIG_BOTALI-DRIVE_CLIENT_SECRET', $clientSecret, 'Process')
}

function Clear-DriveClientEnvironment {
    [Environment]::SetEnvironmentVariable('RCLONE_CONFIG_BOTALI-DRIVE_CLIENT_ID', $null, 'Process')
    [Environment]::SetEnvironmentVariable('RCLONE_CONFIG_BOTALI-DRIVE_CLIENT_SECRET', $null, 'Process')
}

if ($Action -eq 'StoreS3FromStdin') {
    $submitted = [Console]::In.ReadToEnd() | ConvertFrom-Json
    if (-not $submitted.s3_key_id -or -not $submitted.s3_secret -or $submitted.s3_region -notmatch '^[a-z0-9-]{3,32}$') {
        throw 'Dados S3 inválidos'
    }
    New-Item -ItemType Directory -Path $vaultDir -Force | Out-Null
    $s3Config = [ordered]@{
        s3_key_id = ConvertFrom-SecureString (ConvertTo-SecureString $submitted.s3_key_id -AsPlainText -Force)
        s3_secret = ConvertFrom-SecureString (ConvertTo-SecureString $submitted.s3_secret -AsPlainText -Force)
        s3_region = $submitted.s3_region
    }
    $s3Config | ConvertTo-Json | Set-Content -LiteralPath $s3VaultPath -Encoding UTF8
    Write-Host 'Chave S3 protegida pela conta Windows.'
    exit 0
}

if ($Action -eq 'CheckS3') {
    if (-not (Test-Path -LiteralPath $s3VaultPath)) { throw 'Chave S3 não encontrada no cofre local.' }
    $savedS3 = Get-Content -LiteralPath $s3VaultPath -Raw | ConvertFrom-Json
    $payloadS3 = @{
        s3_key_id = Reveal-Secret $savedS3.s3_key_id
        s3_secret = Reveal-Secret $savedS3.s3_secret
        s3_region = $savedS3.s3_region
    } | ConvertTo-Json -Compress
    $wslCheck = '/mnt/' + $scriptPath.Substring(0,1).ToLower() + $scriptPath.Substring(2).Replace('\','/')
    $wslCheck = $wslCheck.Replace('/auto_backup_windows.ps1', '/check_s3_access.py')
    try {
        $payloadS3 | wsl.exe -d Ubuntu --exec /home/ningas/.local/share/botali-backup-venv/bin/python $wslCheck
        if ($LASTEXITCODE -ne 0) { throw 'A chave S3 não conseguiu listar os buckets.' }
    } finally {
        $payloadS3 = $null
    }
    exit 0
}

if ($Action -eq 'Configure' -or $Action -eq 'ConfigureFromStdin') {
    New-Item -ItemType Directory -Path $vaultDir -Force | Out-Null
    if ($Action -eq 'ConfigureFromStdin') {
        $submitted = [Console]::In.ReadToEnd() | ConvertFrom-Json
        foreach ($name in @('database_password', 'archive_passphrase', 'rclone_config_pass')) {
            if (-not $submitted.$name) { throw "Campo obrigatório vazio: $name" }
        }
        if ($submitted.archive_passphrase.Length -lt 16) { throw 'A senha do arquivo deve ter 16 caracteres ou mais.' }
        if (Test-Path -LiteralPath $s3VaultPath) {
            $savedS3 = Get-Content -LiteralPath $s3VaultPath -Raw | ConvertFrom-Json
        } elseif (-not $submitted.s3_key_id -or -not $submitted.s3_secret) {
            throw 'Chave S3 não configurada'
        }
        $config = [ordered]@{
            database_password = ConvertFrom-SecureString (ConvertTo-SecureString $submitted.database_password -AsPlainText -Force)
            archive_passphrase = ConvertFrom-SecureString (ConvertTo-SecureString $submitted.archive_passphrase -AsPlainText -Force)
            s3_key_id = $(if ($savedS3) { $savedS3.s3_key_id } else { ConvertFrom-SecureString (ConvertTo-SecureString $submitted.s3_key_id -AsPlainText -Force) })
            s3_secret = $(if ($savedS3) { $savedS3.s3_secret } else { ConvertFrom-SecureString (ConvertTo-SecureString $submitted.s3_secret -AsPlainText -Force) })
            s3_region = $(if ($savedS3) { $savedS3.s3_region } else { $submitted.s3_region })
            rclone_config_pass = ConvertFrom-SecureString (ConvertTo-SecureString $submitted.rclone_config_pass -AsPlainText -Force)
        }
        $submitted = $null
    } else {
        $config = [ordered]@{
            database_password = Read-Secret 'Senha atual do banco da homologação'
            archive_passphrase = Read-Secret 'Senha forte para a cópia criptografada (guarde fora do computador)'
            s3_key_id = Read-Secret 'Supabase Storage S3 Access Key ID'
            s3_secret = Read-Secret 'Supabase Storage S3 Secret Access Key'
            s3_region = Read-Host 'Região S3 exibida no Supabase'
            rclone_config_pass = Read-Secret 'Senha da configuração criptografada do rclone'
        }
    }
    if ($config.s3_region -notmatch '^[a-z0-9-]{3,32}$') { throw 'Região S3 inválida' }
    $temporary = Join-Path $vaultDir 'credentials.json.partial'
    $config | ConvertTo-Json | Set-Content -LiteralPath $temporary -Encoding UTF8
    Move-Item -LiteralPath $temporary -Destination $vaultPath -Force
    Write-Host 'Credenciais protegidas pela conta Windows. Nenhuma senha foi enviada à conversa.'
    exit 0
}

if (-not (Test-Path -LiteralPath $vaultPath)) {
    throw 'Credenciais ainda não configuradas. Execute com -Action Configure.'
}
$vault = Get-Content -LiteralPath $vaultPath -Raw | ConvertFrom-Json

if ($Action -eq 'SetupDrive') {
    if (-not $rcloneExe) { throw 'rclone não está instalado.' }
    $env:RCLONE_CONFIG_PASS = Reveal-Secret $vault.rclone_config_pass
    try {
        & $rcloneExe --config $rcloneConfig config create botali-drive drive scope drive.file --no-output
        if ($LASTEXITCODE -ne 0) { throw 'Não foi possível conectar ao Google Drive.' }
    } finally {
        Remove-Item Env:RCLONE_CONFIG_PASS -ErrorAction SilentlyContinue
    }
    exit 0
}

if ($Action -eq 'ReconnectDrive') {
    if (-not $rcloneExe) { throw 'rclone não está instalado.' }
    $env:RCLONE_CONFIG_PASS = Reveal-Secret $vault.rclone_config_pass
    Set-DriveClientEnvironment
    try {
        @('y', 'y', 'n') | & $rcloneExe --config $rcloneConfig config reconnect botali-drive:
        if ($LASTEXITCODE -ne 0) { throw 'Não foi possível autorizar o cliente OAuth próprio.' }
    } finally {
        Clear-DriveClientEnvironment
        Remove-Item Env:RCLONE_CONFIG_PASS -ErrorAction SilentlyContinue
    }
    exit 0
}
if ($Action -eq 'Check') {
    foreach ($name in @('database_password', 'archive_passphrase', 's3_key_id', 's3_secret', 's3_region', 'rclone_config_pass')) {
        if (-not $vault.$name) { throw "Credencial ausente: $name" }
    }
    if (-not (Test-Path -LiteralPath $rcloneConfig)) { throw 'Google Drive ainda não configurado no rclone.' }
    if (-not (Test-Path -LiteralPath $oauthIdPath) -or -not (Test-Path -LiteralPath $oauthSecretPath)) { throw 'Cliente OAuth próprio ainda não configurado.' }
    if (-not $rcloneExe) { throw 'rclone não está instalado.' }
    Write-Host 'Pré-requisitos locais presentes. Execute -Action Run para testar a cópia.'
    exit 0
}

$payload = @{
    database_password = Reveal-Secret $vault.database_password
    archive_passphrase = Reveal-Secret $vault.archive_passphrase
    s3_key_id = Reveal-Secret $vault.s3_key_id
    s3_secret = Reveal-Secret $vault.s3_secret
    s3_region = $vault.s3_region
} | ConvertTo-Json -Compress
$env:RCLONE_CONFIG_PASS = Reveal-Secret $vault.rclone_config_pass
Set-DriveClientEnvironment
try {
    $wslScript = '/mnt/' + $scriptPath.Substring(0,1).ToLower() + $scriptPath.Substring(2).Replace('\','/')
    $wslScript = $wslScript.Replace('/auto_backup_windows.ps1', '/run_automatic_backup.py')
    $result = $payload | wsl.exe -d Ubuntu --exec /home/ningas/.local/share/botali-backup-venv/bin/python $wslScript 2>&1
    if ($LASTEXITCODE -ne 0) { throw 'Backup local falhou. Verifique a conexão e as credenciais; nenhuma cópia foi enviada.' }
    $record = $result | Where-Object { $_ -match '^\{"archive":' } | Select-Object -Last 1 | ConvertFrom-Json
    if (-not $record) { throw 'Backup sem comprovante local.' }
    $fileName = [IO.Path]::GetFileName($record.archive)
    $localArchive = Join-Path $vaultDir $fileName
    $wslTarget = '/mnt/' + $localArchive.Substring(0,1).ToLower() + $localArchive.Substring(2).Replace('\','/')
    $remoteArchive = "botali-drive:Botali Backup Automatico/$fileName"
    $tempCopy = Join-Path $vaultDir ($fileName + '.check')
    try {
        wsl.exe -d Ubuntu --exec cp -- $record.archive $wslTarget
        if ($LASTEXITCODE -ne 0) { throw 'Não foi possível copiar o arquivo criptografado para o Windows.' }
        $stagedHash = (Get-FileHash -LiteralPath $localArchive -Algorithm SHA256).Hash.ToLowerInvariant()
        if ($stagedHash -ne $record.sha256) { throw 'A cópia temporária diverge do arquivo original.' }
        & $rcloneExe --config $rcloneConfig copyto $localArchive $remoteArchive --immutable
        if ($LASTEXITCODE -ne 0) { throw 'Upload para o Google Drive falhou.' }
        & $rcloneExe --config $rcloneConfig copyto $remoteArchive $tempCopy
        if ($LASTEXITCODE -ne 0) { throw 'Download de verificação falhou.' }
        $remoteHash = (Get-FileHash -LiteralPath $tempCopy -Algorithm SHA256).Hash.ToLowerInvariant()
        if ($remoteHash -ne $record.sha256) { throw 'Hash do Drive diverge da cópia local.' }
        Write-Host "Backup completo e recuperado do Drive: $fileName SHA-256 $remoteHash"
    } finally {
        Remove-Item -LiteralPath $tempCopy -Force -ErrorAction SilentlyContinue
        Remove-Item -LiteralPath $localArchive -Force -ErrorAction SilentlyContinue
    }
} finally {
    Remove-Item Env:RCLONE_CONFIG_PASS -ErrorAction SilentlyContinue
    Clear-DriveClientEnvironment
    $payload = $null
}
