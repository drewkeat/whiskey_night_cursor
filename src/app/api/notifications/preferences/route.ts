import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const categories = ["event_invite", "club", "account"] as const;
const channels = ["email", "sms"] as const;

const updateSchema = z.object({
  preferences: z.array(
    z.object({
      channel: z.enum(channels),
      category: z.enum(categories),
      enabled: z.boolean(),
    })
  ),
});

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const prefs = await prisma.userNotificationPreference.findMany({
    where: { userId: session.user.id },
  });
  const defaults = categories.flatMap((category) =>
    channels.map((channel) => ({
      channel,
      category,
      enabled: prefs.find((p) => p.channel === channel && p.category === category)?.enabled ?? (channel === "email"),
    }))
  );
  return NextResponse.json({ preferences: defaults });
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = await request.json().catch(() => ({}));
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  for (const p of parsed.data.preferences) {
    await prisma.userNotificationPreference.upsert({
      where: {
        userId_channel_category: {
          userId: session.user.id,
          channel: p.channel,
          category: p.category,
        },
      },
      create: {
        userId: session.user.id,
        channel: p.channel,
        category: p.category,
        enabled: p.enabled,
      },
      update: { enabled: p.enabled },
    });
  }
  return NextResponse.json({ ok: true });
}
