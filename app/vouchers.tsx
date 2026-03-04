import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
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

type VoucherRow = {
  id: string;
  status: string;
  deal_title: string;
  business_name: string;
  points_cost: number;
  created_at: string;
  expires_at: string;
  used_at: string | null;
};

type StatusFilter = 'all' | 'active' | 'used' | 'expired';

export default function VouchersScreen() {
  const router = useRouter();
  const { session } = useAuthSession();
  const [vouchers, setVouchers] = useState<VoucherRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');

  const loadVouchers = useCallback(async () => {
    if (!session?.user.id || !isSupabaseConfigured) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    const { data, error: fetchError } = await supabase
      .from('vouchers')
      .select(`
        id,
        status,
        created_at,
        expires_at,
        used_at,
        deals(title, points_cost, businesses(name))
      `)
      .eq('user_id', session.user.id)
      .order('created_at', { ascending: false });

    if (fetchError) {
      setError(fetchError.message);
      setVouchers([]);
    } else {
      const rows: VoucherRow[] = (data ?? []).map((v: any) => {
        const deal = v.deals;
        const business = deal?.businesses;
        return {
          id: v.id,
          status: v.status ?? 'active',
          deal_title: deal?.title ?? 'Deal',
          business_name: business?.name ?? 'Business',
          points_cost: Number(deal?.points_cost ?? 0),
          created_at: v.created_at,
          expires_at: v.expires_at,
          used_at: v.used_at ?? null,
        };
      });
      setVouchers(rows);
    }
    setLoading(false);
  }, [session?.user.id]);

  useEffect(() => {
    void loadVouchers();
  }, [loadVouchers]);

  const filtered = statusFilter === 'all'
    ? vouchers
    : vouchers.filter((v) => v.status === statusFilter);

  const filters: StatusFilter[] = ['all', 'active', 'used', 'expired'];

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backBtnText}>← Back</Text>
        </Pressable>
        <Text style={styles.title}>Redemption history</Text>
      </View>

      <View style={styles.chipRow}>
        {filters.map((f) => (
          <Pressable
            key={f}
            onPress={() => setStatusFilter(f)}
            style={[styles.chip, statusFilter === f && styles.chipActive]}>
            <Text style={[styles.chipText, statusFilter === f && styles.chipTextActive]}>
              {f === 'all' ? 'All' : f[0].toUpperCase() + f.slice(1)}
            </Text>
          </Pressable>
        ))}
      </View>

      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#2f7f65" />
        </View>
      ) : (
        <FlatList
          contentContainerStyle={styles.listContent}
          data={filtered}
          keyExtractor={(item) => item.id}
          ListEmptyComponent={
            <Text style={styles.emptyText}>No vouchers yet.</Text>
          }
          renderItem={({ item }) => (
            <Pressable
              style={styles.card}
              onPress={() =>
                router.push({
                  pathname: '/voucher/[id]',
                  params: {
                    id: item.id,
                    qr_data: item.status === 'active' ? JSON.stringify({ voucher_id: item.id }) : undefined,
                    expires_at: item.expires_at,
                    deal_title: item.deal_title,
                    business_name: item.business_name,
                  },
                })
              }>
              <View style={styles.cardMain}>
                <Text style={styles.dealTitle}>{item.deal_title}</Text>
                <Text style={styles.businessName}>{item.business_name}</Text>
                <Text style={styles.pointsCost}>{item.points_cost} pts</Text>
              </View>
              <View style={[styles.statusBadge, item.status === 'active' && styles.statusActive, item.status === 'used' && styles.statusUsed, item.status === 'expired' && styles.statusExpired]}>
                <Text style={styles.statusText}>{item.status}</Text>
              </View>
            </Pressable>
          )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#d9ece5' },
  header: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 12 },
  backBtn: { marginBottom: 8 },
  backBtnText: { fontSize: 17, color: '#2f7f65', fontWeight: '600' },
  title: { fontSize: 26, fontWeight: '700', color: '#1d4c3e' },
  chipRow: { flexDirection: 'row', paddingHorizontal: 20, paddingBottom: 12, gap: 8 },
  chip: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 999, backgroundColor: '#eef7f2' },
  chipActive: { backgroundColor: '#2f7f65' },
  chipText: { fontSize: 14, fontWeight: '600', color: '#1d4c3e' },
  chipTextActive: { color: '#fff' },
  errorText: { paddingHorizontal: 20, color: '#992b2b', marginBottom: 8 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  listContent: { paddingHorizontal: 20, paddingBottom: 24, gap: 10 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#eef7f2',
    borderRadius: 14,
    padding: 16,
  },
  cardMain: { flex: 1 },
  dealTitle: { fontSize: 17, fontWeight: '700', color: '#1d4c3e' },
  businessName: { fontSize: 14, color: '#4b6f62', marginTop: 2 },
  pointsCost: { fontSize: 14, color: '#366b58', marginTop: 2 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  statusActive: { backgroundColor: '#c7e3d9' },
  statusUsed: { backgroundColor: '#e0e0e0' },
  statusExpired: { backgroundColor: '#f5d0d0' },
  statusText: { fontSize: 12, fontWeight: '700', color: '#1d4c3e', textTransform: 'capitalize' },
  emptyText: { paddingTop: 24, textAlign: 'center', color: '#4b6f62', fontSize: 16 },
});
