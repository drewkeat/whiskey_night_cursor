import "dotenv/config";
import { readFileSync } from "fs";
import { join } from "path";
import { parse } from "csv-parse/sync";
import { PrismaClient } from "./generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";
import { WHISKEY_ENRICHMENT } from "./seed-enrichment";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

const TEST_PASSWORD = "password123";

function buildWhiskeyName(brand: string, type: string): string {
  const b = brand.trim();
  const t = type.trim();
  if (!b) return "";
  if (!t) return b;
  if (t.toLowerCase().startsWith("flight")) return b;
  return `${b} ${t}`.trim();
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function fetchBottleImageUrl(name: string, apiKey: string): Promise<string | null> {
  try {
    const q = encodeURIComponent(`${name} whiskey bottle`);
    const res = await fetch(`https://api.search.brave.com/res/v1/images/search?q=${q}&count=5`, {
      headers: { "X-Subscription-Token": apiKey },
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { results?: { thumbnail?: { src?: string }; src?: string }[] };
    const results = data.results ?? [];
    const first = results[0];
    const url = first?.src ?? first?.thumbnail?.src;
    return typeof url === "string" && url.startsWith("http") ? url : null;
  } catch {
    return null;
  }
}

async function seedWhiskeysFromCsv() {
  const csvPath = join(__dirname, "..", "Drinks - Whiskey.csv");
  const raw = readFileSync(csvPath, "utf-8");
  const rows = parse(raw, {
    columns: true,
    skip_empty_lines: true,
    relax_column_count: true,
    trim: true,
    bom: true,
  }) as Record<string, string>[];

  const searchApiKey = process.env.SEARCH_API_KEY;
  let imagesFetched = 0;

  let seeded = 0;
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const brand = (row.Brand ?? "").trim();
    if (!brand) continue;

    const typeVal = (row["Type "] ?? row.Type ?? "").trim();
    const region = (row.Region ?? "").trim();
    const tastingNotes = (row["Tasting notes"] ?? "").trim();
    const name = buildWhiskeyName(brand, typeVal);

    const externalId = `seed-csv-${i}`;
    const enrich = WHISKEY_ENRICHMENT[externalId] ?? {};

    let imageUrl = enrich.imageUrl ?? null;
    if (!imageUrl && searchApiKey) {
      const fetched = await fetchBottleImageUrl(name, searchApiKey);
      if (fetched) {
        imageUrl = fetched;
        imagesFetched++;
      }
      await sleep(300);
    }

    const existing = await prisma.whiskey.findFirst({ where: { externalId } });
    const data = {
      name,
      distillery: enrich.distillery ?? (brand || null),
      type: typeVal || null,
      region: enrich.region ?? (region || null),
      abv: enrich.abv ?? null,
      imageUrl,
      flavorProfile: tastingNotes || null,
      source: "seed" as const,
      externalId,
    };
    if (existing) {
      await prisma.whiskey.update({ where: { id: existing.id }, data });
    } else {
      await prisma.whiskey.create({ data });
    }
    seeded++;
  }
  if (imagesFetched > 0) {
    console.log(`Fetched ${imagesFetched} bottle images via Brave Search.`);
  }
  return seeded;
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

  const csvCount = await seedWhiskeysFromCsv();
  console.log(`Seeded ${csvCount} whiskeys from Drinks - Whiskey.csv`);

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
  console.log(`Created or updated: 1 club, ${csvCount} whiskeys (from CSV), 1 upcoming whiskey night, 2 library entries.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
