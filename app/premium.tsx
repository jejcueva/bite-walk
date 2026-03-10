import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { PREMIUM_MULTIPLIER } from '@bitewalk/shared';

import { useAuthSession } from '@/hooks/use-auth-session';
import { useSubscription } from '@/hooks/use-subscription';
import { PremiumBadge } from '@/components/ui/PremiumBadge';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';
import { colors, fontSizes, fontWeights, spacing, radii } from '@/constants/theme';

const gold = {
  bg: '#fdf6e3',
  border: '#e6c85e',
  text: '#b8860b',
  textLight: '#d4a843',
} as const;

const BENEFITS = [
  { title: '2x Points on every walk', detail: 'Double your earning rate on all tracked walks' },
  { title: 'Access premium-only deals', detail: 'Exclusive discounts from top partners' },
  { title: 'Priority support', detail: 'Get help faster when you need it' },
];

export default function PremiumScreen() {
  const router = useRouter();
  const { session } = useAuthSession();
  const { subscription, isPremium, status, isLoading, refetch } = useSubscription();
  const [isSubscribing, setIsSubscribing] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleUpgrade = async () => {
    setErrorMessage(null);

    if (!session?.user.id) {
      setErrorMessage('Please log in to upgrade.');
      return;
    }

    if (!isSupabaseConfigured) {
      setErrorMessage('Supabase is not configured.');
      return;
    }

    setIsSubscribing(true);

    const { error } = await supabase.from('subscriptions').insert({
      user_id: session.user.id,
      plan: 'premium',
      points_multiplier: PREMIUM_MULTIPLIER,
      is_active: true,
    });

    setIsSubscribing(false);

    if (error) {
      setErrorMessage(error.message);
      return;
    }

    await refetch();
  };

  const handleCancel = () => {
    Alert.alert('Cancel Subscription', 'Are you sure you want to cancel your premium subscription?', [
      { text: 'Keep Premium', style: 'cancel' },
      { text: 'Cancel Subscription', style: 'destructive', onPress: confirmCancel },
    ]);
  };

  const confirmCancel = async () => {
    setErrorMessage(null);

    if (!subscription?.id) return;

    setIsCancelling(true);

    const { error } = await supabase
      .from('subscriptions')
      .update({ is_active: false })
      .eq('id', subscription.id);

    setIsCancelling(false);

    if (error) {
      setErrorMessage(error.message);
      return;
    }

    await refetch();
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content}>
        <Pressable style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backText}>{'< Back'}</Text>
        </Pressable>

        {isPremium ? (
          <>
            <View style={styles.activeCard}>
              <View style={styles.activeHeader}>
                <PremiumBadge isActive variant="label" />
                <Text style={styles.activeTitle}>Premium Active</Text>
              </View>

              <View style={styles.multiplierCard}>
                <Text style={styles.multiplierValue}>{PREMIUM_MULTIPLIER}x</Text>
                <Text style={styles.multiplierLabel}>Points Multiplier</Text>
              </View>

              <View style={styles.detailsCard}>
                <Text style={styles.detailsTitle}>Plan Details</Text>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Plan</Text>
                  <Text style={styles.detailValue}>Premium</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Status</Text>
                  <Text style={[styles.detailValue, { color: colors.success }]}>{status}</Text>
                </View>
                {subscription?.started_at ? (
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Started</Text>
                    <Text style={styles.detailValue}>
                      {new Date(subscription.started_at).toLocaleDateString(undefined, {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </Text>
                  </View>
                ) : null}
                {subscription?.expires_at ? (
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Expires</Text>
                    <Text style={styles.detailValue}>
                      {new Date(subscription.expires_at).toLocaleDateString(undefined, {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </Text>
                  </View>
                ) : null}
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Multiplier</Text>
                  <Text style={styles.detailValue}>{subscription?.points_multiplier ?? PREMIUM_MULTIPLIER}x</Text>
                </View>
              </View>

              {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}

              <Pressable
                disabled={isCancelling}
                style={[styles.cancelButton, isCancelling ? styles.buttonDisabled : undefined]}
                onPress={handleCancel}
              >
                <Text style={styles.cancelButtonText}>
                  {isCancelling ? 'Cancelling...' : 'Cancel Subscription'}
                </Text>
              </Pressable>
            </View>
          </>
        ) : (
          <>
            <View style={styles.heroCard}>
              <Text style={styles.heroTitle}>Go Premium</Text>
              <Text style={styles.heroSubtitle}>
                Earn more, unlock exclusive deals, and get priority support.
              </Text>
            </View>

            <View style={styles.benefitsCard}>
              {BENEFITS.map((benefit) => (
                <View key={benefit.title} style={styles.benefitRow}>
                  <View style={styles.benefitCheck}>
                    <Text style={styles.benefitCheckText}>{'✓'}</Text>
                  </View>
                  <View style={styles.benefitTextBlock}>
                    <Text style={styles.benefitTitle}>{benefit.title}</Text>
                    <Text style={styles.benefitDetail}>{benefit.detail}</Text>
                  </View>
                </View>
              ))}
            </View>

            <View style={styles.priceCard}>
              <Text style={styles.priceAmount}>$4.99</Text>
              <Text style={styles.pricePeriod}>/ month</Text>
            </View>

            {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}

            <Pressable
              disabled={isSubscribing}
              style={[styles.upgradeButton, isSubscribing ? styles.buttonDisabled : undefined]}
              onPress={handleUpgrade}
            >
              <Text style={styles.upgradeButtonText}>
                {isSubscribing ? 'Upgrading...' : 'Upgrade to Premium'}
              </Text>
            </Pressable>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    padding: spacing.xl,
    gap: spacing.lg,
    paddingBottom: 40,
  },
  backButton: {
    alignSelf: 'flex-start',
    paddingVertical: spacing.xs,
  },
  backText: {
    fontSize: fontSizes.md,
    fontWeight: fontWeights.semibold,
    color: colors.primary,
  },

  // --- Active state ---
  activeCard: {
    gap: spacing.lg,
  },
  activeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  activeTitle: {
    fontSize: fontSizes['5xl'],
    fontWeight: fontWeights.bold,
    color: colors.textPrimary,
  },
  multiplierCard: {
    backgroundColor: gold.bg,
    borderWidth: 1,
    borderColor: gold.border,
    borderRadius: radii.lg,
    padding: spacing['2xl'],
    alignItems: 'center',
    gap: spacing.xs,
  },
  multiplierValue: {
    fontSize: fontSizes['8xl'],
    fontWeight: fontWeights.extrabold,
    color: gold.text,
  },
  multiplierLabel: {
    fontSize: fontSizes.md,
    fontWeight: fontWeights.semibold,
    color: gold.textLight,
  },
  detailsCard: {
    backgroundColor: colors.backgroundLight,
    borderRadius: radii.lg,
    padding: spacing.lg,
    gap: spacing.md,
  },
  detailsTitle: {
    fontSize: fontSizes.xl,
    fontWeight: fontWeights.bold,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  detailLabel: {
    fontSize: fontSizes.md,
    color: colors.textMuted,
  },
  detailValue: {
    fontSize: fontSizes.md,
    fontWeight: fontWeights.semibold,
    color: colors.textPrimary,
  },
  cancelButton: {
    height: 48,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.error,
    marginTop: spacing.sm,
  },
  cancelButtonText: {
    color: colors.textOnPrimary,
    fontWeight: fontWeights.bold,
    fontSize: fontSizes.lg,
  },

  // --- Upsell state ---
  heroCard: {
    backgroundColor: colors.primaryDark,
    borderRadius: radii.lg,
    padding: spacing['3xl'],
    gap: spacing.sm,
  },
  heroTitle: {
    fontSize: fontSizes['6xl'],
    fontWeight: fontWeights.extrabold,
    color: colors.textOnPrimary,
  },
  heroSubtitle: {
    fontSize: fontSizes.lg,
    color: colors.backgroundLight,
    lineHeight: 26,
  },
  benefitsCard: {
    backgroundColor: colors.backgroundLight,
    borderRadius: radii.lg,
    padding: spacing.lg,
    gap: spacing.lg,
  },
  benefitRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  benefitCheck: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  benefitCheckText: {
    color: colors.textOnPrimary,
    fontWeight: fontWeights.bold,
    fontSize: fontSizes.sm,
  },
  benefitTextBlock: {
    flex: 1,
    gap: 2,
  },
  benefitTitle: {
    fontSize: fontSizes.md,
    fontWeight: fontWeights.bold,
    color: colors.textPrimary,
  },
  benefitDetail: {
    fontSize: fontSizes.sm,
    color: colors.textSecondary,
  },
  priceCard: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'center',
    backgroundColor: gold.bg,
    borderWidth: 1,
    borderColor: gold.border,
    borderRadius: radii.lg,
    padding: spacing['2xl'],
    gap: spacing.xs,
  },
  priceAmount: {
    fontSize: fontSizes['6xl'],
    fontWeight: fontWeights.extrabold,
    color: gold.text,
  },
  pricePeriod: {
    fontSize: fontSizes.lg,
    fontWeight: fontWeights.semibold,
    color: gold.textLight,
  },
  upgradeButton: {
    height: 58,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
  },
  upgradeButtonText: {
    color: colors.textOnPrimary,
    fontWeight: fontWeights.bold,
    fontSize: fontSizes.xl,
  },
  buttonDisabled: {
    opacity: 0.75,
  },
  errorText: {
    color: colors.error,
    fontSize: fontSizes.sm,
  },
});
