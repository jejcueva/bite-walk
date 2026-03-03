import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';

import { useAuthSession } from '@/hooks/use-auth-session';
import { canRedeemDiscount } from '@/lib/points';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';

type Discount = {
  id: string;
  businessName: string;
  offerText: string;
  pointsRequired: number | null;
};

type DiscountRow = {
  id: string;
  business_name: string | null;
  offer_text: string | null;
  points_required: number | null;
};

type WalkPointsRow = {
  points_earned: number | string | null;
};

export default function DiscountsScreen() {
  const { session } = useAuthSession();
  const [discounts, setDiscounts] = useState<Discount[]>([]);
  const [userPoints, setUserPoints] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadDiscounts = useCallback(async () => {
    if (!isSupabaseConfigured) {
      setErrorMessage('Set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY first.');
      setIsLoading(false);
      return;
    }

    setErrorMessage(null);
    setIsLoading(true);

    const [discountResponse, walkResponse] = await Promise.all([
      supabase
        .from('discounts')
        .select('id,business_name,offer_text,points_required')
        .order('points_required', { ascending: true }),
      session?.user.id
        ? supabase.from('walks').select('points_earned').eq('user_id', session.user.id)
        : Promise.resolve({ data: [], error: null }),
    ]);

    if (discountResponse.error) {
      setErrorMessage(discountResponse.error.message);
      setIsLoading(false);
      return;
    }

    if (walkResponse.error) {
      setErrorMessage(walkResponse.error.message);
      setIsLoading(false);
      return;
    }

    const normalizedDiscounts: Discount[] = ((discountResponse.data ?? []) as DiscountRow[]).map(
      (row) => ({
        id: row.id,
        businessName: row.business_name?.trim() || 'Partner business',
        offerText: row.offer_text?.trim() || 'Offer details unavailable',
        pointsRequired:
          typeof row.points_required === 'number' && Number.isFinite(row.points_required)
            ? row.points_required
            : null,
      })
    );

    const pointsTotal = ((walkResponse.data ?? []) as WalkPointsRow[]).reduce((sum, walkRow) => {
      const walkPoints = Number(walkRow.points_earned);
      return Number.isFinite(walkPoints) ? sum + walkPoints : sum;
    }, 0);

    setDiscounts(normalizedDiscounts);
    setUserPoints(pointsTotal);
    setIsLoading(false);
  }, [session?.user.id]);

  useEffect(() => {
    void loadDiscounts();
  }, [loadDiscounts]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Discounts</Text>
        <Text style={styles.subtitle}>Loaded from Supabase</Text>

        <View style={styles.pointsCard}>
          <Text style={styles.pointsValue}>{userPoints}</Text>
          <Text style={styles.pointsLabel}>Your points</Text>
        </View>

        <View style={styles.headerRow}>
          <Text style={styles.sectionTitle}>Available offers</Text>
          <Pressable onPress={() => void loadDiscounts()}>
            <Text style={styles.refreshText}>Refresh</Text>
          </Pressable>
        </View>

        {isLoading ? (
          <ActivityIndicator size="small" color="#2f7f65" />
        ) : errorMessage ? (
          <Text style={styles.errorText}>{errorMessage}</Text>
        ) : discounts.length === 0 ? (
          <Text style={styles.emptyText}>No discounts are available yet.</Text>
        ) : (
          discounts.map((discount) => {
            const pointsRequired = discount.pointsRequired;
            const canRedeem =
              typeof pointsRequired === 'number' ? canRedeemDiscount(userPoints, pointsRequired) : false;

            return (
              <View key={discount.id} style={styles.discountCard}>
                <Text style={styles.businessName}>{discount.businessName}</Text>
                <Text style={styles.offerText}>{discount.offerText}</Text>
                {typeof pointsRequired === 'number' ? (
                  <Text style={[styles.pointsRequiredText, canRedeem ? styles.redeemReadyText : undefined]}>
                    {canRedeem
                      ? `Ready to redeem (${pointsRequired} pts)`
                      : `${pointsRequired} pts required`}
                  </Text>
                ) : null}
              </View>
            );
          })
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#d9ece5',
  },
  content: {
    padding: 20,
    gap: 12,
    paddingBottom: 40,
  },
  title: {
    fontSize: 42,
    fontWeight: '700',
    color: '#1d4c3e',
  },
  subtitle: {
    fontSize: 16,
    color: '#2f7f65',
  },
  pointsCard: {
    backgroundColor: '#eef7f2',
    borderRadius: 16,
    padding: 16,
    marginTop: 6,
  },
  pointsValue: {
    fontSize: 44,
    fontWeight: '800',
    color: '#0f4a38',
  },
  pointsLabel: {
    fontSize: 16,
    color: '#366b58',
  },
  headerRow: {
    marginTop: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1d4c3e',
  },
  refreshText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#2f7f65',
  },
  discountCard: {
    backgroundColor: '#eef7f2',
    borderRadius: 14,
    padding: 14,
    gap: 6,
  },
  businessName: {
    fontSize: 19,
    fontWeight: '700',
    color: '#1d4c3e',
  },
  offerText: {
    fontSize: 16,
    color: '#2d5649',
  },
  pointsRequiredText: {
    fontSize: 14,
    color: '#356a58',
    fontWeight: '600',
  },
  redeemReadyText: {
    color: '#1f7a4f',
  },
  errorText: {
    color: '#992b2b',
    fontSize: 15,
  },
  emptyText: {
    color: '#4b6f62',
    fontSize: 16,
    paddingVertical: 12,
  },
});
