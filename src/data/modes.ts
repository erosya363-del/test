import type { Settings } from "./types";

/** Режимы игры для одного ребёнка (телефоны в одной семье). */
export type PlayMode = "eye" | "listen" | "stress" | "letter";

export const PLAY_MODES: {
  id: PlayMode;
  emoji: string;
  title: string;
  desc: string;
}[] = [
  { id: "eye", emoji: "👁️", title: "Глаз", desc: "Найди ошибку в слове" },
  { id: "listen", emoji: "🔊", title: "Слух", desc: "Слушай и выбери написание" },
  { id: "stress", emoji: "🎵", title: "Ударение", desc: "Только ударения" },
  { id: "letter", emoji: "🔤", title: "Буквы", desc: "Только буквы" },
];

export type ModeRewards = {
  correct: number;
  streak: number;
  penalty: number;
};

export function modeRewards(settings: Settings, mode: PlayMode): ModeRewards {
  switch (mode) {
    case "listen":
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

export function modeTitle(mode: PlayMode): string {
  return PLAY_MODES.find((item) => item.id === mode)?.title ?? "Игра";
}
