export type MathSkillId =
  | "add_to_10"
  | "add_to_20_no_bridge"
  | "add_to_20_bridge"
  | "add_tens"
  | "add_2digit_1digit"
  | "add_2digit_2digit"
  | "sub_to_10"
  | "sub_to_20_no_bridge"
  | "sub_to_20_bridge"
  | "sub_tens"
  | "sub_2digit_1digit"
  | "sub_2digit_2digit"
  | "compare_numbers"
  | "compare_expression_number"
  | "compare_expressions"
  | "missing_addend"
  | "missing_minuend"
  | "missing_subtrahend"
  | "word_add"
  | "word_sub"
  | "word_compare_more"
  | "word_compare_less"
  | "word_two_step"
  | "word_money"
  | "word_length"
  | "series_add"
  | "series_sub"
  | "length_cm_dm"
  | "length_dm_cm"
  | "length_compare"
  | "segment_length"
  | "segment_longer"
  | "segment_shorter"
  | "multiplication_concept"
  | "times_2"
  | "times_3"
  | "times_4"
  | "times_5"
  | "times_6"
  | "times_7"
  | "times_8"
  | "times_9"
  | "division_concept"
  | "division_by_2"
  | "division_by_3"
  | "division_by_4"
  | "division_by_5"
  | "division_by_6"
  | "division_by_7"
  | "division_by_8"
  | "division_by_9";

export type MathCategory =
  | "calc"
  | "compare"
  | "missing"
  | "word"
  | "series"
  | "multiply"
  | "length"
  | "geometry";

export type MathAnswerKind = "number" | "compare" | "done" | "pair";

export type CompareOp = "<" | "=" | ">";

export type LengthPair = { dm: number; cm: number };

export type SkillState = "locked" | "learning" | "practice" | "mastered";

export type MathExercise = {
  id: string;
  category: MathCategory;
  /** @deprecated используй skillId; сохранено для совместимости */
  skill: string;
  skillId: MathSkillId;
  /** Короткий текст / формула для экрана */
  prompt: string;
  /** Доп. строки (текстовая задача) */
  lines?: string[];
  answerKind: MathAnswerKind;
  /** Числовой ответ, сравнение, пара дм/см, или 1 для done */
  answer: number | CompareOp | LengthPair;
  hint: string;
  explanation: string;
  /** Похожий пример после разбора */
  similar?: Omit<MathExercise, "id" | "similar">;
};

export type AttemptOutcome = "first" | "retry" | "hint" | "gave_up" | "learned";

export type SessionStats = {
  total: number;
  firstTry: number;
  retry: number;
  withHint: number;
  gaveUp: number;
  learned: number;
  earned: number;
  /** Разбивка по навыкам (для проверки) */
  bySkill?: Record<string, { ok: number; fail: number }>;
};

export type MathRewardSettings = {
  mathRewardFirst: number;
  mathRewardRetry: number;
  mathRewardHint: number;
  mathRewardGaveUp: number;
};

export const DEFAULT_MATH_REWARDS: MathRewardSettings = {
  mathRewardFirst: 2,
  mathRewardRetry: 1,
  mathRewardHint: 0,
  mathRewardGaveUp: 0,
};

/** Награда по outcome; settings опциональны (defaults +2/+1/0/0). */
export function rewardFor(outcome: AttemptOutcome, settings?: Partial<MathRewardSettings>): number {
  const s = { ...DEFAULT_MATH_REWARDS, ...settings };
  switch (outcome) {
    case "first":
      return s.mathRewardFirst;
    case "retry":
      return s.mathRewardRetry;
    case "hint":
      return s.mathRewardHint;
    case "gave_up":
      return s.mathRewardGaveUp;
    case "learned":
      return 0;
    default: {
      const _exhaustive: never = outcome;
      return _exhaustive;
    }
  }
}

export type MathSkillStat = {
  skillId: MathSkillId;
  seen: number;
  firstTryCorrect: number;
  retryCorrect: number;
  hints: number;
  failed: number;
  totalTimeMs: number;
  lastSeenAt: number;
  mastery: number;
  state: SkillState;
};

