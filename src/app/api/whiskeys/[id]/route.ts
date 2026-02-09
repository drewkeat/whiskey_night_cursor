import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const updateSchema = z.object({
  name: z.string().min(1),
  distillery: z.string().optional(),
  type: z.string().optional(),
  region: z.string().optional(),
  abv: z.number().min(0).max(100).optional(),
  imageUrl: z
    .union([z.string().url(), z.string().startsWith("data:image/")])
    .optional()
    .or(z.literal("")),
  flavorProfile: z.string().optional(),
  tags: z.array(z.string()).optional(),
});

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const whiskey = await prisma.whiskey.findUnique({
    where: { id },
    include: {
      reviews: {
        include: {
          user: { select: { id: true, name: true, image: true } },
          flavorAxes: true,
          traits: true,
        },
        orderBy: { createdAt: "desc" },
      },
      _count: { select: { reviews: true } },
    },
  });
  if (!whiskey) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json(whiskey);
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  const existing = await prisma.whiskey.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const body = await request.json().catch(() => ({}));
  const parsed = updateSchema.safeParse({
    ...body,
    abv: body.abv != null ? Number(body.abv) : undefined,
    imageUrl: body.imageUrl === "" ? undefined : body.imageUrl,
  });
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const whiskey = await prisma.whiskey.update({
    where: { id },
    data: {
      name: parsed.data.name,
      distillery: parsed.data.distillery ?? null,
      type: parsed.data.type ?? null,
      region: parsed.data.region ?? null,
      abv: parsed.data.abv ?? null,
      imageUrl: parsed.data.imageUrl ?? null,
      flavorProfile: parsed.data.flavorProfile ?? null,
      tags: parsed.data.tags ?? existing.tags,
    },
  });
  return NextResponse.json(whiskey);
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  const existing = await prisma.whiskey.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  await prisma.whiskey.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
