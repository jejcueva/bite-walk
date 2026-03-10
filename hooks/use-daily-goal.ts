import { useCallback, useEffect, useState } from 'react';

import { isSupabaseConfigured, supabase } from '@/lib/supabase';
import { useAuthSession } from '@/hooks/use-auth-session';
import type { DailyGoal, Streak } from '@bitewalk/shared';
import {
  DEFAULT_DAILY_STEP_GOAL,
  getGoalProgress,
  isGoalCompleted,
  getStreakStatus,
} from '@bitewalk/shared';

export function useDailyGoal() {
  const { session } = useAuthSession();
  const [goal, setGoal] = useState<DailyGoal | null>(null);
  const [streak, setStreak] = useState<Streak | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const userId = session?.user.id;

  const fetchGoalAndStreak = useCallback(async () => {
    if (!userId || !isSupabaseConfigured) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);

    const [goalResult, streakResult] = await Promise.all([
      supabase.rpc('get_or_create_daily_goal', {
        p_user_id: userId,
        p_target_steps: DEFAULT_DAILY_STEP_GOAL,
      }),
      supabase.rpc('get_streak', { p_user_id: userId }),
    ]);

    if (goalResult.data) setGoal(goalResult.data);
    if (streakResult.data) setStreak(streakResult.data);

    setIsLoading(false);
  }, [userId]);

  useEffect(() => {
    void fetchGoalAndStreak();
  }, [fetchGoalAndStreak]);

  const refreshProgress = useCallback(async () => {
    if (!userId || !isSupabaseConfigured) return;

    const { data } = await supabase.rpc('update_daily_goal_progress', {
      p_user_id: userId,
    });

    if (data) {
      setGoal(data);
      const { data: streakData } = await supabase.rpc('get_streak', {
        p_user_id: userId,
      });
      if (streakData) setStreak(streakData);
    }
  }, [userId]);

  const today = new Date().toISOString().slice(0, 10);

  const stepProgress = goal ? getGoalProgress(goal.actual_steps, goal.target_steps) : 0;
  const distanceProgress = goal
    ? getGoalProgress(goal.actual_distance_meters, goal.target_distance_meters)
    : 0;
  const progress = Math.max(stepProgress, distanceProgress);
  const completed = goal
    ? isGoalCompleted(
        goal.actual_steps,
        goal.actual_distance_meters,
        goal.target_steps,
        goal.target_distance_meters,
      )
    : false;
  const streakStatus = streak
    ? getStreakStatus(streak.current_streak, streak.last_active_date, today)
    : 'inactive';

  return {
    goal,
    streak,
    progress,
    completed,
    streakStatus,
    isLoading,
    refreshProgress,
    refetch: fetchGoalAndStreak,
  };
}
