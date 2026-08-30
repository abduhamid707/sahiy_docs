# 📘 Sahiy Docs & CRM — DevOps & Production Handover Guide

Ushbu qo‘llanma **Sahiy Docs / CRM** tizimini serverda xavfsiz boshqarish, Docker orqali deploy qilish, Nginx va ma’lumotlar bazasini sozlash bo‘yicha DevOps va Backend muhandislari (Mubashshir aka) uchun maxsus tayyorlangan.

---

## 🏗️ 1. Arxitektura va Tizim Sxemasi

Loyiha **Next.js 16 (Standalone)** + **Node.js 20** + **MongoDB** asosida qurilgan yagona full-stack konteyner sifatida ishlaydi:

```text
Foydalanuvchi / Operator (Brauzer & Mobil)
                   ↓  HTTPS (443) / WSS
              [ Nginx + SSL ]
                   ↓  proxy_pass (http://localhost:3006)
          [ Docker: sahiy-docs ]
         ├── Next.js Web Server (:3000)
         ├── Socket.IO Real-time Engine
         ├── Telegram Bot (Grammy Long-polling)
         └── CRM Task Reminder Worker (Sweep)
                   ↓
   ├── [ Docker: brend-mongo ] (MongoDB Database)
   ├── [ Docker Volume: sahiy_docs_uploads ] (Media & Fayllar)
   └── [ Firebase FCM & Telegram API ] (Tashqi xizmatlar)
```

---

## 📦 2. Docker Kontrakti (Production Contract)

| Xususiyat | Qiymat | Izoh |
| :--- | :--- | :--- |
| **Konteyner nomi** | `sahiy-docs` | Production asosiy ilovasi |
| **Ichki port** | `3000` | Next.js standalone server porti |
| **Tashqi port (Host)** | `3006` | Nginx yo'naltiradigan port (`127.0.0.1:3006`) |
| **Docker Tarmog'i** | `brend-market_brend-network` | MongoDB (`brend-mongo`) bilan ichki ulanish |
| **Fayllar Volume** | `sahiy_docs_uploads:/app/public/uploads` | Chat va CRM attachmentlari saqlanadigan xotira |
| **Restart siyosati** | `unless-stopped` | Server qayta yonganda avtomatik ishga tushadi |

---

## ⚙️ 3. Konfiguratsiya (.env.production)

Serverdagi `/root/sahiy-docs/.env` (yoki `.env.production`) faylida quyidagi o‘zgaruvchilar bo‘lishi lozim:

```env
# ------------------------------------------------------------------------------
# Asosiy muhit va Autentifikatsiya
# ------------------------------------------------------------------------------
NODE_ENV=production
PORT=3000
HOSTNAME=0.0.0.0
AUTH_SECRET=9237b11a117ab93ac5ee66690114f66ff932aa345eeb16bc5b1d419face51a38
AUTH_TRUST_HOST=true
NEXTAUTH_URL=https://docs.logistic.org.uz

# ------------------------------------------------------------------------------
# MongoDB Ulanishi (brend-market tarmog'i orqali)
# ------------------------------------------------------------------------------
MONGODB_URI=mongodb://admin:brendmarket2026@brend-mongo:27017/sahiy_docs?authSource=admin

# ------------------------------------------------------------------------------
# Telegram Bot & CRM Eslatmalar
# ------------------------------------------------------------------------------
TELEGRAM_BOT_TOKEN=8970855742:AAF734KzgSKFQv4pLsW3zwOkr5dudsimFmQ
TELEGRAM_BOT_USERNAME=sahiy_support_assistant_bot
ENABLE_TELEGRAM_BOT=true
ENABLE_REMINDER_SWEEP=true

# ------------------------------------------------------------------------------
# Firebase FCM Push Bildirishnomalar
# ------------------------------------------------------------------------------
NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSy...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=sahiydocsfcm.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=sahiydocsfcm
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=sahiydocsfcm.firebasestorage.app
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=849187313018
NEXT_PUBLIC_FIREBASE_APP_ID=1:849187313018:web:...
NEXT_PUBLIC_FIREBASE_VAPID_KEY=BHLoN0b2nTyshjRQHRMtyihDuOS9-OZWMquI5MhrsLYXBSA7XlPm0eOV4941sZExRMKvRCch_HHNu9brjWntVPY
FIREBASE_SERVICE_ACCOUNT_PATH=/root/sahiy-docs/sahiydocsfcm-firebase-adminsdk-fbsvc-cff9b32004.json
```

