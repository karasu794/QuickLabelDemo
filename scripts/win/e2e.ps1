Param(
  [string]$Url = "http://localhost:3000",
  [int]$TimeoutSec = 60
)

$ErrorActionPreference = "Stop"

# ---- 1) 必要ENVを事前セット（テスト専用値） ----
$env:NODE_ENV = "test"
$env:NEXT_PUBLIC_TEST_FORCE_ANCHORS = "1"
$env:E2E_TEST_MODE = "1"
# APIガードが 401 を返さないようにダミーでも必ず一致させる
if (-not $env:ACTIONS_TOKEN) { $env:ACTIONS_TOKEN = "e2e-dummy-token" }

# ---- 2) サーバ起動（既に別ターミナルで動かすならこの行はコメントアウト）----
Start-Process -FilePath "cmd.exe" -ArgumentList "/c","pnpm","dev" -NoNewWindow
Start-Sleep -Seconds 2

# ---- 3) ヘルスチェック（最大60秒。HTTP 200 でOK扱い） ----
$stopwatch = [System.Diagnostics.Stopwatch]::StartNew()
$healthy = $false
while ($stopwatch.Elapsed.TotalSeconds -lt $TimeoutSec) {
  try {
    $resp = Invoke-WebRequest -Uri $Url -UseBasicParsing -Method GET -Headers @{ "Cache-Control"="no-cache" }
    if ($resp.StatusCode -eq 200) { $healthy = $true; break }
  } catch {}
  Start-Sleep -Milliseconds 800
}
if (-not $healthy) {
  Write-Error "Server not ready at $Url within $TimeoutSec sec"
  exit 1
}

# ---- 4) Playwright 実行（headed推奨でまず目視） ----
pnpm -s exec playwright test --headed
exit $LASTEXITCODE
$env:NEXT_PUBLIC_TEST_FORCE_ANCHORS="1"
pnpm -s build
start cmd /c "pnpm -s start"
Start-Sleep -Seconds 3
pnpm -s test:e2e

