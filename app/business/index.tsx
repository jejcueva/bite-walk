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

type BusinessRow = {
  id: string;
  name: string;
  category: string | null;
  deal_count: number;
};

export default function BusinessAdminScreen() {
  const router = useRouter();
  const { session } = useAuthSession();
  const [businesses, setBusinesses] = useState<BusinessRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!session?.user.id || !isSupabaseConfigured) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    const { data: bizData, error: bizError } = await supabase
      .from('businesses')
      .select('id, name, category')
      .eq('owner_id', session.user.id);

    if (bizError) {
      setError(bizError.message);
      setBusinesses([]);
      setLoading(false);
      return;
    }

    const bizList = (bizData ?? []) as { id: string; name: string; category: string | null }[];
    if (bizList.length === 0) {
      setBusinesses([]);
      setLoading(false);
      return;
    }

    const { data: dealCounts } = await supabase
      .from('deals')
      .select('business_id')
      .in('business_id', bizList.map((b) => b.id));

    const countByBiz = new Map<string, number>();
    for (const b of bizList) countByBiz.set(b.id, 0);
    for (const d of dealCounts ?? []) {
      const bid = (d as { business_id: string }).business_id;
      countByBiz.set(bid, (countByBiz.get(bid) ?? 0) + 1);
    }

    setBusinesses(
      bizList.map((b) => ({
        id: b.id,
        name: b.name,
        category: b.category,
        deal_count: countByBiz.get(b.id) ?? 0,
      }))
    );
    setLoading(false);
  }, [session?.user.id]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()}>
          <Text style={styles.backText}>← Back</Text>
        </Pressable>
        <Text style={styles.title}>My businesses</Text>
      </View>
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#2f7f65" />
        </View>
      ) : businesses.length === 0 ? (
        <View style={styles.centered}>
          <Text style={styles.emptyText}>You have no businesses. Add a business_owner role and owner_id to see deals here.</Text>
        </View>
      ) : (
        <FlatList
          contentContainerStyle={styles.list}
          data={businesses}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <Pressable
              style={styles.card}
              onPress={() => router.push({ pathname: '/business/deals/[id]', params: { id: item.id } })}>
              <Text style={styles.bizName}>{item.name}</Text>
              <Text style={styles.meta}>{item.category ?? 'other'} · {item.deal_count} deal(s)</Text>
            </Pressable>
          )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#d9ece5' },
  header: { padding: 20, paddingBottom: 12 },
  backText: { fontSize: 17, color: '#2f7f65', fontWeight: '600', marginBottom: 8 },
  title: { fontSize: 26, fontWeight: '700', color: '#1d4c3e' },
  errorText: { paddingHorizontal: 20, color: '#992b2b', marginBottom: 8 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  list: { padding: 20, paddingBottom: 40 },
  card: { backgroundColor: '#eef7f2', borderRadius: 14, padding: 16, marginBottom: 10 },
  bizName: { fontSize: 18, fontWeight: '700', color: '#1d4c3e' },
  meta: { fontSize: 14, color: '#4b6f62', marginTop: 4 },
  emptyText: { textAlign: 'center', color: '#4b6f62', fontSize: 16 },
});
