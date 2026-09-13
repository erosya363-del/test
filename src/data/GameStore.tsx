import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import {
  cacheLocal,
  deviceId,
  emptyState,
  hexEncode,
  loadCloud,
  newId,
  readLocalCache,
  saveCloud,
} from "./cloud";
import { START_BALANCE, START_HINTS, type GameEvent, type Settings, type SharedState } from "./types";

type AnswerInput = {
  ok: boolean;
  word: string;
  shown: string;
  expected: string;
  choice: string;
  errorType?: string;
  detail?: string;
  streakAfter: number;
};

type GameStoreValue = {
  ready: boolean;
  syncing: boolean;
  money: number;
  hints: number;
  settings: Settings;
  events: GameEvent[];
  wordStats: SharedState["wordStats"];
  refresh: () => Promise<void>;
  applyAnswer: (input: AnswerInput) => Promise<void>;
  applyHint: () => Promise<void>;
  applyShop: (pack: boolean) => Promise<void>;
  payout: (amount: number, reason: string) => Promise<void>;
  resetProgress: (reason: string) => Promise<void>;
  saveSettings: (settings: Settings) => Promise<void>;
};

const GameStoreContext = createContext<GameStoreValue | null>(null);

function localMoney(): number {
  const raw = localStorage.getItem("dictation_money");
  const value = raw ? Number(raw) : 0;
  return Number.isFinite(value) ? value : 0;
}

