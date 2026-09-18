import { useEffect, useMemo, useState } from "react";
import { useGameStore } from "../data/GameStore";
import { playClickSound, playCorrectSound, playWrongSound, playCoinSound, resumeAudio } from "../sounds";
import { buildTableSession, buildTodaySession, buildTrainSession } from "./generate";
import {
  MATH_HUB_CARDS,
  rewardFor,
  type AttemptOutcome,
  type CompareOp,
  type MathCategory,
  type MathExercise,
  type MathHubId,
  type SessionStats,
} from "./types";

type Screen =
  | { name: "hub" }
  | { name: "today" }
  | { name: "train" }
  | { name: "table" }
  | { name: "tasks" }
  | { name: "money" }
  | { name: "soon"; title: string }
  | { name: "play"; exercises: MathExercise[]; title: string }
  | { name: "summary"; stats: SessionStats; title: string };

type Props = {
  onBackToSubjects: () => void;
};

export function MathApp({ onBackToSubjects }: Props) {
  const store = useGameStore();
  const [screen, setScreen] = useState<Screen>({ name: "hub" });

  if (screen.name === "hub") {
    return (
      <div className="app-screen">
        <div className="play-stage">
          <div className="text-center mb-3">
            <div className="text-6xl mb-2 animate-float">🧮</div>
            <h1 className="text-3xl font-black">
              <span className="bg-gradient-to-r from-yellow-200 via-pink-200 to-purple-200 bg-clip-text text-transparent">
                Математика
              </span>
            </h1>
            <p className="text-purple-200/80 text-sm mt-1">2 класс</p>
          </div>

          <div className="glass-card w-full !p-3 mb-3">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-xs text-white/50">Баланс</p>
                <p className="text-xl font-black text-yellow-300">{store.ready ? `${store.money} ₽` : "…"}</p>
              </div>
              <p className="text-[11px] text-white/40 text-right">Общий с русским</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 w-full mb-3">
            {MATH_HUB_CARDS.map((card) => (
              <button
                key={card.id}
                type="button"
                className="glass-card !p-4 text-left active:scale-[0.98] transition-transform"
                onClick={() => {
                  playClickSound();
                  resumeAudio();
                  openHub(card.id, setScreen);
                }}
              >
                <div className="text-3xl mb-1">{card.emoji}</div>
                <p className="font-black text-base">{card.title}</p>
                <p className="text-white/55 text-xs mt-0.5">{card.desc}</p>
              </button>
            ))}
          </div>

          <button type="button" className="play-cta btn-secondary" onClick={onBackToSubjects}>
            ← К предметам
          </button>
        </div>
      </div>
    );
  }

  if (screen.name === "today") {
    return (
      <TodayIntro
        money={store.money}
        onStart={() => {
          playClickSound();
          setScreen({ name: "play", exercises: buildTodaySession(10), title: "Сегодня" });
        }}
        onBack={() => setScreen({ name: "hub" })}
      />
    );
  }

  if (screen.name === "train") {
    return (
      <TrainPick
        onPick={(cat) => {
          playClickSound();
          setScreen({ name: "play", exercises: buildTrainSession(cat, 10), title: trainTitle(cat) });
        }}
        onBack={() => setScreen({ name: "hub" })}
      />
    );
  }

  if (screen.name === "table") {
    return (
      <TablePick
        onPick={(n) => {
          playClickSound();
          setScreen({ name: "play", exercises: buildTableSession(n, 10), title: `Таблица ×${n}` });
        }}
        onBack={() => setScreen({ name: "hub" })}
      />
    );
  }

  if (screen.name === "tasks") {
    return (
      <div className="app-screen">
        <div className="play-stage">
          <div className="play-badge bg-cyan-500/15 border-cyan-400/30 text-cyan-100">📖 Задачи</div>
          <div className="glass-card w-full text-center space-y-2">
            <p className="font-black text-xl">Текстовые задачи</p>
            <p className="text-white/60 text-sm">10 задач · как в «Сегодня»</p>
          </div>
          <button
            type="button"
            className="play-cta btn-primary"
            onClick={() => {
              playClickSound();
              setScreen({ name: "play", exercises: buildTrainSession("word", 10), title: "Задачи" });
            }}
          >
            Начать
          </button>
          <button type="button" className="play-cta btn-secondary" onClick={() => setScreen({ name: "hub" })}>
            ← Назад
          </button>
        </div>
      </div>
    );
  }

  if (screen.name === "money") {
    return (
      <div className="app-screen">
        <div className="play-stage">
          <div className="play-badge bg-yellow-500/15 border-yellow-400/30 text-yellow-100">💰 Мои деньги</div>
          <div className="glass-card w-full text-center space-y-2">
            <p className="text-white/50 text-sm">Общий баланс</p>
            <p className="text-4xl font-black text-yellow-300">{store.money} ₽</p>
            <p className="text-white/50 text-xs">Русский и математика — один кошелёк</p>
          </div>
          <button type="button" className="play-cta btn-secondary" onClick={() => setScreen({ name: "hub" })}>
            ← Назад
          </button>
        </div>
      </div>
    );
  }

  if (screen.name === "soon") {
    return (
      <div className="app-screen">
        <div className="play-stage">
          <div className="play-emoji">🛠️</div>
          <div className="glass-card w-full text-center space-y-2">
            <p className="font-black text-xl">{screen.title}</p>
            <p className="text-white/60 text-sm">Скоро добавим. Пока зайди в «Сегодня».</p>
          </div>
          <button type="button" className="play-cta btn-secondary" onClick={() => setScreen({ name: "hub" })}>
            ← Назад
          </button>
        </div>
      </div>
    );
  }

  if (screen.name === "play") {
    return (
      <MathPlay
        title={screen.title}
        exercises={screen.exercises}
        onCredit={(amount, reason) => store.credit(amount, reason)}
        onDone={(stats) => setScreen({ name: "summary", stats, title: screen.title })}
        onExit={() => setScreen({ name: "hub" })}
      />
    );
  }

  if (screen.name === "summary") {
    const { stats } = screen;
    return (
      <div className="app-screen">
        <div className="play-stage">
          <div className="play-emoji">🏆</div>
          <div className="glass-card w-full text-center space-y-2">
            <p className="font-black text-2xl">Отлично!</p>
            <p className="text-white/70 text-sm">{stats.total} заданий</p>
            <p className="text-green-300 text-sm">✓ {stats.firstTry} с первой попытки</p>
            <p className="text-yellow-200 text-sm">↻ {stats.retry} исправил сам</p>
            <p className="text-blue-200 text-sm">💡 {stats.withHint} с подсказкой</p>
            {stats.gaveUp > 0 && <p className="text-orange-300 text-sm">Разбор: {stats.gaveUp}</p>}
            <p className="text-yellow-300 font-black text-xl mt-2">+{stats.earned} ₽</p>
            <p className="text-white/50 text-sm">Баланс {store.money} ₽</p>
          </div>
          <button
            type="button"
            className="play-cta btn-primary"
            onClick={() => {
              playClickSound();
              setScreen({ name: "hub" });
            }}
          >
            Закончить
          </button>
          <button
            type="button"
            className="play-cta btn-secondary"
            onClick={() => {
              playClickSound();
              setScreen({ name: "play", exercises: buildTodaySession(5), title: "Ещё 5" });
            }}
          >
            Ещё 5 заданий
          </button>
        </div>
      </div>
    );
  }

  return null;
}

