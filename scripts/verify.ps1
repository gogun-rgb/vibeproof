$ErrorActionPreference = "Stop"
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

$Npm = (Get-Command npm.cmd -ErrorAction SilentlyContinue).Source
if (-not $Npm) {
  $Npm = (Get-Command npm -ErrorAction Stop).Source
}

function Invoke-Step([string]$Name, [string]$File, [string[]]$Arguments) {
  Write-Host ""
  Write-Host "==> $Name"
  Write-Host "+ $File $($Arguments -join ' ')"
  & $File @Arguments
  if ($LASTEXITCODE -ne 0) {
    throw "$Name failed with exit code $LASTEXITCODE"
  }
}

Invoke-Step "dependency status" $Npm @("ls", "--workspaces", "--depth=0")
Invoke-Step "lint" $Npm @("run", "lint")
Invoke-Step "typecheck" $Npm @("run", "typecheck")
Invoke-Step "unit and integration tests" $Npm @("run", "test")
Invoke-Step "E2E tests" $Npm @("run", "test:e2e")
Invoke-Step "production build" $Npm @("run", "build")

$Git = (Get-Command git -ErrorAction SilentlyContinue).Source
Write-Host ""
Write-Host "==> git status and diff"
if ($Git) {
  & $Git rev-parse --is-inside-work-tree *> $null
  if ($LASTEXITCODE -eq 0) {
    & $Git status --short
    & $Git diff --stat
  } else {
    Write-Host "not a git repository; skipping repository diff summary."
  }
} else {
  Write-Host "git was not found; skipping repository diff summary."
}

Write-Host ""
Write-Host "VibeProof verification passed."
