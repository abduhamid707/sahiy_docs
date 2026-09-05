import { redirect } from "next/navigation";
import { auth } from "@/auth";
import dbConnect from "@/lib/mongodb";
import Call from "@/models/Call";
import { User } from "@/models/User";
import { canUseCrm } from "@/lib/support/access";
import CrmCallsList from "@/components/crm/CrmCallsList";

export const revalidate = 0;

export default async function CrmCallsPage({ searchParams }: { searchParams: Promise<{ [key: string]: string | undefined }> }) {
  const params = await searchParams;
  const session = await auth();
  const user = session?.user as any;

  if (!session) redirect("/login");
  if (!canUseCrm(user)) redirect("/");

  await dbConnect();

  const period = params.period || "today";
  let query: any = {};
  
  const now = new Date();
  let startD = new Date();
  let endD = new Date();
  
  if (period === "today") {
    startD.setHours(0, 0, 0, 0);
    endD.setHours(23, 59, 59, 999);
  } else if (period === "yesterday") {
    startD.setDate(startD.getDate() - 1);
    startD.setHours(0, 0, 0, 0);
    endD = new Date(startD);
    endD.setHours(23, 59, 59, 999);
  } else if (period === "3days") {
    startD.setDate(startD.getDate() - 2);
    startD.setHours(0, 0, 0, 0);
    endD.setHours(23, 59, 59, 999);
  } else if (period === "4days") {
    startD.setDate(startD.getDate() - 3);
    startD.setHours(0, 0, 0, 0);
    endD.setHours(23, 59, 59, 999);
  } else if (period === "5days") {
    startD.setDate(startD.getDate() - 4);
    startD.setHours(0, 0, 0, 0);
    endD.setHours(23, 59, 59, 999);
  } else if (period === "custom") {
    if (params.from) startD = new Date(params.from);
    if (params.to) {
      endD = new Date(params.to);
      endD.setHours(23, 59, 59, 999);
    }
  } else {
    // Default fallback
    startD.setHours(0, 0, 0, 0);
    endD.setHours(23, 59, 59, 999);
  }

  query.startedAt = { $gte: startD, $lte: endD };

  const calls = await Call.find(query)
    .populate("ticketId", "ticketNumber status")
    .sort({ startedAt: -1 })
    .limit(1000)
    .lean();

  const agents = await User.find({ role: "SUPPORT" })
    .select("name email image")
    .sort({ name: 1 })
    .lean();

  return (
    <div className="mx-auto max-w-7xl p-4 sm:p-6 lg:p-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Qo'ng'iroqlar Tarixi</h1>
          <p className="text-sm text-slate-500 mt-1">Uztelecom Virtual Office orqali kelib tushgan barcha qo'ng'iroqlar</p>
        </div>
      </div>
      <CrmCallsList 
        initialCalls={JSON.parse(JSON.stringify(calls))} 
        agents={JSON.parse(JSON.stringify(agents))} 
        currentUserId={user.id}
        initialPeriod={period}
        initialFrom={params.from || ""}
        initialTo={params.to || ""}
      />
    </div>
  );
}
