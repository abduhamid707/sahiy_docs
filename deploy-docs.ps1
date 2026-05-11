# Sahiy Docs ni serverga yuklash uchun avtomatik skript
$SERVER_IP = "158.220.100.58"
$SERVER_USER = "root"
$SERVER_PASS = "WeXw8VT3DO77iS5m0Hq6muT"
$APP_NAME = "sahiy-docs"
$PORT = "3006"

Write-Host "1. Loyiha fayllari siqilmoqda (Tar yaratilmoqda)..." -ForegroundColor Cyan
# Fayllarni siqish (node_modules, .next, .git dan tashqari)
tar --exclude=node_modules --exclude=.next --exclude=.git -czvf sahiy-docs.tar.gz .

Write-Host "`n2. Fayllar Serverga ($SERVER_IP) yuborilmoqda..." -ForegroundColor Cyan
Write-Host "Server paroli: $SERVER_PASS" -ForegroundColor Yellow
scp sahiy-docs.tar.gz ${SERVER_USER}@${SERVER_IP}:/root/sahiy-docs.tar.gz

Write-Host "`n3. Serverda Docker orqali yangilanmoqda..." -ForegroundColor Cyan
$DOCKER_CMD = "mkdir -p /root/sahiy-docs && cd /root/sahiy-docs && tar -xzvf /root/sahiy-docs.tar.gz && " +
              "docker build -t ${APP_NAME} . && " +
              "(docker stop ${APP_NAME} || true) && (docker rm -f ${APP_NAME} || true) && " +
              "docker run -d -p ${PORT}:3000 --name ${APP_NAME} --restart unless-stopped " +
              "-e MONGODB_URI=mongodb://admin:brendmarket2026@158.220.100.58:27017/sahiy_docs?authSource=admin " +
              "-e AUTH_SECRET=sahiy_docs_secret_key_2026 " +
              "-e NEXTAUTH_URL=https://docs.logistic.org.uz " +
              "-e AUTH_TRUST_HOST=true " +
              "${APP_NAME}"

ssh ${SERVER_USER}@${SERVER_IP} "$DOCKER_CMD"

Remove-Item sahiy-docs.tar.gz
Write-Host "`n✅ SAHIY DOCS MUVAFFARIYATLI DEPLOY QILINDI!" -ForegroundColor Green
Write-Host "Endi Nginx ni sozlash va SSL o'rnatish kerak." -ForegroundColor Yellow
