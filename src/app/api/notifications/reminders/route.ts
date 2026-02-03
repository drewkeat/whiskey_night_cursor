import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendEmail, sendSms, shouldSend } from "@/lib/notifications";

export const maxDuration = 60;

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const in24h = new Date(Date.now() + 24 * 60 * 60 * 1000);
  const in1h = new Date(Date.now() + 60 * 60 * 1000);
  const now = new Date();

  const upcoming = await prisma.whiskeyNight.findMany({
    where: {
      startTime: { gte: now, lte: in24h },
      attendees: {
        some: { status: "accepted" },
      },
    },
    include: {
      whiskey: true,
      club: true,
      host: { select: { name: true, email: true } },
      attendees: {
        where: { status: "accepted" },
        include: { user: { select: { id: true, email: true, phone: true, name: true } } },
      },
    },
  });

  const baseUrl = process.env.NEXTAUTH_URL ?? "http://localhost:3000";
  let sent = 0;
  for (const night of upcoming) {
    const diff = night.startTime.getTime() - now.getTime();
    const hours = diff / (60 * 60 * 1000);
    const is24h = hours <= 24 && hours > 23;
    const is1h = hours <= 1 && hours > 0.5;
    if (!is24h && !is1h) continue;

    const eventName = night.title ?? `${night.whiskey.name} at ${night.club.name}`;
    const subject = `Reminder: ${eventName} ${is1h ? "starts in ~1 hour" : "tomorrow"}`;
    const body = `${eventName} ${is1h ? "starts in about an hour" : `is tomorrow at ${night.startTime.toLocaleString()}`}. ${baseUrl}/nights/${night.id}`;

    for (const att of night.attendees) {
      if (att.userId === night.hostId) continue;
      const userId = att.user.id;
      const emailOk = await shouldSend(userId, "email", "event_invite");
      if (emailOk && att.user.email) {
        await sendEmail(
          att.user.email,
          subject,
          `<p>${body.replace(/\n/g, "<br/>")}</p>`,
          "event_invite",
          userId
        );
        sent++;
      }
      const smsOk = await shouldSend(userId, "sms", "event_invite");
      if (smsOk && att.user.phone) {
        await sendSms(att.user.phone, body.slice(0, 160), "event_invite", userId);
        sent++;
      }
    }
  }

  return NextResponse.json({ ok: true, remindersSent: sent });
}
