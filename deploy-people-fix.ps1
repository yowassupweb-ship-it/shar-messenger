$SERVER = "root@81.90.31.129"

Write-Host "Deploying people API fix..." -ForegroundColor Cyan

scp C:\Users\a.nikolyuk\Desktop\slovolov-pro\new-yml\frontend\src\app\api\todos\people\route.ts ${SERVER}:/var/www/feed-editor/frontend/src/app/api/todos/people/route.ts

Write-Host "Rebuilding..." -ForegroundColor Yellow
ssh $SERVER "cd /var/www/feed-editor/frontend && npm run build && systemctl restart feed-editor-frontend.service"

Write-Host "Checking logs..." -ForegroundColor Yellow
ssh $SERVER "journalctl -u feed-editor-frontend.service -n 20 --no-pager"

Write-Host "Done!" -ForegroundColor Green
