import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  cacheLocal,
  commitDeck,
  commitDics,
  commitEvent,
  commitPhotos,
  commitTasks,
  deviceId,
  emptyState,
  ensureCloudSeeded,
  hexEncode,
  loadBellSeen,
  loadCloud,
  loadCloudMetaState,
  loadDeck,
  loadDics,
  loadImgbbApiKey,
  loadMathCloudStats,
  loadMathCloudStates,
  saveMathCloudStats,
  saveMathCloudStates,
  loadPhotos,
  loadTasks,
  newId,
  peekCloudMeta,
  readLocalCache,
  saveBellSeen,
  saveImgbbApiKey,
  shuffleWordIds,
  todayDayKey,
  autoTasksForDay,
  type RoundDeck,
} from "./cloud";
import {
  START_HINTS,
  type DicAnswer,
  type DicReport,
  type GameEvent,
  type PhotoItem,
  type Settings,
  type SharedState,
  type TaskKind,
  type TodayTask,
} from "./types";
import { gradePay } from "./modes";
import { cacheImgbbKeyLocal } from "../photos";
import { pullAndMergeMathCloud } from "../math/progress";

type AnswerInput = {
  ok: boolean;
  word: string;
  shown: string;
  expected: string;
  choice: string;
  errorType?: string;
  detail?: string;
  streakAfter: number;
  rewardCorrect?: number;
  rewardStreak?: number;
  penaltyWrong?: number;
};

type GameStoreValue = {
  ready: boolean;
  syncing: boolean;
  money: number;
  hints: number;
  settings: Settings;
  events: GameEvent[];
  wordStats: SharedState["wordStats"];
  /** Общая колода раунда (null — ещё не подтянули / сброшена). */
  deck: RoundDeck | null;
  photos: PhotoItem[];
  dics: DicReport[];
  tasks: TodayTask[];
  bellSeenTs: number;
  refresh: () => Promise<void>;
  /** Время последнего meta.u из облака (мс). */
  metaUpdatedAt: number;
  /** Взять незавершённый раунд из облака или создать новый. forceNew — всегда новая колода. */
  ensureRound: (wordCount: number, opts?: { forceNew?: boolean }) => Promise<RoundDeck>;
  /** Обновить позицию (и порядок, если вставили повтор ошибки). */
  advanceRound: (pos: number, ids?: number[]) => Promise<RoundDeck | null>;
  applyAnswer: (input: AnswerInput) => Promise<void>;
  applyHint: () => Promise<void>;
  applyShop: (pack: boolean) => Promise<void>;
  payout: (amount: number, reason: string) => Promise<void>;
  /** Начислить деньги сыну (заслуга и т.п.). */
  credit: (amount: number, reason: string) => Promise<void>;
  logDictation: (okCount: number, total: number, kind?: "paper" | "keys") => Promise<void>;
  addPhoto: (url: string, note?: string) => Promise<PhotoItem | null>;
  gradePhoto: (id: string, grade: number) => Promise<void>;
  removePhoto: (id: string) => Promise<void>;
  addDicReport: (answers: DicAnswer[]) => Promise<DicReport | null>;
  gradeDic: (id: string, grade: number) => Promise<void>;
  removeDic: (id: string) => Promise<void>;
  markBellSeen: () => Promise<void>;
  saveImgbbKey: (key: string) => Promise<void>;
  /** Подтянуть ключ ImgBB из облака в localStorage (для любого телефона). */
  pullImgbbKey: () => Promise<string>;
  addTask: (input: { kind: TaskKind; title: string; reward: number; day?: string }) => Promise<TodayTask | null>;
  removeTask: (id: string) => Promise<void>;
  completeTask: (id: string) => Promise<void>;
  seedAutoTasks: (replace?: boolean) => Promise<TodayTask[]>;
  resetProgress: (reason: string) => Promise<void>;
  saveSettings: (settings: Settings) => Promise<void>;
};

const GameStoreContext = createContext<GameStoreValue | null>(null);

