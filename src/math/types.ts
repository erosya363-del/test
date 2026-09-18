export type MathCategory =
  | "calc"
  | "compare"
  | "missing"
  | "word"
  | "series"
  | "multiply";

export type MathAnswerKind = "number" | "compare" | "done";

export type CompareOp = "<" | "=" | ">";

export type MathExercise = {
  id: string;
  category: MathCategory;
  skill: string;
  /** Короткий текст / формула для экрана */
  prompt: string;
  /** Доп. строки (текстовая задача) */
  lines?: string[];
  answerKind: MathAnswerKind;
  /** Числовой ответ или символ сравнения */
  answer: number | CompareOp;
  hint: string;
  explanation: string;
  /** Похожий пример после разбора */
  similar?: Omit<MathExercise, "id" | "similar">;
};

export type AttemptOutcome = "first" | "retry" | "hint" | "gave_up";

export type SessionStats = {
  total: number;
  firstTry: number;
  retry: number;
  withHint: number;
  gaveUp: number;
  earned: number;
};

/** Целые ₽: с первой попытки +2, сам исправил +1, с подсказкой 0. */
export function rewardFor(outcome: AttemptOutcome): number {
  if (outcome === "first") return 2;
  if (outcome === "retry") return 1;
  return 0;
}

export const MATH_HUB_CARDS = [
  { id: "today", emoji: "☀️", title: "Сегодня", desc: "10 заданий · ~7 мин" },
  { id: "train", emoji: "🏋️", title: "Тренировка", desc: "Выбери тему" },
  { id: "table", emoji: "✖️", title: "Таблица", desc: "Умножение" },
  { id: "tasks", emoji: "📖", title: "Задачи", desc: "Текстовые" },
  { id: "hw", emoji: "📓", title: "Домашка", desc: "Скоро" },
  { id: "money", emoji: "💰", title: "Мои деньги", desc: "Общий баланс" },
] as const;

export type MathHubId = (typeof MATH_HUB_CARDS)[number]["id"];
