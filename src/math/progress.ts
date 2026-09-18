import {
  computeMastery,
  emptyMathSkillStat,
  masteryToState,
  MATH_ATTEMPTS_LIMIT,
  type AttemptOutcome,
  type MathAttempt,
  type MathSkillId,
  type MathSkillStat,
  type SkillState,
  type TableFactProgress,
} from "./types";
import { defaultSkillStates } from "./curriculum";

const LS_MATH_STATS = "dq_math_skill_stats";
const LS_MATH_ATTEMPTS = "dq_math_attempts";
const LS_MATH_STATES = "dq_math_skill_states";
const LS_TABLE_FACTS = "dq_math_table_facts";

export type MathProgressBundle = {
  stats: Record<string, MathSkillStat>;
  attempts: MathAttempt[];
  states: Record<string, SkillState>;
  tableFacts: Record<string, TableFactProgress>;
};

function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function writeJson(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* quota */
  }
}

export function loadMathProgress(): MathProgressBundle {
  const defaults = defaultSkillStates();
  const states = { ...defaults, ...readJson<Record<string, SkillState>>(LS_MATH_STATES, {}) };
  const stats = readJson<Record<string, MathSkillStat>>(LS_MATH_STATS, {});
  const attempts = readJson<MathAttempt[]>(LS_MATH_ATTEMPTS, []);
  const tableFacts = readJson<Record<string, TableFactProgress>>(LS_TABLE_FACTS, {});
  return { stats, attempts, states, tableFacts };
}

export function saveMathProgress(bundle: MathProgressBundle): void {
  writeJson(LS_MATH_STATS, bundle.stats);
  writeJson(LS_MATH_ATTEMPTS, bundle.attempts.slice(-MATH_ATTEMPTS_LIMIT));
  writeJson(LS_MATH_STATES, bundle.states);
  writeJson(LS_TABLE_FACTS, bundle.tableFacts);
}

export function applyMathAttempt(
  bundle: MathProgressBundle,
  input: {
    skillId: MathSkillId;
    prompt: string;
    expectedAnswer: string;
    userAnswer: string;
    attempts: number;
    hintUsed: boolean;
    outcome: AttemptOutcome;
    durationMs: number;
  },
): MathProgressBundle {
  const prev =
    bundle.stats[input.skillId] ??
    emptyMathSkillStat(input.skillId, bundle.states[input.skillId] ?? "learning");
  const next: MathSkillStat = {
    ...prev,
    seen: prev.seen + 1,
    firstTryCorrect: prev.firstTryCorrect + (input.outcome === "first" ? 1 : 0),
    retryCorrect: prev.retryCorrect + (input.outcome === "retry" ? 1 : 0),
    hints: prev.hints + (input.hintUsed || input.outcome === "hint" ? 1 : 0),
    failed: prev.failed + (input.outcome === "gave_up" ? 1 : 0),
    totalTimeMs: prev.totalTimeMs + Math.max(0, input.durationMs),
    lastSeenAt: Date.now(),
    mastery: 0,
    state: prev.state,
  };
  next.mastery = computeMastery(next);
  const autoState = masteryToState(next.mastery, bundle.states[input.skillId] ?? prev.state);
  // Не повышать locked автоматически; mastered только из результата
  if ((bundle.states[input.skillId] ?? prev.state) !== "locked") {
    next.state = autoState;
    bundle.states[input.skillId] = autoState;
  }
  const attempt: MathAttempt = {
    id: `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`,
    ts: Date.now(),
    skillId: input.skillId,
    prompt: input.prompt.slice(0, 80),
    expectedAnswer: input.expectedAnswer.slice(0, 40),
    userAnswer: input.userAnswer.slice(0, 40),
    attempts: input.attempts,
    hintUsed: input.hintUsed,
    outcome: input.outcome,
    durationMs: input.durationMs,
  };
  return {
    ...bundle,
    stats: { ...bundle.stats, [input.skillId]: next },
    attempts: [...bundle.attempts, attempt].slice(-MATH_ATTEMPTS_LIMIT),
    states: { ...bundle.states },
  };
}

export function setSkillState(
  bundle: MathProgressBundle,
  skillId: MathSkillId,
  state: SkillState,
): MathProgressBundle {
  const stats = { ...bundle.stats };
  if (stats[skillId]) {
    stats[skillId] = { ...stats[skillId]!, state };
  }
  return {
    ...bundle,
    stats,
    states: { ...bundle.states, [skillId]: state },
  };
}

export function updateTableFact(
  bundle: MathProgressBundle,
  fact: string,
  patch: Partial<Pick<TableFactProgress, "seen" | "correctFirstTry" | "errors" | "hints">>,
): MathProgressBundle {
  const prev = bundle.tableFacts[fact] ?? { fact, seen: 0, correctFirstTry: 0, errors: 0, hints: 0 };
  return {
    ...bundle,
    tableFacts: {
      ...bundle.tableFacts,
      [fact]: {
        ...prev,
        seen: prev.seen + (patch.seen ?? 0),
        correctFirstTry: prev.correctFirstTry + (patch.correctFirstTry ?? 0),
        errors: prev.errors + (patch.errors ?? 0),
        hints: prev.hints + (patch.hints ?? 0),
      },
    },
  };
}

