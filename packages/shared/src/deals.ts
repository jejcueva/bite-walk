export const DEAL_CATEGORIES = ['food', 'drinks', 'retail', 'other'] as const;
export type DealCategoryType = (typeof DEAL_CATEGORIES)[number];

export const DEAL_SUBCATEGORIES = [
  'breakfast', 'lunch', 'dinner', 'coffee', 'dessert', 'drinks', 'snacks',
] as const;
export type DealSubcategoryType = (typeof DEAL_SUBCATEGORIES)[number];

type DealLike = {
  id: string;
  title: string;
  category: string | null;
  subcategory?: string | null;
  points_cost: number;
  distance_meters?: number | null;
  [key: string]: unknown;
};

export function filterDealsByCategory<T extends DealLike>(
  deals: T[],
  category: string | null,
): T[] {
  if (!category) return deals;
  return deals.filter((d) => d.category === category);
}

export function filterDealsBySubcategory<T extends DealLike>(
  deals: T[],
  subcategory: string | null,
): T[] {
  if (!subcategory) return deals;
  return deals.filter((d) => d.subcategory === subcategory);
}

export function sortDealsByDistance<T extends DealLike>(deals: T[]): T[] {
  return [...deals].sort((a, b) => {
    const aD = a.distance_meters ?? Infinity;
    const bD = b.distance_meters ?? Infinity;
    return aD - bD;
  });
}

export function sortDealsByPoints<T extends DealLike>(
  deals: T[],
  direction: 'asc' | 'desc' = 'asc',
): T[] {
  return [...deals].sort((a, b) =>
    direction === 'asc'
      ? a.points_cost - b.points_cost
      : b.points_cost - a.points_cost,
  );
}

export function formatDistance(meters: number | null | undefined): string | null {
  if (meters == null) return null;
  if (meters < 1000) return `${Math.round(meters)} m`;
  return `${(meters / 1000).toFixed(1)} km`;
}

export function searchDeals<T extends DealLike>(deals: T[], query: string): T[] {
  const trimmed = query.trim().toLowerCase();
  if (!trimmed) return deals;
  return deals.filter((d) => d.title.toLowerCase().includes(trimmed));
}
