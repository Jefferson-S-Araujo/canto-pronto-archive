export const SALVADOR_NEIGHBORHOODS = [
  "Brotas",
  "Ondina",
  "Cabula",
  "Cajazeiras",
  "Pituba",
] as const;

export type SalvadorNeighborhood = (typeof SALVADOR_NEIGHBORHOODS)[number];
