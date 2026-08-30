# Sahiy CRM rahbar mobil ilovasi — AI agent uchun prompt

Sahiy CRM uchun **faqat kompaniya rahbari foydalanadigan Expo mobil ilova** yarat. Bu desktop sahifaning kichraytirilgan nusxasi bo‘lmasin. Ilova rahbarga bir qarashda vaziyatni tushunish, shoshilinch muammolarni topish va tasklarni tez tasdiqlash imkonini beradigan haqiqiy mobil boshqaruv markazi bo‘lsin.

Ishni quyidagi bosqichlarda bajar. Har bir bosqich tugagach, o‘sha qismni tekshir, xatolarini tuzat va keyin navbatdagi bosqichga o‘t. Bir vaqtda hamma sahifani yuzaki chiqarib tashlama.

## Asosiy talablar

- UX juda puxta ishlansin. Har bir element rahbar uchun nima sababdan kerakligi tushunarli bo‘lsin.
- Ilova bir qo‘lda tez ishlatiladigan bo‘lsin.
- Kerakli ma’lumot yoki action ikki-uch bosishdan uzoqda bo‘lmasin.
- Desktop sidebar, katta table va desktop layout mobilga ko‘chirilmasin.
- Interfeys Telegram kabi toza, tartibli va ko‘proq to‘rtburchak shaklda bo‘lsin.
- Card radiuslari me’yorida bo‘lsin; hamma narsani haddan tashqari yumaloq qilma.
- Status va kichik filter chiplarigina pill ko‘rinishida bo‘lishi mumkin.
- Sahiy logosi, Sahiy brand ranglari va bitta umumiy fontdan foydalan.
- Light va dark holatlari bir xil sifatli ko‘rinsin.
- Kichik ekranlar, uzun matnlar, katta raqamlar va safe area holatlarini hisobga ol.
- Bosiladigan elementlar yetarlicha katta va aniq bo‘lsin.
- Loading, skeleton, empty, error, offline va qayta urinish holatlarini unutma.
- Demo yoki statik ma’lumotga bog‘lanib qolma. Sahifalarni mavjud backend API’lari bilan to‘liq ulab chiq.
- API’dan kelgan ma’lumotlar yangilanganda UI ham to‘g‘ri yangilansin.
- Xato bo‘lsa foydalanuvchiga oddiy va tushunarli o‘zbekcha xabar ko‘rsat.
- Hech qanday tugma faqat ko‘rinish uchun turmasin. Ko‘rinadigan har bir action ishlasin.

## Ilova navigatsiyasi

Pastki navigatsiyada dastlab uchta asosiy bo‘lim bo‘lsin:

1. `Bosh sahifa`
2. `Tasdiqlar`
3. `Murojaatlar`

`Xodimlar` bo‘limi keyingi bosqichda qo‘shiladi. Hozir uni asosiy navigatsiyada ko‘rsatish shart emas.

Headerda:

- Sahiy logosi yoki sahifa nomi;
- notification qo‘ng‘irog‘i;
- rahbar profili;
- kerak bo‘lsa qaytish tugmasi bo‘lsin.

## 1-bosqich: Ilova asosi va kirish

Avval ilovaning umumiy vizual tizimini tayyorla:

- Sahiy brand ko‘rinishi;
- light va dark rejim;
- pastki navigatsiya;
- header;
- loading va error komponentlari;
- tugma, input, status, card va list elementlarining yagona uslubi.

Kirish sahifasi juda sodda bo‘lsin:

- Sahiy logosi;
- email;
- parol;
- parolni ko‘rsatish/yashirish;
- `Kirish` tugmasi;
- loading va noto‘g‘ri login holati.

Muvaffaqiyatli kirgandan keyin foydalanuvchi to‘g‘ridan-to‘g‘ri `Bosh sahifa`ga o‘tsin. Sessiya saqlansin va ilova qayta ochilganda foydalanuvchi bekorga qayta login qilmasin. Faqat rahbarlik huquqi bor foydalanuvchi ilovaga kira olsin.

Bu bosqich tugagach, login, logout, sessiyani tiklash, dark/light va navigatsiyani to‘liq tekshir.

## 2-bosqich: Bosh sahifa

Bosh sahifa rahbar uchun bir qarashda butun CRM holatini ko‘rsatishi kerak.

Yuqorida salomlashish va oxirgi yangilangan vaqt ko‘rinsin. Uning ostida bosiladigan ko‘rsatkichlar joylashsin:

- Tasdiq kutayotgan tasklar;
- Kechikkan tasklar;
- Kritik ticketlar;
- Jarayondagi ticketlar;
- Bugun yopilgan ticketlar;
- Operatorga biriktirilmagan ishlar.

Har bir ko‘rsatkich bosilganda foydalanuvchini aynan o‘sha natijalar filtrlangan ro‘yxatga olib o‘t. Ko‘rsatkich cardini bosish mumkinligi tashqi ko‘rinishidan bilinib tursin.

Ko‘rsatkichlardan keyin uchta ixcham section bo‘lsin:

