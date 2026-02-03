export const FLAVOR_AXES = [
  { key: "sweet_dry", label: "Sweet – Dry", min: 1, max: 5 },
  { key: "smoky_smooth", label: "Smoky – Smooth", min: 1, max: 5 },
  { key: "light_full", label: "Light – Full-bodied", min: 1, max: 5 },
  { key: "spicy_mellow", label: "Spicy – Mellow", min: 1, max: 5 },
  { key: "fruity_earthy", label: "Fruity – Earthy", min: 1, max: 5 },
] as const;

export const REVIEW_TRAITS = [
  "vanilla",
  "peat",
  "citrus",
  "honey",
  "oak",
  "smoke",
  "fruit",
  "caramel",
  "spice",
  "floral",
  "nutty",
  "earthy",
] as const;

export type FlavorAxisKey = (typeof FLAVOR_AXES)[number]["key"];
export type TraitKey = (typeof REVIEW_TRAITS)[number];