export type MathAttempt = {
  id: string;
  ts: number;
  skillId: MathSkillId;
  prompt: string;
  expectedAnswer: string;
  userAnswer: string;
  attempts: number;
  hintUsed: boolean;
  outcome: AttemptOutcome;
  durationMs: number;
};

export type TableFactProgress = {
  fact: string;
  seen: number;
  correctFirstTry: number;
  errors: number;
  hints: number;
};

export const MATH_HUB_CARDS = [
  { id: "learn", emoji: "📚", title: "Учусь", desc: "Новые темы" },
  { id: "train", emoji: "🏋️", title: "Тренируюсь", desc: "Выбери тему" },
  { id: "table", emoji: "✖️", title: "Таблица", desc: "Умножение" },
  { id: "tasks", emoji: "📖", title: "Задачи", desc: "Текстовые" },
  { id: "check", emoji: "✅", title: "Проверка", desc: "10 или 20" },
] as const;

export type MathHubId = (typeof MATH_HUB_CARDS)[number]["id"];

/** Минимальное число встреч навыка для высокого mastery. */
export const MASTERY_MIN_SEEN = 5;

/** Порог «мало данных» в кабинете. */
export const STAT_MIN_SEEN = 3;

/** Максимум попыток в облачной истории. */
export const MATH_ATTEMPTS_LIMIT = 40;

export function computeMastery(stat: Pick<MathSkillStat, "seen" | "firstTryCorrect" | "retryCorrect" | "hints" | "failed">): number {
  if (stat.seen < MASTERY_MIN_SEEN) {
    const early = (stat.firstTryCorrect * 0.7 + stat.retryCorrect * 0.3) / Math.max(1, stat.seen);
    return Math.min(0.55, Math.round(early * 100) / 100);
  }
  const firstRate = stat.firstTryCorrect / stat.seen;
  const retryRate = stat.retryCorrect / stat.seen;
  const hintPenalty = Math.min(0.25, (stat.hints / stat.seen) * 0.15);
  const failPenalty = Math.min(0.3, (stat.failed / stat.seen) * 0.2);
  const raw = firstRate * 0.75 + retryRate * 0.2 - hintPenalty - failPenalty;
  return Math.max(0, Math.min(0.99, Math.round(raw * 100) / 100));
}

export function masteryToState(mastery: number, current: SkillState): SkillState {
  if (current === "locked") return "locked";
  if (mastery >= 0.85) return "mastered";
  if (mastery >= 0.45) return "practice";
  return "learning";
}

export function emptyMathSkillStat(skillId: MathSkillId, state: SkillState = "learning"): MathSkillStat {
  return {
    skillId,
    seen: 0,
    firstTryCorrect: 0,
    retryCorrect: 0,
    hints: 0,
    failed: 0,
    totalTimeMs: 0,
    lastSeenAt: 0,
    mastery: 0,
    state,
  };
}

/** Совместимость: старый строковый skill → skillId. */
export function legacySkillToId(skill: string): MathSkillId {
  if (skill === "add") return "add_to_20_no_bridge";
  if (skill === "sub") return "sub_to_20_no_bridge";
  if (skill === "compare") return "compare_expression_number";
  if (skill === "missing_add") return "missing_addend";
  if (skill === "missing_sub") return "missing_minuend";
  if (skill === "missing_sub2") return "missing_subtrahend";
  if (skill === "word_mix") return "word_two_step";
  if (skill === "word_add") return "word_add";
  if (skill === "word_sub") return "word_sub";
  if (skill === "series") return "series_add";
  const times = /^times_(\d)$/.exec(skill);
  if (times) {
    const n = times[1]!;
    return `times_${n}` as MathSkillId;
  }
  return "add_to_20_no_bridge";
}

export function timesSkillId(factor: number): MathSkillId {
  const n = Math.min(9, Math.max(2, Math.trunc(factor)));
  return `times_${n}` as MathSkillId;
}
