dark light bo'lishi shart.
Umumiy bitta fonddan foydalanish shart
Mobile xolati ham bo'lishi shart
Brand colors bo'lishi shart
style bir xil bo'lishi kerak


1. Eksport (Export) qanday ishlaydi?
Siz "Eksport" tugmasini bosganingizda, tizim bazadagi sizga ruxsat berilgan barcha hujjatlarni yig'adi.
Ularni maxsus JSON formatidagi faylga aylantiradi.
Bu faylda hujjatning:
Sarlavhasi (Title)
Mazmuni (Content)
Kimlarga ko'rinishi (Allowed Roles)
Kalit so'zlari (Keywords)
Qaysi loyihaga tegishliligi (Project)
Qaysi kategoriyada ekanligi (Category) saqlanadi.
Fayl avtomatik ravishda sahiy_docs_export.json nomi bilan kompyuteringizga yuklanadi.
2. Import qanday ishlaydi?
Siz "Import" tugmasini bosib, oldin eksport qilingan (yoki qo'lda tayyorlangan) JSON faylni tanlaysiz.
Tizim fayl ichidagi har bir hujjatni o'qib chiqadi.
Aqlli qidiruv: Agar faylda ko'rsatilgan loyiha yoki kategoriya bazada bo'lmasa, tizim ularni avtomatik ravishda yangi yaratadi.
Himoya: Agar faylda loyiha yoki kategoriya nomi umuman ko'rsatilmagan bo'lsa (masalan, eski yoki noto'g'ri fayl bo'lsa), tizim hujjatni yo'qotib yubormaydi. Ularni "Default Project" va "Uncategorized" nomli maxsus kategoriya ichiga joylashtiradi.
Jarayon tugagach, nechta hujjat muvaffaqiyatli qo'shilgani haqida xabar chiqadi.



1. Tizim Jurnali (Logs) - To'liq Backend va Frontend
Database Model: Yangi Log modeli yaratildi. Unda kim, qachon, qaysi faylda qanday amal (Yaratish, Tahrirlash, O'chirish, Import) bajargani saqlanadi.
Backend integration: Hujjat yaratilganda, o'zgartirilganda, o'chirilganda va import qilinganda avtomatik ravishda log yoziladigan qilindi. Endi hech bir fayl izsiz o'chib ketmaydi!
Logs API: Faqat SUPER_ADMIN uchun ruxsat berilgan maxsus API yaratildi.
Frontend UI: Chap menyuda (Sidebar) faqat Super Adminlar uchun ko'rinadigan "Tizim jurnali" linki va sahifasi yaratildi. U yerda chiroyli jadvalda barcha harakatlar ko'rinib turadi.
2. Dasturchilar uchun AI Prompt va JSON Shablonlari
AI Prompt Shablon (ai_doc_prompt.md): Mobilechilar yoki boshqa dasturchilar o'zlarining VS Code dagi AI (masalan, Claude yoki ChatGPT) ga berib, bizning tizim tushunadigan formatda JSON hujjat yaratishlari uchun tayyor prompt yaratildi. Uni public/templates/ai_doc_prompt.md manzilidan olishlari mumkin.
JSON Shablon (doc_template.json): Qo'lda to'ldirib import qilish uchun namuna JSON fayli yaratildi. Uni public/templates/doc_template.json manzilidan olish mumkin.


Hozirgi holatda: Agar kimdir o'chirib yuborsa yoki tahrirlash jarayonida hammasini o'chirib yuborsa, ma'lumotlar bazadan butunlay o'chib ketar edi va ularni qaytarib bo'lmasdi.

Lekin men hozirgina buni to'g'riladim! 🛠️

Men UPDATE (tahrirlash) va DELETE (o'chirish) API'larini o'zgartirdim:

O'chirishda (DELETE): Hujjat o'chirilishidan oldin uning to'liq nusxasi (hamma kontenti bilan) Loglar jadvaliga saqlanadi.
Tahrirlashda (UPDATE): Hujjat o'zgartirilishidan oldin uning eski matni (content) logda saqlab qolinadi.
Bu nima beradi?
Endi kimdir xato qilib hujjatni o'chirib yuborsa yoki matnini buzib qo'ysa:

Super Admin Loglar sahifasidan o'sha harakatni topadi.
Log ichida hujjatning o'sha vaqtdagi asl nusxasi saqlangan bo'ladi.
O'sha matnni ko'rib, nusxa olib, hujjatni bemalol qayta tiklash mumkin!
Eslatma: Hozircha UI (interfeys)da "Qaytarish" tugmasi yo'q, lekin ma'lumotlar bazada (Loglarda) xavfsiz saqlanmoqda. Zarur bo'lsa matnni olib tiklasa bo'ladi.

P.S. Siz terminalda npm run dev qilganingizda xatolik berganining sababi — men serverni fonda (background) allaqachon ishga tushirgan edim. Port band bo'lgani uchun sizda xatolik berdi. Xavotir olmang, server hozir muvaffaqiyatli ishlayapti! 😊