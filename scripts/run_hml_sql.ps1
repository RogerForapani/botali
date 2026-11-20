param([Parameter(Mandatory=$true)][string]$SqlFile)
$ErrorActionPreference = 'Stop'
$vault = Get-Content (Join-Path $env:LOCALAPPDATA 'BotaliBackup\credentials.json') -Raw | ConvertFrom-Json
$secure = ConvertTo-SecureString -String $vault.database_password
$pointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure)
try {
    $password = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($pointer)
    $payload = @{ database_password = $password } | ConvertTo-Json -Compress
    $runner = Join-Path $PSScriptRoot 'run_hml_sql.py'
    $wslRunner = '/mnt/' + $runner.Substring(0,1).ToLower() + $runner.Substring(2).Replace('\','/')
    $fullSql = (Resolve-Path -LiteralPath $SqlFile).Path
    $wslSql = '/mnt/' + $fullSql.Substring(0,1).ToLower() + $fullSql.Substring(2).Replace('\','/')
    $payload | wsl.exe -d Ubuntu --exec python3 $wslRunner $wslSql
    if ($LASTEXITCODE -ne 0) { throw "SQL não concluído (código $LASTEXITCODE)." }
} finally {
    [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($pointer)
}
