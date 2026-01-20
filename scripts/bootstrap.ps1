Param()

$ErrorActionPreference = "Stop"

function Write-Info($message) {
  Write-Host $message -ForegroundColor Cyan
}

function Write-Warn($message) {
  Write-Host $message -ForegroundColor Yellow
}

function Write-ErrorAndExit($message) {
  Write-Host $message -ForegroundColor Red
  exit 1
}

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Definition
$ProjectRoot = Resolve-Path (Join-Path $ScriptDir "..")
Set-Location $ProjectRoot

Write-Info "DM-Commerce-OS One-Click Setup (Windows)"

if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
  Write-ErrorAndExit "Node.js is required. Please install Node 18 or later and rerun this script."
}

$nodeMajor = [int]([string](node -p "process.versions.node.split('.')[0]"))
if ($nodeMajor -lt 18) {
  Write-ErrorAndExit "Node.js 18+ is required. Current version: $(node -v)."
}

$usingPnpm = $true
if (-not (Get-Command pnpm -ErrorAction SilentlyContinue)) {
  Write-Warn "pnpm was not found. Attempting to enable pnpm via Corepack..."
  try {
    corepack enable pnpm | Out-Null
  } catch {
    Write-Warn "Corepack enable failed or is unavailable. Falling back to npm."
    $usingPnpm = $false
  }
  if ($usingPnpm -and -not (Get-Command pnpm -ErrorAction SilentlyContinue)) {
    Write-Warn "pnpm still unavailable. Falling back to npm."
    $usingPnpm = $false
  }
}

$packageManager = if ($usingPnpm) { "pnpm" } else { "npm" }
$packageCommand = if ($usingPnpm) { "pnpm" } else { "npm" }

function Invoke-Step([string]$command, [string[]]$arguments) {
  $psi = New-Object System.Diagnostics.ProcessStartInfo
  $psi.FileName = $command
  $psi.Arguments = [string]::Join(' ', $arguments)
  $psi.RedirectStandardOutput = $false
  $psi.RedirectStandardError = $false
  $psi.UseShellExecute = $true
  $process = [System.Diagnostics.Process]::Start($psi)
  $process.WaitForExit()
  if ($process.ExitCode -ne 0) {
    throw "Command '$command $($psi.Arguments)' failed with exit code $($process.ExitCode)."
  }
}

$envPath = Join-Path $ProjectRoot ".env.local"
if (-not (Test-Path $envPath)) {
  Write-Info "Creating .env.local with secure APP_SECRET"
  $secret = $null
  if (Get-Command openssl -ErrorAction SilentlyContinue) {
    $secret = (& openssl rand -hex 32).Trim()
  }
  if (-not $secret) {
    $secret = (node -e "console.log(require('crypto').randomBytes(32).toString('hex'))").Trim()
  }
  "APP_SECRET=$secret" | Out-File -FilePath $envPath -Encoding utf8
} else {
  $existing = Get-Content $envPath
  $secretLine = $existing | Where-Object { $_ -match '^APP_SECRET=' }
  if (-not $secretLine) {
    Write-Info "Appending APP_SECRET to existing .env.local"
    $secret = $null
    if (Get-Command openssl -ErrorAction SilentlyContinue) {
      $secret = (& openssl rand -hex 32).Trim()
    }
    if (-not $secret) {
      $secret = (node -e "console.log(require('crypto').randomBytes(32).toString('hex'))").Trim()
    }
    Add-Content -Path $envPath -Value "APP_SECRET=$secret"
  } elseif ($secretLine -match 'GENERATE_AT_INSTALL') {
    Write-Info "Replacing placeholder APP_SECRET"
    $secret = $null
    if (Get-Command openssl -ErrorAction SilentlyContinue) {
      $secret = (& openssl rand -hex 32).Trim()
    }
    if (-not $secret) {
      $secret = (node -e "console.log(require('crypto').randomBytes(32).toString('hex'))").Trim()
    }
    ($existing -replace '^APP_SECRET=.*', "APP_SECRET=$secret") | Set-Content -Path $envPath
  } else {
    Write-Info ".env.local already has an APP_SECRET"
  }
}

Write-Info "Installing dependencies with $packageManager"
if ($usingPnpm) {
  Invoke-Step "pnpm" @("install")
} else {
  Invoke-Step "npm" @("install")
}

function Invoke-PnpmOrNpm([string[]]$pnpmArgs, [string[]]$npmArgs) {
  if ($usingPnpm) {
    Invoke-Step "pnpm" $pnpmArgs
  } else {
    Invoke-Step "npm" $npmArgs
  }
}

Invoke-PnpmOrNpm @("prisma", "generate") @("run", "prisma:generate")

$hasMigrations = Test-Path (Join-Path $ProjectRoot "prisma/migrations") -PathType Container -ErrorAction SilentlyContinue
if ($hasMigrations -and ((Get-ChildItem (Join-Path $ProjectRoot "prisma/migrations") | Where-Object { $_.PSIsContainer }).Count -gt 0)) {
  Invoke-PnpmOrNpm @("prisma", "migrate", "deploy") @("exec", "prisma", "migrate", "deploy")
} else {
  Invoke-PnpmOrNpm @("prisma", "migrate", "dev", "--name", "init") @("exec", "prisma", "migrate", "dev", "--name", "init")
}

Invoke-PnpmOrNpm @("db:seed") @("run", "db:seed")

$portToUse = 3000
try {
  $connection = Get-NetTCPConnection -LocalPort 3000 -ErrorAction Stop
  if ($connection) {
    Write-Warn "Port 3000 is busy. The dev server will start on port 3001 instead."
    $portToUse = 3001
  }
} catch {
  # Get-NetTCPConnection may throw if not elevated; ignore
}

Write-Info "Starting development server on port $portToUse..."

$devArgs = if ($usingPnpm) { if ($portToUse -eq 3000) { @("dev") } else { @("run", "dev") } } else { @("run", "dev") }
$devProcess = New-Object System.Diagnostics.Process
$devProcess.StartInfo.FileName = if ($usingPnpm) { "pnpm" } else { "npm" }
if ($usingPnpm -and $portToUse -ne 3000) {
  $devProcess.StartInfo.EnvironmentVariables["PORT"] = "$portToUse"
  $devProcess.StartInfo.Arguments = "dev"
} elseif (-not $usingPnpm -and $portToUse -ne 3000) {
  $devProcess.StartInfo.EnvironmentVariables["PORT"] = "$portToUse"
  $devProcess.StartInfo.Arguments = "run dev"
} else {
  $devProcess.StartInfo.Arguments = [string]::Join(' ', $devArgs)
}
$devProcess.StartInfo.UseShellExecute = $false
$devProcess.StartInfo.RedirectStandardOutput = $false
$devProcess.StartInfo.RedirectStandardError = $false
$devProcess.Start()

Start-Sleep -Seconds 3
Write-Host "Press Enter to open http://localhost:$portToUse/login" -ForegroundColor Green
[void][System.Console]::ReadLine()

try {
  Start-Process "http://localhost:$portToUse/login" | Out-Null
} catch {
  Write-Warn "Unable to automatically open the browser. Please navigate to http://localhost:$portToUse/login."
}

$devProcess.WaitForExit()