function openHub(id: MathHubId, setScreen: (s: Screen) => void) {
  if (id === "today") setScreen({ name: "today" });
  else if (id === "train") setScreen({ name: "train" });
  else if (id === "table") setScreen({ name: "table" });
  else if (id === "tasks") setScreen({ name: "tasks" });
  else if (id === "money") setScreen({ name: "money" });
  else setScreen({ name: "soon", title: "Домашка" });
}

function trainTitle(cat: MathCategory): string {
  const map: Record<MathCategory, string> = {
    calc: "Вычисления",
    compare: "Сравнение",
    missing: "Найди число",
    word: "Задачи",
    series: "Ряды",
    multiply: "Умножение",
  };
  return map[cat];
}

function TodayIntro({
  money,
  onStart,
  onBack,
}: {
  money: number;
  onStart: () => void;
  onBack: () => void;
}) {
  return (
    <div className="app-screen">
      <div className="play-stage">
        <div className="play-badge bg-yellow-500/15 border-yellow-400/30 text-yellow-100">☀️ Сегодня</div>
        <div className="glass-card w-full space-y-3 text-center">
          <p className="font-black text-2xl">Сегодняшняя тренировка</p>
          <p className="text-white/70">10 заданий</p>
          <p className="text-white/50 text-sm">~7 минут</p>
          <p className="text-yellow-300 font-black">Можно заработать до +20 ₽</p>
        </div>
        <button type="button" className="play-cta btn-primary" onClick={onStart}>
          Начать
        </button>
        <div className="glass-card w-full !p-3 text-sm text-white/60 flex justify-between">
          <span>Баланс</span>
          <span className="text-yellow-300 font-black">{money} ₽</span>
        </div>
        <button type="button" className="play-cta btn-secondary" onClick={onBack}>
          ← Назад
        </button>
      </div>
    </div>
  );
}

