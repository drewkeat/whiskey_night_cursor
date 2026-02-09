import "dotenv/config";
import { PrismaClient } from "./generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

const TEST_PASSWORD = "password123";

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

  const whiskeyNames = [
    { name: "Lagavulin 16 Year", distillery: "Lagavulin", type: "scotch", region: "Islay", abv: 43 },
    { name: "Michter's US*1 Small Batch Bourbon", distillery: "Michter's", type: "bourbon", region: "USA", abv: 45.7 },
    { name: "Redbreast 12 Year", distillery: "Redbreast", type: "irish", region: "Ireland", abv: 40 },
  ];
  const whiskeys = [];
  for (const w of whiskeyNames) {
    let found = await prisma.whiskey.findFirst({ where: { name: w.name } });
    if (!found) found = await prisma.whiskey.create({ data: { ...w, source: "manual" } });
    whiskeys.push(found);
  }

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
        whiskeyId: whiskeys[0].id,
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

  for (const { userId, whiskeyId } of [
    { userId: alice.id, whiskeyId: whiskeys[0].id },
    { userId: bob.id, whiskeyId: whiskeys[1].id },
  ]) {
    await prisma.userWhiskeyLibrary.upsert({
      where: { userId_whiskeyId: { userId, whiskeyId } },
      update: {},
      create: { userId, whiskeyId },
    });
  }

  console.log("Seed complete.");
  console.log("");
  console.log("Test users (password for all: " + TEST_PASSWORD + ")");
  console.log("  alice@example.com  (Alice)");
  console.log("  bob@example.com    (Bob)");
  console.log("  carol@example.com (Carol)");
  console.log("");
  console.log("Created or updated: 1 club, 3 whiskeys, 1 upcoming whiskey night, 2 library entries.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