export function GameStoreProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<SharedState>(() => readLocalCache() ?? emptyState());
  const [ready, setReady] = useState(false);
  const [syncing, setSyncing] = useState(false);

  const persist = useCallback(async (next: SharedState) => {
    setState(next);
    cacheLocal(next);
    setSyncing(true);
    try {
      const remote = await loadCloud();
      if (!remote) {
        await saveCloud(next);
        cacheLocal(next);
        return;
      }
      const known = new Set(remote.events.map((event) => event.id));
      const fresh = next.events.filter((event) => !known.has(event.id));
      const merged: SharedState = {
        money: Math.max(0, remote.money + fresh.reduce((sum, event) => sum + event.moneyDelta, 0)),
        hints: Math.max(0, remote.hints + fresh.reduce((sum, event) => sum + (event.hintDelta ?? 0), 0)),
        settings: next.settings,
        events: [...remote.events, ...fresh].sort((a, b) => a.ts - b.ts),
        wordStats: { ...remote.wordStats, ...next.wordStats },
      };
      await saveCloud(merged);
      setState(merged);
      cacheLocal(merged);
    } finally {
      setSyncing(false);
    }
  }, []);

  const refresh = useCallback(async () => {
    setSyncing(true);
    try {
      const remote = await loadCloud();
      if (remote) {
        setState(remote);
        cacheLocal(remote);
      }
    } finally {
      setSyncing(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const remote = await loadCloud();
        const phone = localMoney();
        if (!remote) {
          const start = Math.max(START_BALANCE, phone);
          const seed: GameEvent = {
            id: newId(),
            ts: Date.now(),
            kind: "seed",
            moneyDelta: start,
            hintDelta: 0,
            reason: "Стартовый баланс с телефона",
            device: deviceId(),
          };
          const initial = {
            ...emptyState(),
            money: start,
            hints: Number(localStorage.getItem("dictation_hints") ?? START_HINTS) || START_HINTS,
            events: [seed],
          };
          if (!cancelled) {
            setState(initial);
            cacheLocal(initial);
          }
          await saveCloud(initial);
        } else {
          const needsLift = phone > remote.money && remote.events.every((event) => event.kind !== "pay" && event.kind !== "rst");
          if (needsLift) {
            const lift: GameEvent = {
              id: newId(),
              ts: Date.now(),
              kind: "seed",
              moneyDelta: phone - remote.money,
              reason: "Подтянули баланс с телефона сына",
              device: deviceId(),
            };
            const lifted = {
              ...remote,
              money: phone,
              events: [...remote.events, lift],
            };
            if (!cancelled) {
              setState(lifted);
              cacheLocal(lifted);
            }
            await saveCloud(lifted);
          } else if (!cancelled) {
            setState(remote);
            cacheLocal(remote);
          }
        }
      } catch {
        const cached = readLocalCache();
        if (cached && !cancelled) setState(cached);
      } finally {
        if (!cancelled) setReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const applyAnswer = useCallback(
    async (input: AnswerInput) => {
      const reward = input.ok
        ? input.streakAfter >= 2
          ? state.settings.rewardStreak
          : state.settings.rewardCorrect
        : -state.settings.penaltyWrong;
      const event: GameEvent = {
        id: newId(),
        ts: Date.now(),
        kind: input.ok ? "ok" : "bad",
        word: input.word,
        shown: input.shown,
        expected: input.expected,
        choice: input.choice,
        errorType: input.errorType,
        detail: input.detail,
        moneyDelta: reward,
        device: deviceId(),
      };
      const next: SharedState = {
        ...state,
        money: Math.max(0, state.money + reward),
        events: [...state.events, event],
        wordStats: {
          ...state.wordStats,
          [input.word]: {
            word: input.word,
            seen: (state.wordStats[input.word]?.seen ?? 0) + 1,
            ok: (state.wordStats[input.word]?.ok ?? 0) + (input.ok ? 1 : 0),
            bad: (state.wordStats[input.word]?.bad ?? 0) + (input.ok ? 0 : 1),
            lastTs: event.ts,
            lastShown: input.shown,
          },
        },
      };
      await persist(next);
    },
    [persist, state],
  );

  const applyHint = useCallback(async () => {
    if (state.hints <= 0) return;
    const event: GameEvent = {
      id: newId(),
      ts: Date.now(),
      kind: "hint",
      moneyDelta: 0,
      hintDelta: -1,
      reason: "Подсказка в игре",
      device: deviceId(),
    };
    await persist({
      ...state,
      hints: state.hints - 1,
      events: [...state.events, event],
    });
  }, [persist, state]);

  const applyShop = useCallback(
    async (pack: boolean) => {
      const price = pack ? state.settings.hintPackPrice : state.settings.hintPrice;
      const add = pack ? 3 : 1;
      if (state.money < price) return;
      const event: GameEvent = {
        id: newId(),
        ts: Date.now(),
        kind: "shop",
        moneyDelta: -price,
        hintDelta: add,
        reason: pack ? "Набор подсказок" : "Подсказка",
        device: deviceId(),
      };
      await persist({
        ...state,
        money: state.money - price,
        hints: state.hints + add,
        events: [...state.events, event],
      });
    },
    [persist, state],
  );

  const payout = useCallback(
    async (amount: number, reason: string) => {
      const cut = Math.min(state.money, Math.max(0, Math.round(amount)));
      const event: GameEvent = {
        id: newId(),
        ts: Date.now(),
        kind: "pay",
        moneyDelta: -cut,
        reason: reason || "Снятие денег для сына",
        device: deviceId(),
      };
      await persist({
        ...state,
        money: state.money - cut,
        events: [...state.events, event],
      });
    },
    [persist, state],
  );

  const resetProgress = useCallback(
    async (reason: string) => {
      const event: GameEvent = {
        id: newId(),
        ts: Date.now(),
        kind: "rst",
        moneyDelta: -state.money,
        hintDelta: START_HINTS - state.hints,
        reason: reason || "Сброс прогресса",
        device: deviceId(),
      };
      await persist({
        ...state,
        money: 0,
        hints: START_HINTS,
        events: [...state.events, event],
      });
    },
    [persist, state],
  );

  const saveSettings = useCallback(
    async (settings: Settings) => {
      const event: GameEvent = {
        id: newId(),
        ts: Date.now(),
        kind: "set",
        moneyDelta: 0,
        detail: `${settings.rewardCorrect},${settings.rewardStreak},${settings.penaltyWrong},${settings.hintPrice},${settings.hintPackPrice},${hexEncode(settings.parentPassword)}`,
        reason: settings.parentPassword !== state.settings.parentPassword ? "Сменили пароль" : "Изменили премии",
        device: deviceId(),
      };
      await persist({
        ...state,
        settings,
        events: [...state.events, event],
      });
    },
    [persist, state],
  );

  const value = useMemo<GameStoreValue>(
    () => ({
      ready,
      syncing,
      money: state.money,
      hints: state.hints,
      settings: state.settings,
      events: state.events,
      wordStats: state.wordStats,
      refresh,
      applyAnswer,
      applyHint,
      applyShop,
      payout,
      resetProgress,
      saveSettings,
    }),
    [applyAnswer, applyHint, applyShop, payout, ready, refresh, resetProgress, saveSettings, state, syncing],
  );

  return <GameStoreContext.Provider value={value}>{children}</GameStoreContext.Provider>;
}

export function useGameStore() {
  const value = useContext(GameStoreContext);
  if (!value) throw new Error("GameStore missing");
  return value;
}
