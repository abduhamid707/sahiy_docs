import { NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import { Employee } from "@/models/Employee";
import { User } from "@/models/User";
import { getAuthUser } from "@/lib/auth-helper";
import {
  canManageEmployees,
  calculateAgeFromBirthDate,
  generateNextEmployeeId,
  serializeEmployeeForUser,
  syncExistingUsersToEmployees,
} from "@/lib/employees/service";
import { normalizeUzPhone } from "@/lib/crm";
import bcrypt from "bcryptjs";

export async function GET(req: Request) {
  try {
    const user = await getAuthUser(req);
    if (!user) {
      return NextResponse.json({ error: "Avtorizatsiyadan o'tilmagan" }, { status: 401 });
    }

    await dbConnect();
    // Auto-sync existing users if needed
    await syncExistingUsersToEmployees();

    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search")?.trim();
    const department = searchParams.get("department");
    const position = searchParams.get("position");
    const status = searchParams.get("status");
    const role = searchParams.get("role");
    const reveal = searchParams.get("reveal") === "true";

    const filter: any = {};

    if (search) {
      const searchRegex = new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
      filter.$or = [
        { fullName: searchRegex },
        { employeeId: searchRegex },
        { phone: searchRegex },
        { email: searchRegex },
        { position: searchRegex },
        { department: searchRegex },
      ];
    }

    if (department && department !== "ALL") {
      filter.department = department;
    }

    if (position && position !== "ALL") {
      filter.position = position;
    }

    if (status && status !== "ALL") {
      filter.status = status;
    }

    if (role && role !== "ALL") {
      filter.role = role;
    }

    // If sessionUser is Lead (not SuperAdmin / HR / Rahbar), restrict to their department
    if (user.role !== "SUPER_ADMIN" && user.role !== "HR" && user.role !== "RAHBAR" && user.isLead) {
      filter.role = user.role;
    }

    const rawEmployees = await Employee.find(filter)
      .sort({ createdAt: -1 })
      .lean();

    const formatted = rawEmployees.map((emp: any) =>
      serializeEmployeeForUser(emp, user, reveal)
    );

    return NextResponse.json({
      employees: formatted,
      total: formatted.length,
    });
  } catch (error: any) {
    console.error("Get employees list error:", error?.message || error);
    return NextResponse.json(
      { error: "Xodimlarni yuklashda xatolik yuz berdi" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const sessionUser = await getAuthUser(req);
    if (!sessionUser) {
      return NextResponse.json({ error: "Avtorizatsiyadan o'tilmagan" }, { status: 401 });
    }

    if (!canManageEmployees(sessionUser)) {
      return NextResponse.json({ error: "Xodim qo'shishga ruxsat yo'q" }, { status: 403 });
    }

    const body = await req.json();
    const {
      fullName,
      employeeId,
      avatarUrl,
      gender,
      birthDate,
      address,
      notes,
      phone,
      secondaryPhone,
      telegramUsername,
      telegramPhone,
      email,
      emergencyContact,
      department,
      position,
      role = "SUPPORT",
      isLead = false,
      hiredAt,
      employmentType = "FULL_TIME",
      status = "ACTIVE",
      workSchedule,
      probationEndDate,
      salary,
      passport,
      documents = [],
      hasSystemAccess = false,
      password,
      forcePasswordChange = false,
    } = body;

    if (!fullName?.trim() || !phone?.trim() || !department?.trim() || !position?.trim()) {
      return NextResponse.json(
        { error: "Ism, telefon, bo'lim va lavozim maydonlari majburiy" },
        { status: 400 }
      );
    }

    await dbConnect();

    // Generate unique employee ID if not provided
    let finalEmployeeId = employeeId?.trim();
    if (!finalEmployeeId) {
      finalEmployeeId = await generateNextEmployeeId();
    } else {
      const existingId = await Employee.findOne({ employeeId: finalEmployeeId });
      if (existingId) {
        return NextResponse.json(
          { error: `Ushbu tabel raqami (${finalEmployeeId}) allaqachon mavjud` },
          { status: 400 }
        );
      }
    }

    const normalizedPhone = normalizeUzPhone(phone);
    const normalizedSecPhone = secondaryPhone ? normalizeUzPhone(secondaryPhone) : null;
    let normalizedTg = telegramUsername?.trim();
    if (normalizedTg && !normalizedTg.startsWith("@")) {
      normalizedTg = `@${normalizedTg}`;
    }

    const calculatedAge = calculateAgeFromBirthDate(birthDate);

    let createdUserId = null;

    // Handle System Access (Login account creation)
    if (hasSystemAccess) {
      if (!email?.trim() || !password?.trim()) {
        return NextResponse.json(
          { error: "Tizimga kirish uchun Email va Parol kiritilishi shart" },
          { status: 400 }
        );
      }

      const existingUser = await User.findOne({ email: email.toLowerCase().trim() });
      if (existingUser) {
        return NextResponse.json(
          { error: "Ushbu email manzili bilan allaqachon foydalanuvchi ro'yxatdan o'tgan" },
          { status: 400 }
        );
      }

      const hashedPassword = await bcrypt.hash(password, 10);
      const newUser = await User.create({
        name: fullName.trim(),
        email: email.toLowerCase().trim(),
        password: hashedPassword,
        role: role || "SUPPORT",
        isLead: Boolean(isLead),
        phone: normalizedPhone,
        telegramUsername: normalizedTg,
        image: avatarUrl || null,
      });

      createdUserId = newUser._id;
    }

    const newEmployee = await Employee.create({
      userId: createdUserId,
      fullName: fullName.trim(),
      employeeId: finalEmployeeId,
      avatarUrl: avatarUrl || null,
      gender: gender || null,
      birthDate: birthDate ? new Date(birthDate) : null,
      age: calculatedAge,
      address: address?.trim() || null,
      notes: notes?.trim() || null,

      phone: normalizedPhone,
      secondaryPhone: normalizedSecPhone,
      telegramUsername: normalizedTg || null,
      telegramPhone: telegramPhone ? normalizeUzPhone(telegramPhone) : null,
      email: email ? email.toLowerCase().trim() : null,
      emergencyContact: {
        name: emergencyContact?.name?.trim() || null,
        relationship: emergencyContact?.relationship?.trim() || null,
        phone: emergencyContact?.phone ? normalizeUzPhone(emergencyContact.phone) : null,
      },

      department: department.trim(),
      position: position.trim(),
      role: role || "SUPPORT",
      isLead: Boolean(isLead),
      hiredAt: hiredAt ? new Date(hiredAt) : new Date(),
      employmentType,
      status,
      workSchedule: workSchedule?.trim() || "09:00 - 18:00 (6/1)",
      probationEndDate: probationEndDate ? new Date(probationEndDate) : null,

      salary: {
        amount: salary?.amount ? Number(salary.amount) : 0,
        currency: salary?.currency || "USD",
        payDay: salary?.payDay ? Number(salary.payDay) : 5,
        period: salary?.period || "MONTHLY",
        lastPaidAt: salary?.lastPaidAt ? new Date(salary.lastPaidAt) : null,
        nextPayDate: salary?.nextPayDate ? new Date(salary.nextPayDate) : null,
        notes: salary?.notes?.trim() || null,
      },

      passport: {
        seriesNumber: passport?.seriesNumber?.trim() || null,
        pinfl: passport?.pinfl?.trim() || null,
        issuedBy: passport?.issuedBy?.trim() || null,
        issuedAt: passport?.issuedAt ? new Date(passport.issuedAt) : null,
        expiresAt: passport?.expiresAt ? new Date(passport.expiresAt) : null,
        frontFile: passport?.frontFile || null,
        backFile: passport?.backFile || null,
      },
      documents: Array.isArray(documents) ? documents : [],

      hasSystemAccess: Boolean(hasSystemAccess),
      forcePasswordChange: Boolean(forcePasswordChange),

      history: [
        {
          action: "EMPLOYEE_CREATED",
          performedBy: sessionUser._id || sessionUser.id,
          performedByName: sessionUser.name || "Administrator",
          details: `Xodim profili yaratildi (${finalEmployeeId})`,
          timestamp: new Date(),
        },
      ],
    });

    const serialized = serializeEmployeeForUser(newEmployee.toObject(), sessionUser, true);

    return NextResponse.json(serialized, { status: 201 });
  } catch (error: any) {
    console.error("Create employee error:", error?.message || error);
    return NextResponse.json(
      { error: error?.message || "Xodimni yaratishda xatolik yuz berdi" },
      { status: 500 }
    );
  }
}