---

## 🚀 4. Serverda Ishga Tushirish va Boshqarish

### Variant A: Docker Compose orqali (Tavsiya etiladi)
```bash
cd /root/sahiy-docs

# Yangi versiyani build qilib ishga tushirish
docker compose -f docker-compose.prod.yml up -d --build

# Loglarni jonli kuzatish
docker logs -f sahiy-docs

# Konteyner holatini tekshirish
docker ps --filter name=sahiy-docs
```

### Variant B: GitHub Actions Avtomatik Deploy
Loyiha repozitoriyasiga har safar `git push origin master` bo‘lganda, GitHub Actions serverga ulanib, konteynerni avtomatik xatosiz yangilaydi va Health-Check orqali tekshiradi.

---

## 🌐 5. Nginx va WebSocket Konfiguratsiyasi

Nginx konfiguratsiyasi (`/etc/nginx/sites-available/docs.logistic.org.uz`):

```nginx
server {
    listen 80;
    server_name docs.logistic.org.uz;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name docs.logistic.org.uz;

    ssl_certificate /etc/letsencrypt/live/docs.logistic.org.uz/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/docs.logistic.org.uz/privkey.pem;

    # Client body hajmi (katta rasm va attachmentlar yuklash uchun)
    client_max_body_size 50M;

    location / {
        proxy_pass http://localhost:3006;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # WebSocket qo'llab-quvvatlash (Socket.IO uchun shart)
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_read_timeout 86400s;
        proxy_send_timeout 86400s;
    }
}
```

Nginx'ni qayta yuklash:
```bash
nginx -t && systemctl reload nginx
```

---

## 💾 6. MongoDB Avtomatik Kunlik Backup

Har kecha soat 03:00 da `sahiy_docs` bazasini siqilgan holatda arxivlash skripti:

1. Backup skriptini yaratish (`/root/backup-sahiy-docs.sh`):
```bash
#!/bin/bash
BACKUP_DIR="/root/backups/mongodb"
DATE=$(date +'%Y-%m-%d_%H-%M-%S')
mkdir -p "$BACKUP_DIR"

docker exec brend-mongo mongodump -u admin -p brendmarket2026 --authenticationDatabase admin --db sahiy_docs --archive | gzip > "$BACKUP_DIR/sahiy_docs_$DATE.gz"

# 7 kundan eski backuplarni avtomatik tozalash
find "$BACKUP_DIR" -type f -name "*.gz" -mtime +7 -exec rm -f {} \;
echo "Backup completed: $BACKUP_DIR/sahiy_docs_$DATE.gz"
```

2. Ijro ruxsatini berish va Cron'ga qo‘shish:
```bash
chmod +x /root/backup-sahiy-docs.sh
(crontab -l 2>/dev/null; echo "0 3 * * * /root/backup-sahiy-docs.sh >> /var/log/mongo_backup.log 2>&1") | crontab -
```

---

## ✅ 7. Ishga Tushirishdan Keyingi Tekshiruv (Checklist)

1. **Kirish (Auth):** `https://docs.logistic.org.uz/login` ochilib, Super Admin orqali tizimga kirish tekshirildi.
2. **CRM Tizimi:** Yangi tiket yaratish, vazifa (task) biriktirish va muddat (deadline) qo‘yish ishlayapti.
3. **Fayl Yuklash & Volume:** Chat va CRM'ga rasm/hujjat yuklanganda `sahiy_docs_uploads` jildiga yozilmoqda va konteyner restart bo'lganda yo'qolmaydi.
4. **Real-time Chat:** Sahiy Chat bo'limida Socket.io xabarlari bir zumda uzatilmoqda.
5. **Telegram Bot:** Profil orqali botga ulanganda test xabari va vazifa eslatmalari to'g'ri yetib bormoqda.
