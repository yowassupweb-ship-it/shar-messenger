$SERVER = "root@81.90.31.129"

Write-Host "Copying files..." -ForegroundColor Cyan

scp C:\Users\a.nikolyuk\Desktop\slovolov-pro\new-yml\frontend\src\app\todos\page.tsx ${SERVER}:/var/www/feed-editor/frontend/src/app/todos/page.tsx
scp C:\Users\a.nikolyuk\Desktop\slovolov-pro\new-yml\frontend\src\app\events\page.tsx ${SERVER}:/var/www/feed-editor/frontend/src/app/events/page.tsx
scp C:\Users\a.nikolyuk\Desktop\slovolov-pro\new-yml\frontend\src\app\content-plan\page.tsx ${SERVER}:/var/www/feed-editor/frontend/src/app/content-plan/page.tsx

Write-Host "Creating directories..." -ForegroundColor Cyan
ssh $SERVER "mkdir -p /var/www/feed-editor/frontend/src/app/api/todos/files/[filename]"
ssh $SERVER "mkdir -p /var/www/feed-editor/data/uploads/todos"
ssh $SERVER "chmod -R 755 /var/www/feed-editor/data/uploads"

Write-Host "Copying API routes..." -ForegroundColor Cyan
scp "C:\Users\a.nikolyuk\Desktop\slovolov-pro\new-yml\frontend\src\app\api\todos\files\[filename]\route.ts" "${SERVER}:/var/www/feed-editor/frontend/src/app/api/todos/files/[filename]/route.ts"

Write-Host "Rebuilding frontend..." -ForegroundColor Cyan
ssh $SERVER "cd /var/www/feed-editor/frontend && npm run build"

Write-Host "Restarting services..." -ForegroundColor Cyan
ssh $SERVER "systemctl restart feed-editor-backend.service"
ssh $SERVER "systemctl restart feed-editor-frontend.service"

Write-Host "Done!" -ForegroundColor Green