export function GameStoreProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<SharedState>(() => readLocalCache() ?? emptyState());
  const [deck, setDeck] = useState<RoundDeck | null>(null);
  const [photos, setPhotos] = useState<PhotoItem[]>([]);
  const [dics, setDics] = useState<DicReport[]>([]);
  const [tasks, setTasks] = useState<TodayTask[]>([]);
  const [bellSeenTs, setBellSeenTs] = useState(0);
  const [ready, setReady] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [metaUpdatedAt, setMetaUpdatedAt] = useState(0);
  const stateRef = useRef(state);
  const deckRef = useRef(deck);
  const writeTail = useRef(Promise.resolve());
  const pendingWrites = useRef(0);
  const sleptRef = useRef(document.visibilityState === "hidden");
  stateRef.current = state;
  deckRef.current = deck;

  const adopt = useCallback((next: SharedState) => {
    stateRef.current = next;
    setState(next);
    cacheLocal(next);
  }, []);

  const adoptDeck = useCallback((next: RoundDeck | null) => {
    deckRef.current = next;
    setDeck(next);
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
      pendingWrites.current += 1;
      return enqueue(async () => {
        setSyncing(true);
        try {
          const merged = await commitEvent(event, stateRef.current);
          adopt(merged);
        } catch {
          // Локально уже показали ход; при следующем refresh подтянем правду из облака.
          try {
            const remote = (await loadCloud()) ?? (await loadCloudMetaState());
            if (remote) adopt(remote);
          } catch {
            /* офлайн */
          }
        } finally {
          pendingWrites.current = Math.max(0, pendingWrites.current - 1);
          setSyncing(false);
        }
      });
    },
    [adopt, enqueue],
  );

  const pullDeck = useCallback(async () => {
    try {
      const remote = await loadDeck();
      adoptDeck(remote);
      return remote;
    } catch {
      return deckRef.current;
    }
  }, [adoptDeck]);

  const refresh = useCallback(
    (silent = true) => {
      return enqueue(async () => {
        if (pendingWrites.current > 0) return;
        if (!silent) setSyncing(true);
        try {
          const peek = await peekCloudMeta();
          if (peek?.updatedAt) setMetaUpdatedAt(peek.updatedAt);
          const remote = (await loadCloud()) ?? (await loadCloudMetaState());
          if (pendingWrites.current > 0) return;
          if (remote) adopt(remote);
          await pullDeck();
          try {
            const [remotePhotos, remoteDics, remoteTasks, seen, imgbb] = await Promise.all([
              loadPhotos(),
              loadDics(),
              loadTasks(),
              loadBellSeen(),
              loadImgbbApiKey(),
            ]);
            setPhotos(remotePhotos);
            setDics(remoteDics);
            setTasks(remoteTasks);
            setBellSeenTs((prev) => Math.max(prev, seen));
            if (imgbb) cacheImgbbKeyLocal(imgbb);
          } catch {
            /* photos optional — ключ всё равно пробуем отдельно */
            try {
              const imgbb = await loadImgbbApiKey();
              if (imgbb) cacheImgbbKeyLocal(imgbb);
            } catch {
              /* offline */
            }
          }
          try {
            await pullAndMergeMathCloud(
              loadMathCloudStats,
              loadMathCloudStates,
              saveMathCloudStats,
              saveMathCloudStates,
            );
          } catch {
            /* math progress optional */
          }
        } finally {
          if (!silent) setSyncing(false);
        }
      });
    },
    [adopt, enqueue, pullDeck],
  );

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        // Сначала только meta — новый ярлык iPhone сразу видит общие деньги.
        const quickMeta = await peekCloudMeta();
        if (!cancelled && quickMeta) {
          setMetaUpdatedAt(quickMeta.updatedAt);
          adopt({
            ...emptyState(),
            money: quickMeta.money,
            hints: quickMeta.hints,
            settings: quickMeta.settings,
          });
        }

        const remote = (await loadCloud()) ?? (await loadCloudMetaState()) ?? (await ensureCloudSeeded());
        if (!cancelled) adopt(remote);
        const remoteDeck = await loadDeck();
        if (!cancelled) adoptDeck(remoteDeck);
        const [remotePhotos, remoteDics, remoteTasks, seen, imgbb] = await Promise.all([
          loadPhotos(),
          loadDics(),
          loadTasks(),
          loadBellSeen(),
          loadImgbbApiKey(),
        ]);
        if (!cancelled) {
          setPhotos(remotePhotos);
          setDics(remoteDics);
          setTasks(remoteTasks);
          setBellSeenTs((prev) => Math.max(prev, seen));
          if (imgbb) cacheImgbbKeyLocal(imgbb);
        }
      } catch {
        try {
          const peek = await peekCloudMeta();
          if (peek && !cancelled) {
            setMetaUpdatedAt(peek.updatedAt);
            adopt({
              ...emptyState(),
              money: peek.money,
              hints: peek.hints,
              settings: peek.settings,
            });
          } else {
            const cached = readLocalCache();
            if (cached && !cancelled) adopt(cached);
          }
        } catch {
          const cached = readLocalCache();
          if (cached && !cancelled) adopt(cached);
        }
        // Даже при сбое полной загрузки — ключ фото из облака (сын без ручного ввода).
        try {
          const imgbb = await loadImgbbApiKey();
          if (!cancelled && imgbb) cacheImgbbKeyLocal(imgbb);
        } catch {
          /* offline */
        }
      } finally {
        if (!cancelled) setReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [adopt, adoptDeck]);

  useEffect(() => {
    let wakeTimerA = 0;
    let wakeTimerB = 0;

    const wake = () => {
      sleptRef.current = false;
      if (document.visibilityState === "hidden") return;
      void refresh(true);
      window.clearTimeout(wakeTimerA);
      window.clearTimeout(wakeTimerB);
      wakeTimerA = window.setTimeout(() => void refresh(true), 700);
      wakeTimerB = window.setTimeout(() => void refresh(true), 2000);
    };

    const onVisibility = () => {
      if (document.visibilityState === "hidden") {
        sleptRef.current = true;
        return;
      }
      wake();
    };

    const onPointer = () => {
      if (!sleptRef.current) return;
      wake();
    };

    const tick = async () => {
      if (document.visibilityState === "hidden" || pendingWrites.current > 0) return;
      try {
        const [peek, remoteDeck] = await Promise.all([peekCloudMeta(), loadDeck()]);
        if (pendingWrites.current > 0) return;
        if (peek?.updatedAt) setMetaUpdatedAt(peek.updatedAt);
        const now = stateRef.current;
        const moneyChanged = peek && (peek.money !== now.money || peek.hints !== now.hints);
        if (moneyChanged && peek) {
          // Цифра в облаке другая — сразу ставим meta, журнал догоним refresh.
          adopt({
            ...now,
            money: peek.money,
            hints: peek.hints,
            settings: peek.settings,
          });
        }
        const localDeck = deckRef.current;
        const deckChanged =
          (!localDeck && remoteDeck) ||
          (localDeck && !remoteDeck) ||
          (localDeck &&
            remoteDeck &&
            (localDeck.pos !== remoteDeck.pos ||
              localDeck.updatedAt !== remoteDeck.updatedAt ||
              localDeck.ids.length !== remoteDeck.ids.length ||
              localDeck.ids.some((id, i) => id !== remoteDeck.ids[i])));
        if (deckChanged) adoptDeck(remoteDeck);
        if (moneyChanged) await refresh(true);
      } catch {
        /* сеть уснула */
      }
    };

    const poll = window.setInterval(() => {
      void tick();
    }, 2500);

    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("pageshow", wake);
    window.addEventListener("focus", wake);
    window.addEventListener("online", wake);
    document.addEventListener("pointerdown", onPointer, { passive: true });
    return () => {
      window.clearInterval(poll);
      window.clearTimeout(wakeTimerA);
      window.clearTimeout(wakeTimerB);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pageshow", wake);
      window.removeEventListener("focus", wake);
      window.removeEventListener("online", wake);
      document.removeEventListener("pointerdown", onPointer);
    };
  }, [adopt, adoptDeck, refresh]);

  const ensureRound = useCallback(
    async (wordCount: number, opts?: { forceNew?: boolean }) => {
      pendingWrites.current += 1;
      setSyncing(true);
      try {
        const forceNew = Boolean(opts?.forceNew);
        const saved = await commitDeck((current) => {
          if (!forceNew && current && current.ids.length > 0 && current.pos < current.ids.length) {
            return current;
          }
          const ids = shuffleWordIds(wordCount, 50);
          return {
            ids,
            pos: 0,
            updatedAt: Date.now(),
            seed: newId(),
          };
        });
        if (!saved) {
          throw new Error("Не удалось создать раунд");
        }
        adoptDeck(saved);
        return saved;
      } finally {
        pendingWrites.current = Math.max(0, pendingWrites.current - 1);
        setSyncing(false);
      }
    },
    [adoptDeck],
  );

  const advanceRound = useCallback(
    async (pos: number, ids?: number[]) => {
      const base = deckRef.current;
      const nextIds = ids ?? base?.ids ?? [];
      if (nextIds.length === 0) return null;
      const optimistic: RoundDeck = {
        ids: nextIds,
        pos: Math.max(0, Math.min(Math.floor(pos), nextIds.length)),
        updatedAt: Date.now(),
        seed: base?.seed || newId(),
      };
      adoptDeck(optimistic);
      pendingWrites.current += 1;
      try {
        const saved = await commitDeck((current) => {
          const from = current ?? optimistic;
          return {
            ...from,
            ids: ids ?? from.ids,
            pos: Math.max(0, Math.min(Math.floor(pos), (ids ?? from.ids).length)),
            updatedAt: Date.now(),
          };
        });
        adoptDeck(saved);
        return saved;
      } catch {
        return optimistic;
      } finally {
        pendingWrites.current = Math.max(0, pendingWrites.current - 1);
      }
    },
    [adoptDeck],
  );

  const applyAnswer = useCallback(
    async (input: AnswerInput) => {
      const current = stateRef.current;
      const rewardOk = input.rewardCorrect ?? current.settings.rewardCorrect;
      const rewardStreak = input.rewardStreak ?? current.settings.rewardStreak;
      const penalty = input.penaltyWrong ?? current.settings.penaltyWrong;
      const reward = input.ok ? (input.streakAfter >= 2 ? rewardStreak : rewardOk) : -penalty;
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
      if (cut <= 0) return;
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

  const credit = useCallback(
    async (amount: number, reason: string) => {
      const add = Math.max(0, Math.round(amount));
      if (add <= 0) return;
      const event: GameEvent = {
        id: newId(),
        ts: Date.now(),
        kind: "add",
        moneyDelta: add,
        reason: reason || "Начисление за заслугу",
        device: deviceId(),
      };
      await persistEvent(event, (now) => ({
        ...now,
        money: now.money + add,
        events: [...now.events, event],
      }));
    },
    [persistEvent],
  );

  const logDictation = useCallback(
    async (okCount: number, total: number, kind: "paper" | "keys" = "keys") => {
      const event: GameEvent = {
        id: newId(),
        ts: Date.now(),
        kind: "dic",
        moneyDelta: 0,
        detail: `${okCount},${total},${kind}`,
        reason: kind === "paper" ? `Диктант на бумаге ${okCount}/${total}` : `Диктант с клавиатуры ${okCount}/${total}`,
        device: deviceId(),
      };
      await persistEvent(event, (now) => ({
        ...now,
        events: [...now.events, event],
      }));
    },
    [persistEvent],
  );

  const applyGradePay = useCallback(
    async (grade: number, label: string) => {
      const g = Math.min(5, Math.max(1, Math.round(grade)));
      const pay = gradePay(stateRef.current.settings, g);
      if (pay > 0) await credit(pay, `${label} ${g}/5`);
      else if (pay < 0) await payout(Math.abs(pay), `${label} ${g}/5`);
    },
    [credit, payout],
  );

  const addPhoto = useCallback(async (url: string, note?: string) => {
    const item: PhotoItem = {
      id: newId(),
      ts: Date.now(),
      status: "wait",
      grade: 0,
      url,
      note,
    };
    const saved = await commitPhotos((current) => [item, ...current].slice(0, 12));
    setPhotos(saved);
    const event: GameEvent = {
      id: newId(),
      ts: Date.now(),
      kind: "photo",
      moneyDelta: 0,
      reason: "Фото на проверку",
      detail: item.id,
      device: deviceId(),
    };
    await persistEvent(event, (now) => ({
      ...now,
      events: [...now.events, event],
    }));
    return saved.find((row) => row.id === item.id) ?? item;
  }, [persistEvent]);

  const gradePhoto = useCallback(
    async (id: string, grade: number) => {
      const g = Math.min(5, Math.max(1, Math.round(grade)));
      const saved = await commitPhotos((current) =>
        current.map((row) => (row.id === id ? { ...row, status: "done" as const, grade: g } : row)),
      );
      setPhotos(saved);
      await applyGradePay(g, "Оценка фото");
    },
    [applyGradePay],
  );

  const removePhoto = useCallback(async (id: string) => {
    const saved = await commitPhotos((current) => current.filter((row) => row.id !== id));
    setPhotos(saved);
  }, []);

  const addDicReport = useCallback(
    async (answers: DicAnswer[]) => {
      const ok = answers.filter((row) => row.ok).length;
      const item: DicReport = {
        id: newId(),
        ts: Date.now(),
        status: "wait",
        grade: 0,
        ok,
        total: answers.length,
        answers,
      };
      const saved = await commitDics((current) => [item, ...current].slice(0, 8));
      setDics(saved);
      await logDictation(ok, answers.length, "keys");
      return saved.find((row) => row.id === item.id) ?? item;
    },
    [logDictation],
  );

  const gradeDic = useCallback(
    async (id: string, grade: number) => {
      const g = Math.min(5, Math.max(1, Math.round(grade)));
      const saved = await commitDics((current) =>
        current.map((row) => (row.id === id ? { ...row, status: "done" as const, grade: g } : row)),
      );
      setDics(saved);
      await applyGradePay(g, "Оценка диктанта");
    },
    [applyGradePay],
  );

  const removeDic = useCallback(async (id: string) => {
    const saved = await commitDics((current) => current.filter((row) => row.id !== id));
    setDics(saved);
  }, []);

  const markBellSeen = useCallback(async () => {
    const ts = Date.now();
    setBellSeenTs((prev) => Math.max(prev, ts));
    try {
      await saveBellSeen(ts);
    } catch {
      /* offline */
    }
  }, []);

  const saveImgbbKey = useCallback(async (key: string) => {
    const trimmed = key.trim();
    cacheImgbbKeyLocal(trimmed);
    await saveImgbbApiKey(trimmed);
  }, []);

  const pullImgbbKey = useCallback(async () => {
    const imgbb = await loadImgbbApiKey();
    if (imgbb) cacheImgbbKeyLocal(imgbb);
    return imgbb;
  }, []);

  const addTask = useCallback(
    async (input: { kind: TaskKind; title: string; reward: number; day?: string }) => {
      const item: TodayTask = {
        id: newId(),
        day: input.day || todayDayKey(),
        kind: input.kind,
        title: (input.title || "Задание").trim().slice(0, 40),
        reward: Math.trunc(input.reward) || 0,
        status: "wait",
      };
      const saved = await commitTasks((current) => {
        const sameDay = current.filter((row) => row.day === item.day);
        const other = current.filter((row) => row.day !== item.day);
        return [item, ...sameDay, ...other].slice(0, 8);
      });
      setTasks(saved);
      return saved.find((row) => row.id === item.id) ?? item;
    },
    [],
  );

  const removeTask = useCallback(async (id: string) => {
    const saved = await commitTasks((current) => current.filter((row) => row.id !== id));
    setTasks(saved);
  }, []);

  const completeTask = useCallback(
    async (id: string) => {
      let reward = 0;
      let title = "Задание";
      const saved = await commitTasks((current) =>
        current.map((row) => {
          if (row.id !== id || row.status === "done") return row;
          reward = row.reward;
          title = row.title;
          return { ...row, status: "done" as const };
        }),
      );
      setTasks(saved);
      if (reward > 0) await credit(reward, `Задание: ${title}`);
      else if (reward < 0) await payout(Math.abs(reward), `Задание: ${title}`);
    },
    [credit, payout],
  );

  const seedAutoTasks = useCallback(async (replace = false) => {
    const day = todayDayKey();
    const saved = await commitTasks((current) => {
      const others = current.filter((row) => row.day !== day);
      const today = current.filter((row) => row.day === day);
      if (today.length > 0 && !replace) return current;
      return [...autoTasksForDay(day), ...others].slice(0, 8);
    });
    setTasks(saved);
    return saved.filter((row) => row.day === day);
  }, []);

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
      try {
        await commitDeck(() => null);
        adoptDeck(null);
      } catch {
        adoptDeck(null);
      }
    },
    [adoptDeck, persistEvent],
  );

  const saveSettings = useCallback(
    async (settings: Settings) => {
      const current = stateRef.current;
      const event: GameEvent = {
        id: newId(),
        ts: Date.now(),
        kind: "set",
        moneyDelta: 0,
        detail: [
          settings.rewardCorrect,
          settings.rewardStreak,
          settings.penaltyWrong,
          settings.hintPrice,
          settings.hintPackPrice,
          hexEncode(settings.parentPassword),
          settings.listenRewardCorrect,
          settings.listenRewardStreak,
          settings.listenPenaltyWrong,
          settings.stressRewardCorrect,
          settings.stressRewardStreak,
          settings.stressPenaltyWrong,
          settings.letterRewardCorrect,
          settings.letterRewardStreak,
          settings.letterPenaltyWrong,
          settings.grade1,
          settings.grade2,
          settings.grade3,
          settings.grade4,
          settings.grade5,
        ].join(","),
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
      deck,
      photos,
      dics,
      tasks,
      bellSeenTs,
      metaUpdatedAt,
      refresh,
      ensureRound,
      advanceRound,
      applyAnswer,
      applyHint,
      applyShop,
      payout,
      credit,
      logDictation,
      addPhoto,
      gradePhoto,
      removePhoto,
      addDicReport,
      gradeDic,
      removeDic,
      markBellSeen,
      saveImgbbKey,
      pullImgbbKey,
      addTask,
      removeTask,
      completeTask,
      seedAutoTasks,
      resetProgress,
      saveSettings,
    }),
    [
      advanceRound,
      applyAnswer,
      applyHint,
      applyShop,
      addDicReport,
      addPhoto,
      addTask,
      bellSeenTs,
      completeTask,
      credit,
      deck,
      dics,
      ensureRound,
      gradeDic,
      gradePhoto,
      logDictation,
      markBellSeen,
      metaUpdatedAt,
      payout,
      photos,
      pullImgbbKey,
      ready,
      refresh,
      removeDic,
      removePhoto,
      removeTask,
      resetProgress,
      saveImgbbKey,
      saveSettings,
      seedAutoTasks,
      state,
      syncing,
      tasks,
    ],
  );

  return <GameStoreContext.Provider value={value}>{children}</GameStoreContext.Provider>;
}

export function useGameStore() {
  const value = useContext(GameStoreContext);
  if (!value) throw new Error("GameStore missing");
  return value;
}
