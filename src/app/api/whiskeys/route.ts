import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const createSchema = z.object({
  name: z.string().min(1),
  distillery: z.string().optional(),
  type: z.string().optional(),
  region: z.string().optional(),
  abv: z.number().min(0).max(100).optional(),
  imageUrl: z.string().url().optional().or(z.literal("")),
  source: z.enum(["manual", "web_search"]).optional(),
  externalId: z.string().optional(),
});

export async function GET(request: Request) {
  await getServerSession(authOptions);
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q") ?? "";
  const type = searchParams.get("type") ?? "";
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
  const limit = Math.min(50, Math.max(1, parseInt(searchParams.get("limit") ?? "20", 10)));
  const skip = (page - 1) * limit;

  const where: { name?: { contains: string; mode: "insensitive" }; type?: string } = {};
  if (q) where.name = { contains: q, mode: "insensitive" };
  if (type) where.type = type;

  const [whiskeys, total] = await Promise.all([
    prisma.whiskey.findMany({
      where,
      orderBy: { name: "asc" },
      skip,
      take: limit,
      include: { _count: { select: { reviews: true } } },
    }),
    prisma.whiskey.count({ where }),
  ]);

  return NextResponse.json({ whiskeys, total, page, limit });
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = await request.json().catch(() => ({}));
  const parsed = createSchema.safeParse({
    ...body,
    abv: body.abv != null ? Number(body.abv) : undefined,
    imageUrl: body.imageUrl === "" ? undefined : body.imageUrl,
  });
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const whiskey = await prisma.whiskey.create({
    data: {
      ...parsed.data,
      imageUrl: parsed.data.imageUrl ?? null,
      source: parsed.data.source ?? "manual",
    },
  });
  return NextResponse.json(whiskey);
}
