export type EventKind =
  | "seed"
  | "ok"
  | "bad"
  | "hint"
  | "shop"
  | "pay"
  | "rst"
  | "set";

export type Settings = {
  rewardCorrect: number;
  rewardStreak: number;
  penaltyWrong: number;
  hintPrice: number;
  hintPackPrice: number;
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
  hintPrice: 15,
  hintPackPrice: 40,
  parentPassword: "654321",
};

export const START_BALANCE = 2000;
export const START_HINTS = 3;
export const PARENT_PASSWORD = "654321";
export const CLOUD_APP_KEY = "yr4anjeb";
