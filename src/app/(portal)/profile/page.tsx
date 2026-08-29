import { auth } from "@/auth";
import dbConnect from "@/lib/mongodb";
import { User } from "@/models/User";
import { redirect } from "next/navigation";
import { UserCog } from "lucide-react";
import TelegramLinkCard from "@/components/profile/TelegramLinkCard";
import { ROLE_LABELS, UserRole } from "@/lib/constants";

export default async function ProfilePage() {
  const session = await auth();
  if (!session) redirect("/login");

  await dbConnect();
  const user = await User.findById((session.user as any).id).select("name email role telegram").lean();
  if (!user) redirect("/login");

  const isTelegramLinked = !!(user as any).telegram?.chatId;

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400 mb-1">
          <UserCog className="h-5 w-5" />
          <span className="text-sm font-bold uppercase tracking-wider">Profil</span>
        </div>
        <h1 className="text-3xl font-bold text-foreground">{(user as any).name}</h1>
        <p className="text-muted-foreground">{(user as any).email} · {ROLE_LABELS[(user as any).role as UserRole]}</p>
      </div>

      <TelegramLinkCard isLinked={isTelegramLinked} />
    </div>
  );
}
