import { NextResponse } from "next/server";
import { auth } from "@/auth";
import dbConnect from "@/lib/mongodb";
import { User } from "@/models/User";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    const role = (session?.user as any)?.role;

    // Only SUPER_ADMIN can manage users
    if (role !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "Unauthorized. Only SUPER_ADMIN can manage users." }, { status: 401 });
    }

    const { id } = await params;
    await dbConnect();
    const { role: newRole } = await req.json();
    
    const user = await User.findByIdAndUpdate(id, { role: newRole }, { new: true });
    return NextResponse.json(user);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    const role = (session?.user as any)?.role;

    if (role !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    await dbConnect();
    
    // Prevent deleting self
    if (id === session?.user?.id) {
      return NextResponse.json({ error: "You cannot delete yourself." }, { status: 400 });
    }

    await User.findByIdAndDelete(id);
    return NextResponse.json({ message: "User deleted" });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
