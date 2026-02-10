import "dotenv/config";
import { readFileSync } from "fs";
import { join } from "path";
import { PrismaClient } from "./generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

const TEST_PASSWORD = "password123";

type WhiskeySeedRecord = {
  name: string;
  distillery: string | null;
  type: string | null;
  region: string | null;
  abv: number | null;
  imageUrl: string | null;
  flavorProfile: string | null;
  tags: string[];
  source: string | null;
  externalId: string | null;
};

async function seedWhiskeysFromExport() {
  const jsonPath = join(__dirname, "seed-whiskeys.json");
  const raw = readFileSync(jsonPath, "utf-8");
  const records = JSON.parse(raw) as WhiskeySeedRecord[];

  for (const r of records) {
    const externalId = r.externalId ?? null;
    const existing = externalId ? await prisma.whiskey.findFirst({ where: { externalId } }) : null;
    const data = {
      name: r.name,
      distillery: r.distillery,
      type: r.type,
      region: r.region,
      abv: r.abv,
      imageUrl: r.imageUrl,
      flavorProfile: r.flavorProfile,
      tags: r.tags ?? [],
      source: (r.source as "seed" | "manual" | "web_search") ?? "seed",
      externalId,
    };
    if (existing) {
      await prisma.whiskey.update({ where: { id: existing.id }, data });
    } else {
      await prisma.whiskey.create({ data });
    }
  }
  return records.length;
}

async function main() {
  const hash = await bcrypt.hash(TEST_PASSWORD, 12);

  const alice = await prisma.user.upsert({
    where: { email: "alice@example.com" },
    update: { passwordHash: hash, name: "Alice" },
    create: {
      email: "alice@example.com",
      name: "Alice",
      passwordHash: hash,
    },
  });

  const bob = await prisma.user.upsert({
    where: { email: "bob@example.com" },
    update: { passwordHash: hash, name: "Bob" },
    create: {
      email: "bob@example.com",
      name: "Bob",
      passwordHash: hash,
    },
  });

  const carol = await prisma.user.upsert({
    where: { email: "carol@example.com" },
    update: { passwordHash: hash, name: "Carol" },
    create: {
      email: "carol@example.com",
      name: "Carol",
      passwordHash: hash,
    },
  });

  let club = await prisma.club.findFirst({
    where: { name: "Weekend Whiskey Club", createdById: alice.id },
    include: { members: true },
  });
  if (!club) {
    club = await prisma.club.create({
      data: {
        name: "Weekend Whiskey Club",
        description: "Tastings every other Saturday",
        createdById: alice.id,
      },
      include: { members: true },
    });
    await prisma.clubMember.createMany({
      data: [
        { clubId: club.id, userId: alice.id, role: "admin" },
        { clubId: club.id, userId: bob.id, role: "member" },
        { clubId: club.id, userId: carol.id, role: "member" },
      ],
    });
    club = await prisma.club.findFirstOrThrow({
      where: { id: club.id },
      include: { members: true },
    });
  }

  const whiskeyCount = await seedWhiskeysFromExport();
  console.log(`Seeded ${whiskeyCount} whiskeys from seed-whiskeys.json`);

  const lagavulin = await prisma.whiskey.findFirst({ where: { name: { contains: "Lagavulin", mode: "insensitive" } } });
  const michter = await prisma.whiskey.findFirst({ where: { name: { contains: "Michter", mode: "insensitive" } } });
  const demoWhiskeys = [lagavulin, michter].filter(Boolean) as Awaited<ReturnType<typeof prisma.whiskey.findFirst>>[];
  const firstWhiskey = demoWhiskeys[0] ?? (await prisma.whiskey.findFirst());
  const secondWhiskey = demoWhiskeys[1] ?? demoWhiskeys[0] ?? firstWhiskey;

  let night = await prisma.whiskeyNight.findFirst({
    where: { clubId: club.id, title: "Islay Night" },
  });
  if (!night) {
    const now = new Date();
    const nextSat = new Date(now);
    nextSat.setDate(now.getDate() + ((6 - now.getDay() + 7) % 7) + 7);
    nextSat.setHours(19, 0, 0, 0);
    const endSat = new Date(nextSat);
    endSat.setHours(22, 0, 0, 0);
    night = await prisma.whiskeyNight.create({
      data: {
        clubId: club.id,
        hostId: alice.id,
        whiskeyId: firstWhiskey?.id ?? null,
        title: "Islay Night",
        startTime: nextSat,
        endTime: endSat,
        attendees: {
          create: [
            { userId: alice.id, status: "accepted" },
            { userId: bob.id, status: "accepted" },
            { userId: carol.id, status: "invited" },
          ],
        },
      },
    });
  }

  if (firstWhiskey && secondWhiskey) {
    for (const { userId, whiskeyId } of [
      { userId: alice.id, whiskeyId: firstWhiskey.id },
      { userId: bob.id, whiskeyId: secondWhiskey.id },
    ]) {
      await prisma.userWhiskeyLibrary.upsert({
        where: { userId_whiskeyId: { userId, whiskeyId } },
        update: {},
        create: { userId, whiskeyId },
      });
    }
  }

  console.log("Seed complete.");
  console.log("");
  console.log("Test users (password for all: " + TEST_PASSWORD + ")");
  console.log("  alice@example.com  (Alice)");
  console.log("  bob@example.com    (Bob)");
  console.log("  carol@example.com (Carol)");
  console.log("");
  console.log(`Created or updated: 1 club, ${whiskeyCount} whiskeys, 1 upcoming whiskey night, 2 library entries.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
