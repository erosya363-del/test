import {
  CLOUD_APP_KEY,
  DEFAULT_SETTINGS,
  START_BALANCE,
  START_HINTS,
  type DicAnswer,
  type DicReport,
  type EventKind,
  type GameEvent,
  type PhotoItem,
  type PhotoStatus,
  type Settings,
  type SharedState,
  type TaskKind,
  type TaskStatus,
  type TodayTask,
  type WordStat,
} from "./types";

const BASE = "https://keyvalue.immanuel.co/api/KeyVal";
const META_KEY = "meta";
const STATS_KEY = "stats";
const LOCK_KEY = "lock";
const EIDS_KEY = "eids";
const DECK_KEY = "deck";
const PHOTOS_KEY = "photos";
const BELL_KEY = "bell";
const IMGBB_KEY = "imgbb";
const DICS_KEY = "dics";
const TASKS_KEY = "tasks";
const MATH_STATS_KEY = "mstat";
const MATH_STATES_KEY = "mstates";
const LOG_KEYS = ["l0", "l1", "l2", "l3", "l4", "l5", "l6", "l7"] as const;
const EVENTS_PER_LOG = 8;
/** Пустой слот: API не любит пустую строку, а "-" раньше ломал разбор. */
const EMPTY_SLOT = ".";
const LOCK_TTL_MS = 8000;

/** Общий раунд: порядок слов и позиция — одна на все телефоны. */
export type RoundDeck = {
  ids: number[];
  pos: number;
  updatedAt: number;
  seed: string;
};

