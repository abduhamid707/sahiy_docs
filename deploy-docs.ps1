# Sahiy Docs ni serverga yuklash uchun avtomatik skript (SSH kalit orqali)
$SERVER_IP = "158.220.100.58"
$SERVER_USER = "root"
$APP_NAME = "sahiy-docs"
$PORT = "3006"

Write-Host "1. Loyiha fayllari siqilmoqda (Tar yaratilmoqda)..." -ForegroundColor Cyan
tar --exclude=node_modules --exclude=.next --exclude=.git --exclude=*.tar.gz --exclude=.env.local --warning=no-file-changed -czvf sahiy-docs.tar.gz .

Write-Host "`n2. Fayllar Serverga ($SERVER_IP) yuborilmoqda..." -ForegroundColor Cyan
scp -o StrictHostKeyChecking=no sahiy-docs.tar.gz ${SERVER_USER}@${SERVER_IP}:/root/sahiy-docs.tar.gz

Write-Host "`n3. Serverda Docker orqali yangilanmoqda..." -ForegroundColor Cyan
$DOCKER_CMD = "mkdir -p /root/sahiy-docs && cd /root/sahiy-docs && " +
              "tar -xzvf /root/sahiy-docs.tar.gz && " +
              "docker build -t ${APP_NAME} . && " +
              "(docker stop ${APP_NAME} || true) && (docker rm -f ${APP_NAME} || true) && " +
              "docker run -d -p ${PORT}:3000 --name ${APP_NAME} --restart unless-stopped " +
              "--network brend-market_brend-network " +
              "-v sahiy_docs_uploads:/app/public/uploads " +
              "--env-file /root/sahiy-docs/.env " +
              "${APP_NAME} && " +
              "sleep 3 && docker ps --filter name=${APP_NAME}"

ssh -o StrictHostKeyChecking=no ${SERVER_USER}@${SERVER_IP} "$DOCKER_CMD"

Remove-Item sahiy-docs.tar.gz
Write-Host "`n✅ SAHIY DOCS MUVAFFARIYATLI DEPLOY QILINDI!" -ForegroundColor Green
Write-Host "Domen: https://docs.logistic.org.uz" -ForegroundColor Yellow
