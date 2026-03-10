import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';

import type { LeaderboardEntry, LeaderboardPeriod } from '@bitewalk/shared';
import { metersToMiles } from '@/lib/points';
import { useAuthSession } from '@/hooks/use-auth-session';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';
import { colors, fontSizes, fontWeights, radii, spacing } from '@/constants/theme';

type LeaderboardScope = 'global' | 'friends';

const PERIODS: { label: string; value: LeaderboardPeriod }[] = [
  { label: 'Weekly', value: 'weekly' },
  { label: 'Monthly', value: 'monthly' },
  { label: 'All Time', value: 'all_time' },
];

const SCOPES: { label: string; value: LeaderboardScope }[] = [
  { label: 'Global', value: 'global' },
  { label: 'Friends', value: 'friends' },
];

const RANK_COLORS: Record<number, string> = {
  1: '#d4a017',
  2: '#8a8a8a',
  3: '#b5651d',
};

function getInitials(name: string): string {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('');
}

function Avatar({ name, rank }: { name: string; rank: number }) {
  const medalColor = RANK_COLORS[rank];
  return (
    <View style={[styles.avatar, medalColor ? { borderColor: medalColor, borderWidth: 2 } : null]}>
      <Text style={styles.avatarText}>{getInitials(name)}</Text>
    </View>
  );
}

function RankBadge({ rank }: { rank: number }) {
  const medalColor = RANK_COLORS[rank];
  return (
    <View style={[styles.rankBadge, medalColor ? { backgroundColor: medalColor } : null]}>
      <Text style={[styles.rankText, medalColor ? { color: '#fff' } : null]}>{rank}</Text>
    </View>
  );
}

function LeaderboardRow({
  entry,
  isCurrentUser,
}: {
  entry: LeaderboardEntry;
  isCurrentUser: boolean;
}) {
  const miles = metersToMiles(entry.total_distance_meters);

  return (
    <View style={[styles.row, isCurrentUser ? styles.rowHighlight : null]}>
      <RankBadge rank={entry.rank} />
      <Avatar name={entry.display_name} rank={entry.rank} />
      <View style={styles.rowInfo}>
        <Text style={styles.rowName} numberOfLines={1}>
          {entry.display_name}
          {isCurrentUser ? ' (you)' : ''}
        </Text>
        <Text style={styles.rowSub}>
          {miles.toFixed(1)} mi · {entry.total_steps.toLocaleString()} steps
        </Text>
      </View>
      <Text style={styles.rowPoints}>{entry.total_points.toLocaleString()} pts</Text>
    </View>
  );
}

