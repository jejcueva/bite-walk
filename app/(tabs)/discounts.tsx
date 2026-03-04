import * as Location from 'expo-location';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
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
  dist_meters?: number | null;
};

type DealCardProps = {
  deal: DealRow;
  onPress: () => void;
};

function DealCard({ deal, onPress }: DealCardProps) {
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
      </View>
      {deal.description ? <Text style={styles.dealDescription}>{deal.description}</Text> : null}
      {deal.dist_meters != null && deal.dist_meters >= 0 ? (
        <Text style={styles.distLabel}>{deal.dist_meters < 1000 ? `${Math.round(deal.dist_meters)} m` : `${(deal.dist_meters / 1000).toFixed(1)} km`}</Text>
      ) : null}
      {deal.category ? <Text style={styles.categoryLabel}>{deal.category}</Text> : null}
    </Pressable>
  );
}

export default function DiscountsScreen() {
  const router = useRouter();
  const { session } = useAuthSession();

  const [category, setCategory] = useState<DealCategory>('all');
  const [deals, setDeals] = useState<DealRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const categories: DealCategory[] = ['all', 'food', 'drinks', 'retail', 'other'];

  const filteredDeals = useMemo(() => {
    if (category === 'all') return deals;
    return deals.filter((d) => (d.category ?? '').toLowerCase() === category);
  }, [category, deals]);

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
            dist_meters: row.dist_meters != null ? Number(row.dist_meters) : null,
          }));
          setDeals(rows);
          return;
        }
      }

      const { data, error: fetchError } = await supabase
        .from('deals_with_businesses')
        .select('id,title,description,points_cost,business_name,business_logo_url,category')
        .order('points_cost', { ascending: true });

      if (fetchError) {
        setError(fetchError.message);
      } else {
        const rows: DealRow[] = (data ?? []).map((row) => ({
          id: row.id,
          title: row.title,
          description: row.description,
          points_cost: Number(row.points_cost),
          business_name: row.business_name,
          business_logo_url: row.business_logo_url,
          category: row.category,
          dist_meters: null,
        }));
        setDeals(rows);
      }
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [session?.user.id]);

  useEffect(() => {
    void loadDeals();
  }, [loadDeals]);

  const handleRefresh = () => {
    setIsRefreshing(true);
    void loadDeals();
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
      </View>

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
