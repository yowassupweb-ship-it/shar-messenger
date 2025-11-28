$headers = @{
    "Content-Type" = "application/json;charset=utf-8"
    "Authorization" = "Bearer y0__xCr7czIAhiQ9jogleaU3RS_bSKv534RkyhuEQ4ibuDjnpiL0Q"
}

try {
    $response = Invoke-RestMethod -Uri "https://api.wordstat.yandex.net/v1/userInfo" -Method POST -Headers $headers -Body "{}"
    Write-Host "✅ API Test Success!" -ForegroundColor Green
    Write-Host ($response | ConvertTo-Json -Depth 3) -ForegroundColor Green
} catch {
    Write-Host "❌ API Test Failed!" -ForegroundColor Red
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
}