const mongoose = require("mongoose");

const BATCH = "CRM_MOCK_20260828_A";
const COUNT = 100;
const categories = ["DELIVERY_DELAY", "TRACKING", "NOT_RECEIVED", "WRONG_OR_MISSING", "REFUND_PAYMENT", "CHINA_WAREHOUSE", "OTHER"];
const problems = {
  DELIVERY_DELAY: ["Buyurtmam belgilangan muddatdan kechikyapti.", "Posilka 18 kundan beri yo'lda, yangilik yo'q.", "Yetkazib berish sanasi o'tib ketdi."],
  TRACKING: ["Tracking raqami ishlamayapti.", "Tracking holati bir haftadan beri o'zgarmadi.", "Ilovadagi tracking va tashuvchi ma'lumoti mos emas."],
  NOT_RECEIVED: ["Mahsulot yetib kelmadi, omborda ham ko'rinmayapti.", "Buyurtma delivered deyilgan, lekin qo'limga tegmagan.", "Posilka Xitoy omboridan chiqmagan ko'rinadi."],
  WRONG_OR_MISSING: ["Buyurtmadagi bitta mahsulot yetishmaydi.", "Noto'g'ri rangdagi mahsulot keldi.", "Komplekt to'liq emas va qadoq shikastlangan."],
  REFUND_PAYMENT: ["Refund hali kartamga tushmadi.", "To'lov ikki marta yechilgan.", "Buyurtma bekor bo'ldi, lekin pul qaytmadi."],
  CHINA_WAREHOUSE: ["Xitoy ombori mahsulotni qabul qilmagan.", "Ombordagi vazn noto'g'ri hisoblangan.", "Sotuvchi yuborgan, lekin ombor tasdiqlamagan."],
  OTHER: ["Ilovada buyurtma tafsilotlari ochilmayapti.", "Operator bilan qayta bog'lanish kerak.", "Buyurtma bo'yicha qo'shimcha tekshiruv kerak."],
};
const firstNames = ["Aziz", "Dilnoza", "Bekzod", "Malika", "Javohir", "Shahnoza", "Sardor", "Madina", "Diyor", "Zarina", "Akmal", "Nilufar", "Bobur", "Mohira", "Asadbek", "Nodira", "Temur", "Sabina", "Oybek", "Sevara"];
const lastNames = ["Karimov", "Rahimova", "Tursunov", "Aliyeva", "Qodirov", "Ismoilova", "Abdullayev", "Yusupova", "Rasulov", "Hamidova"];
const statuses = ["NEW", "IN_PROGRESS", "WAITING", "IN_PROGRESS", "RESOLVED", "CLOSED", "IN_PROGRESS", "NEW", "WAITING", "RESOLVED"];

function before(days, hours = 0) { return new Date(Date.now() - days * 86400000 - hours * 3600000); }
function seeded(i, mod) { return (i * 37 + 11) % mod; }

