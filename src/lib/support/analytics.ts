/* eslint-disable @typescript-eslint/no-explicit-any */
import { Ticket } from "@/models/Ticket";
import { User } from "@/models/User";

export async function getCrmAnalytics() {
  const now = new Date(); const startToday = new Date(); startToday.setHours(0, 0, 0, 0);
  const [total, newToday, open, resolved, overdue, critical, responseAgg, resolutionAgg, categories, statuses, operators, longest] = await Promise.all([
    Ticket.countDocuments(), Ticket.countDocuments({ createdAt: { $gte: startToday } }), Ticket.countDocuments({ status: { $nin: ["RESOLVED", "CLOSED"] } }),
    Ticket.countDocuments({ status: { $in: ["RESOLVED", "CLOSED"] } }), Ticket.countDocuments({ status: { $nin: ["RESOLVED", "CLOSED"] }, deadlineAt: { $lt: now } }),
    Ticket.countDocuments({ status: { $nin: ["RESOLVED", "CLOSED"] }, priority: "CRITICAL" }),
    Ticket.aggregate([{ $match: { firstResponseAt: { $exists: true } } }, { $group: { _id: null, avg: { $avg: { $subtract: ["$firstResponseAt", "$createdAt"] } } } }]),
    Ticket.aggregate([{ $match: { resolvedAt: { $exists: true } } }, { $group: { _id: null, avg: { $avg: { $subtract: ["$resolvedAt", "$createdAt"] } } } }]),
    Ticket.aggregate([{ $group: { _id: { $ifNull: ["$category", "OTHER"] }, count: { $sum: 1 } } }, { $sort: { count: -1 } }]),
    Ticket.aggregate([{ $group: { _id: { $cond: [{ $eq: ["$status", "OPEN"] }, "NEW", "$status"] }, count: { $sum: 1 } } }, { $sort: { count: -1 } }]),
    Ticket.aggregate([{ $match: { assignedTo: { $type: "objectId" } } }, { $group: { _id: "$assignedTo", total: { $sum: 1 }, resolved: { $sum: { $cond: [{ $in: ["$status", ["RESOLVED", "CLOSED"]] }, 1, 0] } }, avgResolutionMs: { $avg: { $cond: [{ $ne: ["$resolvedAt", null] }, { $subtract: ["$resolvedAt", "$createdAt"] }, null] } } } }, { $sort: { resolved: -1, total: -1 } }]),
    Ticket.find({ status: { $nin: ["RESOLVED", "CLOSED"] } }).select("ticketNumber callerName problem priority createdAt deadlineAt").sort({ createdAt: 1 }).limit(7).lean(),
  ]);
  const userIds = operators.map((o: any) => o._id); const users = await User.find({ _id: { $in: userIds } }).select("name").lean(); const names = new Map(users.map((u: any) => [u._id.toString(), u.name]));
  return { summary: { total, newToday, open, resolved, overdue, critical, avgFirstResponseMs: responseAgg[0]?.avg || 0, avgResolutionMs: resolutionAgg[0]?.avg || 0 }, categories, statuses, operators: operators.map((o: any) => ({ ...o, name: names.get(o._id.toString()) || "Noma'lum operator" })), longest };
}
