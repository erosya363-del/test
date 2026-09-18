import type { AttemptOutcome, MathExercise, SessionStats } from "./types";
import { rewardFor } from "./types";

export function emptySessionStats(): SessionStats {
  return {
    total: 0,
    firstTry: 0,
    retry: 0,
    withHint: 0,
    gaveUp: 0,
    earned: 0,
  };
}

export function applyOutcome(stats: SessionStats, outcome: AttemptOutcome): SessionStats {
  const pay = rewardFor(outcome);
  return {
    total: stats.total + 1,
    firstTry: stats.firstTry + (outcome === "first" ? 1 : 0),
    retry: stats.retry + (outcome === "retry" ? 1 : 0),
    withHint: stats.withHint + (outcome === "hint" ? 1 : 0),
    gaveUp: stats.gaveUp + (outcome === "gave_up" ? 1 : 0),
    earned: stats.earned + pay,
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