export function hexEncode(text: string): string {
  return Array.from(new TextEncoder().encode(text))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

function hexDecode(hex: string): string {
  if (!hex) return "";
  const bytes = new Uint8Array(hex.match(/.{1,2}/g)?.map((pair) => parseInt(pair, 16)) ?? []);
  return new TextDecoder().decode(bytes);
}

function unwrap(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return "";
  try {
    const parsed = JSON.parse(trimmed);
    if (Array.isArray(parsed)) return String(parsed[0] ?? "");
    if (typeof parsed === "string") return parsed;
  } catch {
    /* raw string */
  }
  return trimmed.replace(/^\[?"|"\]?$/g, "");
}

function isEmptySlot(value: string): boolean {
  return !value || value === "." || value === "-" || value === "x" || value === "null" || value === "undefined";
}

async function cloudGet(key: string): Promise<string> {
  const stamp = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  // Без Cache-Control/Pragma: они включают CORS preflight, а API его не отдаёт → Failed to fetch.
  const response = await fetch(`${BASE}/GetValue/${CLOUD_APP_KEY}/${key}?t=${stamp}`, {
    cache: "no-store",
  });
  // Пустой ключ у этого API даёт 500 DBNull. Это не «базы нет».
  if (response.status === 404 || response.status === 500) {
    return "";
  }
  if (!response.ok) {
    throw new Error("Не удалось прочитать общую базу");
  }
  const value = unwrap(await response.text());
  return isEmptySlot(value) ? "" : value;
}

async function cloudSet(key: string, value: string): Promise<void> {
  const body = value && !isEmptySlot(value) ? value.slice(0, 1000) : EMPTY_SLOT;
  const url = `${BASE}/UpdateValue/${CLOUD_APP_KEY}/${key}/${encodeURIComponent(body)}?t=${Date.now()}`;
  const response = await fetch(url, {
    method: "POST",
    cache: "no-store",
  });
  if (!response.ok) {
    throw new Error("Не удалось сохранить в общую базу");
  }
}

function encodeMeta(state: SharedState, updatedAt = Date.now()): string {
  const s = state.settings;
  return [
    `m=${state.money}`,
    `h=${state.hints}`,
    `rc=${s.rewardCorrect}`,
    `rs=${s.rewardStreak}`,
    `pw=${s.penaltyWrong}`,
    `lrc=${s.listenRewardCorrect}`,
    `lrs=${s.listenRewardStreak}`,
    `lpw=${s.listenPenaltyWrong}`,
    `src=${s.stressRewardCorrect}`,
    `srs=${s.stressRewardStreak}`,
    `spw=${s.stressPenaltyWrong}`,
    `brc=${s.letterRewardCorrect}`,
    `brs=${s.letterRewardStreak}`,
    `bpw=${s.letterPenaltyWrong}`,
    `hp=${s.hintPrice}`,
    `hpp=${s.hintPackPrice}`,
    `g1=${s.grade1}`,
    `g2=${s.grade2}`,
    `g3=${s.grade3}`,
    `g4=${s.grade4}`,
    `g5=${s.grade5}`,
    `mrf=${s.mathRewardFirst ?? 2}`,
    `mrr=${s.mathRewardRetry ?? 1}`,
    `mrh=${s.mathRewardHint ?? 0}`,
    `mrg=${s.mathRewardGaveUp ?? 0}`,
    `pp=${hexEncode(s.parentPassword || DEFAULT_SETTINGS.parentPassword)}`,
    `u=${updatedAt}`,
  ].join(";");
}

function parseMetaMap(raw: string): Record<string, string> | null {
  if (isEmptySlot(raw) || !raw.includes("m=")) return null;
  return Object.fromEntries(
    raw.split(";").map((part) => {
      const idx = part.indexOf("=");
      return idx === -1 ? [part, ""] : [part.slice(0, idx), part.slice(idx + 1)];
    }),
  );
}

function decodeMeta(
  raw: string,
): (Pick<SharedState, "money" | "hints" | "settings"> & { updatedAt: number }) | null {
  const map = parseMetaMap(raw);
  if (!map) return null;
  const settings = {
      rewardCorrect: Number(map.rc ?? DEFAULT_SETTINGS.rewardCorrect),
      rewardStreak: Number(map.rs ?? DEFAULT_SETTINGS.rewardStreak),
      penaltyWrong: Number(map.pw ?? DEFAULT_SETTINGS.penaltyWrong),
      listenRewardCorrect: Number(map.lrc ?? DEFAULT_SETTINGS.listenRewardCorrect),
      listenRewardStreak: Number(map.lrs ?? DEFAULT_SETTINGS.listenRewardStreak),
      listenPenaltyWrong: Number(map.lpw ?? DEFAULT_SETTINGS.listenPenaltyWrong),
      stressRewardCorrect: Number(map.src ?? DEFAULT_SETTINGS.stressRewardCorrect),
      stressRewardStreak: Number(map.srs ?? DEFAULT_SETTINGS.stressRewardStreak),
      stressPenaltyWrong: Number(map.spw ?? DEFAULT_SETTINGS.stressPenaltyWrong),
      letterRewardCorrect: Number(map.brc ?? DEFAULT_SETTINGS.letterRewardCorrect),
      letterRewardStreak: Number(map.brs ?? DEFAULT_SETTINGS.letterRewardStreak),
      letterPenaltyWrong: Number(map.bpw ?? DEFAULT_SETTINGS.letterPenaltyWrong),
      hintPrice: Number(map.hp ?? DEFAULT_SETTINGS.hintPrice),
      hintPackPrice: Number(map.hpp ?? DEFAULT_SETTINGS.hintPackPrice),
      grade1: Number(map.g1 ?? DEFAULT_SETTINGS.grade1),
      grade2: Number(map.g2 ?? DEFAULT_SETTINGS.grade2),
      grade3: Number(map.g3 ?? DEFAULT_SETTINGS.grade3),
      grade4: Number(map.g4 ?? DEFAULT_SETTINGS.grade4),
      grade5: Number(map.g5 ?? DEFAULT_SETTINGS.grade5),
      mathRewardFirst: Number(map.mrf ?? DEFAULT_SETTINGS.mathRewardFirst),
      mathRewardRetry: Number(map.mrr ?? DEFAULT_SETTINGS.mathRewardRetry),
      mathRewardHint: Number(map.mrh ?? DEFAULT_SETTINGS.mathRewardHint),
      mathRewardGaveUp: Number(map.mrg ?? DEFAULT_SETTINGS.mathRewardGaveUp),
      parentPassword: map.pp ? hexDecode(map.pp) : DEFAULT_SETTINGS.parentPassword,
    };
  // Старые дефолты оценок (10…100) → новые (−20…+30)
  if (
    settings.grade1 === 10 &&
    settings.grade2 === 25 &&
    settings.grade3 === 40 &&
    settings.grade4 === 60 &&
    settings.grade5 === 100
  ) {
    settings.grade1 = DEFAULT_SETTINGS.grade1;
    settings.grade2 = DEFAULT_SETTINGS.grade2;
    settings.grade3 = DEFAULT_SETTINGS.grade3;
    settings.grade4 = DEFAULT_SETTINGS.grade4;
    settings.grade5 = DEFAULT_SETTINGS.grade5;
  }
  return {
    money: Number(map.m ?? 0),
    hints: Number(map.h ?? START_HINTS),
    updatedAt: Number(map.u ?? 0),
    settings,
  };
}

function encodeStats(stats: Record<string, WordStat>): string {
  const parts = Object.values(stats).map(
    (item) => `${hexEncode(item.word)}:${item.seen},${item.ok},${item.bad},${item.lastTs ?? 0}`,
  );
  let packed = parts.join("|");
  while (packed.length > 1000 && parts.length > 1) {
    parts.pop();
    packed = parts.join("|");
  }
  return packed;
}

function decodeStats(raw: string): Record<string, WordStat> {
  const stats: Record<string, WordStat> = {};
  if (isEmptySlot(raw)) return stats;
  for (const part of raw.split("|")) {
    const [wordHex, nums] = part.split(":");
    if (!wordHex || !nums) continue;
    const [seen, ok, bad, lastTs] = nums.split(",").map(Number);
    const word = hexDecode(wordHex);
    if (!word) continue;
    stats[word] = { word, seen: seen || 0, ok: ok || 0, bad: bad || 0, lastTs: lastTs || 0 };
  }
  return stats;
}

function encodeEvent(event: GameEvent): string {
  return [
    event.id,
    String(event.ts),
    event.kind,
    hexEncode(event.word ?? ""),
    hexEncode(event.shown ?? ""),
    hexEncode(event.expected ?? ""),
    hexEncode(event.choice ?? ""),
    hexEncode(event.errorType ?? ""),
    hexEncode(event.detail ?? ""),
    String(event.moneyDelta),
    String(event.hintDelta ?? 0),
    hexEncode(event.reason ?? ""),
    hexEncode(event.device ?? ""),
  ].join("~");
}

function decodeEvent(raw: string): GameEvent | null {
  if (isEmptySlot(raw) || !raw.includes("~")) return null;
  const p = raw.split("~");
  if (p.length < 10) return null;
  const kind = p[2] as EventKind;
  return {
    id: p[0],
    ts: Number(p[1]),
    kind,
    word: hexDecode(p[3]) || undefined,
    shown: hexDecode(p[4]) || undefined,
    expected: hexDecode(p[5]) || undefined,
    choice: hexDecode(p[6]) || undefined,
    errorType: hexDecode(p[7]) || undefined,
    detail: hexDecode(p[8]) || undefined,
    moneyDelta: Number(p[9]),
    hintDelta: Number(p[10] || 0),
    reason: hexDecode(p[11]) || undefined,
    device: hexDecode(p[12]) || undefined,
  };
}

function encodeLog(events: GameEvent[]): string {
  const packed: string[] = [];
  for (const event of events) {
    const next = encodeEvent(event);
    const candidate = packed.length ? `${packed.join("/")}/${next}` : next;
    if (candidate.length > 1000) break;
    packed.push(next);
  }
  return packed.join("/");
}

function decodeLog(raw: string): GameEvent[] {
  if (isEmptySlot(raw)) return [];
  return raw
    .split("/")
    .map(decodeEvent)
    .filter((event): event is GameEvent => Boolean(event));
}

export function emptyState(): SharedState {
  return {
    money: 0,
    hints: START_HINTS,
    settings: { ...DEFAULT_SETTINGS },
    events: [],
    wordStats: {},
    recentIds: [],
  };
}

export function applyRemoteEvent(remote: SharedState, event: GameEvent, local: SharedState): SharedState {
  const known = new Set([...(remote.recentIds ?? []), ...remote.events.map((item) => item.id)]);
  if (known.has(event.id)) {
    return remote;
  }
  const nextStats = { ...remote.wordStats };
  if ((event.kind === "ok" || event.kind === "bad") && event.word) {
    const prev = nextStats[event.word] ?? { word: event.word, seen: 0, ok: 0, bad: 0 };
    nextStats[event.word] = {
      word: event.word,
      seen: prev.seen + 1,
      ok: prev.ok + (event.kind === "ok" ? 1 : 0),
      bad: prev.bad + (event.kind === "bad" ? 1 : 0),
      lastTs: event.ts,
      lastShown: event.shown ?? prev.lastShown,
    };
  }
  const recentIds = [event.id, ...(remote.recentIds ?? [])].filter((id, index, all) => all.indexOf(id) === index).slice(0, 8);
  return {
    money: Math.max(0, remote.money + event.moneyDelta),
    hints: Math.max(0, remote.hints + (event.hintDelta ?? 0)),
    settings: event.kind === "set" ? local.settings : remote.settings,
    events: [...remote.events, event].sort((a, b) => a.ts - b.ts || a.id.localeCompare(b.id)),
    wordStats: nextStats,
    recentIds,
  };
}

export function replay(events: GameEvent[], settings = DEFAULT_SETTINGS): SharedState {
  const sorted = [...events].sort((a, b) => a.ts - b.ts || a.id.localeCompare(b.id));
  let money = 0;
  let hints = START_HINTS;
  const wordStats: Record<string, WordStat> = {};
  let currentSettings = { ...settings };

  for (const event of sorted) {
    if (event.kind === "set" && event.detail) {
      const p = event.detail.split(",");
      const [
        rc,
        rs,
        pw,
        hp,
        hpp,
        passHex,
        lrc,
        lrs,
        lpw,
        src,
        srs,
        spw,
        brc,
        brs,
        bpw,
        g1,
        g2,
        g3,
        g4,
        g5,
      ] = p;
      currentSettings = {
        rewardCorrect: Number(rc) || currentSettings.rewardCorrect,
        rewardStreak: Number(rs) || currentSettings.rewardStreak,
        penaltyWrong: Number(pw) || currentSettings.penaltyWrong,
        hintPrice: Number(hp) || currentSettings.hintPrice,
        hintPackPrice: Number(hpp) || currentSettings.hintPackPrice,
        parentPassword: passHex ? hexDecode(passHex) : currentSettings.parentPassword,
        listenRewardCorrect: Number(lrc) || currentSettings.listenRewardCorrect,
        listenRewardStreak: Number(lrs) || currentSettings.listenRewardStreak,
        listenPenaltyWrong: Number(lpw) || currentSettings.listenPenaltyWrong,
        stressRewardCorrect: Number(src) || currentSettings.stressRewardCorrect,
        stressRewardStreak: Number(srs) || currentSettings.stressRewardStreak,
        stressPenaltyWrong: Number(spw) || currentSettings.stressPenaltyWrong,
        letterRewardCorrect: Number(brc) || currentSettings.letterRewardCorrect,
        letterRewardStreak: Number(brs) || currentSettings.letterRewardStreak,
        letterPenaltyWrong: Number(bpw) || currentSettings.letterPenaltyWrong,
        grade1: Number.isFinite(Number(g1)) ? Number(g1) : currentSettings.grade1,
        grade2: Number.isFinite(Number(g2)) ? Number(g2) : currentSettings.grade2,
        grade3: Number.isFinite(Number(g3)) ? Number(g3) : currentSettings.grade3,
        grade4: Number.isFinite(Number(g4)) ? Number(g4) : currentSettings.grade4,
        grade5: Number.isFinite(Number(g5)) ? Number(g5) : currentSettings.grade5,
        mathRewardFirst: currentSettings.mathRewardFirst ?? DEFAULT_SETTINGS.mathRewardFirst,
        mathRewardRetry: currentSettings.mathRewardRetry ?? DEFAULT_SETTINGS.mathRewardRetry,
        mathRewardHint: currentSettings.mathRewardHint ?? DEFAULT_SETTINGS.mathRewardHint,
        mathRewardGaveUp: currentSettings.mathRewardGaveUp ?? DEFAULT_SETTINGS.mathRewardGaveUp,
      };
    }
    money = Math.max(0, money + event.moneyDelta);
    hints = Math.max(0, hints + (event.hintDelta ?? 0));
    if ((event.kind === "ok" || event.kind === "bad") && event.word) {
      const row = wordStats[event.word] ?? { word: event.word, seen: 0, ok: 0, bad: 0 };
      row.seen += 1;
      if (event.kind === "ok") row.ok += 1;
      else row.bad += 1;
      row.lastTs = event.ts;
      row.lastShown = event.shown;
      wordStats[event.word] = row;
    }
  }

  return { money, hints, settings: currentSettings, events: sorted, wordStats };
}

export function mergeStats(remote: Record<string, WordStat>, local: Record<string, WordStat>): Record<string, WordStat> {
  const merged: Record<string, WordStat> = { ...remote };
  for (const [word, row] of Object.entries(local)) {
    const prev = merged[word];
    if (!prev) {
      merged[word] = row;
      continue;
    }
    const localNewer = (row.lastTs ?? 0) >= (prev.lastTs ?? 0);
    merged[word] = {
      word,
      seen: Math.max(prev.seen, row.seen),
      ok: Math.max(prev.ok, row.ok),
      bad: Math.max(prev.bad, row.bad),
      lastTs: Math.max(prev.lastTs ?? 0, row.lastTs ?? 0),
      lastShown: localNewer ? row.lastShown : prev.lastShown,
    };
  }
  return merged;
}

export function mergeIncoming(remote: SharedState, incoming: GameEvent[], local: SharedState): SharedState {
  let merged = remote;
  for (const event of incoming) {
    merged = applyRemoteEvent(merged, event, local);
  }
  return merged;
}

export async function peekCloudMeta(): Promise<{
  money: number;
  hints: number;
  updatedAt: number;
  settings: Settings;
  recentIds: string[];
} | null> {
  const [raw, eidsRaw] = await Promise.all([cloudGet(META_KEY), cloudGet(EIDS_KEY)]);
  const meta = decodeMeta(raw);
  if (!meta) return null;
  return {
    money: meta.money,
    hints: meta.hints,
    updatedAt: meta.updatedAt,
    settings: meta.settings,
    recentIds: isEmptySlot(eidsRaw) ? [] : eidsRaw.split("_").filter(Boolean).slice(0, 8),
  };
}

/** Только meta — быстрый путь для ярлыков iPhone, даже если журнал 500. */
export async function loadCloudMetaState(): Promise<SharedState | null> {
  const meta = await peekCloudMeta();
  if (!meta) return null;
  return {
    ...emptyState(),
    money: meta.money,
    hints: meta.hints,
    settings: meta.settings,
    recentIds: meta.recentIds,
  };
}

export async function loadCloud(): Promise<SharedState | null> {
  const [metaRaw, eidsRaw] = await Promise.all([cloudGet(META_KEY), cloudGet(EIDS_KEY)]);
  const meta = decodeMeta(metaRaw);
  if (!meta) return null;
  const recentIds = isEmptySlot(eidsRaw) ? [] : eidsRaw.split("_").filter(Boolean).slice(0, 8);

  let statsRaw = "";
  let logsRaw: string[] = LOG_KEYS.map(() => "");
  try {
    [statsRaw, ...logsRaw] = await Promise.all([
      cloudGet(STATS_KEY),
      ...LOG_KEYS.map((key) => cloudGet(key)),
    ]);
  } catch {
    return {
      ...emptyState(),
      money: meta.money,
      hints: meta.hints,
      settings: meta.settings,
      recentIds,
    };
  }

  const events = logsRaw.flatMap(decodeLog);
  const unique = new Map(events.map((event) => [event.id, event]));
  const uniqueEvents = [...unique.values()];
  const state = replay(uniqueEvents, meta.settings);
  if (Object.keys(state.wordStats).length === 0) {
    state.wordStats = decodeStats(statsRaw);
  }
  state.money = meta.money;
  state.hints = meta.hints;
  state.settings = meta.settings;
  state.recentIds = recentIds;
  return state;
}

export async function saveCloud(state: SharedState): Promise<void> {
  const updatedAt = Date.now();
  const recentIds = (state.recentIds ?? []).slice(0, 8);
  // Сначала id хода — иначе при повторе тот же ход начислится дважды.
  try {
    await cloudSet(EIDS_KEY, recentIds.join("_") || EMPTY_SLOT);
  } catch {
    /* eids */
  }
  await cloudSet(META_KEY, encodeMeta(state, updatedAt));
  const verify = await cloudGet(META_KEY).then(decodeMeta);
  if (!verify || verify.money !== state.money || verify.hints !== state.hints) {
    throw new Error("Облако не подтвердило баланс");
  }

  const stats = encodeStats(state.wordStats);
  try {
    await cloudSet(STATS_KEY, stats);
  } catch {
    /* журнал слов не должен ронять баланс */
  }

  const newest = [...state.events].sort((a, b) => b.ts - a.ts);
  await Promise.all(
    LOG_KEYS.map(async (key, index) => {
      const packed = encodeLog(newest.slice(index * EVENTS_PER_LOG, (index + 1) * EVENTS_PER_LOG));
      try {
        await cloudSet(key, packed);
      } catch {
        /* кусок журнала мог не влезть — meta уже записана */
      }
    }),
  );
}

async function acquireCloudLock(owner: string): Promise<boolean> {
  const existing = await cloudGet(LOCK_KEY);
  if (existing && existing.includes("|")) {
    const ts = Number(existing.split("|")[1] ?? 0);
    if (ts && Date.now() - ts < LOCK_TTL_MS && !existing.startsWith(`${owner}|`)) {
      return false;
    }
  }
  const stamp = `${owner}|${Date.now()}|${Math.random().toString(36).slice(2, 7)}`;
  await cloudSet(LOCK_KEY, stamp);
  await new Promise((resolve) => setTimeout(resolve, 160));
  const raw = await cloudGet(LOCK_KEY);
  return raw === stamp;
}

async function releaseCloudLock(owner: string): Promise<void> {
  const raw = await cloudGet(LOCK_KEY);
  if (raw && raw.startsWith(`${owner}|`)) {
    await cloudSet(LOCK_KEY, EMPTY_SLOT);
  }
}

/** Запись события поверх свежей meta. Замок + повтор, чтобы два ярлыка не затирали плюс/минус. */
export async function commitEvent(event: GameEvent, local: SharedState): Promise<SharedState> {
  let lastError: unknown;
  const owner = `${event.id}`;
  const deadline = Date.now() + 22_000;
  for (let attempt = 0; attempt < 8; attempt += 1) {
    if (Date.now() > deadline) break;
    try {
      const locked = await acquireCloudLock(owner);
      if (!locked) {
        await new Promise((resolve) => setTimeout(resolve, 100 + attempt * 70));
        continue;
      }
      try {
        const remote = (await loadCloud()) ?? (await loadCloudMetaState());
        if (!remote) {
          throw new Error("Общая база пуста");
        }
        if ((remote.recentIds ?? []).includes(event.id) || remote.events.some((item) => item.id === event.id)) {
          return remote;
        }
        const merged = applyRemoteEvent(remote, event, local);
        await saveCloud(merged);
        const check = await peekCloudMeta();
        if (!check) {
          throw new Error("Гонка записи, повторяем");
        }
        if (check.money === merged.money && check.hints === merged.hints) {
          return { ...merged, recentIds: check.recentIds.length ? check.recentIds : merged.recentIds };
        }
        // Meta уже могла принять наш ход, а verify прочитал чужой кадр — не дублируем.
        if ((check.recentIds ?? []).includes(event.id)) {
          return {
            ...merged,
            money: check.money,
            hints: check.hints,
            settings: check.settings,
            recentIds: check.recentIds,
          };
        }
        throw new Error("Гонка записи, повторяем");
      } finally {
        await releaseCloudLock(owner);
      }
    } catch (error) {
      lastError = error;
      await new Promise((resolve) => setTimeout(resolve, 120 + attempt * 80));
    }
  }
  throw lastError instanceof Error ? lastError : new Error("Не удалось записать в облако");
}

export async function ensureCloudSeeded(): Promise<SharedState> {
  const existing = (await loadCloud()) ?? (await loadCloudMetaState());
  if (existing) return existing;

  const seed: GameEvent = {
    id: newId(),
    ts: Date.now(),
    kind: "seed",
    moneyDelta: START_BALANCE,
    reason: "Стартовый баланс",
    device: "boot",
  };
  const initial: SharedState = {
    ...emptyState(),
    money: START_BALANCE,
    events: [seed],
  };
  await saveCloud(initial);
  return initial;
}

export function mergeStates(remote: SharedState, incoming: GameEvent[]): SharedState {
  return mergeIncoming(remote, incoming, remote);
}

export function newId(): string {
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}

export function deviceId(): string {
  const key = "dictation_device";
  const existing = localStorage.getItem(key);
  if (existing) return existing;
  const created = newId();
  localStorage.setItem(key, created);
  return created;
}

function encodeDeck(deck: RoundDeck): string {
  return [
    "v=1",
    `pos=${Math.max(0, Math.floor(deck.pos))}`,
    `u=${deck.updatedAt || Date.now()}`,
    `seed=${deck.seed || EMPTY_SLOT}`,
    `ids=${deck.ids.map((n) => Math.max(0, Math.floor(n))).join("_")}`,
  ].join(";");
}

function decodeDeck(raw: string): RoundDeck | null {
  if (isEmptySlot(raw) || !raw.includes("ids=")) return null;
  const map = Object.fromEntries(
    raw.split(";").map((part) => {
      const idx = part.indexOf("=");
      return idx === -1 ? [part, ""] : [part.slice(0, idx), part.slice(idx + 1)];
    }),
  );
  const ids = (map.ids ?? "")
    .split("_")
    .map((n) => Number(n))
    .filter((n) => Number.isFinite(n) && n >= 0);
  if (ids.length === 0) return null;
  // pos === ids.length значит раунд закончен; иначе clamp в границы колоды.
  const rawPos = Math.max(0, Number(map.pos ?? 0) || 0);
  const pos = Math.min(rawPos, ids.length);
  return {
    ids,
    pos,
    updatedAt: Number(map.u ?? 0) || 0,
    seed: map.seed && map.seed !== EMPTY_SLOT ? map.seed : "",
  };
}

export async function loadDeck(): Promise<RoundDeck | null> {
  try {
    const raw = await cloudGet(DECK_KEY);
    return decodeDeck(raw);
  } catch {
    return null;
  }
}

export async function saveDeck(deck: RoundDeck): Promise<void> {
  await cloudSet(DECK_KEY, encodeDeck({ ...deck, updatedAt: deck.updatedAt || Date.now() }));
}

export async function clearDeck(): Promise<void> {
  await cloudSet(DECK_KEY, EMPTY_SLOT);
}

/** Запись колоды под замком — два телефона не создают два разных раунда. */
export async function commitDeck(
  mutate: (current: RoundDeck | null) => RoundDeck | null,
): Promise<RoundDeck | null> {
  let lastError: unknown;
  const owner = `deck_${newId()}`;
  for (let attempt = 0; attempt < 10; attempt += 1) {
    try {
      const locked = await acquireCloudLock(owner);
      if (!locked) {
        await new Promise((resolve) => setTimeout(resolve, 100 + attempt * 70));
        continue;
      }
      try {
        const current = await loadDeck();
        const next = mutate(current);
        if (next === null) {
          await clearDeck();
          return null;
        }
        const stamped = { ...next, updatedAt: Date.now() };
        await saveDeck(stamped);
        const check = await loadDeck();
        if (
          check &&
          check.pos === stamped.pos &&
          check.ids.length === stamped.ids.length &&
          check.ids.every((id, i) => id === stamped.ids[i])
        ) {
          return check;
        }
        throw new Error("Гонка колоды, повторяем");
      } finally {
        await releaseCloudLock(owner);
      }
    } catch (error) {
      lastError = error;
      await new Promise((resolve) => setTimeout(resolve, 120 + attempt * 80));
    }
  }
  throw lastError instanceof Error ? lastError : new Error("Не удалось сохранить колоду");
}

export function shuffleWordIds(wordCount: number, take = 50): number[] {
  const baseOrder = [...Array(Math.max(0, wordCount)).keys()];
  for (let i = baseOrder.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [baseOrder[i], baseOrder[j]] = [baseOrder[j], baseOrder[i]];
  }
  return baseOrder.slice(0, Math.min(take, baseOrder.length));
}

function statusToCode(status: PhotoStatus): string {
  if (status === "done") return "d";
  if (status === "gone") return "g";
  return "w";
}

function codeToStatus(code: string): PhotoStatus {
  if (code === "d") return "done";
  if (code === "g") return "gone";
  return "wait";
}

export function encodePhotos(items: PhotoItem[]): string {
  const newest = [...items].filter((item) => item.status !== "gone").sort((a, b) => b.ts - a.ts);
  const parts: string[] = [];
  for (const item of newest) {
    const row = `${item.id}_${item.ts}_${statusToCode(item.status)}_${Math.max(0, item.grade)}_${hexEncode(item.url)}`;
    const next = parts.length ? `${parts.join("|")}|${row}` : row;
    if (next.length > 1000) {
      if (parts.length === 0) {
        throw new Error("Фото слишком длинное для облака");
      }
      break;
    }
    parts.push(row);
  }
  return parts.join("|");
}

export function decodePhotos(raw: string): PhotoItem[] {
  if (isEmptySlot(raw)) return [];
  const out: PhotoItem[] = [];
  for (const part of raw.split("|")) {
    const chunks = part.split("_");
    if (chunks.length < 5) continue;
    const [id, tsRaw, st, gradeRaw, ...urlParts] = chunks;
    const urlHex = urlParts.join("_");
    const url = hexDecode(urlHex);
    if (!id || !url) continue;
    out.push({
      id,
      ts: Number(tsRaw) || 0,
      status: codeToStatus(st),
      grade: Number(gradeRaw) || 0,
      url,
    });
  }
  return out.sort((a, b) => b.ts - a.ts);
}

export async function loadPhotos(): Promise<PhotoItem[]> {
  try {
    return decodePhotos(await cloudGet(PHOTOS_KEY));
  } catch {
    return [];
  }
}

export async function savePhotos(items: PhotoItem[]): Promise<void> {
  const packed = encodePhotos(items);
  await cloudSet(PHOTOS_KEY, packed || EMPTY_SLOT);
}

export async function commitPhotos(
  mutate: (current: PhotoItem[]) => PhotoItem[],
): Promise<PhotoItem[]> {
  let lastError: unknown;
  const owner = `photo_${newId()}`;
  const deadline = Date.now() + 18_000;
  for (let attempt = 0; attempt < 6; attempt += 1) {
    if (Date.now() > deadline) break;
    try {
      const locked = await acquireCloudLock(owner);
      if (!locked) {
        await new Promise((resolve) => setTimeout(resolve, 100 + attempt * 70));
        continue;
      }
      try {
        const current = await loadPhotos();
        const next = mutate(current);
        await savePhotos(next);
        return await loadPhotos();
      } finally {
        await releaseCloudLock(owner);
      }
    } catch (error) {
      lastError = error;
      await new Promise((resolve) => setTimeout(resolve, 120 + attempt * 80));
    }
  }
  throw lastError instanceof Error
    ? lastError
    : new Error("Не удалось сохранить фото в общую базу. Попробуй ещё раз");
}

export async function loadBellSeen(): Promise<number> {
  try {
    const raw = await cloudGet(BELL_KEY);
    const n = Number(raw);
    return Number.isFinite(n) ? n : 0;
  } catch {
    return 0;
  }
}

export async function saveBellSeen(ts: number): Promise<void> {
  await cloudSet(BELL_KEY, String(Math.max(0, Math.floor(ts))));
}

/** Ключ ImgBB в облаке — один на семью (папа сохранил → сын грузит). */
export async function loadImgbbApiKey(): Promise<string> {
  try {
    const raw = await cloudGet(IMGBB_KEY);
    if (isEmptySlot(raw)) return "";
    return hexDecode(raw) || "";
  } catch {
    return "";
  }
}

export async function saveImgbbApiKey(key: string): Promise<void> {
  const trimmed = key.trim();
  await cloudSet(IMGBB_KEY, trimmed ? hexEncode(trimmed) : EMPTY_SLOT);
}

function encodeDicAnswers(answers: DicAnswer[]): string {
  const compact = answers
    .map((row) => `${row.word.replace(/[,;]/g, "")},${row.input.replace(/[,;]/g, "")},${row.ok ? 1 : 0}`)
    .join(";");
  return hexEncode(compact);
}

function decodeDicAnswers(hex: string): DicAnswer[] {
  const raw = hexDecode(hex);
  if (!raw) return [];
  const out: DicAnswer[] = [];
  for (const part of raw.split(";")) {
    if (!part) continue;
    const [word, input, okRaw] = part.split(",");
    if (!word) continue;
    out.push({ word, input: input || "", ok: okRaw === "1" });
  }
  return out;
}

export function encodeDics(items: DicReport[]): string {
  const newest = [...items].filter((item) => item.status !== "gone").sort((a, b) => b.ts - a.ts);
  const parts: string[] = [];
  for (const item of newest) {
    const row = `${item.id}_${item.ts}_${statusToCode(item.status)}_${Math.max(0, item.grade)}_${item.ok}_${item.total}_${encodeDicAnswers(item.answers)}`;
    const next = parts.length ? `${parts.join("|")}|${row}` : row;
    if (next.length > 1000) {
      if (parts.length === 0) throw new Error("Диктант слишком длинный для облака");
      break;
    }
    parts.push(row);
  }
  return parts.join("|");
}

export function decodeDics(raw: string): DicReport[] {
  if (isEmptySlot(raw)) return [];
  const out: DicReport[] = [];
  for (const part of raw.split("|")) {
    const chunks = part.split("_");
    if (chunks.length < 7) continue;
    const [id, tsRaw, st, gradeRaw, okRaw, totalRaw, ...ansParts] = chunks;
    const answers = decodeDicAnswers(ansParts.join("_"));
    if (!id) continue;
    out.push({
      id,
      ts: Number(tsRaw) || 0,
      status: codeToStatus(st),
      grade: Number(gradeRaw) || 0,
      ok: Number(okRaw) || 0,
      total: Number(totalRaw) || answers.length,
      answers,
    });
  }
  return out.sort((a, b) => b.ts - a.ts);
}

export async function loadDics(): Promise<DicReport[]> {
  try {
    return decodeDics(await cloudGet(DICS_KEY));
  } catch {
    return [];
  }
}

export async function saveDics(items: DicReport[]): Promise<void> {
  const packed = encodeDics(items);
  await cloudSet(DICS_KEY, packed || EMPTY_SLOT);
}

export async function commitDics(
  mutate: (current: DicReport[]) => DicReport[],
): Promise<DicReport[]> {
  let lastError: unknown;
  const owner = `dic_${newId()}`;
  for (let attempt = 0; attempt < 8; attempt += 1) {
    try {
      const locked = await acquireCloudLock(owner);
      if (!locked) {
        await new Promise((resolve) => setTimeout(resolve, 100 + attempt * 70));
        continue;
      }
      try {
        const current = await loadDics();
        const next = mutate(current);
        await saveDics(next);
        return await loadDics();
      } finally {
        await releaseCloudLock(owner);
      }
    } catch (error) {
      lastError = error;
      await new Promise((resolve) => setTimeout(resolve, 120 + attempt * 80));
    }
  }
  throw lastError instanceof Error ? lastError : new Error("Не удалось сохранить диктант");
}

const TASK_KINDS: TaskKind[] = [
  "ru_eye",
  "ru_listen",
  "ru_stress",
  "ru_letter",
  "ru_dictation",
  "math_today",
  "math_calc",
  "math_table",
  "custom",
];

function kindToCode(kind: TaskKind): string {
  const idx = TASK_KINDS.indexOf(kind);
  return idx >= 0 ? String(idx) : "8";
}

function codeToKind(code: string): TaskKind {
  const idx = Number(code);
  return TASK_KINDS[idx] ?? "custom";
}

function taskStatusToCode(status: TaskStatus): string {
  return status === "done" ? "d" : "w";
}

function codeToTaskStatus(code: string): TaskStatus {
  return code === "d" ? "done" : "wait";
}

export function todayDayKey(d = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function encodeTasks(items: TodayTask[]): string {
  const newest = [...items].sort((a, b) => b.id.localeCompare(a.id));
  const parts: string[] = [];
  for (const item of newest) {
    const row = [
      item.id,
      item.day.replace(/-/g, ""),
      kindToCode(item.kind),
      taskStatusToCode(item.status),
      String(Math.trunc(item.reward)),
      hexEncode(item.title.slice(0, 40)),
    ].join("_");
    const next = parts.length ? `${parts.join("|")}|${row}` : row;
    if (next.length > 1000) {
      if (parts.length === 0) break;
      break;
    }
    parts.push(row);
  }
  return parts.join("|");
}

export function decodeTasks(raw: string): TodayTask[] {
  if (isEmptySlot(raw)) return [];
  const out: TodayTask[] = [];
  for (const part of raw.split("|")) {
    const chunks = part.split("_");
    if (chunks.length < 6) continue;
    const [id, dayRaw, kindCode, st, rewardRaw, ...titleParts] = chunks;
    if (!id || !dayRaw || dayRaw.length !== 8) continue;
    const day = `${dayRaw.slice(0, 4)}-${dayRaw.slice(4, 6)}-${dayRaw.slice(6, 8)}`;
    out.push({
      id,
      day,
      kind: codeToKind(kindCode),
      status: codeToTaskStatus(st),
      reward: Number(rewardRaw) || 0,
      title: hexDecode(titleParts.join("_")) || "Задание",
    });
  }
  return out;
}

export async function loadTasks(): Promise<TodayTask[]> {
  try {
    return decodeTasks(await cloudGet(TASKS_KEY));
  } catch {
    return [];
  }
}

export async function saveTasks(items: TodayTask[]): Promise<void> {
  const packed = encodeTasks(items);
  await cloudSet(TASKS_KEY, packed || EMPTY_SLOT);
}

export async function commitTasks(
  mutate: (current: TodayTask[]) => TodayTask[],
): Promise<TodayTask[]> {
  let lastError: unknown;
  const owner = `task_${newId()}`;
  for (let attempt = 0; attempt < 8; attempt += 1) {
    try {
      const locked = await acquireCloudLock(owner);
      if (!locked) {
        await new Promise((resolve) => setTimeout(resolve, 100 + attempt * 70));
        continue;
      }
      try {
        const current = await loadTasks();
        const next = mutate(current);
        await saveTasks(next);
        return await loadTasks();
      } finally {
        await releaseCloudLock(owner);
      }
    } catch (error) {
      lastError = error;
      await new Promise((resolve) => setTimeout(resolve, 120 + attempt * 80));
    }
  }
  throw lastError instanceof Error ? lastError : new Error("Не удалось сохранить задания");
}

export function autoTasksForDay(day: string): TodayTask[] {
  return [
    {
      id: newId(),
      day,
      kind: "math_today",
      title: "Математика · 10 заданий",
      reward: 20,
      status: "wait",
    },
    {
      id: newId(),
      day,
      kind: "ru_eye",
      title: "Русский · Глаз",
      reward: 15,
      status: "wait",
    },
    {
      id: newId(),
      day,
      kind: "ru_dictation",
      title: "Диктант 10",
      reward: 25,
      status: "wait",
    },
  ];
}

/** Экспорт для юнит-доказательств без сети. */
export const __deckTest = { encodeDeck, decodeDeck };
export const __photoTest = { encodePhotos, decodePhotos };
export const __tasksTest = { encodeTasks, decodeTasks };

/** Компактный слот математических навыков. */
export async function loadMathCloudStats(): Promise<string> {
  try {
    return await cloudGet(MATH_STATS_KEY);
  } catch {
    return "";
  }
}

export async function saveMathCloudStats(encoded: string): Promise<void> {
  try {
    await cloudSet(MATH_STATS_KEY, encoded || EMPTY_SLOT);
  } catch {
    /* не роняем игру из‑за статистики */
  }
}

export async function loadMathCloudStates(): Promise<string> {
  try {
    return await cloudGet(MATH_STATES_KEY);
  } catch {
    return "";
  }
}

export async function saveMathCloudStates(encoded: string): Promise<void> {
  try {
    await cloudSet(MATH_STATES_KEY, encoded || EMPTY_SLOT);
  } catch {
    /* ok */
  }
}

export function cacheLocal(state: SharedState) {
  localStorage.setItem("dictation_money", String(state.money));
  localStorage.setItem("dictation_hints", String(state.hints));
  localStorage.setItem("dictation_cloud_cache", JSON.stringify(state));
  localStorage.setItem("dictation_cloud_rev", String(Date.now()));
}

export function readLocalCache(): SharedState | null {
  try {
    const raw = localStorage.getItem("dictation_cloud_cache");
    if (!raw) return null;
    const parsed = JSON.parse(raw) as SharedState;
    if (!parsed || typeof parsed.money !== "number") return null;
    return {
      ...parsed,
      settings: { ...DEFAULT_SETTINGS, ...(parsed.settings ?? {}) },
      hints: typeof parsed.hints === "number" ? parsed.hints : START_HINTS,
      events: parsed.events ?? [],
      wordStats: parsed.wordStats ?? {},
    };
  } catch {
    return null;
  }
}
