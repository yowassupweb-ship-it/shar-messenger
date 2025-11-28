param(
  [Parameter(Mandatory=$true)] [string]$RepoName,
  [string]$Org = $env:GITHUB_USER,
  [string]$Token = $env:GITHUB_TOKEN
)

if (-not $Token) {
  Write-Error "GITHUB_TOKEN не задан. Установите переменную окружения GITHUB_TOKEN с правами repo:create:public и repo:status."
  exit 1
}

if (-not $Org) {
  Write-Error "Не указан Org/аккаунт. Передайте -Org <user_or_org> или задайте переменную GITHUB_USER."
  exit 1
}

$Headers = @{ Authorization = "token $Token"; 'User-Agent' = 'publish-script' }
$Body = @{ name = $RepoName; private = $false } | ConvertTo-Json

# 1) Создать репозиторий
$createUrl = "https://api.github.com/user/repos"
# Если Org отличается от авторизованного пользователя, попробуем орг-эндпоинт
if ($Org -and $Org -ne $env:GITHUB_USER) {
  $createUrl = "https://api.github.com/orgs/$Org/repos"
}

try {
  Write-Host "Создаю репозиторий $Org/$RepoName ..."
  $resp = Invoke-RestMethod -Method POST -Uri $createUrl -Headers $Headers -Body $Body
  $sshUrl = $resp.ssh_url
  $httpsUrl = $resp.clone_url
  Write-Host "Репозиторий создан: $httpsUrl" -ForegroundColor Green
} catch {
  Write-Error "Не удалось создать репозиторий: $($_.Exception.Message)"
  exit 1
}

# 2) Проверить наличие git и попытаться запушить
$gitExists = (Get-Command git -ErrorAction SilentlyContinue) -ne $null
if (-not $gitExists) {
  Write-Warning "Git не найден в системе. Репозиторий создан, но пуш не выполнен."
  Write-Host "Скачайте и установите Git for Windows: https://git-scm.com/download/win" -ForegroundColor Yellow
  Write-Host "После установки выполните:" -ForegroundColor Yellow
  Write-Host "  git init" -ForegroundColor Yellow
  Write-Host "  git add -A" -ForegroundColor Yellow
  Write-Host "  git commit -m 'chore: initial commit'" -ForegroundColor Yellow
  Write-Host "  git remote add origin $httpsUrl" -ForegroundColor Yellow
  Write-Host "  git branch -M main" -ForegroundColor Yellow
  Write-Host "  git push -u origin main" -ForegroundColor Yellow
  exit 0
}

if (-not (Test-Path .git)) {
  git init | Out-Null
}

git add -A | Out-Null
$head = git rev-parse --verify HEAD 2>$null
if (-not $head) {
  git commit -m "chore: initial commit" | Out-Null
} else {
  git commit -m "chore: publish" | Out-Null
}

# Настроить origin
$origin = git remote get-url origin 2>$null
if (-not $origin) {
  git remote add origin $httpsUrl | Out-Null
} else {
  git remote set-url origin $httpsUrl | Out-Null
}

git branch -M main | Out-Null

git push -u origin main

Write-Host "Готово!" -ForegroundColor Green
