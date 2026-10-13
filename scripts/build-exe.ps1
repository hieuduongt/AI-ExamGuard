# Build the Windows EXE: export the web UI (web/out), package it with PyInstaller,
# then copy the result to release/. Does not overwrite an EXE that is running
# unless it has the same name - pass -Name to build a new versioned file.
#
#   powershell -ExecutionPolicy Bypass -File scripts/build-exe.ps1
#   powershell -ExecutionPolicy Bypass -File scripts/build-exe.ps1 -Name AI_ExamGuard_2026_09_08_3
param(
    [string]$Name = 'AI_ExamGuard_Portable'
)
$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot

function Invoke-Step([string]$Title, [string]$Folder, [scriptblock]$Command) {
    Write-Host "== $Title" -ForegroundColor Cyan
    Push-Location (Join-Path $root $Folder)
    try {
        & $Command
        if ($LASTEXITCODE) { throw "$Title failed (exit code $LASTEXITCODE)" }
    } finally {
        Pop-Location
    }
}

Invoke-Step 'Install web dependencies' 'web' { npm ci }
Invoke-Step 'Export web UI to web/out' 'web' { npm run build }

$env:EXAMGUARD_EXE_NAME = $Name
Invoke-Step 'Package EXE with PyInstaller' 'desktop' { python -m PyInstaller --noconfirm examguard.spec }

$release = Join-Path $root 'release'
New-Item -ItemType Directory -Force $release | Out-Null
Copy-Item (Join-Path $root "desktop/dist/$Name.exe") $release -Force
Write-Host "Done: release/$Name.exe" -ForegroundColor Green
