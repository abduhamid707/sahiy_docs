/* eslint-disable @typescript-eslint/no-explicit-any */
import { Ticket } from "@/models/Ticket";
import { User } from "@/models/User";
import Call from "@/models/Call";

export async function getCrmAnalytics() {
  const now = new Date(); const startToday = new Date(); startToday.setHours(0, 0, 0, 0);
  
  const [
    total, newToday, open, resolved, overdue, critical, responseAgg, resolutionAgg, categories, statuses, operators, longest,
    totalCalls, answeredCalls, missedCalls, callAverages, operatorCalls
  ] = await Promise.all([
    Ticket.countDocuments(), Ticket.countDocuments({ createdAt: { $gte: startToday } }), Ticket.countDocuments({ status: { $nin: ["RESOLVED", "CLOSED"] } }),
    Ticket.countDocuments({ status: { $in: ["RESOLVED", "CLOSED"] } }), Ticket.countDocuments({ status: { $nin: ["RESOLVED", "CLOSED"] }, deadlineAt: { $lt: now } }),
    Ticket.countDocuments({ status: { $nin: ["RESOLVED", "CLOSED"] }, priority: "CRITICAL" }),
    Ticket.aggregate([{ $match: { firstResponseAt: { $exists: true } } }, { $group: { _id: null, avg: { $avg: { $subtract: ["$firstResponseAt", "$createdAt"] } } } }]),
    Ticket.aggregate([{ $match: { resolvedAt: { $exists: true } } }, { $group: { _id: null, avg: { $avg: { $subtract: ["$resolvedAt", "$createdAt"] } } } }]),
    Ticket.aggregate([{ $group: { _id: { $ifNull: ["$category", "OTHER"] }, count: { $sum: 1 } } }, { $sort: { count: -1 } }]),
    Ticket.aggregate([{ $group: { _id: { $cond: [{ $eq: ["$status", "OPEN"] }, "NEW", "$status"] }, count: { $sum: 1 } } }, { $sort: { count: -1 } }]),
    Ticket.aggregate([{ $match: { assignedTo: { $type: "objectId" } } }, { $group: { _id: "$assignedTo", total: { $sum: 1 }, resolved: { $sum: { $cond: [{ $in: ["$status", ["RESOLVED", "CLOSED"]] }, 1, 0] } }, avgResolutionMs: { $avg: { $cond: [{ $ne: ["$resolvedAt", null] }, { $subtract: ["$resolvedAt", "$createdAt"] }, null] } } } }, { $sort: { resolved: -1, total: -1 } }]),
    Ticket.find({ status: { $nin: ["RESOLVED", "CLOSED"] } }).select("ticketNumber callerName problem priority createdAt deadlineAt").sort({ createdAt: 1 }).limit(7).lean(),
    // Calls
    Call.countDocuments({ startedAt: { $gte: startToday } }),
    Call.countDocuments({ startedAt: { $gte: startToday }, status: "answered" }),
    Call.countDocuments({ startedAt: { $gte: startToday }, status: "missed" }),
    Call.aggregate([
      { $match: { startedAt: { $gte: startToday }, status: "answered" } },
      { $group: { _id: null, avgTalk: { $avg: "$duration" }, avgTotal: { $avg: "$totalDuration" } } }
    ]),
    Call.aggregate([
      { $match: { startedAt: { $gte: startToday }, operator: { $ne: null } } },
      { $group: { _id: "$operator", total: { $sum: 1 }, answered: { $sum: { $cond: [{ $eq: ["$status", "answered"] }, 1, 0] } }, missed: { $sum: { $cond: [{ $eq: ["$status", "missed"] }, 1, 0] } }, avgTalk: { $avg: "$duration" } } },
      { $sort: { answered: -1 } }
    ])
  ]);
  
  const userIds = operators.map((o: any) => o._id); const users = await User.find({ _id: { $in: userIds } }).select("name").lean(); const names = new Map(users.map((u: any) => [u._id.toString(), u.name]));
  
  const avgTalk = callAverages[0]?.avgTalk || 0;
  const avgTotal = callAverages[0]?.avgTotal || 0;
  const avgWait = Math.max(0, avgTotal - avgTalk);
  
  return { 
    summary: { total, newToday, open, resolved, overdue, critical, avgFirstResponseMs: responseAgg[0]?.avg || 0, avgResolutionMs: resolutionAgg[0]?.avg || 0 }, 
    categories, 
    statuses, 
    operators: operators.map((o: any) => ({ ...o, name: names.get(o._id.toString()) || "Noma'lum operator" })), 
    longest,
    calls: {
      todayTotal: totalCalls,
      todayAnswered: answeredCalls,
      todayMissed: missedCalls,
      avgTalkSec: avgTalk,
      avgWaitSec: avgWait,
      operators: operatorCalls,
    }
  };
}
