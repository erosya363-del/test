import type { AttemptOutcome, MathExercise, MathRewardSettings, SessionStats } from "./types";
import { rewardFor } from "./types";

export function emptySessionStats(): SessionStats {
  return {
    total: 0,
    firstTry: 0,
    retry: 0,
    withHint: 0,
    gaveUp: 0,
    learned: 0,
    earned: 0,
    bySkill: {},
  };
}

export function applyOutcome(
  stats: SessionStats,
  outcome: AttemptOutcome,
  settings?: Partial<MathRewardSettings>,
  skillId?: string,
  ok = true,
): SessionStats {
  const pay = rewardFor(outcome, settings);
  const bySkill = { ...(stats.bySkill ?? {}) };
  if (skillId) {
    const prev = bySkill[skillId] ?? { ok: 0, fail: 0 };
    bySkill[skillId] = {
      ok: prev.ok + (ok && outcome !== "gave_up" ? 1 : 0),
      fail: prev.fail + (outcome === "gave_up" || !ok ? 1 : 0),
    };
  }
  return {
    total: stats.total + 1,
    firstTry: stats.firstTry + (outcome === "first" ? 1 : 0),
    retry: stats.retry + (outcome === "retry" ? 1 : 0),
    withHint: stats.withHint + (outcome === "hint" ? 1 : 0),
    gaveUp: stats.gaveUp + (outcome === "gave_up" ? 1 : 0),
    learned: stats.learned + (outcome === "learned" ? 1 : 0),
    earned: stats.earned + pay,
    bySkill,
  };
}

export function outcomeFromAttempts(attemptsBeforeOk: number, usedHint: boolean): AttemptOutcome {
  if (usedHint) return "hint";
  if (attemptsBeforeOk === 0) return "first";
  return "retry";
}

export function withSimilarQueued(
  queue: MathExercise[],
  index: number,
  current: MathExercise,
): MathExercise[] {
  if (!current.similar) return queue;
  const similar: MathExercise = {
    ...current.similar,
    id: `${current.id}_s`,
  };
  const copy = [...queue];
  copy.splice(index + 1, 0, similar);
  return copy;
}
