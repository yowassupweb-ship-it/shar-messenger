$SERVER = "root@81.90.31.129"

Write-Host "Deploying fixes..." -ForegroundColor Cyan

scp C:\Users\a.nikolyuk\Desktop\slovolov-pro\new-yml\frontend\src\app\api\todos\people\route.ts ${SERVER}:/var/www/feed-editor/frontend/src/app/api/todos/people/route.ts
scp C:\Users\a.nikolyuk\Desktop\slovolov-pro\new-yml\frontend\src\app\todos\page.tsx ${SERVER}:/var/www/feed-editor/frontend/src/app/todos/page.tsx

Write-Host "Rebuilding..." -ForegroundColor Yellow
ssh $SERVER "cd /var/www/feed-editor/frontend && npm run build && systemctl restart feed-editor-frontend.service"

Write-Host "Done!" -ForegroundColor Green