function TrainPick({ onPick, onBack }: { onPick: (c: MathCategory) => void; onBack: () => void }) {
  const items: { id: MathCategory; emoji: string; title: string }[] = [
    { id: "calc", emoji: "➕", title: "Сложение и вычитание" },
    { id: "compare", emoji: "⚖️", title: "Сравнение" },
    { id: "missing", emoji: "⬜", title: "Найди число" },
    { id: "word", emoji: "📖", title: "Задачи" },
    { id: "series", emoji: "🔢", title: "Ряды" },
    { id: "multiply", emoji: "✖️", title: "Умножение" },
  ];
  return (
    <div className="app-screen">
      <div className="play-stage">
        <div className="play-badge bg-purple-500/15 border-purple-400/30 text-purple-100">🏋️ Тренировка</div>
        <div className="space-y-2 w-full">
          {items.map((item) => (
            <button
              key={item.id}
              type="button"
              className="w-full btn-secondary play-cta text-left flex items-center gap-3"
              onClick={() => onPick(item.id)}
            >
              <span className="text-2xl">{item.emoji}</span>
              <span className="font-black">{item.title}</span>
            </button>
          ))}
        </div>
        <button type="button" className="play-cta btn-secondary" onClick={onBack}>
          ← Назад
        </button>
      </div>
    </div>
  );
}

function TablePick({ onPick, onBack }: { onPick: (n: number) => void; onBack: () => void }) {
  return (
    <div className="app-screen">
      <div className="play-stage">
        <div className="play-badge bg-orange-500/15 border-orange-400/30 text-orange-100">✖️ Таблица</div>
        <p className="text-white/70 text-sm text-center mb-2">Выбери множитель</p>
        <div className="grid grid-cols-3 gap-2 w-full">
          {[2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
            <button key={n} type="button" className="btn-primary py-4 text-xl font-black" onClick={() => onPick(n)}>
              ×{n}
            </button>
          ))}
        </div>
        <button type="button" className="play-cta btn-secondary mt-2" onClick={onBack}>
          ← Назад
        </button>
      </div>
    </div>
  );
}

