import { STEPS_PER_MILE, METERS_PER_MILE } from './points';

export const DEFAULT_DAILY_STEP_GOAL = 10000;
export const DEFAULT_DAILY_DISTANCE_GOAL_METERS =
  (DEFAULT_DAILY_STEP_GOAL / STEPS_PER_MILE) * METERS_PER_MILE;

export type StreakStatus = 'active' | 'at_risk' | 'broken' | 'inactive';

export function getGoalProgress(actual: number, target: number): number {
  if (target <= 0 || actual <= 0) return 0;
  return Math.min(actual / target, 1);
}

export function isGoalCompleted(
  actualSteps: number,
  actualDistanceMeters: number,
  targetSteps: number,
  targetDistanceMeters: number,
): boolean {
  return actualSteps >= targetSteps || actualDistanceMeters >= targetDistanceMeters;
}

export function getStreakStatus(
  currentStreak: number,
  lastActiveDate: string | null,
  today: string,
): StreakStatus {
  if (currentStreak === 0 && !lastActiveDate) return 'inactive';
  if (!lastActiveDate) return 'broken';

  if (lastActiveDate === today) return 'active';

  const lastDate = new Date(lastActiveDate + 'T00:00:00');
  const todayDate = new Date(today + 'T00:00:00');
  const diffMs = todayDate.getTime() - lastDate.getTime();
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 1) return 'at_risk';
  return 'broken';
}