### Tez tasdiqlash

Tasdiq kutayotgan eng muhim uchta taskni ko‘rsat. Har birida:

- operator;
- mijoz;
- task nomi;
- qancha vaqtdan beri kutayotgani;
- SLA holati ko‘rinsin.

### Shoshilinch ishlar

Deadline o‘tgan yoki yaqinlashgan tasklarni urgency tartibida ko‘rsat:

`Kechikkan → 1 soatdan kam → Kritik → Bugun → Qolganlari`.

### E’tibor talab qiladi

Biriktirilmagan kritik ticketlar yoki uzoq vaqt harakatsiz qolgan murojaatlarni ko‘rsat.

Sahifani pastga tortib yangilash ishlasin. Raqamlar va ro‘yxatlar har doim bir-biriga mos bo‘lsin.

Bu bosqich tugagach, barcha cardlar to‘g‘ri filterga olib o‘tishini va bo‘sh holatlarni tekshir.

## 3-bosqich: Tasdiqlar ro‘yxati

Bu ilovaning eng muhim ishchi sahifasi. Rahbar ko‘p taskni tez va xatosiz ko‘rib chiqishi kerak.

Yuqorida:

- sahifa nomi;
- tasdiq kutayotganlar soni;
- `Eng eski`, `SLA yaqin`, `Kritik` saralash imkoniyati bo‘lsin.

Har bir task qatori yoki cardida:

- mijoz ismi;
- Ticket ID;
- task nomi;
- operator;
- muhimlik;
- SLA va qancha vaqt qolgan yoki kechikkanligi;
- operatorning qisqa yakuniy izohi ko‘rinsin.

Cardni bosganda `Tasdiq detail` ochilsin. Ro‘yxat yangilanganda foydalanuvchining scroll joyi va tanlangan filtri yo‘qolib ketmasin.

Tasdiq kutayotgan task bo‘lmasa, yaxshi empty state ko‘rsat:

`Hozir tasdiq kutayotgan task yo‘q — hammasi nazoratda.`

## 4-bosqich: Tasdiq detail

Rahbar qaror qilish uchun kerak bo‘lgan hamma ma’lumot bitta ekranda tartibli ko‘rinsin.

Yuqori qismda:

- mijoz;
- telefon;
- Ticket ID;
- Order ID;
- kategoriya;
- muhimlik;
- SLA holati bo‘lsin.

Keyin quyidagi bloklar bo‘lsin:

1. Muammoning asl tavsifi.
2. Operatorga berilgan task va izoh.
3. Operator qilgan ish haqida yakuniy sharh.
4. Mijozga yuborilishi taklif qilingan matn.
5. Ticketning muhim history voqealari.
6. Oldin rahbar tomonidan qaytarilgan bo‘lsa, qaytarish sababi.

Ekranning pastida doim ko‘rinadigan sticky action panel bo‘lsin:

- `Operatorga qaytarish`;
- `Tasdiqlash`.

`Operatorga qaytarish` bosilganda pastdan modal ochilsin. Rahbar izohi majburiy bo‘lsin. Tasdiqlagach task operatorga qaytsin va ro‘yxatdan olib tashlansin.

`Tasdiqlash` bosilganda qisqa confirmation ko‘rsat. Tasdiqlangach:

- task yopilsin;
- history’da mijozga SMS qo‘lda yuborilgani qayd qilinsin;
- operatorga notification yaratilgan bo‘lsin;
- muvaffaqiyat xabari chiqsin;
- keyingi tasdiq kutayotgan taskga o‘tish imkoniyati berilsin.

Bir action ikki marta yuborilib ketmasin. So‘rov davomida tugmalar bloklansin.

## 5-bosqich: Murojaatlar ro‘yxati

Desktop table ishlatma. Mobilga mos ixcham va tez o‘qiladigan list yarat.

Yuqoridagi qidiruv inputi foydalanuvchi yozishi bilan avtomatik qidirsin. Alohida `Qidirish` tugmasi bo‘lmasin.

Quyidagilar bo‘yicha qidirish ishlasin:

- telefon;
- Order ID;
- Ticket ID;
- mijoz ismi.

Telefon `+998 95 777 77 88`, `998957777788` yoki `957777788` shaklida yozilsa ham bir xil natija topilsin.

Quick filterlar:

- Barchasi;
- Kritik;
- Kechikkan;
- Jarayonda;
- Kutilmoqda;
- Biriktirilmagan;
- Yopilgan.

Har bir ticket elementida:

- Ticket ID;
- mijoz va telefon;
- muammo kategoriyasi;
- mas’ul operator;
- status;
- muhimlik;
- eng yaqin task;
- SLA yoki ochiq turgan vaqt ko‘rinsin.

Urgency faqat rang bilan berilmasin. Matn yoki belgi bilan ham tushunarli bo‘lsin. Default tartib eng shoshilinch ishlarni tepaga olib chiqsin.

Qidiruv va filterlar birga to‘g‘ri ishlasin. Natija bo‘lmaganda qaysi filter sabab bo‘layotgani tushunarli ko‘rinsin va `Filtrlarni tozalash` actioni bo‘lsin.

