import { NextResponse } from "next/server";
import { auth } from "@/auth";
import dbConnect from "@/lib/mongodb";
import { User } from "@/models/User";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    const sessionUser = session?.user as any;
    
    if (!session || !sessionUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const { role: newRole, isLead: newIsLead } = await req.json();
    
    const isSuperAdmin = sessionUser.role === "SUPER_ADMIN";
    const isLead = sessionUser.isLead;

    await dbConnect();

    if (!isSuperAdmin) {
      if (!isLead) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
      
      const targetUser = await User.findById(id);
      if (!targetUser || targetUser.role !== sessionUser.role) {
        return NextResponse.json({ error: "Siz faqat o'z bo'limingiz xodimlarini tahrirlay olasiz" }, { status: 401 });
      }
      
      if (newRole !== undefined && newRole !== targetUser.role) {
        return NextResponse.json({ error: "Siz foydalanuvchi rolini o'zgartira olmaysiz" }, { status: 401 });
      }
      
      if (newIsLead !== undefined && newIsLead !== targetUser.isLead) {
        return NextResponse.json({ error: "Faqat Super Admin jamoa yetakchisini tayinlashi mumkin" }, { status: 401 });
      }
    }

    const updateData: any = {};
    if (newRole !== undefined) updateData.role = newRole;
    if (newIsLead !== undefined) updateData.isLead = newIsLead;
    
    const user = await User.findByIdAndUpdate(id, updateData, { new: true });
    return NextResponse.json(user);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    const sessionUser = session?.user as any;

    if (!session || !sessionUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const isSuperAdmin = sessionUser.role === "SUPER_ADMIN";
    const isLead = sessionUser.isLead;

    await dbConnect();
    
    // Prevent deleting self
    if (id === session?.user?.id) {
      return NextResponse.json({ error: "You cannot delete yourself." }, { status: 400 });
    }

    if (!isSuperAdmin) {
      if (!isLead) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
      
      const targetUser = await User.findById(id);
      if (!targetUser || targetUser.role !== sessionUser.role) {
        return NextResponse.json({ error: "Siz faqat o'z bo'limingiz xodimlarini o'chira olasiz" }, { status: 401 });
      }
    }

    await User.findByIdAndDelete(id);
    return NextResponse.json({ message: "User deleted" });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
