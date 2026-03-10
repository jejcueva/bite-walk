import {
  DEAL_SUBCATEGORIES,
  filterDealsBySubcategory,
  formatDistance,
  searchDeals,
} from '@bitewalk/shared';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { useAuthSession } from '@/hooks/use-auth-session';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';

type DealCategory = 'all' | 'food' | 'drinks' | 'retail' | 'other';

type DealRow = {
  id: string;
  title: string;
  description: string | null;
  points_cost: number;
  business_name: string;
  business_logo_url: string | null;
  category: string | null;
  subcategory?: string | null;
  dist_meters?: number | null;
};

type DealCardProps = {
  deal: DealRow;
  onPress: () => void;
  isFavorite: boolean;
  onToggleFavorite: () => void;
};

function DealCard({ deal, onPress, isFavorite, onToggleFavorite }: DealCardProps) {
  const distStr = formatDistance(deal.dist_meters ?? null);
  return (
    <Pressable style={styles.card} onPress={onPress}>
      <View style={styles.cardHeader}>
        <View style={styles.logoPlaceholder}>
          <Text style={styles.logoInitials}>
            {deal.business_name
              .split(' ')
              .map((p) => p[0])
              .join('')
              .slice(0, 2)
              .toUpperCase()}
          </Text>
        </View>
        <View style={styles.cardText}>
          <Text style={styles.businessName}>{deal.business_name}</Text>
          <Text style={styles.dealTitle}>{deal.title}</Text>
        </View>
        <View style={styles.pointsPill}>
          <Text style={styles.pointsValue}>{deal.points_cost}</Text>
          <Text style={styles.pointsLabel}>pts</Text>
        </View>
        <Pressable
          onPress={(e) => {
            e.stopPropagation();
            onToggleFavorite();
          }}
          hitSlop={8}
          style={styles.favoriteButton}>
          <Text style={[styles.favoriteIcon, isFavorite && styles.favoriteIconFilled]}>
            {isFavorite ? '\u2665' : '\u2661'}
          </Text>
        </Pressable>
      </View>
      {deal.description ? <Text style={styles.dealDescription}>{deal.description}</Text> : null}
      {distStr ? <Text style={styles.distLabel}>{distStr}</Text> : null}
      {deal.category ? <Text style={styles.categoryLabel}>{deal.category}</Text> : null}
    </Pressable>
  );
}

