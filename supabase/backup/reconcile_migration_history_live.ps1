param(
    [ValidateSet('Check', 'Apply')]
    [string]$Action = 'Check',
    [string]$Bundle = '/home/ningas/botali-backups/20261108-124003-homologacao-YU4Thg'
)

$ErrorActionPreference = 'Stop'
Import-Module Microsoft.PowerShell.Security -ErrorAction Stop
$vaultPath = Join-Path $env:LOCALAPPDATA 'BotaliBackup\credentials.json'
if (-not (Test-Path -LiteralPath $vaultPath)) { throw 'Cofre local do backup ausente.' }
$vault = Get-Content -LiteralPath $vaultPath -Raw | ConvertFrom-Json
$secure = ConvertTo-SecureString -String $vault.database_password
$pointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure)
try {
    $password = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($pointer)
    $runner = Join-Path $PSScriptRoot 'reconcile_migration_history_live.sh'
    $wslRunner = '/mnt/' + $runner.Substring(0, 1).ToLower() + $runner.Substring(2).Replace('\', '/')
    $password | wsl.exe -d Ubuntu --user ningas --exec bash $wslRunner $Action $Bundle
    if ($LASTEXITCODE -ne 0) { throw "Conciliação $Action não concluída (código $LASTEXITCODE)." }
} finally {
    $password = $null
    [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($pointer)
}
