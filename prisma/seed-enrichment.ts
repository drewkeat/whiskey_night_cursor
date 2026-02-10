/**
 * Supplemental data for CSV whiskeys: distillery, region, ABV, and image URLs.
 * Keyed by externalId (seed-csv-{index}) to match CSV row order.
 * Only include overrides; missing keys use CSV/default values.
 */
export const WHISKEY_ENRICHMENT: Record<
  string,
  { distillery?: string; region?: string; abv?: number; imageUrl?: string }
> = {
  "seed-csv-0": { distillery: "Teeling", region: "Ireland", abv: 46 },
  "seed-csv-1": { distillery: "Dewar's", region: "Scotland", abv: 40 },
  "seed-csv-2": { distillery: "Nikka", region: "Japan", abv: 45 },
  "seed-csv-3": { distillery: "Defiant", region: "North Carolina", abv: 46 },
  "seed-csv-4": { distillery: "The Family Jones", region: "Denver, CO", abv: 45 },
  "seed-csv-5": { distillery: "Bulleit", region: "Kentucky", abv: 45.6 },
  "seed-csv-6": { distillery: "High West", region: "Salt Lake City, UT", abv: 46 },
  "seed-csv-7": { distillery: "Michter's", region: "Kentucky", abv: 45.7 },
  "seed-csv-8": { distillery: "Koval", region: "Chicago, IL", abv: 46 },
  "seed-csv-9": { distillery: "Belle Meade", region: "Nashville, TN", abv: 46 },
  "seed-csv-10": { distillery: "Hogback", region: "Boulder, CO", abv: 46 },
  "seed-csv-11": { distillery: "Woods", region: "Salida, CO", abv: 46 },
  "seed-csv-12": { distillery: "Penelope", region: "New Jersey", abv: 57 },
  "seed-csv-13": { distillery: "Lagavulin", region: "Islay, Scotland", abv: 46 },
  "seed-csv-14": { distillery: "Short Stack", region: "New York", abv: 46 },
  "seed-csv-15": { distillery: "Breckenridge", region: "Breckenridge, CO", abv: 43 },
  "seed-csv-16": { distillery: "Molly Brown", region: "Colorado", abv: 46 },
  "seed-csv-17": { distillery: "Uncle Nearest", region: "Shelbyville, TN", abv: 46 },
  "seed-csv-18": { distillery: "Rowan's Creek", region: "Kentucky", abv: 50 },
  "seed-csv-19": { distillery: "Spirit Hound", region: "Lyons, CO", abv: 46 },
  "seed-csv-20": { distillery: "Rittenhouse", region: "Kentucky", abv: 50 },
  "seed-csv-21": { distillery: "Tenjaku", region: "Japan", abv: 43 },
  "seed-csv-22": { distillery: "Kamaki", region: "Japan", abv: 46 },
};
