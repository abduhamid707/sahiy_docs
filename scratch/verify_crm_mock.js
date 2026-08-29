const mongoose = require("mongoose");

const BATCH = "CRM_MOCK_20260828_A";

async function main() {
  await mongoose.connect(process.env.MONGODB_URI, { bufferCommands: false });
  const db = mongoose.connection.db;
  const tickets = db.collection("tickets");
  const messages = db.collection("ticketmessages");
  const [ticketCount, messageCount, categories, statuses, priorities, messageTypes, repeatedCustomers, unassigned, orphanMessages] = await Promise.all([
    tickets.countDocuments({ mockBatch: BATCH }),
    messages.countDocuments({ mockBatch: BATCH }),
    tickets.distinct("category", { mockBatch: BATCH }),
    tickets.distinct("status", { mockBatch: BATCH }),
    tickets.distinct("priority", { mockBatch: BATCH }),
    messages.distinct("type", { mockBatch: BATCH }),
    tickets.aggregate([{ $match: { mockBatch: BATCH } }, { $group: { _id: "$callerPhone", count: { $sum: 1 } } }, { $match: { count: { $gt: 1 } } }, { $count: "count" }]).toArray(),
    tickets.countDocuments({ mockBatch: BATCH, $or: [{ assignedTo: null }, { assignedTo: { $exists: false } }] }),
    messages.aggregate([{ $match: { mockBatch: BATCH } }, { $lookup: { from: "tickets", localField: "ticketId", foreignField: "_id", as: "ticket" } }, { $match: { ticket: { $size: 0 } } }, { $count: "count" }]).toArray(),
  ]);
  const result = {
    ticketCount, messageCount, categories: categories.sort(), statuses: statuses.sort(), priorities: priorities.sort(), messageTypes: messageTypes.sort(),
    repeatedCustomerPhones: repeatedCustomers[0]?.count || 0, unassigned, orphanMessages: orphanMessages[0]?.count || 0,
  };
  const passed = ticketCount === 100 && messageCount >= 400 && categories.length === 7 && statuses.length === 5 && priorities.length === 4 && messageTypes.length === 4 && result.repeatedCustomerPhones > 0 && unassigned > 0 && result.orphanMessages === 0;
  console.log(JSON.stringify({ passed, ...result }, null, 2));
  await mongoose.disconnect();
  if (!passed) process.exit(1);
}

main().catch(async error => { console.error(error.message || error); await mongoose.disconnect().catch(() => {}); process.exit(1); });
