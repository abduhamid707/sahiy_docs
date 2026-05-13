# 💬 Sahiy Docs - Jamoaviy Chat Tizimi Rejasi

Ushbu hujjat Sahiy Docs platformasi ichida dasturchilar va jamoa a'zolari uchun to'liq chat tizimini yaratish rejasini belgilaydi. Bu tizim real-vaqtda muloqot qilish, hujjatlarni muhokama qilish va topshiriqlarni muvofiqlashtirish imkonini beradi.

---

## 🚀 1. Umumiy Maqsad
Hujjatlar tizimini shunchaki matnlar omboridan faol **muloqot va hamkorlik markaziga** aylantirish. Dasturchilar hujjatlarni o'qish jarayonida bir-birlari bilan bog'lanishlari, savol berishlari va muammolarni hal qilishlari mumkin bo'ladi.

---

## 🛠️ 2. Texnologik Arxitektura

| Komponent | Texnologiya | Vazifasi |
|---|---|---|
| **Real-time Aloqa** | **Socket.io** | Xabarlarni soniyalarda yetkazish, o'qilganlik holati, yozayotganlik (typing) indikatori. |
| **Push Bildirishnomalar** | **Firebase (FCM)** | Ilova yopiq bo'lganda yoki foydalanuvchi oflayn bo'lganda xabarlarni bildirishnoma ko'rinishida yuborish. |
| **Ma'lumotlar Bazasi** | **MongoDB** | Xabarlar tarixi, xonalar (conversations) va foydalanuvchilar holatini saqlash. |
| **Fayllar Saqlagichi** | **MinIO / Local Storage** | Chatda yuborilgan rasm va fayllarni saqlash. |

---

## ✨ 3. Asosiy Imkoniyatlar (Features)

### 3.1. Real-time Chat Funksiyalari
- **Real-vaqtda xabar almashish**: Sahifani yangilamasdan xabarlarni ko'rish.
- **O'qilganlik holati (Seen/Unseen)**: Kim xabarni o'qidi, kim o'qimadi — ko'rinib turadi.
- **Xabarga javob berish (Reply)**: Aniq bir xabarga iqtibos (quote) keltirib javob berish.
- **Xabarlarni tahrirlash va o'chirish**: O'z xabarlarini boshqarish.
- **Yozayotganlik indikatori (Typing...)**: Kimdir yozayotganini real-vaqtda ko'rish.

### 3.2. Aqlli Tag tizimi (Smart Tagging)
- **Foydalanuvchilarni tag qilish (`@username`)**: Masalan, `@frontend` bu apini ko'rib ber. Tag qilingan foydalanuvchiga alohida bildirishnoma boradi.
- **Hujjatlarni tag qilish (`#doc_id` yoki `#hujjat_nomi`)**: Masalan, `#Auth-setup` hujjatini o'qib chiqing. Bu avtomatik ravishda o'sha hujjatga chiroyli havola (Card) yaratadi.

### 3.3. Bildirishnomalar (Badge & Sound)
- **O'qilmagan xabarlar soni**: Menyuda "Sahiy Team" yonida qizil nishon (badge) chiqib turadi.
- **Ovozli bildirishnoma**: Yangi xabar kelganda qisqa ovoz.

---

## 📚 4. Hujjatlar Tizimini Kuchaytirish (Docs Integration)

Chat shunchaki alohida sahifa bo'lmaydi, u hujjatlar bilan chambarchas bog'lanadi:
1. **Document-based Chat**: Har bir hujjatning ostida yoki yonida o'sha hujjatga tegishli chat (muhokama) ochiladi.
2. **Knowledge Base to Chat**: Chatda berilgan savollarga javob sifatida hujjatlardan qismlarni tezda ulashish (Search & Share) imkoniyati bo'ladi.
3. **Chat Arxivini Hujjatga aylantirish**: Agar chatda biron muhim texnik yechim topilsa, uni bitta tugma bilan yangi hujjat (Draft) ko'rinishida saqlab qo'yish mumkin bo'ladi.

---

## 🗺️ 5. Bosqichma-bosqich Amalga Oshirish Rejasi

### 1-Bosqich: Baza va UI (1-2 kun)
- MongoDB da `Conversation` va `Message` modellarini yaratish.
- Chat sahifasining UI maketini chizish (Sidebar + Chat Area + Info Panel).
- "Asosiy Menu" da "Sahiy Team" havolasini yaratish.

### 2-Bosqich: Real-time & Socket (2-3 kun)
- Next.js loyihasida Socket.io serverini sozlash (yoki alohida kichik server).
- Xabar yuborish va qabul qilish mantiqini ulash.
- O'qilganlik (Seen) holatini saqlash.

### 3-Bosqich: Aqlli funksiyalar (2 kun)
- `@mentions` va `#docs` taglarini aniqlash va formatlash.
- Reply (javob berish) funksiyasini qo'shish.
- Fayl va rasm yuklash imkoniyatini yaratish.

### 4-Bosqich: FCM & Push Notifications (2 kun)
- Firebase Cloud Messaging ni sozlash.
- Foydalanuvchi oflayn bo'lganda push bildirishnoma yuborish.

---

## 📈 Reja bo'yicha taklifingiz bormi?
Agar reja ma'qul bo'lsa, **1-Bosqich** — ma'lumotlar bazasi modellarini yaratishdan boshlaymiz. Qaysi bandni kengaytirishimiz yoki o'zgartirishimiz kerak?
