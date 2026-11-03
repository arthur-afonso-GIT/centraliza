[CmdletBinding()]
param(
    [string]$DatabaseName = "centraliza_smoke",
    [string]$DatabaseUser = "centraliza",
    [string]$DatabasePassword = "",
    [string]$DemoPassword = "Centraliza@2026"
)

$ErrorActionPreference = "Stop"
$repo = Split-Path -Parent $PSScriptRoot
$backend = Join-Path $repo "backend"
$frontend = Join-Path $repo "frontend"
$pgBinLocal = Join-Path $repo ".local\postgresql\pgsql\bin"
$pgDataLocal = Join-Path $repo ".local\pgdata"
$pgLog = Join-Path $repo ".local\postgresql-smoke.log"
$backendLog = Join-Path $backend "smoke-server.log"
$backendErrorLog = Join-Path $backend "smoke-server.error.log"
$frontendLog = Join-Path $frontend "smoke-server.log"
$frontendErrorLog = Join-Path $frontend "smoke-server.error.log"
$backendProcess = $null
$frontendProcess = $null
$postgresStartedHere = $false

function Resolve-Executable([string]$name) {
    $local = Join-Path $pgBinLocal "$name.exe"
    if (Test-Path -LiteralPath $local) { return $local }
    $command = Get-Command $name -ErrorAction SilentlyContinue
    if ($command) { return $command.Source }
    throw "Executável '$name' não encontrado. Instale PostgreSQL 16+ ou prepare .local/postgresql."
}

function Wait-Http([string]$url, [string]$service) {
    for ($attempt = 0; $attempt -lt 40; $attempt++) {
        try {
            $response = Invoke-WebRequest -UseBasicParsing -Uri $url -TimeoutSec 2
            if ($response.StatusCode -lt 500) { return }
        } catch { Start-Sleep -Milliseconds 500 }
    }
    throw "$service não respondeu em $url. Consulte os logs smoke-server.log."
}

function Assert-PortFree([int]$port, [string]$service) {
    if (Get-NetTCPConnection -State Listen -LocalPort $port -ErrorAction SilentlyContinue) {
        throw "A porta $port já está em uso. Encerre o $service existente antes do smoke integrado."
    }
}

function Stop-ProcessTree([int]$processId) {
    $children = Get-CimInstance Win32_Process -Filter "ParentProcessId=$processId" -ErrorAction SilentlyContinue
    foreach ($child in $children) { Stop-ProcessTree $child.ProcessId }
    Stop-Process -Id $processId -Force -ErrorAction SilentlyContinue
}

if ($DatabaseName -ne "centraliza_smoke") {
    throw "Por segurança, esta automação só pode recriar o banco centraliza_smoke."
}

$pgIsReady = Resolve-Executable "pg_isready"
$pgCtl = Resolve-Executable "pg_ctl"
$dropDb = Resolve-Executable "dropdb"
$createDb = Resolve-Executable "createdb"

try {
    Assert-PortFree 8000 "backend"
    Assert-PortFree 3000 "frontend"

    & $pgIsReady -h 127.0.0.1 -p 55432 *> $null
    if ($LASTEXITCODE -ne 0) {
        if (-not (Test-Path -LiteralPath $pgDataLocal)) {
            throw "PostgreSQL não está em 127.0.0.1:55432 e .local/pgdata não existe."
        }
        & $pgCtl start -D $pgDataLocal -l $pgLog -o "-p 55432 -h 127.0.0.1" -w
        if ($LASTEXITCODE -ne 0) { throw "Não foi possível iniciar o PostgreSQL local." }
        $postgresStartedHere = $true
    }

    $env:PGPASSWORD = $DatabasePassword
    & $dropDb -h 127.0.0.1 -p 55432 -U $DatabaseUser --if-exists --force $DatabaseName
    if ($LASTEXITCODE -ne 0) { throw "Não foi possível remover o banco descartável $DatabaseName." }
    & $createDb -h 127.0.0.1 -p 55432 -U $DatabaseUser -O $DatabaseUser $DatabaseName
    if ($LASTEXITCODE -ne 0) { throw "Não foi possível criar o banco descartável $DatabaseName." }

    $env:DJANGO_DEBUG = "1"
    $env:POSTGRES_DB = $DatabaseName
    $env:POSTGRES_USER = $DatabaseUser
    $env:POSTGRES_PASSWORD = $DatabasePassword
    $env:POSTGRES_HOST = "127.0.0.1"
    $env:POSTGRES_PORT = "55432"
    $env:CENTRALIZA_DEMO_PASSWORD = $DemoPassword
    $env:CENTRALIZA_SMOKE_PASSWORD = $DemoPassword
    $env:CENTRALIZA_SMOKE_URL = "http://localhost:3000"
    $env:CENTRALIZA_API_URL = "http://127.0.0.1:8000"

    $python = Join-Path $backend ".venv\Scripts\python.exe"
    if (-not (Test-Path -LiteralPath $python)) {
        Push-Location $backend
        try { & uv sync } finally { Pop-Location }
    }
    if (-not (Test-Path -LiteralPath $python)) { throw "Ambiente Python do backend não foi criado." }

    & $python (Join-Path $backend "manage.py") migrate --noinput
    & $python (Join-Path $backend "manage.py") seed_demo --total 30
    & $python (Join-Path $backend "manage.py") seed_agenda
    & $python (Join-Path $backend "manage.py") seed_avisos

    $backendProcess = Start-Process -FilePath $python -ArgumentList @("manage.py", "runserver", "127.0.0.1:8000", "--noreload") -WorkingDirectory $backend -WindowStyle Hidden -RedirectStandardOutput $backendLog -RedirectStandardError $backendErrorLog -PassThru
    Wait-Http "http://127.0.0.1:8000/api/auth/csrf/" "Backend"

    $frontendProcess = Start-Process -FilePath "npm.cmd" -ArgumentList @("run", "dev", "--", "--host", "localhost") -WorkingDirectory $frontend -WindowStyle Hidden -RedirectStandardOutput $frontendLog -RedirectStandardError $frontendErrorLog -PassThru
    Wait-Http "http://localhost:3000/login" "Frontend"

    Push-Location $frontend
    try {
        & npm.cmd run test:smoke:integrado
        if ($LASTEXITCODE -ne 0) { throw "O smoke integrado falhou. Consulte frontend/test-results-smoke." }
    } finally { Pop-Location }
}
finally {
    if ($frontendProcess) { Stop-ProcessTree $frontendProcess.Id }
    if ($backendProcess) { Stop-ProcessTree $backendProcess.Id }
    Start-Sleep -Milliseconds 500
    if ($postgresStartedHere) { & $pgCtl stop -D $pgDataLocal -m fast 2>$null }
    Remove-Item Env:PGPASSWORD -ErrorAction SilentlyContinue
}
