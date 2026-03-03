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

import { useAuthSession } from '@/hooks/use-auth-session';
import { calculatePointsForWalk, METERS_PER_MILE, metersToMiles } from '@/lib/points';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';

type WalkEntry = {
  id: string;
  distance_meters: number;
  points_earned: number;
  walked_at: string;
};

export default function DistanceScreen() {
  const router = useRouter();
  const { session, isLoading } = useAuthSession();
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

    const normalizedEntries: WalkEntry[] = (data ?? []).map((entry) => ({
      id: entry.id,
      distance_meters: Number(entry.distance_meters),
      points_earned: Number(entry.points_earned),
      walked_at: entry.walked_at,
    }));

    setWalks(normalizedEntries.slice(0, 25));
    setIsFetching(false);
  }, [session?.user.id]);

  useEffect(() => {
    void loadWalks();
  }, [loadWalks]);

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

    const { error } = await supabase.from('walks').insert({
      user_id: session.user.id,
      distance_meters: distanceMeters,
      points_earned: pointsEarned,
    });

    setIsSaving(false);

    if (error) {
      setErrorMessage(error.message);
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
});
