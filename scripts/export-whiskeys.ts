/**
 * Export whiskey records from the database to seed-whiskeys.json.
 * Run with: npx tsx scripts/export-whiskeys.ts
 * Ensure DATABASE_URL points to the source DB (e.g. dev).
 */
import "dotenv/config";
import { writeFileSync } from "fs";
import { join } from "path";
import { PrismaClient } from "../prisma/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

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

async function main() {
  const whiskeys = await prisma.whiskey.findMany({
    orderBy: { name: "asc" },
  });

  const records: WhiskeySeedRecord[] = whiskeys.map((w) => ({
    name: w.name,
    distillery: w.distillery,
    type: w.type,
    region: w.region,
    abv: w.abv,
    imageUrl: w.imageUrl,
    flavorProfile: w.flavorProfile,
    tags: w.tags,
    source: w.source,
    externalId: w.externalId ?? `seed-export-${w.id}`,
  }));

  const outPath = join(__dirname, "..", "prisma", "seed-whiskeys.json");
  writeFileSync(outPath, JSON.stringify(records, null, 2), "utf-8");
  console.log(`Exported ${records.length} whiskey records to prisma/seed-whiskeys.json`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