export default function LeaderboardScreen() {
  const router = useRouter();
  const { session } = useAuthSession();
  const [period, setPeriod] = useState<LeaderboardPeriod>('weekly');
  const [scope, setScope] = useState<LeaderboardScope>('global');
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const userId = session?.user.id;

  const fetchLeaderboard = useCallback(
    async (showRefreshIndicator = false) => {
      if (!isSupabaseConfigured) {
        setError('Supabase is not configured.');
        setIsLoading(false);
        return;
      }

      if (showRefreshIndicator) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }
      setError(null);

      const rpcName =
        scope === 'friends' ? 'get_friends_leaderboard' : 'get_leaderboard';

      const params =
        scope === 'friends'
          ? { p_user_id: userId, p_period_type: period, p_limit: 50 }
          : { p_period_type: period, p_limit: 50 };

      const { data, error: rpcError } = await supabase.rpc(rpcName, params);

      if (rpcError) {
        setError(rpcError.message);
        setEntries([]);
      } else {
        setEntries((data as LeaderboardEntry[]) ?? []);
      }

      setIsLoading(false);
      setIsRefreshing(false);
    },
    [period, scope, userId],
  );

  useEffect(() => {
    void fetchLeaderboard();
  }, [fetchLeaderboard]);

  const handleRefresh = () => {
    void fetchLeaderboard(true);
  };

  const renderItem = ({ item }: { item: LeaderboardEntry }) => (
    <LeaderboardRow entry={item} isCurrentUser={item.user_id === userId} />
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Text style={styles.backText}>Back</Text>
        </Pressable>
        <Text style={styles.title}>Leaderboard</Text>
        <View style={styles.backPlaceholder} />
      </View>

      <View style={styles.tabBar}>
        {PERIODS.map((p) => (
          <Pressable
            key={p.value}
            style={[styles.tab, period === p.value ? styles.tabActive : null]}
            onPress={() => setPeriod(p.value)}>
            <Text style={[styles.tabText, period === p.value ? styles.tabTextActive : null]}>
              {p.label}
            </Text>
          </Pressable>
        ))}
      </View>

      <View style={styles.scopeBar}>
        {SCOPES.map((s) => (
          <Pressable
            key={s.value}
            style={[styles.scopeChip, scope === s.value ? styles.scopeChipActive : null]}
            onPress={() => setScope(s.value)}>
            <Text
              style={[styles.scopeText, scope === s.value ? styles.scopeTextActive : null]}>
              {s.label}
            </Text>
          </Pressable>
        ))}
      </View>

      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      {isLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={entries}
          keyExtractor={(item) => item.user_id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={handleRefresh}
              tintColor={colors.primary}
              colors={[colors.primary]}
            />
          }
          ListEmptyComponent={
            <Text style={styles.emptyText}>No entries yet for this period.</Text>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  backText: {
    fontSize: fontSizes.lg,
    fontWeight: fontWeights.bold,
    color: colors.primary,
  },
  backPlaceholder: {
    width: 40,
  },
  title: {
    fontSize: fontSizes['4xl'],
    fontWeight: fontWeights.extrabold,
    color: colors.textPrimary,
  },
  tabBar: {
    flexDirection: 'row',
    marginHorizontal: spacing.xl,
    marginTop: spacing.sm,
    backgroundColor: colors.backgroundLight,
    borderRadius: radii.sm,
    padding: spacing.xs,
  },
  tab: {
    flex: 1,
    paddingVertical: spacing.sm,
    borderRadius: radii.sm - 2,
    alignItems: 'center',
  },
  tabActive: {
    backgroundColor: colors.primary,
  },
  tabText: {
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.bold,
    color: colors.textMuted,
  },
  tabTextActive: {
    color: colors.textOnPrimary,
  },
  scopeBar: {
    flexDirection: 'row',
    marginHorizontal: spacing.xl,
    marginTop: spacing.md,
    gap: spacing.sm,
  },
  scopeChip: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.backgroundLight,
  },
  scopeChipActive: {
    backgroundColor: colors.primaryDark,
    borderColor: colors.primaryDark,
  },
  scopeText: {
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.semibold,
    color: colors.textMuted,
  },
  scopeTextActive: {
    color: colors.textOnPrimary,
  },
  list: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    paddingBottom: spacing['5xl'],
    gap: spacing.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.backgroundLight,
    borderRadius: radii.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    gap: spacing.md,
  },
  rowHighlight: {
    backgroundColor: colors.backgroundCard,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  rankBadge: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rankText: {
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.extrabold,
    color: colors.textPrimary,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.bold,
    color: colors.textOnPrimary,
  },
  rowInfo: {
    flex: 1,
    gap: 2,
  },
  rowName: {
    fontSize: fontSizes.md,
    fontWeight: fontWeights.bold,
    color: colors.textPrimary,
  },
  rowSub: {
    fontSize: fontSizes.xs,
    color: colors.textMuted,
  },
  rowPoints: {
    fontSize: fontSizes.md,
    fontWeight: fontWeights.extrabold,
    color: colors.primary,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    textAlign: 'center',
    color: colors.textMuted,
    fontSize: fontSizes.md,
    paddingTop: spacing['4xl'],
  },
  errorText: {
    color: colors.error,
    fontSize: fontSizes.sm,
    marginHorizontal: spacing.xl,
    marginTop: spacing.sm,
  },
});
