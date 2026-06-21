$ErrorActionPreference = "Stop"

$ProjectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$BackendPath = Join-Path $ProjectRoot "backend"
$FrontendPath = Join-Path $ProjectRoot "frontend"
$WorkPath = Join-Path $ProjectRoot "work"
$BundledPython = Join-Path $env:USERPROFILE ".cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe"

if (!(Test-Path $WorkPath)) {
    New-Item -ItemType Directory -Path $WorkPath | Out-Null
}

if (Test-Path $BundledPython) {
    $PythonCommand = "& '$BundledPython'"
} else {
    $PythonCommand = "python"
}

Write-Host "Building FitQuest frontend..."
Push-Location $FrontendPath
npm run build
Pop-Location

Write-Host "Starting FitQuest backend in production-like mode..."
Start-Process powershell -ArgumentList @(
    "-NoProfile",
    "-Command",
    "cd '$BackendPath'; `$env:APP_ENV='production'; `$env:CORS_ORIGINS='http://127.0.0.1:4173'; `$env:ENABLE_DOCS='true'; $PythonCommand -m uvicorn app.main:app --host 127.0.0.1 --port 8000 *> '$WorkPath\backend-production.log'"
)

Write-Host "Starting FitQuest frontend production preview..."
Start-Process powershell -ArgumentList @(
    "-NoProfile",
    "-Command",
    "cd '$FrontendPath'; npm run preview:local *> '$WorkPath\frontend-production.log'"
)

Write-Host ""
Write-Host "FitQuest production preview: http://127.0.0.1:4173"
Write-Host "FitQuest backend docs: http://127.0.0.1:8000/docs"
