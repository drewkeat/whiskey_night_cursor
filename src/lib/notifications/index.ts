import { Resend } from "resend";
import twilio from "twilio";
import { prisma } from "@/lib/prisma";

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;
const twilioClient =
  process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN
    ? twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN)
    : null;
const fromEmail = process.env.RESEND_FROM_EMAIL ?? "Whiskey Night <noreply@example.com>";
const fromPhone = process.env.TWILIO_PHONE_NUMBER ?? "";

export type NotificationCategory = "event_invite" | "club" | "account";
export type NotificationChannel = "email" | "sms";

export async function getPreferences(userId: string): Promise<{ email: boolean; sms: boolean }> {
  const prefs = await prisma.userNotificationPreference.findMany({
    where: { userId },
  });
  const byChannel = (channel: NotificationChannel, category: NotificationCategory) =>
    prefs.find((p) => p.channel === channel && p.category === category)?.enabled ?? (channel === "email");
  return {
    email: byChannel("email", "event_invite") || byChannel("email", "club") || byChannel("email", "account"),
    sms: byChannel("sms", "event_invite") || byChannel("sms", "club") || byChannel("sms", "account"),
  };
}

export async function shouldSend(userId: string, channel: NotificationChannel, category: NotificationCategory): Promise<boolean> {
  const pref = await prisma.userNotificationPreference.findUnique({
    where: {
      userId_channel_category: { userId, channel, category },
    },
  });
  if (pref) return pref.enabled;
  return channel === "email";
}

export async function sendEmail(to: string, subject: string, html: string, category: NotificationCategory, userId: string) {
  if (!resend) return { ok: false, error: "Email not configured" };
  const ok = await shouldSend(userId, "email", category);
  if (!ok) return { ok: true, skipped: true };
  try {
    const { data, error } = await resend.emails.send({
      from: fromEmail,
      to: [to],
      subject,
      html,
    });
    if (error) throw new Error(error.message);
    await prisma.notificationLog.create({
      data: { userId, channel: "email", category, subjectOrSnippet: subject, success: true, providerId: data?.id ?? undefined },
    });
    return { ok: true, id: data?.id };
  } catch (e) {
    await prisma.notificationLog.create({
      data: { userId, channel: "email", category, subjectOrSnippet: subject, success: false },
    });
    return { ok: false, error: String(e) };
  }
}

export async function sendSms(to: string, body: string, category: NotificationCategory, userId: string) {
  if (!twilioClient || !fromPhone) return { ok: false, error: "SMS not configured" };
  const ok = await shouldSend(userId, "sms", category);
  if (!ok) return { ok: true, skipped: true };
  try {
    const msg = await twilioClient.messages.create({
      body,
      from: fromPhone,
      to: to.replace(/\D/g, "").replace(/^(\d{10})$/, "+1$1").replace(/^(\d{11})$/, "+$1"),
    });
    await prisma.notificationLog.create({
      data: { userId, channel: "sms", category, subjectOrSnippet: body.slice(0, 100), success: true, providerId: msg.sid },
    });
    return { ok: true, id: msg.sid };
  } catch (e) {
    await prisma.notificationLog.create({
      data: { userId, channel: "sms", category, subjectOrSnippet: body.slice(0, 100), success: false },
    });
    return { ok: false, error: String(e) };
  }
}

export async function notifyEventInvite(params: {
  userId: string;
  email: string;
  phone: string | null;
  eventName: string;
  hostName: string;
  startTime: Date;
  nightId: string;
  baseUrl: string;
}) {
  const { userId, email, phone, eventName, hostName, startTime, nightId, baseUrl } = params;
  const link = `${baseUrl}/nights/${nightId}`;
  const text = `You're invited to ${eventName} by ${hostName} on ${startTime.toLocaleString()}. ${link}`;
  if (email) {
    await sendEmail(
      email,
      `Invitation: ${eventName}`,
      `<p>You're invited to <strong>${eventName}</strong> by ${hostName}.</p><p>When: ${startTime.toLocaleString()}</p><p><a href="${link}">View event and respond</a></p>`,
      "event_invite",
      userId
    );
  }
  if (phone) {
    await sendSms(phone, text.slice(0, 160), "event_invite", userId);
  }
}

export async function notifyClubUpdate(params: {
  userId: string;
  email: string;
  phone: string | null;
  clubName: string;
  message: string;
  link: string;
}) {
  const { userId, email, phone, message, link, clubName } = params;
  if (email) {
    await sendEmail(
      email,
      `Club update: ${clubName}`,
      `<p>${message}</p><p><a href="${link}">View club</a></p>`,
      "club",
      userId
    );
  }
  if (phone) {
    await sendSms(phone, `${clubName}: ${message.slice(0, 100)} ${link}`, "club", userId);
  }
}

export async function notifyAccountWelcome(params: { userId: string; email: string; name: string | null }) {
  await sendEmail(
    params.email,
    "Welcome to Whiskey Night",
    `<p>Hi ${params.name ?? "there"},</p><p>Welcome to Whiskey Night. Start by creating or joining a club and scheduling your first tasting.</p>`,
    "account",
    params.userId
  );
}