function MathPlay({
  title,
  exercises: initial,
  onCredit,
  onDone,
  onExit,
}: {
  title: string;
  exercises: MathExercise[];
  onCredit: (amount: number, reason: string) => Promise<void>;
  onDone: (stats: SessionStats) => void;
  onExit: () => void;
}) {
  const [queue, setQueue] = useState(initial);
  const [index, setIndex] = useState(0);
  const [attempts, setAttempts] = useState(0);
  const [draft, setDraft] = useState("");
  const [flash, setFlash] = useState<"ok" | "soft" | "hint" | "explain" | null>(null);
  const [hintShown, setHintShown] = useState(false);
  const [askHint, setAskHint] = useState(false);
  const [stats, setStats] = useState<SessionStats>({
    total: 0,
    firstTry: 0,
    retry: 0,
    withHint: 0,
    gaveUp: 0,
    earned: 0,
  });

  const current = queue[index];
  const total = queue.length;

  useEffect(() => {
    setDraft("");
    setAttempts(0);
    setFlash(null);
    setHintShown(false);
    setAskHint(false);
  }, [index, current?.id]);

  const finishOutcome = async (outcome: AttemptOutcome) => {
    const pay = rewardFor(outcome);
    const nextStats: SessionStats = {
      ...stats,
      total: stats.total + 1,
      firstTry: stats.firstTry + (outcome === "first" ? 1 : 0),
      retry: stats.retry + (outcome === "retry" ? 1 : 0),
      withHint: stats.withHint + (outcome === "hint" ? 1 : 0),
      gaveUp: stats.gaveUp + (outcome === "gave_up" ? 1 : 0),
      earned: stats.earned + pay,
    };
    setStats(nextStats);
    if (pay > 0) {
      playCoinSound();
      await onCredit(pay, `Математика · ${title}`);
    }
    if (index + 1 >= queue.length) {
      onDone(nextStats);
      return;
    }
    setIndex((i) => i + 1);
  };

  const checkNumber = async () => {
    if (!current || current.answerKind !== "number" || draft === "") return;
    playClickSound();
    const value = Number(draft.replace(",", "."));
    if (!Number.isFinite(value)) return;
    if (value === current.answer) {
      playCorrectSound();
      setFlash("ok");
      const outcome: AttemptOutcome = hintShown ? "hint" : attempts === 0 ? "first" : "retry";
      window.setTimeout(() => void finishOutcome(outcome), 700);
      return;
    }
    playWrongSound();
    const nextAttempts = attempts + 1;
    setAttempts(nextAttempts);
    setDraft("");
    if (nextAttempts === 1) {
      setFlash("soft");
      return;
    }
    if (nextAttempts === 2) {
      setAskHint(true);
      setFlash("soft");
      return;
    }
    // 3-я ошибка — разбор + похожий
    setFlash("explain");
    window.setTimeout(() => {
      if (current.similar) {
        const similar: MathExercise = {
          ...current.similar,
          id: `${current.id}_s`,
        };
        setQueue((q) => {
          const copy = [...q];
          copy.splice(index + 1, 0, similar);
          return copy;
        });
      }
      void finishOutcome("gave_up");
    }, 2200);
  };

  const checkCompare = async (op: CompareOp) => {
    if (!current || current.answerKind !== "compare") return;
    playClickSound();
    if (op === current.answer) {
      playCorrectSound();
      setFlash("ok");
      const outcome: AttemptOutcome = hintShown ? "hint" : attempts === 0 ? "first" : "retry";
      window.setTimeout(() => void finishOutcome(outcome), 700);
      return;
    }
    playWrongSound();
    const nextAttempts = attempts + 1;
    setAttempts(nextAttempts);
    if (nextAttempts === 1) setFlash("soft");
    else if (nextAttempts === 2) {
      setAskHint(true);
      setFlash("soft");
    } else {
      setFlash("explain");
      window.setTimeout(() => void finishOutcome("gave_up"), 2000);
    }
  };

  if (!current) return null;

  return (
    <div className="app-screen">
      <div className="play-stage">
        <div className="flex items-center justify-between w-full gap-2">
          <button type="button" className="btn-back" aria-label="Выйти" onClick={onExit}>
            ←
          </button>
          <div className="play-badge bg-white/10 border-white/20 text-white/80">
            {index + 1} из {total}
          </div>
          <div className="w-10" />
        </div>

        <div className="glass-card w-full space-y-3 text-center min-h-[8rem]">
          {current.lines?.map((line) => (
            <p key={line} className="text-white/80 text-base text-left">
              {line}
            </p>
          ))}
          <p className="font-black text-3xl tracking-wide">{current.prompt}</p>

          {current.answerKind === "number" && (
            <p className="text-4xl font-black text-yellow-200 tabular-nums min-h-[2.5rem]">{draft || " "}</p>
          )}

          {flash === "ok" && <p className="text-green-300 font-black animate-fade-in-up">✓ Верно</p>}
          {flash === "soft" && !askHint && (
            <p className="text-orange-200 text-sm">Пока не получилось. Попробуй ещё раз.</p>
          )}
          {flash === "hint" && <p className="text-blue-200 text-sm">{current.hint}</p>}
          {flash === "explain" && (
            <div className="text-left text-sm space-y-1">
              <p className="font-black">Разбор</p>
              <p className="text-white/80 whitespace-pre-line">{current.explanation}</p>
              <p className="text-yellow-200">Ответ: {String(current.answer)}</p>
            </div>
          )}
        </div>

        {askHint && !hintShown && (
          <div className="glass-card w-full space-y-2">
            <p className="font-black text-center">Нужна подсказка?</p>
            <button
              type="button"
              className="w-full btn-secondary py-3"
              onClick={() => {
                setAskHint(false);
                setFlash("soft");
              }}
            >
              Попробую сам
            </button>
            <button
              type="button"
              className="w-full btn-primary py-3"
              onClick={() => {
                setHintShown(true);
                setAskHint(false);
                setFlash("hint");
              }}
            >
              Подсказка
            </button>
          </div>
        )}

        {hintShown && flash === "hint" && (
          <button type="button" className="play-cta btn-secondary" onClick={() => setFlash(null)}>
            Понятно, решаю
          </button>
        )}

        {current.answerKind === "compare" && flash !== "ok" && flash !== "explain" && !askHint && (
          <div className="grid grid-cols-3 gap-2 w-full">
            {(["<", "=", ">"] as CompareOp[]).map((op) => (
              <button key={op} type="button" className="btn-primary py-5 text-3xl font-black" onClick={() => void checkCompare(op)}>
                {op}
              </button>
            ))}
          </div>
        )}

        {current.answerKind === "number" && flash !== "ok" && flash !== "explain" && !askHint && (
          <>
            <NumPad
              value={draft}
              onChange={setDraft}
              onSubmit={() => void checkNumber()}
            />
            <button
              type="button"
              className="play-cta btn-primary"
              disabled={!draft}
              onClick={() => void checkNumber()}
            >
              Проверить
            </button>
          </>
        )}
      </div>
    </div>
  );
}

function NumPad({
  value,
  onChange,
  onSubmit,
}: {
  value: string;
  onChange: (v: string) => void;
  onSubmit: () => void;
}) {
  const keys = useMemo(() => ["1", "2", "3", "4", "5", "6", "7", "8", "9", "⌫", "0", "−"], []);
  return (
    <div className="grid grid-cols-3 gap-2 w-full">
      {keys.map((key) => (
        <button
          key={key}
          type="button"
          className="btn-secondary py-4 text-xl font-black active:scale-95"
          onClick={() => {
            playClickSound();
            if (key === "⌫") {
              onChange(value.slice(0, -1));
              return;
            }
            if (key === "−") {
              if (!value) onChange("-");
              return;
            }
            if (value.length >= 4) return;
            onChange(value + key);
          }}
          onDoubleClick={() => {
            if (key === "0" || (key >= "1" && key <= "9")) onSubmit();
          }}
        >
          {key}
        </button>
      ))}
    </div>
  );
}
