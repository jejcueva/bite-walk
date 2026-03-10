import { useCallback, useEffect, useState } from 'react';

import {
  isPremiumActive,
  getSubscriptionStatus,
  PREMIUM_MULTIPLIER,
  FREE_MULTIPLIER,
} from '@bitewalk/shared';
import type { Subscription } from '@bitewalk/shared';
import type { SubscriptionStatus } from '@bitewalk/shared';

import { useAuthSession } from '@/hooks/use-auth-session';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';

export function useSubscription() {
  const { session } = useAuthSession();
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetch = useCallback(async () => {
    const userId = session?.user.id;
    if (!userId || !isSupabaseConfigured) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);

    const { data, error } = await supabase.rpc('get_subscription', {
      p_user_id: userId,
    });

    if (error || !data) {
      setSubscription(null);
    } else {
      setSubscription(data as unknown as Subscription);
    }

    setIsLoading(false);
  }, [session?.user.id]);

  useEffect(() => {
    void fetch();
  }, [fetch]);

  const isPremium = isPremiumActive(subscription);
  const status: SubscriptionStatus = getSubscriptionStatus(subscription);
  const multiplier = isPremium ? PREMIUM_MULTIPLIER : FREE_MULTIPLIER;

  return {
    subscription,
    isPremium,
    multiplier,
    status,
    isLoading,
    refetch: fetch,
  };
}