/** Компактная строка для облака (без двоеточий в значениях после hex). */
export function encodeMathStatsCompact(stats: Record<string, MathSkillStat>): string {
  const parts: string[] = [];
  for (const [id, s] of Object.entries(stats)) {
    if (!s || s.seen === 0) continue;
    // id,seen,first,retry,hints,failed,mastery100,stateCode,lastTs
    const stateCode = s.state === "locked" ? 0 : s.state === "learning" ? 1 : s.state === "practice" ? 2 : 3;
    parts.push(
      `${id},${s.seen},${s.firstTryCorrect},${s.retryCorrect},${s.hints},${s.failed},${Math.round(s.mastery * 100)},${stateCode},${s.lastSeenAt}`,
    );
  }
  return parts.join("|").slice(0, 900);
}

export function decodeMathStatsCompact(raw: string): Record<string, MathSkillStat> {
  const out: Record<string, MathSkillStat> = {};
  if (!raw || raw === "-" || raw === "empty") return out;
  for (const part of raw.split("|")) {
    const [id, seen, first, retry, hints, failed, mastery100, stateCode, lastTs] = part.split(",");
    if (!id) continue;
    const state: SkillState =
      stateCode === "0" ? "locked" : stateCode === "2" ? "practice" : stateCode === "3" ? "mastered" : "learning";
    out[id] = {
      skillId: id as MathSkillId,
      seen: Number(seen) || 0,
      firstTryCorrect: Number(first) || 0,
      retryCorrect: Number(retry) || 0,
      hints: Number(hints) || 0,
      failed: Number(failed) || 0,
      totalTimeMs: 0,
      lastSeenAt: Number(lastTs) || 0,
      mastery: (Number(mastery100) || 0) / 100,
      state,
    };
  }
  return out;
}

export function encodeSkillStatesCompact(states: Record<string, SkillState>): string {
  const parts: string[] = [];
  for (const [id, state] of Object.entries(states)) {
    const code = state === "locked" ? 0 : state === "learning" ? 1 : state === "practice" ? 2 : 3;
    parts.push(`${id}=${code}`);
  }
  return parts.join(",").slice(0, 900);
}

export function decodeSkillStatesCompact(raw: string): Record<string, SkillState> {
  const out: Record<string, SkillState> = {};
  if (!raw || raw === "-" || raw === "empty") return out;
  for (const part of raw.split(",")) {
    const [id, code] = part.split("=");
    if (!id) continue;
    out[id] =
      code === "0" ? "locked" : code === "2" ? "practice" : code === "3" ? "mastered" : "learning";
  }
  return out;
}

export function mergeSkillStats(
  local: Record<string, MathSkillStat>,
  remote: Record<string, MathSkillStat>,
): Record<string, MathSkillStat> {
  const ids = new Set([...Object.keys(local), ...Object.keys(remote)]);
  const out: Record<string, MathSkillStat> = {};
  for (const id of ids) {
    const a = local[id];
    const b = remote[id];
    if (!a && b) {
      out[id] = b;
      continue;
    }
    if (a && !b) {
      out[id] = a;
      continue;
    }
    if (!a || !b) continue;
    const merged: MathSkillStat = {
      skillId: id as MathSkillId,
      seen: Math.max(a.seen, b.seen),
      firstTryCorrect: Math.max(a.firstTryCorrect, b.firstTryCorrect),
      retryCorrect: Math.max(a.retryCorrect, b.retryCorrect),
      hints: Math.max(a.hints, b.hints),
      failed: Math.max(a.failed, b.failed),
      totalTimeMs: Math.max(a.totalTimeMs, b.totalTimeMs),
      lastSeenAt: Math.max(a.lastSeenAt, b.lastSeenAt),
      mastery: 0,
      state: a.lastSeenAt >= b.lastSeenAt ? a.state : b.state,
    };
    merged.mastery = computeMastery(merged);
    out[id] = merged;
  }
  return out;
}

/** Состояния из облака (папа) перекрывают локальные для известных ключей. */
export function mergeSkillStates(
  local: Record<string, SkillState>,
  remote: Record<string, SkillState>,
): Record<string, SkillState> {
  return { ...local, ...remote };
}

export async function pullAndMergeMathCloud(
  loadStats: () => Promise<string>,
  loadStates: () => Promise<string>,
  saveStats: (encoded: string) => Promise<void>,
  saveStates: (encoded: string) => Promise<void>,
): Promise<MathProgressBundle> {
  const local = loadMathProgress();
  let remoteStats: Record<string, MathSkillStat> = {};
  let remoteStates: Record<string, SkillState> = {};
  try {
    remoteStats = decodeMathStatsCompact(await loadStats());
  } catch {
    /* offline */
  }
  try {
    remoteStates = decodeSkillStatesCompact(await loadStates());
  } catch {
    /* offline */
  }
  const merged: MathProgressBundle = {
    ...local,
    stats: mergeSkillStats(local.stats, remoteStats),
    states: mergeSkillStates(local.states, remoteStates),
  };
  saveMathProgress(merged);
  // Отдать в облако объединённое (best-effort), чтобы второй телефон подтянул.
  try {
    await saveStats(encodeMathStatsCompact(merged.stats));
    await saveStates(encodeSkillStatesCompact(merged.states));
  } catch {
    /* offline */
  }
  return merged;
}