async function main() {
  if (!process.env.MONGODB_URI) throw new Error("MONGODB_URI topilmadi");
  await mongoose.connect(process.env.MONGODB_URI, { bufferCommands: false });
  const db = mongoose.connection.db;
  const tickets = db.collection("tickets");
  const messages = db.collection("ticketmessages");
  const existing = await tickets.countDocuments({ mockBatch: BATCH });
  if (existing) throw new Error(`${BATCH} batch allaqachon mavjud (${existing} ta). Takroriy seed to'xtatildi.`);

  const staff = await db.collection("users").find({ $or: [{ role: { $in: ["SUPPORT", "ADMIN", "SUPER_ADMIN"] } }, { isLead: true }] }).project({ name: 1, email: 1 }).toArray();
  if (!staff.length) throw new Error("Admin/support foydalanuvchi topilmadi");

  const ticketDocs = [];
  const messageDocs = [];
  for (let i = 0; i < COUNT; i++) {
    const customerIndex = i % 68;
    const category = categories[i % categories.length];
    const status = statuses[i % statuses.length];
    const priority = i % 17 === 0 ? "CRITICAL" : i % 5 === 0 ? "HIGH" : i % 4 === 0 ? "LOW" : "NORMAL";
    const createdAt = before(i < 12 ? 0 : seeded(i, 45), seeded(i, 20));
    const customerName = `${firstNames[customerIndex % firstNames.length]} ${lastNames[Math.floor(customerIndex / 7) % lastNames.length]}`;
    const callerPhone = `+998${90 + (customerIndex % 9)}${String(1000000 + customerIndex * 7919).slice(-7)}`;
    const problem = problems[category][i % 3];
    const assignee = i % 11 === 0 ? null : staff[i % staff.length];
    const isClosed = status === "RESOLVED" || status === "CLOSED";
    const slaHours = priority === "CRITICAL" ? 4 : priority === "HIGH" ? 12 : priority === "LOW" ? 48 : 24;
    const deadlineAt = new Date(createdAt.getTime() + slaHours * 3600000 + (i % 3 === 0 ? -12 * 3600000 : 0));
    const firstResponseAt = status === "NEW" ? null : new Date(createdAt.getTime() + (8 + seeded(i, 170)) * 60000);
    const resolvedAt = isClosed ? new Date(Math.min(Date.now(), createdAt.getTime() + (3 + seeded(i, 90)) * 3600000)) : null;
    const lastInteractionAt = resolvedAt || new Date(Math.min(Date.now(), createdAt.getTime() + (1 + seeded(i, 30)) * 3600000));
    const _id = new mongoose.Types.ObjectId();
    const ticket = {
      _id, mockBatch: BATCH, ticketNumber: `DEMO-${String(i + 1).padStart(3, "0")}`,
      callerName: customerName, callerPhone, orderId: i % 7 === 0 ? undefined : `SHY-${20260000 + seeded(i, 9000)}`,
      problem, category, priority, status, channel: i % 4 === 0 ? "PHONE" : "MANUAL",
      assignedTo: assignee?._id, createdBy: staff[0]._id, deadlineAt, firstResponseAt: firstResponseAt || undefined,
      lastInteractionAt, resolvedAt: resolvedAt || undefined, closedAt: status === "CLOSED" ? resolvedAt : undefined,
      resolutionNote: isClosed ? "Mijoz bilan bog'lanildi, ma'lumot tekshirildi va murojaat yakunlandi." : undefined,
      lastReminderLevel: deadlineAt < new Date() && !isClosed ? "OVERDUE" : "NONE", origin: "MANUAL", attachments: [],
      createdAt, updatedAt: lastInteractionAt,
    };
    ticketDocs.push(ticket);
    const base = { ticketId: _id, mockBatch: BATCH, channel: ticket.channel, attachments: [] };
    messageDocs.push({ ...base, _id: new mongoose.Types.ObjectId(), type: "SYSTEM_EVENT", body: "Ticket yaratildi", author: staff[0]._id, authorName: staff[0].name, createdAt, updatedAt: createdAt });
    messageDocs.push({ ...base, _id: new mongoose.Types.ObjectId(), type: "CUSTOMER_MESSAGE", body: problem, authorName: customerName, createdAt: new Date(createdAt.getTime() + 60000), updatedAt: new Date(createdAt.getTime() + 60000) });
    if (firstResponseAt) {
      messageDocs.push({ ...base, _id: new mongoose.Types.ObjectId(), type: "OPERATOR_RESPONSE", body: i % 2 ? "Murojaatingiz qabul qilindi, buyurtmani tekshiryapmiz." : "Ma'lumotlarni tegishli bo'limga yubordik, javob bilan qaytamiz.", author: assignee?._id || staff[0]._id, authorName: assignee?.name || staff[0].name, createdAt: firstResponseAt, updatedAt: firstResponseAt });
      messageDocs.push({ ...base, _id: new mongoose.Types.ObjectId(), type: "SYSTEM_EVENT", body: "Status: Yangi → Jarayonda", author: assignee?._id || staff[0]._id, authorName: assignee?.name || staff[0].name, createdAt: new Date(firstResponseAt.getTime() + 1000), updatedAt: new Date(firstResponseAt.getTime() + 1000) });
    }
    if (i % 3 === 0) {
      const noteAt = new Date(Math.min(Date.now(), createdAt.getTime() + 2 * 3600000));
      messageDocs.push({ ...base, _id: new mongoose.Types.ObjectId(), type: "INTERNAL_NOTE", body: i % 2 ? "Xitoy ombori jamoasiga tekshiruv yuborildi." : "Tracking skrinshoti va order ma'lumotlari tekshirildi.", author: staff[0]._id, authorName: staff[0].name, createdAt: noteAt, updatedAt: noteAt });
    }
    if (i % 4 === 0 && !isClosed) {
      const followAt = new Date(Math.min(Date.now(), createdAt.getTime() + 5 * 3600000));
      messageDocs.push({ ...base, _id: new mongoose.Types.ObjectId(), type: "CUSTOMER_MESSAGE", body: "Hali yangilik bormi? Iltimos, tezroq tekshirib bering.", authorName: customerName, createdAt: followAt, updatedAt: followAt });
    }
    if (isClosed && resolvedAt) messageDocs.push({ ...base, _id: new mongoose.Types.ObjectId(), type: "SYSTEM_EVENT", body: status === "CLOSED" ? "Ticket yopildi" : "Ticket hal qilindi", author: assignee?._id || staff[0]._id, authorName: assignee?.name || staff[0].name, createdAt: resolvedAt, updatedAt: resolvedAt });
  }

  await tickets.insertMany(ticketDocs, { ordered: true });
  await messages.insertMany(messageDocs, { ordered: true });
  const [total, open, critical, overdue] = await Promise.all([
    tickets.countDocuments({ mockBatch: BATCH }),
    tickets.countDocuments({ mockBatch: BATCH, status: { $nin: ["RESOLVED", "CLOSED"] } }),
    tickets.countDocuments({ mockBatch: BATCH, priority: "CRITICAL" }),
    tickets.countDocuments({ mockBatch: BATCH, status: { $nin: ["RESOLVED", "CLOSED"] }, deadlineAt: { $lt: new Date() } }),
  ]);
  console.log(JSON.stringify({ batch: BATCH, tickets: total, messages: messageDocs.length, open, critical, overdue }, null, 2));
  await mongoose.disconnect();
}

main().catch(async error => { console.error(error.message || error); await mongoose.disconnect().catch(() => {}); process.exit(1); });
