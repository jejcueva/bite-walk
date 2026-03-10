import { describe, it, expect } from 'vitest';
import {
  DEAL_CATEGORIES,
  DEAL_SUBCATEGORIES,
  filterDealsByCategory,
  filterDealsBySubcategory,
  sortDealsByDistance,
  sortDealsByPoints,
  formatDistance,
  searchDeals,
} from './deals';

const mockDeals = [
  { id: '1', title: 'Free Coffee', category: 'food', subcategory: 'coffee', points_cost: 250, distance_meters: 500 },
  { id: '2', title: 'Dog Wash 20% Off', category: 'retail', subcategory: null, points_cost: 450, distance_meters: 2000 },
  { id: '3', title: 'Juice Special', category: 'drinks', subcategory: 'drinks', points_cost: 300, distance_meters: 100 },
  { id: '4', title: 'Lunch Combo', category: 'food', subcategory: 'lunch', points_cost: 500, distance_meters: 1500 },
  { id: '5', title: 'Pastry of the Day', category: 'food', subcategory: 'breakfast', points_cost: 150, distance_meters: null },
];

describe('DEAL_CATEGORIES', () => {
  it('includes standard categories', () => {
    expect(DEAL_CATEGORIES).toContain('food');
    expect(DEAL_CATEGORIES).toContain('drinks');
    expect(DEAL_CATEGORIES).toContain('retail');
    expect(DEAL_CATEGORIES).toContain('other');
  });
});

describe('DEAL_SUBCATEGORIES', () => {
  it('includes restaurant-focused subcategories', () => {
    expect(DEAL_SUBCATEGORIES).toContain('breakfast');
    expect(DEAL_SUBCATEGORIES).toContain('lunch');
    expect(DEAL_SUBCATEGORIES).toContain('dinner');
    expect(DEAL_SUBCATEGORIES).toContain('coffee');
    expect(DEAL_SUBCATEGORIES).toContain('dessert');
    expect(DEAL_SUBCATEGORIES).toContain('drinks');
    expect(DEAL_SUBCATEGORIES).toContain('snacks');
  });
});

describe('filterDealsByCategory', () => {
  it('returns all when category is null', () => {
    expect(filterDealsByCategory(mockDeals, null)).toHaveLength(5);
  });

  it('filters by food category', () => {
    const result = filterDealsByCategory(mockDeals, 'food');
    expect(result).toHaveLength(3);
    expect(result.every((d) => d.category === 'food')).toBe(true);
  });

  it('returns empty array for non-matching category', () => {
    expect(filterDealsByCategory(mockDeals, 'other')).toHaveLength(0);
  });
});

describe('filterDealsBySubcategory', () => {
  it('returns all when subcategory is null', () => {
    expect(filterDealsBySubcategory(mockDeals, null)).toHaveLength(5);
  });

  it('filters by coffee subcategory', () => {
    const result = filterDealsBySubcategory(mockDeals, 'coffee');
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('1');
  });
});

describe('sortDealsByDistance', () => {
  it('sorts deals by distance ascending', () => {
    const result = sortDealsByDistance(mockDeals);
    expect(result[0].id).toBe('3');
    expect(result[1].id).toBe('1');
    expect(result[2].id).toBe('4');
  });

  it('puts null distance at the end', () => {
    const result = sortDealsByDistance(mockDeals);
    expect(result[result.length - 1].id).toBe('5');
  });
});

describe('sortDealsByPoints', () => {
  it('sorts by points ascending', () => {
    const result = sortDealsByPoints(mockDeals, 'asc');
    expect(result[0].points_cost).toBe(150);
    expect(result[result.length - 1].points_cost).toBe(500);
  });

  it('sorts by points descending', () => {
    const result = sortDealsByPoints(mockDeals, 'desc');
    expect(result[0].points_cost).toBe(500);
  });
});

describe('formatDistance', () => {
  it('formats meters for short distances', () => {
    expect(formatDistance(500)).toBe('500 m');
  });

  it('formats kilometers for longer distances', () => {
    expect(formatDistance(2500)).toBe('2.5 km');
  });

  it('formats very short distances', () => {
    expect(formatDistance(50)).toBe('50 m');
  });

  it('returns null for null input', () => {
    expect(formatDistance(null)).toBeNull();
  });

  it('returns null for undefined input', () => {
    expect(formatDistance(undefined)).toBeNull();
  });
});

describe('searchDeals', () => {
  it('returns all for empty query', () => {
    expect(searchDeals(mockDeals, '')).toHaveLength(5);
  });

  it('matches by title', () => {
    const result = searchDeals(mockDeals, 'coffee');
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('1');
  });

  it('is case insensitive', () => {
    expect(searchDeals(mockDeals, 'JUICE')).toHaveLength(1);
  });

  it('matches partial strings', () => {
    expect(searchDeals(mockDeals, 'past')).toHaveLength(1);
  });

  it('returns empty for no matches', () => {
    expect(searchDeals(mockDeals, 'pizza')).toHaveLength(0);
  });
});
