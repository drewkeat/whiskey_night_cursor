import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

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