export default function DiscountsScreen() {
  const router = useRouter();
  const { session } = useAuthSession();

  const [category, setCategory] = useState<DealCategory>('all');
  const [subcategory, setSubcategory] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showFavorites, setShowFavorites] = useState(false);
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set());
  const [deals, setDeals] = useState<DealRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const categories: DealCategory[] = ['all', 'food', 'drinks', 'retail', 'other'];
  const subcategoryChips = ['all', ...DEAL_SUBCATEGORIES] as const;

  const filteredDeals = useMemo(() => {
    let result = deals;
    if (category !== 'all') {
      result = result.filter((d) => (d.category ?? '').toLowerCase() === category);
    }
    result = filterDealsBySubcategory(result, subcategory === 'all' ? null : subcategory);
    result = searchDeals(result, searchQuery);
    if (showFavorites) {
      result = result.filter((d) => favoriteIds.has(d.id));
    }
    return result;
  }, [category, subcategory, searchQuery, showFavorites, favoriteIds, deals]);

  const loadDeals = useCallback(async () => {
    if (!session?.user.id) {
      setIsLoading(false);
      setIsRefreshing(false);
      return;
    }

    if (!isSupabaseConfigured) {
      setError('Set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY first.');
      setIsLoading(false);
      setIsRefreshing(false);
      return;
    }

    try {
      if (!isRefreshing) setIsLoading(true);
      setError(null);

      let coords: { lng: number; lat: number } | null = null;
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === 'granted') {
          const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
          coords = { lng: loc.coords.longitude, lat: loc.coords.latitude };
        }
      } catch {
        // ignore
      }

      if (coords) {
        const { data, error: rpcError } = await supabase.rpc('get_nearby_deals', {
          p_lng: coords.lng,
          p_lat: coords.lat,
          p_radius_m: 50000,
        });
        if (!rpcError && data && Array.isArray(data)) {
          const rows: DealRow[] = data.map((row: any) => ({
            id: row.id,
            title: row.title,
            description: row.description,
            points_cost: Number(row.points_cost),
            business_name: row.business_name,
            business_logo_url: row.business_logo_url,
            category: row.category,
            subcategory: row.subcategory ?? null,
            dist_meters: row.dist_meters != null ? Number(row.dist_meters) : null,
          }));
          setDeals(rows);
          return;
        }
      }

      const { data, error: fetchError } = await supabase
        .from('deals_with_businesses')
        .select('id,title,description,points_cost,business_name,business_logo_url,category,subcategory')
        .order('points_cost', { ascending: true });

      if (fetchError) {
        setError(fetchError.message);
      } else {
        const rows: DealRow[] = (data ?? []).map((row: any) => ({
          id: row.id,
          title: row.title,
          description: row.description,
          points_cost: Number(row.points_cost),
          business_name: row.business_name,
          business_logo_url: row.business_logo_url,
          category: row.category,
          subcategory: row.subcategory ?? null,
          dist_meters: null,
        }));
        setDeals(rows);
      }
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [session?.user.id]);

  const loadFavoriteIds = useCallback(async () => {
    if (!session?.user.id || !isSupabaseConfigured) return;
    const { data, error: rpcError } = await supabase.rpc('get_favorite_deal_ids', {
      p_user_id: session.user.id,
    });
    if (!rpcError && data && Array.isArray(data)) {
      setFavoriteIds(new Set((data as string[]).map(String)));
    }
  }, [session?.user.id]);

  useEffect(() => {
    void loadDeals();
  }, [loadDeals]);

  useEffect(() => {
    void loadFavoriteIds();
  }, [loadFavoriteIds]);

  const handleToggleFavorite = useCallback(
    async (dealId: string) => {
      if (!session?.user.id) return;
      const { data: isNowFavorite } = await supabase.rpc('toggle_favorite', {
        p_user_id: session.user.id,
        p_deal_id: dealId,
      });
      setFavoriteIds((prev) => {
        const next = new Set(prev);
        if (isNowFavorite) next.add(dealId);
        else next.delete(dealId);
        return next;
      });
    },
    [session?.user.id],
  );

  const handleRefresh = () => {
    setIsRefreshing(true);
    void loadDeals();
    void loadFavoriteIds();
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>Discounts</Text>
        <View style={styles.headerLinks}>
          <Pressable onPress={() => router.push('/vouchers')}>
            <Text style={styles.historyLink}>History</Text>
          </Pressable>
          <Pressable onPress={() => router.push('/business' as any)} style={styles.businessLinkWrap}>
            <Text style={styles.businessLink}>Business</Text>
          </Pressable>
        </View>
      </View>

      <View style={styles.searchRow}>
        <View style={styles.searchInputWrap}>
          <Ionicons name="search-outline" size={20} color="#4b6f62" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search deals..."
            placeholderTextColor="#4b6f62"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
      </View>

      <View style={styles.filtersRow}>
        {categories.map((cat) => {
          const isActive = cat === category;
          return (
            <Pressable
              key={cat}
              onPress={() => setCategory(cat)}
              style={[styles.chip, isActive ? styles.chipActive : styles.chipInactive]}>
              <Text style={isActive ? styles.chipTextActive : styles.chipTextInactive}>
                {cat === 'all' ? 'All' : cat[0].toUpperCase() + cat.slice(1)}
              </Text>
            </Pressable>
          );
        })}
        <Pressable
          onPress={() => setShowFavorites((v) => !v)}
          style={[styles.chip, showFavorites ? styles.chipActive : styles.chipInactive]}>
          <Text style={showFavorites ? styles.chipTextActive : styles.chipTextInactive}>
            Favorites
          </Text>
        </Pressable>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.subcategoryRow}
        style={styles.subcategoryScroll}>
        {subcategoryChips.map((sub) => {
          const subVal = sub === 'all' ? null : sub;
          const isActive = subcategory === subVal;
          return (
            <Pressable
              key={sub}
              onPress={() => setSubcategory(subVal)}
              style={[styles.chip, isActive ? styles.chipActive : styles.chipInactive]}>
              <Text style={isActive ? styles.chipTextActive : styles.chipTextInactive}>
                {sub === 'all' ? 'All' : sub[0].toUpperCase() + sub.slice(1)}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      {isLoading && !isRefreshing ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2f7f65" />
        </View>
      ) : (
        <FlatList
          contentContainerStyle={styles.listContent}
          data={filteredDeals}
          keyExtractor={(item) => item.id}
          refreshing={isRefreshing}
          onRefresh={handleRefresh}
          ListEmptyComponent={
            <Text style={styles.emptyText}>No deals yet. Check back soon.</Text>
          }
          renderItem={({ item }) => (
            <DealCard
              deal={item}
              onPress={() => {
                router.push({
                  pathname: '/deal/[id]',
                  params: { id: item.id },
                });
              }}
              isFavorite={favoriteIds.has(item.id)}
              onToggleFavorite={() => handleToggleFavorite(item.id)}
            />
          )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#d9ece5',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
  },
  searchRow: {
    paddingHorizontal: 20,
    paddingBottom: 8,
  },
  searchInputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#eef7f2',
    borderRadius: 999,
    paddingHorizontal: 16,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 10,
    fontSize: 16,
    color: '#1d4c3e',
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: '#1d4c3e',
  },
  filtersRow: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingBottom: 8,
    gap: 8,
  },
  chip: {
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  chipActive: {
    backgroundColor: '#2f7f65',
  },
  chipInactive: {
    backgroundColor: '#eef7f2',
  },
  chipTextActive: {
    color: '#ffffff',
    fontWeight: '700',
  },
  chipTextInactive: {
    color: '#1d4c3e',
    fontWeight: '600',
  },
  subcategoryScroll: {
    maxHeight: 44,
    marginBottom: 8,
  },
  subcategoryRow: {
    paddingHorizontal: 20,
    gap: 8,
    flexDirection: 'row',
    paddingBottom: 8,
  },
  favoriteButton: {
    padding: 4,
  },
  favoriteIcon: {
    fontSize: 22,
    color: '#4b6f62',
  },
  favoriteIconFilled: {
    color: '#992b2b',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 24,
    gap: 12,
  },
  card: {
    backgroundColor: '#eef7f2',
    borderRadius: 18,
    padding: 16,
    gap: 8,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  logoPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#c7e3d9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoInitials: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1d4c3e',
  },
  cardText: {
    flex: 1,
  },
  businessName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1d4c3e',
  },
  dealTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1d4c3e',
  },
  dealDescription: {
    fontSize: 14,
    color: '#4b6f62',
  },
  pointsPill: {
    alignItems: 'flex-end',
  },
  pointsValue: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0f4a38',
  },
  pointsLabel: {
    fontSize: 12,
    color: '#366b58',
  },
  distLabel: {
    fontSize: 12,
    color: '#366b58',
    marginTop: 2,
  },
  categoryLabel: {
    alignSelf: 'flex-start',
    marginTop: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: '#c7e3d9',
    fontSize: 12,
    fontWeight: '600',
    color: '#1d4c3e',
    textTransform: 'capitalize',
  },
  emptyText: {
    paddingTop: 24,
    textAlign: 'center',
    color: '#4b6f62',
    fontSize: 16,
  },
  errorText: {
    paddingHorizontal: 20,
    paddingBottom: 8,
    color: '#992b2b',
  },
  headerLinks: { flexDirection: 'row', gap: 16, alignItems: 'center' },
  historyLink: {
    fontSize: 16,
    fontWeight: '700',
    color: '#2f7f65',
  },
  businessLinkWrap: {},
  businessLink: { fontSize: 14, fontWeight: '600', color: '#4b6f62' },
});
