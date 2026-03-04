import { useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
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

import type { RealtimePostgresChangesPayload } from '@supabase/supabase-js';

import { useAuthSession } from '@/hooks/use-auth-session';
import { useStepTracker } from '@/hooks/use-step-tracker';
import { calculatePointsForWalk, METERS_PER_MILE, metersToMiles } from '@/lib/points';
import { createWalkId, enqueueWalk, syncQueuedWalks } from '@/lib/offline-walk-queue';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';

type WalkEntry = {
  id: string;
  distance_meters: number;
  points_earned: number;
  walked_at: string;
};

type WeeklyWalkingChartProps = {
  walks: WalkEntry[];
};

function startOfLocalDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function toLocalDayKey(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function WeeklyWalkingChart({ walks }: WeeklyWalkingChartProps) {
  const data = useMemo(() => {
    const today = startOfLocalDay(new Date());

    const days = Array.from({ length: 7 }, (_, i) => {
      const day = new Date(today);
      day.setDate(today.getDate() - (6 - i));
      return day;
    });

    const keys = new Set(days.map(toLocalDayKey));
    const totalsByKey = new Map<string, number>();
    keys.forEach((k) => totalsByKey.set(k, 0));

    for (const w of walks) {
      const walkedAt = new Date(w.walked_at);
      const key = toLocalDayKey(startOfLocalDay(walkedAt));
      if (!totalsByKey.has(key)) continue;
      totalsByKey.set(key, (totalsByKey.get(key) ?? 0) + metersToMiles(w.distance_meters));
    }

    const weekdayInitial = (d: Date) => ['S', 'M', 'T', 'W', 'T', 'F', 'S'][d.getDay()] ?? '?';

    return days.map((day) => {
      const key = toLocalDayKey(day);
      const miles = totalsByKey.get(key) ?? 0;
      return { key, label: weekdayInitial(day), miles };
    });
  }, [walks]);

  const maxMiles = useMemo(() => Math.max(0, ...data.map((d) => d.miles)), [data]);
  const chartMaxHeight = 120;

  return (
    <View style={styles.weeklyCard}>
      <View style={styles.weeklyHeader}>
        <Text style={styles.cardTitle}>This week</Text>
        <Text style={styles.weeklyTotalText}>
          {data.reduce((sum, d) => sum + d.miles, 0).toFixed(2)} mi
        </Text>
      </View>

      <View style={styles.weeklyChart}>
        <View style={styles.weeklyChartGridLine} />
        <View style={styles.weeklyBarsRow}>
          {data.map((d) => {
            const height =
              maxMiles <= 0 ? 2 : Math.max(4, Math.round((d.miles / maxMiles) * chartMaxHeight));

            return (
              <View key={d.key} style={styles.weeklyBarItem}>
                <Text style={styles.weeklyBarValue}>{d.miles > 0 ? d.miles.toFixed(1) : ''}</Text>
                <View style={[styles.weeklyBar, { height }]} />
                <Text style={styles.weeklyBarLabel}>{d.label}</Text>
              </View>
            );
          })}
        </View>
      </View>

      <Text style={styles.weeklyHintText}>Last 7 days ending today</Text>
    </View>
  );
}

const normalizeWalkEntry = (entry: any): WalkEntry => ({
  id: entry.id,
  distance_meters: Number(entry.distance_meters),
  points_earned: Number(entry.points_earned),
  walked_at: entry.walked_at,
});

const sortAndLimit = (entries: WalkEntry[]): WalkEntry[] =>
  entries
    .slice()
    .sort((a, b) => {
      const aTime = a.walked_at ? Date.parse(a.walked_at) : 0;
      const bTime = b.walked_at ? Date.parse(b.walked_at) : 0;
      return bTime - aTime;
    })
    .slice(0, 25);

export default function DistanceScreen() {
  const router = useRouter();
  const { session, isLoading } = useAuthSession();
  const { todaySteps, todayDistance, permissionStatus } = useStepTracker();
  const [walks, setWalks] = useState<WalkEntry[]>([]);
  const [distanceInput, setDistanceInput] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isFetching, setIsFetching] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);

  const totalPoints = useMemo(
    () => walks.reduce((sum, walk) => sum + walk.points_earned, 0),
    [walks],
  );

  const totalMiles = useMemo(
    () => walks.reduce((sum, walk) => sum + metersToMiles(walk.distance_meters), 0),
    [walks],
  );

  const parsedDistance = Number.parseFloat(distanceInput);
  const pointsPreview =
    Number.isFinite(parsedDistance) && parsedDistance > 0
      ? calculatePointsForWalk(parsedDistance)
      : 0;

  const loadWalks = useCallback(async () => {
    if (!session?.user.id) {
      setIsFetching(false);
      return;
    }

    if (!isSupabaseConfigured) {
      setErrorMessage('Set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY first.');
      setIsFetching(false);
      return;
    }

    setIsFetching(true);
    setErrorMessage(null);

    const { data, error } = await supabase
      .from('walks')
      .select('id,distance_meters,points_earned,walked_at')
      .eq('user_id', session.user.id)
      .order('walked_at', { ascending: false });

    if (error) {
      setErrorMessage(error.message);
      setIsFetching(false);
      return;
    }

    const normalizedEntries: WalkEntry[] = (data ?? []).map(normalizeWalkEntry);

    setWalks(sortAndLimit(normalizedEntries));
    setIsFetching(false);
  }, [session?.user.id]);

  useEffect(() => {
    void loadWalks();
  }, [loadWalks]);

  useEffect(() => {
    if (!isSupabaseConfigured) return;
    const userId = session?.user.id;
    if (!userId) return;

    const channel = supabase
      .channel(`walks:${userId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'walks', filter: `user_id=eq.${userId}` },
        (payload: RealtimePostgresChangesPayload<any>) => {
          const incoming = normalizeWalkEntry(payload.new);

          setWalks((prev) => {
            const idx = prev.findIndex((w) => w.id === incoming.id);
            const next =
              idx >= 0
                ? prev.map((w) => (w.id === incoming.id ? incoming : w))
                : [incoming, ...prev];

            return sortAndLimit(next);
          });
        },
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'walks', filter: `user_id=eq.${userId}` },
        (payload: RealtimePostgresChangesPayload<any>) => {
          const incoming = normalizeWalkEntry(payload.new);
          setWalks((prev) => sortAndLimit(prev.map((w) => (w.id === incoming.id ? incoming : w))));
        },
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'walks', filter: `user_id=eq.${userId}` },
        (payload: RealtimePostgresChangesPayload<any>) => {
          const deletedId = (payload.old as any)?.id;
          if (!deletedId) return;

          setWalks((prev) => prev.filter((w) => w.id !== deletedId));
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [session?.user.id]);

  const handleSaveDistance = async () => {
    setErrorMessage(null);

    if (!session?.user.id) {
      setErrorMessage('Please log in again.');
      return;
    }

    if (!isSupabaseConfigured) {
      setErrorMessage('Set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY first.');
      return;
    }

    if (!Number.isFinite(parsedDistance) || parsedDistance <= 0) {
      setErrorMessage('Distance must be a number greater than 0.');
      return;
    }

    const miles = Number(parsedDistance.toFixed(2));
    const pointsEarned = calculatePointsForWalk(miles);
    const distanceMeters = Number((miles * METERS_PER_MILE).toFixed(2));

    setIsSaving(true);

    void syncQueuedWalks({ supabase, userId: session.user.id });

    const walkId = createWalkId();
    const { error } = await supabase.from('walks').insert({
      id: walkId,
      user_id: session.user.id,
      distance_meters: distanceMeters,
      points_earned: pointsEarned,
      source: 'manual',
    });

    setIsSaving(false);

    if (error) {
      await enqueueWalk({
        walkId,
        userId: session.user.id,
        distanceMeters,
        pointsEarned,
        source: 'manual',
      });
      setDistanceInput('');
      setErrorMessage("Saved offline. We'll sync this walk when you're back online.");
      return;
    }

    setDistanceInput('');
    await loadWalks();
  };

  const handleSignOut = async () => {
    setErrorMessage(null);
    setIsSigningOut(true);

    const { error } = await supabase.auth.signOut();

    setIsSigningOut(false);

    if (error) {
      setErrorMessage(error.message);
      return;
    }

    router.replace('/login');
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2f7f65" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Distance Walked</Text>

        <View style={styles.summaryCard}>
          <Text style={styles.pointsValue}>{totalPoints}</Text>
          <Text style={styles.summaryLabel}>Reward Points</Text>
          <Text style={styles.summarySubtext}>{totalMiles.toFixed(2)} miles total</Text>
          <Text style={styles.summarySubtext}>1.0 mile = 100 points</Text>
        </View>

        {permissionStatus === 'granted' ? (
          <View style={styles.stepCard}>
            <Text style={styles.cardTitle}>{"Today's Steps"}</Text>
            <Text style={styles.stepCount}>{todaySteps.toLocaleString()}</Text>
            <Text style={styles.stepDistance}>
              {todayDistance.toFixed(2)} miles · {calculatePointsForWalk(todayDistance)} pts
            </Text>
          </View>
        ) : null}

        <WeeklyWalkingChart walks={walks} />

        <View style={styles.entryCard}>
          <Text style={styles.cardTitle}>Log new walk</Text>
          <TextInput
            keyboardType="decimal-pad"
            placeholder="Distance in miles"
            placeholderTextColor="#4b6f62"
            style={styles.input}
            value={distanceInput}
            onChangeText={setDistanceInput}
          />
          <Text style={styles.previewText}>Points to add: {pointsPreview}</Text>

          <Pressable
            disabled={isSaving}
            style={[styles.primaryButton, isSaving ? styles.buttonDisabled : undefined]}
            onPress={handleSaveDistance}>
            <Text style={styles.primaryButtonText}>{isSaving ? 'Saving...' : 'Save walk'}</Text>
          </Pressable>
        </View>

        {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}

        <View style={styles.recentHeader}>
          <Text style={styles.cardTitle}>Recent entries</Text>
          <Pressable onPress={() => void loadWalks()}>
            <Text style={styles.refreshText}>Refresh</Text>
          </Pressable>
        </View>

        {isFetching ? (
          <ActivityIndicator size="small" color="#2f7f65" />
        ) : walks.length === 0 ? (
          <Text style={styles.emptyStateText}>No walks yet. Add your first entry.</Text>
        ) : (
          walks.map((walk) => {
            const entryMiles = metersToMiles(walk.distance_meters);

            return (
              <View key={walk.id} style={styles.walkRow}>
                <View>
                  <Text style={styles.walkMiles}>{entryMiles.toFixed(2)} miles</Text>
                  <Text style={styles.walkDate}>
                    {new Date(walk.walked_at).toLocaleDateString(undefined, {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </Text>
                </View>
                <Text style={styles.walkPoints}>+{walk.points_earned} pts</Text>
              </View>
            );
          })
        )}

        <Pressable
          disabled={isSigningOut}
          style={[styles.secondaryButton, isSigningOut ? styles.buttonDisabled : undefined]}
          onPress={handleSignOut}>
          <Text style={styles.secondaryButtonText}>{isSigningOut ? 'Signing out...' : 'Log out'}</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#d9ece5',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    padding: 20,
    gap: 14,
    paddingBottom: 40,
  },
  title: {
    fontSize: 44,
    fontWeight: '700',
    color: '#1d4c3e',
  },
  summaryCard: {
    backgroundColor: '#c7e3d9',
    borderRadius: 18,
    padding: 18,
    gap: 4,
  },
  pointsValue: {
    fontSize: 52,
    fontWeight: '800',
    color: '#0f4a38',
  },
  summaryLabel: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1d4c3e',
  },
  summarySubtext: {
    fontSize: 15,
    color: '#366b58',
  },
  stepCard: {
    backgroundColor: '#c7e3d9',
    borderRadius: 18,
    padding: 18,
    gap: 4,
    alignItems: 'center',
  },
  stepCount: {
    fontSize: 42,
    fontWeight: '800',
    color: '#0f4a38',
  },
  stepDistance: {
    fontSize: 16,
    color: '#366b58',
  },
  entryCard: {
    backgroundColor: '#eef7f2',
    borderRadius: 18,
    padding: 18,
    gap: 10,
  },
  cardTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1d4c3e',
  },
  input: {
    height: 50,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#95bdad',
    backgroundColor: '#ffffff',
    paddingHorizontal: 14,
    fontSize: 18,
    color: '#183e32',
  },
  previewText: {
    color: '#366b58',
    fontSize: 16,
  },
  primaryButton: {
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2f7f65',
  },
  primaryButtonText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 19,
  },
  secondaryButton: {
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1f4d3f',
    marginTop: 8,
  },
  secondaryButtonText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 17,
  },
  buttonDisabled: {
    opacity: 0.75,
  },
  errorText: {
    color: '#992b2b',
    fontSize: 15,
  },
  recentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  refreshText: {
    fontSize: 15,
    color: '#2f7f65',
    fontWeight: '700',
  },
  emptyStateText: {
    color: '#4b6f62',
    fontSize: 16,
    paddingVertical: 10,
  },
  walkRow: {
    backgroundColor: '#eef7f2',
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  walkMiles: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1d4c3e',
  },
  walkDate: {
    fontSize: 13,
    color: '#4b6f62',
  },
  walkPoints: {
    fontSize: 18,
    color: '#2f7f65',
    fontWeight: '700',
  },
  weeklyCard: {
    backgroundColor: '#eef7f2',
    borderRadius: 18,
    padding: 18,
    gap: 12,
  },
  weeklyHeader: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
  },
  weeklyTotalText: {
    fontSize: 15,
    color: '#366b58',
    fontWeight: '700',
  },
  weeklyChart: {
    position: 'relative',
    height: 160,
    justifyContent: 'flex-end',
  },
  weeklyChartGridLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 24,
    height: 1,
    backgroundColor: '#b4d8ca',
    opacity: 0.9,
  },
  weeklyBarsRow: {
    height: 160,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    paddingHorizontal: 2,
  },
  weeklyBarItem: {
    width: 34,
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 6,
  },
  weeklyBarValue: {
    height: 16,
    fontSize: 12,
    color: '#4b6f62',
    fontWeight: '700',
  },
  weeklyBar: {
    width: 18,
    borderRadius: 10,
    backgroundColor: '#2f7f65',
  },
  weeklyBarLabel: {
    fontSize: 13,
    color: '#1d4c3e',
    fontWeight: '700',
  },
  weeklyHintText: {
    fontSize: 13,
    color: '#4b6f62',
  },
});
