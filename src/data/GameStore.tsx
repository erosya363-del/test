import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  cacheLocal,
  deviceId,
  emptyState,
  hexEncode,
  loadCloud,
  mergeIncoming,
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

export function GameStoreProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<SharedState>(() => readLocalCache() ?? emptyState());
  const [ready, setReady] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const stateRef = useRef(state);
  const writeTail = useRef(Promise.resolve());
  stateRef.current = state;

  const adopt = useCallback((next: SharedState) => {
    stateRef.current = next;
    setState(next);
    cacheLocal(next);
  }, []);

  const enqueue = useCallback((job: () => Promise<void>) => {
    const run = writeTail.current.then(job, job);
    writeTail.current = run.then(
      () => undefined,
      () => undefined,
    );
    return run;
  }, []);

  const persistEvent = useCallback(
    (event: GameEvent, apply: (current: SharedState) => SharedState) => {
      adopt(apply(stateRef.current));
      return enqueue(async () => {
        setSyncing(true);
        try {
          for (let attempt = 0; attempt < 6; attempt += 1) {
            const remote = await loadCloud();
            if (!remote) {
              await saveCloud(stateRef.current);
              continue;
            }
            const incoming = stateRef.current.events.filter(
              (item) => item.id === event.id || !remote.events.some((row) => row.id === item.id),
            );
            if (!incoming.some((item) => item.id === event.id)) incoming.push(event);
            const merged = mergeIncoming(remote, incoming, stateRef.current);
            await saveCloud(merged);
            const check = await loadCloud();
            if (check?.events.some((item) => item.id === event.id)) {
              adopt(check);
              return;
            }
            adopt(merged);
          }
        } finally {
          setSyncing(false);
        }
      });
    },
    [adopt, enqueue],
  );

  const refresh = useCallback(() => {
    return enqueue(async () => {
      setSyncing(true);
      try {
        const remote = await loadCloud();
        if (remote) adopt(remote);
      } finally {
        setSyncing(false);
      }
    });
  }, [adopt, enqueue]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const remote = await loadCloud();
        if (cancelled) return;
        if (remote) {
          adopt(remote);
        } else {
          const seed: GameEvent = {
            id: newId(),
            ts: Date.now(),
            kind: "seed",
            moneyDelta: START_BALANCE,
            hintDelta: 0,
            reason: "Стартовый баланс",
            device: deviceId(),
          };
          const initial = {
            ...emptyState(),
            money: START_BALANCE,
            hints: START_HINTS,
            events: [seed],
          };
          adopt(initial);
          await saveCloud(initial);
        }
      } catch {
        const cached = readLocalCache();
        if (cached && !cancelled) adopt(cached);
      } finally {
        if (!cancelled) setReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [adopt]);

  useEffect(() => {
    const pull = () => {
      if (document.visibilityState === "hidden") return;
      void refresh();
    };
    const onShow = () => pull();
    document.addEventListener("visibilitychange", pull);
    window.addEventListener("pageshow", onShow);
    window.addEventListener("focus", onShow);
    return () => {
      document.removeEventListener("visibilitychange", pull);
      window.removeEventListener("pageshow", onShow);
      window.removeEventListener("focus", onShow);
    };
  }, [refresh]);

  const applyAnswer = useCallback(
    async (input: AnswerInput) => {
      const current = stateRef.current;
      const reward = input.ok
        ? input.streakAfter >= 2
          ? current.settings.rewardStreak
          : current.settings.rewardCorrect
        : -current.settings.penaltyWrong;
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
      await persistEvent(event, (now) => ({
        ...now,
        money: Math.max(0, now.money + reward),
        events: [...now.events, event],
        wordStats: {
          ...now.wordStats,
          [input.word]: {
            word: input.word,
            seen: (now.wordStats[input.word]?.seen ?? 0) + 1,
            ok: (now.wordStats[input.word]?.ok ?? 0) + (input.ok ? 1 : 0),
            bad: (now.wordStats[input.word]?.bad ?? 0) + (input.ok ? 0 : 1),
            lastTs: event.ts,
            lastShown: input.shown,
          },
        },
      }));
    },
    [persistEvent],
  );

  const applyHint = useCallback(async () => {
    if (stateRef.current.hints <= 0) return;
    const event: GameEvent = {
      id: newId(),
      ts: Date.now(),
      kind: "hint",
      moneyDelta: 0,
      hintDelta: -1,
      reason: "Подсказка в игре",
      device: deviceId(),
    };
    await persistEvent(event, (now) => ({
      ...now,
      hints: Math.max(0, now.hints - 1),
      events: [...now.events, event],
    }));
  }, [persistEvent]);

  const applyShop = useCallback(
    async (pack: boolean) => {
      const current = stateRef.current;
      const price = pack ? current.settings.hintPackPrice : current.settings.hintPrice;
      const add = pack ? 3 : 1;
      if (current.money < price) return;
      const event: GameEvent = {
        id: newId(),
        ts: Date.now(),
        kind: "shop",
        moneyDelta: -price,
        hintDelta: add,
        reason: pack ? "Набор подсказок" : "Подсказка",
        device: deviceId(),
      };
      await persistEvent(event, (now) => ({
        ...now,
        money: Math.max(0, now.money - price),
        hints: now.hints + add,
        events: [...now.events, event],
      }));
    },
    [persistEvent],
  );

  const payout = useCallback(
    async (amount: number, reason: string) => {
      const cut = Math.min(stateRef.current.money, Math.max(0, Math.round(amount)));
      const event: GameEvent = {
        id: newId(),
        ts: Date.now(),
        kind: "pay",
        moneyDelta: -cut,
        reason: reason || "Снятие денег для сына",
        device: deviceId(),
      };
      await persistEvent(event, (now) => ({
        ...now,
        money: Math.max(0, now.money - cut),
        events: [...now.events, event],
      }));
    },
    [persistEvent],
  );

  const resetProgress = useCallback(
    async (reason: string) => {
      const current = stateRef.current;
      const event: GameEvent = {
        id: newId(),
        ts: Date.now(),
        kind: "rst",
        moneyDelta: -current.money,
        hintDelta: START_HINTS - current.hints,
        reason: reason || "Сброс прогресса",
        device: deviceId(),
      };
      await persistEvent(event, () => ({
        ...current,
        money: 0,
        hints: START_HINTS,
        events: [...current.events, event],
      }));
    },
    [persistEvent],
  );

  const saveSettings = useCallback(
    async (settings: Settings) => {
      const current = stateRef.current;
      const event: GameEvent = {
        id: newId(),
        ts: Date.now(),
        kind: "set",
        moneyDelta: 0,
        detail: `${settings.rewardCorrect},${settings.rewardStreak},${settings.penaltyWrong},${settings.hintPrice},${settings.hintPackPrice},${hexEncode(settings.parentPassword)}`,
        reason: settings.parentPassword !== current.settings.parentPassword ? "Сменили пароль" : "Изменили премии",
        device: deviceId(),
      };
      await persistEvent(event, (now) => ({
        ...now,
        settings,
        events: [...now.events, event],
      }));
    },
    [persistEvent],
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
