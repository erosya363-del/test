import {
  CLOUD_APP_KEY,
  DEFAULT_SETTINGS,
  START_BALANCE,
  START_HINTS,
  type EventKind,
  type GameEvent,
  type Settings,
  type SharedState,
  type WordStat,
} from "./types";

const BASE = "https://keyvalue.immanuel.co/api/KeyVal";
const META_KEY = "meta";
const STATS_KEY = "stats";
const LOG_KEYS = ["l0", "l1", "l2", "l3", "l4", "l5", "l6", "l7"] as const;
const EVENTS_PER_LOG = 8;

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

async function cloudGet(key: string): Promise<string> {
  const stamp = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const response = await fetch(`${BASE}/GetValue/${CLOUD_APP_KEY}/${key}?t=${stamp}`, {
    cache: "no-store",
    headers: { "Cache-Control": "no-cache", Pragma: "no-cache" },
  });
  if (!response.ok) {
    throw new Error("Не удалось прочитать общую базу");
  }
  return unwrap(await response.text());
}

async function cloudSet(key: string, value: string): Promise<void> {
  if (value.length > 1000) {
    value = value.slice(0, 1000);
  }
  const url = `${BASE}/UpdateValue/${CLOUD_APP_KEY}/${key}/${encodeURIComponent(value)}?t=${Date.now()}`;
  const response = await fetch(url, {
    method: "POST",
    cache: "no-store",
    headers: { "Cache-Control": "no-cache", Pragma: "no-cache" },
  });
  if (!response.ok) {
    throw new Error("Не удалось сохранить в общую базу");
  }
}

function encodeMeta(state: SharedState): string {
  const s = state.settings;
  return [
    `m=${state.money}`,
    `h=${state.hints}`,
    `rc=${s.rewardCorrect}`,
    `rs=${s.rewardStreak}`,
    `pw=${s.penaltyWrong}`,
    `hp=${s.hintPrice}`,
    `hpp=${s.hintPackPrice}`,
    `pp=${hexEncode(s.parentPassword || DEFAULT_SETTINGS.parentPassword)}`,
    `u=${Date.now()}`,
  ].join(";");
}

function parseMetaMap(raw: string): Record<string, string> | null {
  if (!raw || !raw.includes("m=")) return null;
  return Object.fromEntries(
    raw.split(";").map((part) => {
      const idx = part.indexOf("=");
      return idx === -1 ? [part, ""] : [part.slice(0, idx), part.slice(idx + 1)];
    }),
  );
}

function decodeMeta(raw: string): Pick<SharedState, "money" | "hints" | "settings"> | null {
  const map = parseMetaMap(raw);
  if (!map) return null;
  return {
    money: Number(map.m ?? 0),
    hints: Number(map.h ?? START_HINTS),
    settings: {
      rewardCorrect: Number(map.rc ?? DEFAULT_SETTINGS.rewardCorrect),
      rewardStreak: Number(map.rs ?? DEFAULT_SETTINGS.rewardStreak),
      penaltyWrong: Number(map.pw ?? DEFAULT_SETTINGS.penaltyWrong),
      hintPrice: Number(map.hp ?? DEFAULT_SETTINGS.hintPrice),
      hintPackPrice: Number(map.hpp ?? DEFAULT_SETTINGS.hintPackPrice),
      parentPassword: map.pp ? hexDecode(map.pp) : DEFAULT_SETTINGS.parentPassword,
    },
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
  if (!raw) return stats;
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
  if (!raw) return [];
  return raw
    .split("/")
    .map(decodeEvent)
    .filter((event): event is GameEvent => Boolean(event));
}

export function emptyState(): SharedState {
  return {
    money: START_BALANCE,
    hints: START_HINTS,
    settings: { ...DEFAULT_SETTINGS },
    events: [],
    wordStats: {},
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
      const [rc, rs, pw, hp, hpp, passHex] = event.detail.split(",");
      currentSettings = {
        rewardCorrect: Number(rc) || currentSettings.rewardCorrect,
        rewardStreak: Number(rs) || currentSettings.rewardStreak,
        penaltyWrong: Number(pw) || currentSettings.penaltyWrong,
        hintPrice: Number(hp) || currentSettings.hintPrice,
        hintPackPrice: Number(hpp) || currentSettings.hintPackPrice,
        parentPassword: passHex ? hexDecode(passHex) : currentSettings.parentPassword,
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
  const known = new Set(remote.events.map((event) => event.id));
  const fresh = incoming.filter((event) => !known.has(event.id));
  const lastSet = [...fresh].reverse().find((event) => event.kind === "set");
  return {
    money: Math.max(0, remote.money + fresh.reduce((sum, event) => sum + event.moneyDelta, 0)),
    hints: Math.max(0, remote.hints + fresh.reduce((sum, event) => sum + (event.hintDelta ?? 0), 0)),
    settings: lastSet ? local.settings : remote.settings,
    events: [...remote.events, ...fresh].sort((a, b) => a.ts - b.ts || a.id.localeCompare(b.id)),
    wordStats: mergeStats(remote.wordStats, local.wordStats),
  };
}

export async function peekCloudMeta(): Promise<{ money: number; hints: number; updatedAt: number } | null> {
  const raw = await cloudGet(META_KEY);
  const map = parseMetaMap(raw);
  if (!map) return null;
  return {
    money: Number(map.m ?? 0),
    hints: Number(map.h ?? START_HINTS),
    updatedAt: Number(map.u ?? 0),
  };
}

export async function loadCloud(): Promise<SharedState | null> {
  const [metaRaw, statsRaw, ...logsRaw] = await Promise.all([
    cloudGet(META_KEY),
    cloudGet(STATS_KEY),
    ...LOG_KEYS.map((key) => cloudGet(key)),
  ]);
  const events = logsRaw.flatMap(decodeLog);
  const unique = new Map(events.map((event) => [event.id, event]));
  const uniqueEvents = [...unique.values()];
  const meta = decodeMeta(metaRaw);
  if (!meta) {
    if (uniqueEvents.length === 0 && !statsRaw) return null;
    return replay(uniqueEvents);
  }
  const state = replay(uniqueEvents, meta.settings);
  if (Object.keys(state.wordStats).length === 0) {
    state.wordStats = decodeStats(statsRaw);
  }
  state.money = meta.money;
  state.hints = meta.hints;
  state.settings = meta.settings;
  return state;
}

export async function saveCloud(state: SharedState): Promise<void> {
  const newest = [...state.events].sort((a, b) => b.ts - a.ts);
  const chunks: GameEvent[][] = [];
  for (let i = 0; i < LOG_KEYS.length; i += 1) {
    chunks.push(newest.slice(i * EVENTS_PER_LOG, (i + 1) * EVENTS_PER_LOG));
  }
  await cloudSet(META_KEY, encodeMeta(state));
  await cloudSet(STATS_KEY, encodeStats(state.wordStats));
  await Promise.all(LOG_KEYS.map((key, index) => cloudSet(key, encodeLog(chunks[index] ?? []))));
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

export function cacheLocal(state: SharedState) {
  localStorage.setItem("dictation_money", String(state.money));
  localStorage.setItem("dictation_hints", String(state.hints));
  localStorage.setItem("dictation_cloud_cache", JSON.stringify(state));
}

export function readLocalCache(): SharedState | null {
  try {
    const raw = localStorage.getItem("dictation_cloud_cache");
    if (!raw) return null;
    return JSON.parse(raw) as SharedState;
  } catch {
    return null;
  }
}