## 6-bosqich: Ticket detail

Ticket detail rahbar uchun nazorat va tez o‘zgartirish sahifasi bo‘lsin.

Yuqoridagi customer blokida:

- mijoz ismi;
- formatlangan telefon;
- telefon qilish;
- raqamni spacesiz nusxalash;
- Order ID’ni nusxalash;
- Ticket ID’ni nusxalash bo‘lsin.

Keyin:

- status;
- muhimlik;
- mas’ul operator;
- SLA;
- muammo tavsifi;
- conversation va history;
- shu ticketdagi tasklar ko‘rinsin.

Rahbar shu sahifada:

- statusni o‘zgartira olsin;
- muhimlikni o‘zgartira olsin;
- operatorni almashtira olsin;
- yangi task yarata olsin;
- tasdiq kutayotgan task bo‘lsa uni ochib ko‘ra olsin.

O‘zgarishlar darhol tushunarli feedback bersin. Saqlanmagan yoki muvaffaqiyatsiz action foydalanuvchidan yashirilmasin.

## 7-bosqich: Mobil task yaratish

Task yaratish imkon qadar tez bo‘lsin. Uni alohida og‘ir sahifa emas, ticket detail ustidan ochiladigan qulay full-screen modal yoki bottom sheet ko‘rinishida qil.

Maydonlar:

- Izoh — majburiy;
- Mas’ul operator — ticket operatoridan avtomatik tanlansin;
- SLA — default `1 kun`;
- Task nomi — ixtiyoriy;
- Muhimlik — ixtiyoriy, default oddiy.

SLA uchun tezkor variantlar:

- 2 soat;
- 1 kun;
- 3 kun;
- boshqa muddat.

Formani ochganda klaviatura muhim tugmalarni yopib qo‘ymasligi kerak. Yaratilgandan keyin task ro‘yxatda darhol ko‘rinsin va operatorga notification yaratilgan bo‘lsin.

## 8-bosqich: Bildirishnomalar

Headerdagi notification belgisida o‘qilmagan bildirishnomalar soni ko‘rinsin. Belgini bosganda alohida mobil notification sahifasi yoki full-screen panel ochilsin.

Quyidagi bildirishnomalar ishlasin:

- task tasdiq kutmoqda;
- operator taskni qayta yubordi;
- kritik ticket yaratildi;
- SLAga bir soat qoldi;
- SLA o‘tdi;
- biriktirilmagan kritik ticket paydo bo‘ldi.

Notification bosilganda umumiy bosh sahifaga emas, aynan tegishli task yoki ticketga olib borsin.

O‘qilgan/o‘qilmagan holati, barchasini o‘qilgan qilish va yangi notification kelganda ro‘yxatning yangilanishi ishlasin. FCM notificationlarni backend bilan to‘liq ulab chiq.

## 9-bosqich: Yakuniy UX tekshiruvi

Barcha sahifalar tayyor bo‘lgach, ilovani rahbarning haqiqiy ish jarayoni sifatida boshidan oxirigacha tekshir:

1. Rahbar login qiladi.
2. Dashboardda tasdiq kutayotgan taskni ko‘radi.
3. Task detailini ochadi.
4. Operator yozgan sharh va mijozga ketadigan matnni o‘qiydi.
5. Taskni tasdiqlaydi yoki izoh bilan qaytaradi.
6. Kritik ticket notificationini bosadi.
7. Ticket operatori, statusi yoki muhimligini o‘zgartiradi.
8. Ticketga yangi task qo‘shadi.
9. Telefon yoki Order ID orqali eski mijozni topadi.

Quyidagilarni alohida tekshir:

- juda uzun mijoz va operator nomlari;
- bo‘sh ro‘yxatlar;
- internet uzilishi;
- server xatosi;
- ikki marta tez bosish;
- notification orqali yopiq ilovadan kerakli detailni ochish;
- kichik ekran;
- dark va light ko‘rinish;
- klaviatura ochilgan holat;
- loading paytida layout sakrashi;
- back tugmasi va oldingi filter holatini saqlash.

Oxirida faqat chiroyli screenshot bilan cheklanma. Barcha sahifalar real backend API’lari bilan ishlayotganini, barcha tugmalar amalda bajarilishini va asosiy rahbar workflow’i boshidan oxirigacha uzilmasdan ishlashini tekshir.

## Hozirgi scope’dan tashqarida

Quyidagilarni hozir qo‘shma:

- operatorlar uchun mobil kabinet;
- xodimlar monitoringi;
- murakkab analytics grafiklari;
- real SMS yuborish;
- yangi backend o‘ylab topish;
- desktopga o‘xshash ko‘p menyuli navigatsiya;
- keraksiz sozlamalar va bezak uchun qo‘shilgan sahifalar.

Hozirgi maqsad: **rahbar tasdiqlarni tez boshqarsin, shoshilinch muammolarni yo‘qotmasin va kerakli ticketni bir necha soniyada topa olsin.**
