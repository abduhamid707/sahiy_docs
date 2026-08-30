# Sahiy CRM — production handover

Ushbu loyiha Next.js 16 standalone, Node.js 20 va MongoDB asosida ishlaydi. Go servisiga ko‘chirish talab qilinmaydi: server uchun asosiy kontrakt Docker Compose hisoblanadi.

## Arxitektura

```text
Browser / mobile
       ↓ HTTPS + WSS
Nginx (crm.sahiy.uz)
       ↓ 127.0.0.1:3006
Sahiy CRM container
  ├─ Next.js web/API
  ├─ Socket.IO
  ├─ Telegram long-polling
  └─ CRM reminder sweep
       ↓ Docker network
brend-mongo / sahiy_docs
```

Birinchi production versiyada faqat bitta app replica ishlatiladi. Bir nechta replica kerak bo‘lsa Telegram bot va reminder sweep alohida workerga ajratilishi kerak.

## Server talablari

- Docker Engine va Docker Compose v2
- `brend-market_brend-network` nomli mavjud external network
- Shu network ichida `brend-mongo` nomi bilan ko‘rinadigan MongoDB
- Nginx va amaldagi TLS sertifikat
- `/root/sahiy-docs/.env` production konfiguratsiyasi
- GitHub Actions uchun SSH public key serverga o‘rnatilgan bo‘lishi

Networkni tekshirish:

```bash
docker network inspect brend-market_brend-network >/dev/null
docker inspect brend-mongo >/dev/null
```

## Production `.env`

Repo ichidagi `.env.production.example`dan nusxa oling:

```bash
cd /root/sahiy-docs
cp .env.production.example .env
chmod 600 .env
nano .env
```

Haqiqiy token, parol va service-account qiymatlarini faqat serverdagi `.env`ga yozing. Ularni Git, handover hujjati yoki chatga joylamang.

Muhim:

- `MONGODB_URI` serverdagi `brend-mongo`ga qarashi kerak.
- `FIREBASE_SERVICE_ACCOUNT_JSON` bir qatorli valid JSON bo‘lishi kerak.
- `NEXT_PUBLIC_FIREBASE_*` qiymatlar Docker build vaqtida Compose orqali uzatiladi.
- `ENABLE_TELEGRAM_BOT=true` va `ENABLE_REMINDER_SWEEP=true` faqat bitta app containerda yoqiladi.

## Birinchi qo‘lda deploy

```bash
cd /root/sahiy-docs
docker compose -p sahiy-docs --env-file .env -f docker-compose.prod.yml config --quiet
docker compose -p sahiy-docs --env-file .env -f docker-compose.prod.yml up -d --build --wait --wait-timeout 180
docker compose -p sahiy-docs -f docker-compose.prod.yml ps
```

Loglar:

```bash
docker logs --tail 200 -f sahiy-docs
```

Health-check:

```bash
curl -fsS http://127.0.0.1:3006/api/health
curl -fsS https://crm.sahiy.uz/api/health
```

## GitHub Actions

Repository Settings → Secrets and variables → Actions bo‘limida:

- `PROD_HOST` — server IP yoki host
- `PROD_USER` — hozirgi release yo‘llari uchun `root`
- `PROD_SSH_KEY` — private SSH key

Password fallback yo‘q. `master` yoki `main`ga push qilinganda action release papkada build qiladi, server `.env`ni saqlaydi va Compose orqali containerni yangilaydi.

## Nginx

```nginx
server {
    listen 80;
    server_name crm.sahiy.uz;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name crm.sahiy.uz;

    ssl_certificate /etc/letsencrypt/live/crm.sahiy.uz/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/crm.sahiy.uz/privkey.pem;
    client_max_body_size 50M;

    location / {
        proxy_pass http://127.0.0.1:3006;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_read_timeout 86400s;
        proxy_send_timeout 86400s;
    }
}
```

```bash
nginx -t && systemctl reload nginx
```

## Upload va backup

Chat va CRM attachmentlari `sahiy_docs_uploads` named volume’da saqlanadi:

```bash
docker volume inspect sahiy_docs_uploads
```

MongoDB backupda parolni skriptga hardcode qilmang. Mongo containerni o‘z environment qiymatlari bilan ishlating:

```bash
mkdir -p /root/backups/mongodb
docker exec brend-mongo sh -lc 'mongodump --username "$MONGO_INITDB_ROOT_USERNAME" --password "$MONGO_INITDB_ROOT_PASSWORD" --authenticationDatabase admin --db sahiy_docs --archive' | gzip > /root/backups/mongodb/sahiy_docs_$(date +%F_%H-%M-%S).gz
```

Backup faylini boshqa server yoki object storage’ga ham nusxalash tavsiya etiladi.

## Qabul qilish checklisti

1. `/api/health` 200 qaytaradi va database `connected`.
2. Login va `/crm` ochiladi.
3. Ticket yaratish, operator/status/priority o‘zgartirish ishlaydi.
4. Task yaratish va deadline bo‘yicha table tartibi ishlaydi.
5. Chat ikki brauzerda real-time yangilanadi.
6. Attachment container restartdan keyin ham ochiladi.
7. Telegram ulash va reminder kelishi tekshiriladi.
8. FCM push ruxsati va background notification tekshiriladi.
