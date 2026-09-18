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
  /** Математика: награды за исход попытки */
  mathRewardFirst: number;
  mathRewardRetry: number;
  mathRewardHint: number;
  mathRewardGaveUp: number;
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

/** Результат диктанта с клавиатуры — папа видит ошибки и ставит оценку. */
export type DicAnswer = {
  word: string;
  input: string;
  ok: boolean;
};

export type DicReport = {
  id: string;
  ts: number;
  status: PhotoStatus;
  grade: number;
  ok: number;
  total: number;
  answers: DicAnswer[];
};

/** Задание «на сегодня» от папы — русский / математика / своё. */
export type TaskKind =
  | "ru_eye"
  | "ru_listen"
  | "ru_stress"
  | "ru_letter"
  | "ru_dictation"
  | "math_today"
  | "math_calc"
  | "math_table"
  | "custom";

export type TaskStatus = "wait" | "done";

export type TodayTask = {
  id: string;
  /** YYYY-MM-DD локальный день */
  day: string;
  kind: TaskKind;
  title: string;
  /** Целые ₽ при сдаче: плюс или минус */
  reward: number;
  status: TaskStatus;
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
  /** 1 кол / 2 двойка = минус; 3 = 0; 4–5 = плюс */
  grade1: -20,
  grade2: -10,
  grade3: 0,
  grade4: 20,
  grade5: 30,
  parentPassword: "654321",
  mathRewardFirst: 2,
  mathRewardRetry: 1,
  mathRewardHint: 0,
  mathRewardGaveUp: 0,
};

export const START_BALANCE = 2000;
export const START_HINTS = 3;
export const PARENT_PASSWORD = "654321";
export const CLOUD_APP_KEY = "yr4anjeb";

/** ImgBB API key — можно переопределить localStorage dictation_imgbb */
export const IMGBB_API_KEY = "";
