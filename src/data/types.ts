export type EventKind =
  | "seed"
  | "ok"
  | "bad"
  | "hint"
  | "shop"
  | "pay"
  | "add"
  | "rst"
  | "set"
  | "dic"
  | "photo";

export type Settings = {
  /** Режим «Глаз» */
  rewardCorrect: number;
  rewardStreak: number;
  penaltyWrong: number;
  /** Режим «Слух» */
  listenRewardCorrect: number;
  listenRewardStreak: number;
  listenPenaltyWrong: number;
  /** Режим «Ударение» */
  stressRewardCorrect: number;
  stressRewardStreak: number;
  stressPenaltyWrong: number;
  /** Режим «Буквы» */
  letterRewardCorrect: number;
  letterRewardStreak: number;
  letterPenaltyWrong: number;
  hintPrice: number;
  hintPackPrice: number;
  /** Оценка фото 1–5 → начисление ₽ */
  grade1: number;
  grade2: number;
  grade3: number;
  grade4: number;
  grade5: number;
  parentPassword: string;
};

export type GameEvent = {
  id: string;
  ts: number;
  kind: EventKind;
  word?: string;
  shown?: string;
  expected?: string;
  choice?: string;
  errorType?: string;
  detail?: string;
  moneyDelta: number;
  hintDelta?: number;
  reason?: string;
  device?: string;
};

export type WordStat = {
  word: string;
  seen: number;
  ok: number;
  bad: number;
  lastTs?: number;
  lastShown?: string;
};

export type PhotoStatus = "wait" | "done" | "gone";

export type PhotoItem = {
  id: string;
  ts: number;
  status: PhotoStatus;
  grade: number;
  url: string;
  note?: string;
};

export type SharedState = {
  money: number;
  hints: number;
  settings: Settings;
  events: GameEvent[];
  wordStats: Record<string, WordStat>;
  /** Последние id ходов из meta — чтобы не начислить один ход дважды */
  recentIds?: string[];
};

export const DEFAULT_SETTINGS: Settings = {
  rewardCorrect: 5,
  rewardStreak: 10,
  penaltyWrong: 3,
  listenRewardCorrect: 7,
  listenRewardStreak: 12,
  listenPenaltyWrong: 3,
  stressRewardCorrect: 5,
  stressRewardStreak: 10,
  stressPenaltyWrong: 3,
  letterRewardCorrect: 5,
  letterRewardStreak: 10,
  letterPenaltyWrong: 3,
  hintPrice: 15,
  hintPackPrice: 40,
  grade1: 10,
  grade2: 25,
  grade3: 40,
  grade4: 60,
  grade5: 100,
  parentPassword: "654321",
};

export const START_BALANCE = 2000;
export const START_HINTS = 3;
export const PARENT_PASSWORD = "654321";
export const CLOUD_APP_KEY = "yr4anjeb";

/** ImgBB API key — можно переопределить localStorage dictation_imgbb */
export const IMGBB_API_KEY = "";
