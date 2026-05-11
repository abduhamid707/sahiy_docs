import { auth } from "@/auth";
import { Log } from "@/models/Log";
import dbConnect from "@/lib/mongodb";

export async function recordLog(action: string, entityType: string, entityId?: string, details?: any) {
  try {
    const session = await auth();
    if (!session?.user) return; // Cannot log without user
    
    const userId = (session.user as any).id;
    
    await dbConnect();
    
    await Log.create({
      userId,
      action,
      entityType,
      entityId,
      details,
    });
  } catch (error) {
    console.error("Failed to create log:", error);
  }
}
