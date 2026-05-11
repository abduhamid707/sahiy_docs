# Sahiy Docs uchun Hujjat Yaratish Prompti

Quyidagi ko'rsatmalar asosida loyiha hujjati uchun JSON formatidagi fayl yarating. Bu faylni keyinchalik Sahiy Docs tizimiga import qilish mumkin bo'ladi.

## Ko'rsatmalar:
Sizdan quyidagi loyiha/funksiya haqida texnik hujjat yaratish so'raladi. Hujjatni faqat va faqat quyidagi JSON formatida qaytaring (hech qanday qo'shimcha matn yoki tushuntirishlarsiz).

## JSON Formati:
```json
[
  {
    "title": "Hujjat Sarlavhasi (Masalan: Auth tizimini sozlash)",
    "content": "# Markdown formatidagi to'liq hujjat matni\n\nBu yerda hujjatning batafsil mazmuni bo'lishi kerak. Kod namunalari, jadvallar va barcha zarur ma'lumotlarni kiriting.",
    "projectName": "Loyiha Nomi (Masalan: Sahiy Mobile)",
    "categoryName": "Kategoriya Nomi (Masalan: Authentikatsiya)",
    "keywords": ["auth", "jwt", "setup"],
    "status": "DRAFT",
    "allowedRoles": ["MOBILE", "ADMIN", "SUPER_ADMIN"]
  }
]
```

## Topshiriq:
Quyidagi kod/funksiya/vazifa uchun yuqoridagi formatda hujjat tayyorlang:
[BU YERGA KOD YOKI VAZIFANI KIRITING]
