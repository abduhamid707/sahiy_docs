# Sahiy Docs ni serverga yuklash uchun avtomatik skript (SSH kalit orqali)
$SERVER_IP = "158.220.100.58"
$SERVER_USER = "root"
Write-Host "1. Loyiha fayllari siqilmoqda (Tar yaratilmoqda)..." -ForegroundColor Cyan
tar --exclude=node_modules --exclude=.next --exclude=.git --exclude=*.tar.gz --exclude=.env* --exclude=*firebase-adminsdk*.json -czf sahiy-docs.tar.gz .

Write-Host "`n2. Fayllar Serverga ($SERVER_IP) yuborilmoqda..." -ForegroundColor Cyan
scp sahiy-docs.tar.gz ${SERVER_USER}@${SERVER_IP}:/tmp/sahiy-docs.tar.gz

Write-Host "`n3. Serverda Docker orqali yangilanmoqda..." -ForegroundColor Cyan
$DOCKER_CMD = "set -e && test -f /root/sahiy-docs/.env && " +
              "rm -rf /root/sahiy-docs-release && mkdir -p /root/sahiy-docs-release && " +
              "tar -xzf /tmp/sahiy-docs.tar.gz -C /root/sahiy-docs-release && rm -f /tmp/sahiy-docs.tar.gz && " +
              "cp /root/sahiy-docs/.env /root/sahiy-docs-release/.env && chmod 600 /root/sahiy-docs-release/.env && " +
              "cd /root/sahiy-docs-release && " +
              "docker compose -p sahiy-docs --env-file .env -f docker-compose.prod.yml build && " +
              "(docker stop sahiy-docs 2>/dev/null || true) && (docker rm sahiy-docs 2>/dev/null || true) && " +
              "docker compose -p sahiy-docs --env-file .env -f docker-compose.prod.yml up -d --remove-orphans && " +
              "rm -rf /root/sahiy-docs-previous && mv /root/sahiy-docs /root/sahiy-docs-previous && " +
              "mv /root/sahiy-docs-release /root/sahiy-docs"

ssh ${SERVER_USER}@${SERVER_IP} "$DOCKER_CMD"

Remove-Item sahiy-docs.tar.gz
Write-Host "`n✅ SAHIY DOCS MUVAFFARIYATLI DEPLOY QILINDI!" -ForegroundColor Green
Write-Host "Domen: https://docs.logistic.org.uz" -ForegroundColor Yellow
