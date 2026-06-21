$ErrorActionPreference = "Stop"

$ProjectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$BackendPath = Join-Path $ProjectRoot "backend"
$FrontendPath = Join-Path $ProjectRoot "frontend"
$BundledPython = Join-Path $env:USERPROFILE ".cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe"

if (Test-Path $BundledPython) {
    $PythonCommand = "`"$BundledPython`""
} else {
    $PythonCommand = "python"
}

Write-Host "Installing backend dependencies..."
Start-Process powershell -ArgumentList @(
    "-NoExit",
    "-Command",
    "cd '$BackendPath'; $PythonCommand -m pip install -r requirements.txt; $PythonCommand -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000"
)

Write-Host "Starting FitQuest frontend..."
Start-Process powershell -ArgumentList @(
    "-NoExit",
    "-Command",
    "cd '$FrontendPath'; npm install; npm run dev -- --host 127.0.0.1 --port 5173"
)

Write-Host ""
Write-Host "FitQuest frontend: http://127.0.0.1:5173"
Write-Host "FitQuest backend docs: http://127.0.0.1:8000/docs"
