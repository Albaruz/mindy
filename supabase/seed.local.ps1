# Seed runner: loads credentials from .env.seed.local (gitignored, never
# committed or printed) and runs the wardrobe seed.
# Usage from the repository root:
#   powershell -ExecutionPolicy Bypass -File supabase/seed.local.ps1
$ErrorActionPreference = "Stop"

$envFiles = @(
  (Join-Path (Get-Location) ".env.local"),
  (Join-Path (Get-Location) ".env.seed.local")
)
$loadedAny = $false
foreach ($envFile in $envFiles) {
  if (-not (Test-Path $envFile)) { continue }
  $loadedAny = $true
  Get-Content $envFile | ForEach-Object {
    $line = $_.Trim()
    if ($line -eq "" -or $line.StartsWith("#")) { return }
    $i = $line.IndexOf("=")
    if ($i -lt 1) { return }
    $name = $line.Substring(0, $i).Trim()
    $value = $line.Substring($i + 1).Trim()
    [Environment]::SetEnvironmentVariable($name, $value, "Process")
  }
}
if (-not $loadedAny) {
  Write-Error "Missing .env.local and .env.seed.local. Create one with SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (see seed.ts header)."
  exit 1
}

if (-not $env:SUPABASE_URL -and $env:NEXT_PUBLIC_SUPABASE_URL) {
  $env:SUPABASE_URL = $env:NEXT_PUBLIC_SUPABASE_URL
}
if (-not $env:TEST_USER_ID) {
  $env:TEST_USER_ID = "010289a4-c38d-4f47-9092-d21a53874cda"
}
if (-not $env:SUPABASE_URL -or -not $env:SUPABASE_SERVICE_ROLE_KEY) {
  Write-Error "SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in .env.seed.local."
  exit 1
}

npx tsx supabase/seed.ts
