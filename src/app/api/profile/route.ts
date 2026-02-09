import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const profileSchema = z.object({
  name: z.string().min(1, "Name is required").optional(),
  email: z.string().email("Invalid email").optional(),
  phone: z
    .union([z.string(), z.null()])
    .optional()
    .transform((v) => (v === "" || v == null ? null : v))
    .refine(
      (v) => {
        if (v === null) return true;
        const digits = String(v).replace(/\D/g, "");
        return digits.length >= 10 && digits.length <= 15;
      },
      { message: "Enter a valid phone number (e.g. +1 555 123 4567)" }
    ),
});

/** Normalize phone to E.164: digits only, then + prefix. US 10-digit -> +1XXXXXXXXXX */
function toE164(raw: string | null): string | null {
  if (!raw || !raw.trim()) return null;
  const digits = raw.replace(/\D/g, "");
  if (digits.length < 10) return null;
  if (digits.length === 10 && digits[0] !== "1") return `+1${digits}`;
  if (digits.length === 11 && digits[0] === "1") return `+${digits}`;
  if (digits.length <= 15) return `+${digits}`;
  return null;
}

export async function PATCH(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const parsed = profileSchema.safeParse(body);
  if (!parsed.success) {
    const err = parsed.error.flatten();
    return NextResponse.json({ error: err.fieldErrors }, { status: 400 });
  }

  const data = parsed.data;
  const updates: { name?: string; email?: string; phone?: string | null } = {};

  if (data.name !== undefined) updates.name = data.name.trim();
  if (data.phone !== undefined) updates.phone = toE164(data.phone);

  if (data.email !== undefined) {
    const email = data.email.trim().toLowerCase();
    const existing = await prisma.user.findUnique({
      where: { email },
    });
    if (existing && existing.id !== session.user.id) {
      return NextResponse.json(
        { error: { email: ["An account with this email already exists."] } },
        { status: 400 }
      );
    }
    updates.email = email;
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ ok: true });
  }

  await prisma.user.update({
    where: { id: session.user.id },
    data: updates,
  });

  return NextResponse.json({ ok: true });
}
