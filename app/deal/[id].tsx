import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { useAuthSession } from '@/hooks/use-auth-session';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';

type DealDetail = {
  id: string;
  title: string;
  description: string | null;
  points_cost: number;
  business_name: string;
  business_logo_url: string | null;
  category: string | null;
  address: string | null;
};

export default function DealDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { session } = useAuthSession();

  const [deal, setDeal] = useState<DealDetail | null>(null);
  const [balance, setBalance] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [confirmVisible, setConfirmVisible] = useState(false);
  const [redeeming, setRedeeming] = useState(false);
  const [redeemError, setRedeemError] = useState<string | null>(null);

  const loadDealAndBalance = useCallback(async () => {
    if (!id || !session?.user.id || !isSupabaseConfigured) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const [dealRes, balanceRes] = await Promise.all([
        supabase
          .from('deals_with_businesses')
          .select('id,title,description,points_cost,business_name,business_logo_url,category,address')
          .eq('id', id)
          .single(),
        supabase.rpc('get_points_balance', { p_user_id: session.user.id }),
      ]);

      if (dealRes.error) {
        setError(dealRes.error.message);
        setDeal(null);
      } else if (dealRes.data) {
        setDeal({
          id: dealRes.data.id,
          title: dealRes.data.title,
          description: dealRes.data.description,
          points_cost: Number(dealRes.data.points_cost),
          business_name: dealRes.data.business_name,
          business_logo_url: dealRes.data.business_logo_url,
          category: dealRes.data.category,
          address: dealRes.data.address,
        });
      }

      if (balanceRes.error) {
        setBalance(0);
      } else {
        const raw = balanceRes.data;
        const num = typeof raw === 'number' ? raw : (Array.isArray(raw) ? raw[0] : (raw as { get_points_balance?: number })?.get_points_balance ?? 0);
        setBalance(Number(num) || 0);
      }
    } finally {
      setLoading(false);
    }
  }, [id, session?.user.id]);

  useEffect(() => {
    void loadDealAndBalance();
  }, [loadDealAndBalance]);

  const handleRedeem = async () => {
    if (!deal || !session?.user.id || !isSupabaseConfigured) return;
    setRedeemError(null);
    setRedeeming(true);
    try {
      const { data, error: fnError } = await supabase.functions.invoke('redeem-deal', {
        body: { deal_id: deal.id },
      });

      if (fnError) {
        setRedeemError(fnError.message ?? 'Redeem failed');
        return;
      }
      const err = (data as { error?: string })?.error;
      if (err) {
        setRedeemError(err);
        return;
      }
      const row = data as { voucher_id?: string; qr_data?: string; expires_at?: string };
      setConfirmVisible(false);
      router.replace({
        pathname: '/voucher/[id]',
        params: {
          id: row.voucher_id ?? '',
          qr_data: row.qr_data ?? '',
          expires_at: row.expires_at ?? '',
          deal_title: deal.title,
          business_name: deal.business_name,
        },
      });
    } finally {
      setRedeeming(false);
    }
  };

  if (loading && !deal) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#2f7f65" />
        </View>
      </SafeAreaView>
    );
  }

  if (error || !deal) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.centered}>
          <Text style={styles.errorText}>{error ?? 'Deal not found'}</Text>
          <Pressable style={styles.backBtn} onPress={() => router.back()}>
            <Text style={styles.backBtnText}>Back</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  const canRedeem = balance !== null && balance >= deal.points_cost;

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content}>
        <Pressable style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backBtnText}>← Back</Text>
        </Pressable>

        <View style={styles.card}>
          <Text style={styles.businessName}>{deal.business_name}</Text>
          <Text style={styles.title}>{deal.title}</Text>
          {deal.description ? <Text style={styles.description}>{deal.description}</Text> : null}
          {deal.category ? (
            <View style={styles.categoryBadge}>
              <Text style={styles.categoryText}>{deal.category}</Text>
            </View>
          ) : null}
          {deal.address ? <Text style={styles.address}>{deal.address}</Text> : null}
          <View style={styles.pointsRow}>
            <Text style={styles.pointsCost}>{deal.points_cost} points</Text>
          </View>
        </View>

        <Pressable
          style={[styles.redeemBtn, (!canRedeem || redeeming) && styles.redeemBtnDisabled]}
          onPress={() => setConfirmVisible(true)}
          disabled={!canRedeem || redeeming}>
          <Text style={styles.redeemBtnText}>
            {redeeming ? 'Redeeming…' : canRedeem ? 'Redeem' : `Need ${deal.points_cost - (balance ?? 0)} more pts`}
          </Text>
        </Pressable>
      </ScrollView>

      <Modal visible={confirmVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>Redeem this deal?</Text>
            <Text style={styles.modalDeal}>{deal.title} at {deal.business_name}</Text>
            <Text style={styles.modalCost}>Cost: {deal.points_cost} points</Text>
            <Text style={styles.modalBalance}>Your balance: {balance ?? 0} points</Text>
            {redeemError ? <Text style={styles.modalError}>{redeemError}</Text> : null}
            <View style={styles.modalActions}>
              <Pressable style={styles.modalCancel} onPress={() => { setConfirmVisible(false); setRedeemError(null); }}>
                <Text style={styles.modalCancelText}>Cancel</Text>
              </Pressable>
              <Pressable style={styles.modalConfirm} onPress={handleRedeem} disabled={redeeming}>
                <Text style={styles.modalConfirmText}>{redeeming ? '…' : 'Confirm'}</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#d9ece5' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  content: { padding: 20, paddingBottom: 40 },
  backBtn: { alignSelf: 'flex-start', marginBottom: 16 },
  backBtnText: { fontSize: 17, color: '#2f7f65', fontWeight: '600' },
  card: {
    backgroundColor: '#eef7f2',
    borderRadius: 18,
    padding: 20,
    gap: 8,
  },
  businessName: { fontSize: 16, fontWeight: '700', color: '#1d4c3e' },
  title: { fontSize: 24, fontWeight: '700', color: '#1d4c3e' },
  description: { fontSize: 15, color: '#4b6f62' },
  categoryBadge: { alignSelf: 'flex-start', backgroundColor: '#c7e3d9', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  categoryText: { fontSize: 12, fontWeight: '600', color: '#1d4c3e', textTransform: 'capitalize' },
  address: { fontSize: 14, color: '#4b6f62' },
  pointsRow: { marginTop: 8 },
  pointsCost: { fontSize: 20, fontWeight: '800', color: '#0f4a38' },
  redeemBtn: {
    marginTop: 24,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#2f7f65',
    alignItems: 'center',
    justifyContent: 'center',
  },
  redeemBtnDisabled: { opacity: 0.6 },
  redeemBtnText: { color: '#fff', fontWeight: '700', fontSize: 18 },
  errorText: { color: '#992b2b', marginBottom: 12 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 24 },
  modalBox: { backgroundColor: '#eef7f2', borderRadius: 18, padding: 24, width: '100%', maxWidth: 340 },
  modalTitle: { fontSize: 20, fontWeight: '700', color: '#1d4c3e', marginBottom: 8 },
  modalDeal: { fontSize: 16, color: '#4b6f62', marginBottom: 4 },
  modalCost: { fontSize: 16, fontWeight: '600', color: '#1d4c3e' },
  modalBalance: { fontSize: 15, color: '#366b58', marginBottom: 16 },
  modalError: { color: '#992b2b', fontSize: 14, marginBottom: 12 },
  modalActions: { flexDirection: 'row', gap: 12, justifyContent: 'flex-end' },
  modalCancel: { paddingVertical: 10, paddingHorizontal: 16 },
  modalCancelText: { color: '#4b6f62', fontWeight: '600' },
  modalConfirm: { backgroundColor: '#2f7f65', paddingVertical: 10, paddingHorizontal: 20, borderRadius: 20 },
  modalConfirmText: { color: '#fff', fontWeight: '700' },
});
