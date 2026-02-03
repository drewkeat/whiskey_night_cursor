import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { FLAVOR_AXES, REVIEW_TRAITS } from "@/lib/constants";

const createSchema = z.object({
  whiskeyId: z.string(),
  reviewableType: z.enum(["event", "personal"]),
  reviewableId: z.string(),
  openEndedNotes: z.string().optional(),
  flavorAxes: z.record(z.string(), z.number().min(1).max(5)).optional(),
  traits: z.array(z.string()).optional(),
});

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = await request.json().catch(() => ({}));
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  if (parsed.data.reviewableType === "event") {
    const attendance = await prisma.whiskeyNightAttendee.findFirst({
      where: {
        whiskeyNightId: parsed.data.reviewableId,
        userId: session.user.id,
        status: "accepted",
      },
    });
    if (!attendance) {
      return NextResponse.json({ error: "You must be an accepted attendee to review this event" }, { status: 403 });
    }
    const night = await prisma.whiskeyNight.findUnique({
      where: { id: parsed.data.reviewableId },
    });
    if (!night || night.whiskeyId !== parsed.data.whiskeyId) {
      return NextResponse.json({ error: "Event or whiskey mismatch" }, { status: 400 });
    }
    const now = new Date();
    if (now < night.startTime || now > night.endTime) {
      return NextResponse.json({ error: "Reviews are only allowed during the event time" }, { status: 400 });
    }
  } else {
    const lib = await prisma.userWhiskeyLibrary.findFirst({
      where: {
        id: parsed.data.reviewableId,
        userId: session.user.id,
      },
    });
    if (!lib || lib.whiskeyId !== parsed.data.whiskeyId) {
      return NextResponse.json({ error: "Library entry not found or whiskey mismatch" }, { status: 400 });
    }
  }

  const existing = await prisma.review.findFirst({
    where: {
      userId: session.user.id,
      whiskeyId: parsed.data.whiskeyId,
      reviewableType: parsed.data.reviewableType,
      reviewableId: parsed.data.reviewableId,
    },
  });
  if (existing) {
    return NextResponse.json({ error: "You already submitted a review" }, { status: 400 });
  }

  const review = await prisma.review.create({
    data: {
      userId: session.user.id,
      whiskeyId: parsed.data.whiskeyId,
      reviewableType: parsed.data.reviewableType,
      reviewableId: parsed.data.reviewableId,
      openEndedNotes: parsed.data.openEndedNotes ?? null,
      flavorAxes: parsed.data.flavorAxes
        ? { create: Object.entries(parsed.data.flavorAxes).map(([axisKey, value]) => ({ axisKey, value })) }
        : undefined,
      traits: parsed.data.traits?.length
        ? { create: parsed.data.traits.map((traitKey) => ({ traitKey })) }
        : undefined,
    },
    include: { flavorAxes: true, traits: true },
  });
  return NextResponse.json(review);
}
