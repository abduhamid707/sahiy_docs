import { NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import { Employee } from "@/models/Employee";
import { User } from "@/models/User";
import { getAuthUser } from "@/lib/auth-helper";
import {
  canManageEmployees,
  calculateAgeFromBirthDate,
  serializeEmployeeForUser,
} from "@/lib/employees/service";
import { normalizeUzPhone } from "@/lib/crm";
import bcrypt from "bcryptjs";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthUser(req);
    if (!user) {
      return NextResponse.json({ error: "Avtorizatsiyadan o'tilmagan" }, { status: 401 });
    }

    const { id } = await params;
    await dbConnect();

    const employee = await Employee.findById(id).lean();
    if (!employee) {
      return NextResponse.json({ error: "Xodim topilmadi" }, { status: 404 });
    }

    const { searchParams } = new URL(req.url);
    const reveal = searchParams.get("reveal") === "true";

    const serialized = serializeEmployeeForUser(employee, user, reveal);
    return NextResponse.json(serialized);
  } catch (error: any) {
    console.error("Get employee detail error:", error?.message || error);
    return NextResponse.json(
      { error: "Xodim ma'lumotlarini yuklashda xatolik" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const sessionUser = await getAuthUser(req);
    if (!sessionUser) {
      return NextResponse.json({ error: "Avtorizatsiyadan o'tilmagan" }, { status: 401 });
    }

    if (!canManageEmployees(sessionUser)) {
      return NextResponse.json({ error: "Xodimni tahrirlashga ruxsat yo'q" }, { status: 403 });
    }

    const { id } = await params;
    const body = await req.json();

    await dbConnect();
    const employee = await Employee.findById(id);
    if (!employee) {
      return NextResponse.json({ error: "Xodim topilmadi" }, { status: 404 });
    }

    const changes: string[] = [];

    // 1. Basic Fields
    if (body.fullName !== undefined && body.fullName.trim() !== employee.fullName) {
      employee.fullName = body.fullName.trim();
      changes.push("To'liq ism yangilandi");
    }

    if (body.avatarUrl !== undefined) {
      employee.avatarUrl = body.avatarUrl;
    }

    if (body.gender !== undefined) {
      employee.gender = body.gender;
    }

    if (body.birthDate !== undefined) {
      employee.birthDate = body.birthDate ? new Date(body.birthDate) : null;
      employee.age = calculateAgeFromBirthDate(employee.birthDate);
    }

    if (body.address !== undefined) {
      employee.address = body.address?.trim() || null;
    }

    if (body.notes !== undefined) {
      employee.notes = body.notes?.trim() || null;
    }

    // 2. Contact Fields
    if (body.phone !== undefined && body.phone.trim()) {
      employee.phone = normalizeUzPhone(body.phone);
    }

    if (body.secondaryPhone !== undefined) {
      employee.secondaryPhone = body.secondaryPhone ? normalizeUzPhone(body.secondaryPhone) : null;
    }

    if (body.telegramUsername !== undefined) {
      let tg = body.telegramUsername?.trim();
      if (tg && !tg.startsWith("@")) tg = `@${tg}`;
      employee.telegramUsername = tg || null;
    }

    if (body.telegramPhone !== undefined) {
      employee.telegramPhone = body.telegramPhone ? normalizeUzPhone(body.telegramPhone) : null;
    }

    if (body.email !== undefined) {
      employee.email = body.email ? body.email.toLowerCase().trim() : null;
    }

    if (body.emergencyContact !== undefined) {
      employee.emergencyContact = {
        name: body.emergencyContact?.name?.trim() || null,
        relationship: body.emergencyContact?.relationship?.trim() || null,
        phone: body.emergencyContact?.phone ? normalizeUzPhone(body.emergencyContact.phone) : null,
      };
    }

    // 3. Employment Fields
    if (body.department !== undefined && body.department !== employee.department) {
      changes.push(`Bo'lim o'zgartirildi: ${employee.department} -> ${body.department}`);
      employee.department = body.department.trim();
    }

    if (body.position !== undefined && body.position !== employee.position) {
      changes.push(`Lavozim o'zgartirildi: ${employee.position} -> ${body.position}`);
      employee.position = body.position.trim();
    }

    if (body.role !== undefined && body.role !== employee.role) {
      changes.push(`Tizimdagi rol o'zgartirildi: ${employee.role} -> ${body.role}`);
      employee.role = body.role;
    }

    if (body.isLead !== undefined) {
      employee.isLead = Boolean(body.isLead);
    }

    if (body.hiredAt !== undefined) {
      employee.hiredAt = new Date(body.hiredAt);
    }

    if (body.employmentType !== undefined) {
      employee.employmentType = body.employmentType;
    }

    if (body.status !== undefined && body.status !== employee.status) {
      changes.push(`Holat o'zgartirildi: ${employee.status} -> ${body.status}`);
      employee.status = body.status;
      if (body.status === "TERMINATED") {
        employee.termination = {
          terminatedAt: body.termination?.terminatedAt ? new Date(body.termination.terminatedAt) : new Date(),
          reason: body.termination?.reason?.trim() || "Ishdan bo'shatildi",
        };
      } else {
        employee.termination = { terminatedAt: null, reason: null };
      }
    }

    if (body.workSchedule !== undefined) {
      employee.workSchedule = body.workSchedule?.trim() || null;
    }

    // 4. Salary Fields (Only if SuperAdmin or HR)
    if (body.salary !== undefined && (sessionUser.role === "SUPER_ADMIN" || sessionUser.role === "HR")) {
      changes.push("Maosh ma'lumotlari yangilandi");
      employee.salary = {
        amount: body.salary?.amount !== undefined ? Number(body.salary.amount) : employee.salary?.amount || 0,
        currency: body.salary?.currency || employee.salary?.currency || "USD",
        payDay: body.salary?.payDay !== undefined ? Number(body.salary.payDay) : employee.salary?.payDay || 5,
        period: body.salary?.period || employee.salary?.period || "MONTHLY",
        lastPaidAt: body.salary?.lastPaidAt ? new Date(body.salary.lastPaidAt) : employee.salary?.lastPaidAt || null,
        nextPayDate: body.salary?.nextPayDate ? new Date(body.salary.nextPayDate) : employee.salary?.nextPayDate || null,
        notes: body.salary?.notes?.trim() || employee.salary?.notes || null,
      };
    }

    // 5. Passport & Documents Fields
    if (body.passport !== undefined && (sessionUser.role === "SUPER_ADMIN" || sessionUser.role === "HR")) {
      changes.push("Pasport ma'lumotlari yangilandi");
      employee.passport = {
        seriesNumber: body.passport?.seriesNumber?.trim() || employee.passport?.seriesNumber || null,
        pinfl: body.passport?.pinfl?.trim() || employee.passport?.pinfl || null,
        issuedBy: body.passport?.issuedBy?.trim() || employee.passport?.issuedBy || null,
        issuedAt: body.passport?.issuedAt ? new Date(body.passport.issuedAt) : employee.passport?.issuedAt || null,
        expiresAt: body.passport?.expiresAt ? new Date(body.passport.expiresAt) : employee.passport?.expiresAt || null,
        frontFile: body.passport?.frontFile !== undefined ? body.passport.frontFile : employee.passport?.frontFile || null,
        backFile: body.passport?.backFile !== undefined ? body.passport.backFile : employee.passport?.backFile || null,
      };
    }

    if (body.documents !== undefined) {
      employee.documents = body.documents;
      changes.push("Hujjatlar ro'yxati yangilandi");
    }

    // 6. System Access & Password
    if (body.hasSystemAccess !== undefined) {
      employee.hasSystemAccess = Boolean(body.hasSystemAccess);

      if (employee.hasSystemAccess && !employee.userId) {
        // Create User account if requested
        if (body.email && body.password) {
          const hashedPassword = await bcrypt.hash(body.password, 10);
          const newUser = await User.create({
            name: employee.fullName,
            email: body.email.toLowerCase().trim(),
            password: hashedPassword,
            role: employee.role,
            isLead: employee.isLead,
            phone: employee.phone,
            telegramUsername: employee.telegramUsername,
            image: employee.avatarUrl,
          });
          employee.userId = newUser._id;
          changes.push("Tizimga kirish huquqi yaratildi");
        }
      } else if (!employee.hasSystemAccess && employee.userId) {
        changes.push("Tizimga kirish huquqi o'chirildi");
      }
    }

    // If linked User exists, sync basic properties
    if (employee.userId) {
      const updateUserData: any = {};
      if (employee.fullName) updateUserData.name = employee.fullName;
      if (employee.role) updateUserData.role = employee.role;
      if (employee.isLead !== undefined) updateUserData.isLead = employee.isLead;
      if (employee.phone) updateUserData.phone = employee.phone;
      if (employee.telegramUsername) updateUserData.telegramUsername = employee.telegramUsername;
      if (employee.avatarUrl) updateUserData.image = employee.avatarUrl;

      if (body.password) {
        updateUserData.password = await bcrypt.hash(body.password, 10);
        changes.push("Tizim paroli yangilandi");
      }

      await User.findByIdAndUpdate(employee.userId, { $set: updateUserData });
    }

    // Append Audit Entry
    if (changes.length > 0) {
      employee.history.push({
        action: "EMPLOYEE_UPDATED",
        performedBy: sessionUser._id || sessionUser.id,
        performedByName: sessionUser.name || "Administrator",
        details: changes.join(", "),
        timestamp: new Date(),
      });
    }

    await employee.save();

    const serialized = serializeEmployeeForUser(employee.toObject(), sessionUser, true);
    return NextResponse.json(serialized);
  } catch (error: any) {
    console.error("Update employee error:", error?.message || error);
    return NextResponse.json(
      { error: error?.message || "Xodim ma'lumotlarini saqlashda xatolik" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const sessionUser = await getAuthUser(req);
    if (!sessionUser) {
      return NextResponse.json({ error: "Avtorizatsiyadan o'tilmagan" }, { status: 401 });
    }

    if (!canManageEmployees(sessionUser)) {
      return NextResponse.json({ error: "Xodimni o'chirishga ruxsat yo'q" }, { status: 403 });
    }

    const { id } = await params;
    const { searchParams } = new URL(req.url);
    const hardDelete = searchParams.get("hard") === "true";

    await dbConnect();
    const employee = await Employee.findById(id);
    if (!employee) {
      return NextResponse.json({ error: "Xodim topilmadi" }, { status: 404 });
    }

    if (hardDelete) {
      if (sessionUser.role !== "SUPER_ADMIN") {
        return NextResponse.json(
          { error: "Faqat Super Admin xodimni butunlay o'chira oladi" },
          { status: 403 }
        );
      }

      // Hard Delete
      if (employee.userId) {
        await User.findByIdAndDelete(employee.userId);
      }
      await Employee.findByIdAndDelete(id);

      return NextResponse.json({ success: true, message: "Xodim bazadan butunlay o'chirildi" });
    } else {
      // Soft Delete (Deactivation / Termination)
      employee.status = "TERMINATED";
      employee.hasSystemAccess = false;
      employee.termination = {
        terminatedAt: new Date(),
        reason: "Xodim admin tomonidan nofaol qilindi",
      };
      employee.history.push({
        action: "EMPLOYEE_DEACTIVATED",
        performedBy: sessionUser._id || sessionUser.id,
        performedByName: sessionUser.name || "Administrator",
        details: "Xodim deaktivatsiya qilindi",
        timestamp: new Date(),
      });
      await employee.save();

      return NextResponse.json({ success: true, message: "Xodim muvaffaqiyatli deaktivatsiya qilindi" });
    }
  } catch (error: any) {
    console.error("Delete employee error:", error?.message || error);
    return NextResponse.json(
      { error: "Xodimni o'chirishda xatolik yuz berdi" },
      { status: 500 }
    );
  }
}
