# Sahiy Customer Support CRM — Eslatma

**Holat:** Keyinroq davom ettiriladi  
**Yozilgan sana:** 2026-08-28

## Qabul qilingan asosiy qaror

Telefon qo‘ng‘irog‘i avtomatik ravishda ticket hisoblanmaydi. Avval u alohida **Call interaction** sifatida saqlanadi. Haqiqiy va kuzatishni talab qiladigan muammo aniqlangandagina ticketga aylantiriladi.

Bu yondashuv oddiy, tez hal bo‘ladigan qo‘ng‘iroqlar sabab ticketlar soni sun’iy oshib ketishining oldini oladi.

## Kutilayotgan flow

1. Mijoz qo‘ng‘iroq qiladi.
2. CRM telefon raqami orqali mavjud mijozni qidiradi.
3. Shu mijozda ochiq ticket bo‘lsa, qo‘ng‘iroq yangi ticket yaratmasdan o‘sha ticket tarixiga qo‘shiladi.
4. Ochiq ticket bo‘lmasa, yangi `Call interaction` yaratiladi.
5. Call inboxda `Qo‘ng‘iroq / New` ko‘rinishida turadi.
6. Operator qo‘ng‘iroqni ko‘rib chiqadi:
   - savol tez hal bo‘lsa, interaction sifatida qoladi;
   - haqiqiy muammo bo‘lsa, **Ticketga aylantirish** actionini bosadi.
7. Ticketga aylantirilganda call yozuvi, audio, davomiylik, sana, operator va mijoz ma’lumoti yangi ticketning boshlang‘ich history’siga ko‘chadi.

## Inbox misoli

```text
CALL-1042 | Zarina Qodirova | +998... | Incoming call | 4:12 | New
```

Ticketga aylantirilgandan keyin:

```text
CRM-2098 | Yetkazib berish kechikishi | In Progress
```

Ticket history ichida:

```text
Incoming call — 4 min 12 sec
Audio recording
28 Aug 23:31
Operator: Abduhamid
```

## Domain modeli

```text
Customer
├── Interactions
│   ├── Calls
│   └── Messages
└── Tickets
    ├── Messages
    ├── Events
    └── Attached Calls
```

Muhim bog‘lanishlar:

- `Customer -> many Interactions`
- `Customer -> many Tickets`
- `Interaction -> optional Ticket`
- `Ticket -> many Messages / Events / Calls`
- Call ticketga attach yoki convert qilinganda asl call ma’lumoti yo‘qolmaydi.

## Keyingi implementatsiya uchun vazifalar

- `CustomerInteraction` yoki `CallInteraction` modelini yaratish.
- PBX webhookni to‘g‘ridan-to‘g‘ri `Ticket` yaratishdan interaction yaratishga o‘tkazish.
- Telefon bo‘yicha customer va ochiq ticket matching servis yozish.
- Ochiq ticket topilsa callni uning history’siga attach qilish.
- Ochiq ticket topilmasa Calls Inboxga interaction qo‘shish.
- `Ticketga aylantirish` API va UI actionini yaratish.
- Conversion jarayonini idempotent qilish — bir call ikki marta ticketga aylanmasligi kerak.
- Audio recording, call duration, direction, operator va PBX external ID’ni saqlash.
- Conversion va attachment harakatlarini system event/audit tarixiga yozish.
- Analytics’da calls, converted calls va conversion rate ko‘rsatkichlarini ajratish.

## Asosiy maqsad

Har bir qo‘ng‘iroqni ticketga aylantirish emas. Kuzatishni talab qiladigan haqiqiy mijoz muammosini yo‘qotmaslik va oddiy interactionlar bilan ticket queue’ni sun’iy to‘ldirmaslik.
