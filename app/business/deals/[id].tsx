import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
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

type DealRow = {
  id: string;
  title: string;
  description: string | null;
  points_cost: number;
  is_active: boolean;
};

export default function BusinessDealsScreen() {
  const { id: businessId } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { session } = useAuthSession();
  const [businessName, setBusinessName] = useState<string>('');
  const [deals, setDeals] = useState<DealRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editPoints, setEditPoints] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!businessId || !session?.user.id || !isSupabaseConfigured) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    const { data: biz, error: bizErr } = await supabase
      .from('businesses')
      .select('name')
      .eq('id', businessId)
      .single();
    if (bizErr || !biz) {
      setError(bizErr?.message ?? 'Business not found');
      setLoading(false);
      return;
    }
    setBusinessName((biz as { name: string }).name);

    const { data: dealData, error: dealErr } = await supabase
      .from('deals')
      .select('id, title, description, points_cost, is_active')
      .eq('business_id', businessId)
      .order('created_at', { ascending: false });

    if (dealErr) {
      setError(dealErr.message);
      setDeals([]);
    } else {
      setDeals(
        (dealData ?? []).map((d: any) => ({
          id: d.id,
          title: d.title,
          description: d.description,
          points_cost: Number(d.points_cost),
          is_active: d.is_active ?? true,
        }))
      );
    }
    setLoading(false);
  }, [businessId, session?.user.id]);

  useEffect(() => {
    void load();
  }, [load]);

  const startEdit = (deal: DealRow) => {
    setEditingId(deal.id);
    setEditTitle(deal.title);
    setEditDescription(deal.description ?? '');
    setEditPoints(String(deal.points_cost));
  };

  const saveEdit = async () => {
    if (!editingId || !Number.isFinite(Number(editPoints)) || Number(editPoints) < 1) return;
    setSaving(true);
    const { error: updateErr } = await supabase
      .from('deals')
      .update({
        title: editTitle.trim() || 'Deal',
        description: editDescription.trim() || null,
        points_cost: Number(editPoints),
      })
      .eq('id', editingId);
    setSaving(false);
    if (updateErr) setError(updateErr.message);
    else {
      setEditingId(null);
      void load();
    }
  };

  const toggleActive = async (deal: DealRow) => {
    const { error: updateErr } = await supabase
      .from('deals')
      .update({ is_active: !deal.is_active })
      .eq('id', deal.id);
    if (updateErr) setError(updateErr.message);
    else void load();
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#2f7f65" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()}>
          <Text style={styles.backText}>← Back</Text>
        </Pressable>
        <Text style={styles.title}>{businessName}</Text>
        <Text style={styles.subtitle}>Deals</Text>
      </View>
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
      <ScrollView contentContainerStyle={styles.content}>
        {deals.map((deal) =>
          editingId === deal.id ? (
            <View key={deal.id} style={styles.editCard}>
              <TextInput
                style={styles.input}
                value={editTitle}
                onChangeText={setEditTitle}
                placeholder="Title"
                placeholderTextColor="#4b6f62"
              />
              <TextInput
                style={[styles.input, styles.inputArea]}
                value={editDescription}
                onChangeText={setEditDescription}
                placeholder="Description"
                placeholderTextColor="#4b6f62"
                multiline
              />
              <TextInput
                style={styles.input}
                value={editPoints}
                onChangeText={setEditPoints}
                placeholder="Points cost"
                placeholderTextColor="#4b6f62"
                keyboardType="number-pad"
              />
              <View style={styles.editActions}>
                <Pressable style={styles.cancelBtn} onPress={() => setEditingId(null)}>
                  <Text style={styles.cancelBtnText}>Cancel</Text>
                </Pressable>
                <Pressable style={styles.saveBtn} onPress={saveEdit} disabled={saving}>
                  <Text style={styles.saveBtnText}>{saving ? '…' : 'Save'}</Text>
                </Pressable>
              </View>
            </View>
          ) : (
            <View key={deal.id} style={styles.card}>
              <Text style={styles.dealTitle}>{deal.title}</Text>
              {deal.description ? <Text style={styles.dealDesc}>{deal.description}</Text> : null}
              <Text style={styles.dealPoints}>{deal.points_cost} pts</Text>
              <View style={styles.cardActions}>
                <Pressable style={styles.toggleBtn} onPress={() => toggleActive(deal)}>
                  <Text style={styles.toggleBtnText}>{deal.is_active ? 'Deactivate' : 'Activate'}</Text>
                </Pressable>
                <Pressable style={styles.editBtn} onPress={() => startEdit(deal)}>
                  <Text style={styles.editBtnText}>Edit</Text>
                </Pressable>
              </View>
            </View>
          )
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#d9ece5' },
  header: { padding: 20, paddingBottom: 12 },
  backText: { fontSize: 17, color: '#2f7f65', fontWeight: '600', marginBottom: 8 },
  title: { fontSize: 24, fontWeight: '700', color: '#1d4c3e' },
  subtitle: { fontSize: 16, color: '#4b6f62', marginTop: 4 },
  errorText: { paddingHorizontal: 20, color: '#992b2b', marginBottom: 8 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  content: { padding: 20, paddingBottom: 40 },
  card: { backgroundColor: '#eef7f2', borderRadius: 14, padding: 16, marginBottom: 10 },
  dealTitle: { fontSize: 18, fontWeight: '700', color: '#1d4c3e' },
  dealDesc: { fontSize: 14, color: '#4b6f62', marginTop: 4 },
  dealPoints: { fontSize: 16, fontWeight: '600', color: '#0f4a38', marginTop: 4 },
  cardActions: { flexDirection: 'row', gap: 12, marginTop: 10 },
  toggleBtn: { paddingVertical: 6, paddingHorizontal: 12 },
  toggleBtnText: { fontSize: 14, color: '#4b6f62', fontWeight: '600' },
  editBtn: { paddingVertical: 6, paddingHorizontal: 12 },
  editBtnText: { fontSize: 14, color: '#2f7f65', fontWeight: '700' },
  editCard: { backgroundColor: '#eef7f2', borderRadius: 14, padding: 16, marginBottom: 10 },
  input: { backgroundColor: '#fff', borderRadius: 10, padding: 12, fontSize: 16, color: '#1d4c3e', marginBottom: 8 },
  inputArea: { minHeight: 60 },
  editActions: { flexDirection: 'row', gap: 12, marginTop: 8 },
  cancelBtn: { paddingVertical: 10, paddingHorizontal: 16 },
  cancelBtnText: { color: '#4b6f62', fontWeight: '600' },
  saveBtn: { backgroundColor: '#2f7f65', paddingVertical: 10, paddingHorizontal: 20, borderRadius: 20 },
  saveBtnText: { color: '#fff', fontWeight: '700' },
});
