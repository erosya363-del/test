import type { Settings } from "./types";

/** Режимы игры для одного ребёнка (телефоны в одной семье). */
export type PlayMode = "eye" | "listen" | "stress" | "letter" | "dictation";

/** Уровень сложности для глаз/ударение/буквы. */
export type Difficulty = 1 | 2 | 3;

export const PLAY_MODES: {
  id: PlayMode;
  emoji: string;
  title: string;
  desc: string;
  needsLevel?: boolean;
}[] = [
  { id: "eye", emoji: "👁️", title: "Глаз", desc: "Найди ошибку в слове", needsLevel: true },
  { id: "listen", emoji: "🔊", title: "Слух", desc: "Слушай и выбери написание" },
  { id: "stress", emoji: "🎵", title: "Ударение", desc: "Только ударения", needsLevel: true },
  { id: "letter", emoji: "🔤", title: "Буквы", desc: "Только буквы", needsLevel: true },
  { id: "dictation", emoji: "📝", title: "Диктант 10", desc: "На бумаге или с клавиатуры" },
];

export const DIFFICULTY_LEVELS: {
  id: Difficulty;
  emoji: string;
  title: string;
  desc: string;
}[] = [
  { id: 1, emoji: "🖼️", title: "Картинка", desc: "Сначала эмодзи, потом слово" },
  { id: 2, emoji: "📖", title: "Слово", desc: "Запомни слово, потом найди ошибку" },
  { id: 3, emoji: "✍️", title: "Пиши", desc: "Впиши буквы и ударение сам" },
];

export type ModeRewards = {
  correct: number;
  streak: number;
  penalty: number;
};

export function modeRewards(settings: Settings, mode: PlayMode): ModeRewards {
  switch (mode) {
    case "listen":
    case "dictation":
      return {
        correct: settings.listenRewardCorrect,
        streak: settings.listenRewardStreak,
        penalty: settings.listenPenaltyWrong,
      };
    case "stress":
      return {
        correct: settings.stressRewardCorrect,
        streak: settings.stressRewardStreak,
        penalty: settings.stressPenaltyWrong,
      };
    case "letter":
      return {
        correct: settings.letterRewardCorrect,
        streak: settings.letterRewardStreak,
        penalty: settings.letterPenaltyWrong,
      };
    default:
      return {
        correct: settings.rewardCorrect,
        streak: settings.rewardStreak,
        penalty: settings.penaltyWrong,
      };
  }
}

/** Чуть больше за более сложный уровень (картинка → слово → пиши). */
export function difficultyBonus(level: Difficulty): number {
  if (level === 3) return 2;
  if (level === 2) return 1;
  return 0;
}

export function modeTitle(mode: PlayMode): string {
  return PLAY_MODES.find((item) => item.id === mode)?.title ?? "Игра";
}

export function gradePay(settings: Settings, grade: number): number {
  const g = Math.min(5, Math.max(1, Math.round(grade)));
  const map: Record<number, number> = {
    1: settings.grade1,
    2: settings.grade2,
    3: settings.grade3,
    4: settings.grade4,
    5: settings.grade5,
  };
  return map[g] ?? 0;
}

/** Сравнение ответа диктанта / уровня «Пиши». */
export function normalizeAnswer(text: string): string {
  return text
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "")
    .replace(/ё/g, "е");
}

export function answersMatch(input: string, expected: string): boolean {
  const a = normalizeAnswer(input);
  const b = normalizeAnswer(expected);
  if (a === b) return true;
  // Без знака ударения тоже засчитываем на уровне 3 / диктанте
  const strip = (s: string) => s.replace(/\u0301/g, "");
  return strip(a) === strip(b);
}
