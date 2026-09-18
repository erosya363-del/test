import { useEffect, useMemo, useRef, useState } from "react";
import { useGameStore } from "../data/GameStore";
import { playClickSound, playCorrectSound, playWrongSound, playCoinSound, resumeAudio } from "../sounds";
import { MATH_CURRICULUM, SECTION_TITLES } from "./curriculum";
import {
  buildCheckSession,
  buildTableSession,
  buildTodaySession,
  buildTrainSession,
  makeBySkillId,
} from "./generate";
import {
  applyMathAttempt,
  encodeMathStatsCompact,
  encodeSkillStatesCompact,
  loadMathProgress,
  pullAndMergeMathCloud,
  saveMathProgress,
  updateTableFact,
  type MathProgressBundle,
} from "./progress";
import { loadMathCloudStats, loadMathCloudStates, saveMathCloudStats, saveMathCloudStates } from "../data/cloud";
import { applyOutcome, emptySessionStats, outcomeFromAttempts, withSimilarQueued } from "./session";
import { meaningText, nextLearnPair, repeatedSum, tableFactKey } from "./tableLearn";
import {
  DEFAULT_MATH_REWARDS,
  MATH_HUB_CARDS,
  rewardFor,
  type AttemptOutcome,
  type CompareOp,
  type LengthPair,
  type MathCategory,
  type MathExercise,
  type MathHubId,
  type MathSkillId,
  type SessionStats,
  type SkillState,
} from "./types";

type Screen =
  | { name: "hub" }
  | { name: "learn" }
  | { name: "learnSkill"; skillId: MathSkillId }
  | { name: "train" }
  | { name: "table" }
  | { name: "tableMode"; factor: number }
  | { name: "tableLearn"; factor: number }
  | { name: "tasks" }
  | { name: "checkPick" }
  | {
      name: "play";
      exercises: MathExercise[];
      title: string;
      mode: "train" | "check" | "learn";
    }
  | { name: "summary"; stats: SessionStats; title: string };

export type MathLaunch = "today" | "calc" | "table" | null;

type Props = {
  onBackToSubjects: () => void;
  launch?: MathLaunch;
  onSessionComplete?: () => void;
};

function initialScreen(launch?: MathLaunch): Screen {
  if (launch === "today") {
    return { name: "play", exercises: buildTodaySession(10), title: "Математика", mode: "train" };
  }
  if (launch === "calc") {
    return { name: "play", exercises: buildTrainSession("calc", 10), title: "Вычисления", mode: "train" };
  }
  if (launch === "table") {
    return { name: "tableMode", factor: 2 };
  }
  return { name: "hub" };
}

function mathRewardsFromStore(settings: {
  mathRewardFirst?: number;
  mathRewardRetry?: number;
  mathRewardHint?: number;
  mathRewardGaveUp?: number;
}) {
  return {
    mathRewardFirst: settings.mathRewardFirst ?? DEFAULT_MATH_REWARDS.mathRewardFirst,
    mathRewardRetry: settings.mathRewardRetry ?? DEFAULT_MATH_REWARDS.mathRewardRetry,
    mathRewardHint: settings.mathRewardHint ?? DEFAULT_MATH_REWARDS.mathRewardHint,
    mathRewardGaveUp: settings.mathRewardGaveUp ?? DEFAULT_MATH_REWARDS.mathRewardGaveUp,
  };
}

export function MathApp({ onBackToSubjects, launch = null, onSessionComplete }: Props) {
  const store = useGameStore();
  const [screen, setScreen] = useState<Screen>(() => initialScreen(launch));
  const [progress, setProgress] = useState<MathProgressBundle>(() => loadMathProgress());

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const merged = await pullAndMergeMathCloud(
          loadMathCloudStats,
          loadMathCloudStates,
          saveMathCloudStats,
          saveMathCloudStates,
        );
        if (!cancelled) setProgress(merged);
      } catch {
        /* offline — локальный прогресс */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const persistProgress = (next: MathProgressBundle) => {
    setProgress(next);
    saveMathProgress(next);
    void saveMathCloudStats(encodeMathStatsCompact(next.stats));
    void saveMathCloudStates(encodeSkillStatesCompact(next.states));
  };

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
              <p className="text-[11px] text-white/40 text-right">Общий баланс</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 w-full mb-3">
            {MATH_HUB_CARDS.map((card) => (
              <button
                key={card.id}
                type="button"
                className={`glass-card !p-4 text-left active:scale-[0.98] transition-transform ${
                  card.id === "check" ? "col-span-2" : ""
                }`}
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
            ← Назад
          </button>
        </div>
      </div>
    );
  }

  if (screen.name === "learn") {
    const openSkills = MATH_CURRICULUM.filter((s) => {
      if (s.section === "division") return false;
      const st = progress.states[s.skillId] ?? s.defaultState;
      return st === "learning" || st === "practice";
    });
    return (
      <div className="app-screen">
        <div className="play-stage">
          <div className="play-badge bg-purple-500/15 border-purple-400/30 text-purple-100">📚 Учусь</div>
          <div className="space-y-2 w-full max-h-[60vh] overflow-y-auto">
            {openSkills.length === 0 && (
              <p className="text-white/60 text-sm text-center">Пока нет открытых тем. Папа может открыть их в кабинете.</p>
            )}
            {openSkills.map((s) => (
              <button
                key={s.skillId}
                type="button"
                className="w-full btn-secondary play-cta text-left"
                onClick={() => {
                  playClickSound();
                  setScreen({ name: "learnSkill", skillId: s.skillId });
                }}
              >
                <span className="font-black">{s.title}</span>
                <span className="block text-xs text-white/50">{SECTION_TITLES[s.section]}</span>
              </button>
            ))}
          </div>
          <button type="button" className="play-cta btn-secondary" onClick={() => setScreen({ name: "hub" })}>
            ← Назад
          </button>
        </div>
      </div>
    );
  }

  if (screen.name === "learnSkill") {
    return (
      <LearnFlow
        skillId={screen.skillId}
        rewards={mathRewardsFromStore(store.settings)}
        onCredit={(amount, reason) => store.credit(amount, reason)}
        onProgress={(next) => persistProgress(next)}
        progress={progress}
        onBack={() => setScreen({ name: "learn" })}
        onDone={(stats) => setScreen({ name: "summary", stats, title: "Урок" })}
      />
    );
  }

  if (screen.name === "train") {
    return (
      <TrainPick
        onPick={(cat) => {
          playClickSound();
          setScreen({
            name: "play",
            exercises: buildTrainSession(cat, 10),
            title: trainTitle(cat),
            mode: "train",
          });
        }}
        onBack={() => setScreen({ name: "hub" })}
      />
    );
  }

  if (screen.name === "table") {
    return (
      <TablePick
        states={progress.states}
        onPick={(n) => {
          playClickSound();
          setScreen({ name: "tableMode", factor: n });
        }}
        onBack={() => setScreen({ name: "hub" })}
      />
    );
  }

  if (screen.name === "tableMode") {
    const factor = screen.factor;
    return (
      <div className="app-screen">
        <div className="play-stage">
          <div className="play-badge bg-orange-500/15 border-orange-400/30 text-orange-100">✖️ Таблица ×{factor}</div>
          <div className="space-y-2 w-full">
            <button
              type="button"
              className="w-full btn-primary play-cta"
              onClick={() => {
                playClickSound();
                setScreen({ name: "tableLearn", factor });
              }}
            >
              📚 Учусь
            </button>
            <button
              type="button"
              className="w-full btn-secondary play-cta"
              onClick={() => {
                playClickSound();
                setScreen({
                  name: "play",
                  exercises: buildTableSession(factor, 10),
                  title: `Тренировка ×${factor}`,
                  mode: "train",
                });
              }}
            >
              🏋️ Тренируюсь
            </button>
            <button
              type="button"
              className="w-full btn-secondary play-cta"
              onClick={() => {
                playClickSound();
                setScreen({
                  name: "play",
                  exercises: buildTableSession(factor, 10),
                  title: `Проверка ×${factor}`,
                  mode: "check",
                });
              }}
            >
              ✅ Проверка
            </button>
          </div>
          <button type="button" className="play-cta btn-secondary" onClick={() => setScreen({ name: "table" })}>
            ← Назад
          </button>
        </div>
      </div>
    );
  }

  if (screen.name === "tableLearn") {
    return (
      <TableLearnFlow
        factor={screen.factor}
        progress={progress}
        onProgress={persistProgress}
        onBack={() => setScreen({ name: "tableMode", factor: screen.factor })}
        onDone={(stats) => setScreen({ name: "summary", stats, title: `Учусь ×${screen.factor}` })}
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
            <p className="text-white/60 text-sm">10 задач</p>
          </div>
          <button
            type="button"
            className="play-cta btn-primary"
            onClick={() => {
              playClickSound();
              setScreen({ name: "play", exercises: buildTrainSession("word", 10), title: "Задачи", mode: "train" });
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

  if (screen.name === "checkPick") {
    return (
      <div className="app-screen">
        <div className="play-stage">
          <div className="play-badge bg-green-500/15 border-green-400/30 text-green-100">✅ Проверка</div>
          <p className="text-white/70 text-sm text-center">Без подсказок во время ответа</p>
          <button
            type="button"
            className="play-cta btn-primary"
            onClick={() => {
              playClickSound();
              setScreen({ name: "play", exercises: buildCheckSession(10), title: "Проверка 10", mode: "check" });
            }}
          >
            10 заданий
          </button>
          <button
            type="button"
            className="play-cta btn-secondary"
            onClick={() => {
              playClickSound();
              setScreen({ name: "play", exercises: buildCheckSession(20), title: "Проверка 20", mode: "check" });
            }}
          >
            20 заданий
          </button>
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
        mode={screen.mode}
        rewards={mathRewardsFromStore(store.settings)}
        progress={progress}
        onProgress={persistProgress}
        onCredit={(amount, reason) => store.credit(amount, reason)}
        onDone={(stats) => setScreen({ name: "summary", stats, title: screen.title })}
        onExit={() => (launch ? onBackToSubjects() : setScreen({ name: "hub" }))}
      />
    );
  }

  if (screen.name === "summary") {
    const { stats } = screen;
    const skillRows = Object.entries(stats.bySkill ?? {});
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
            {stats.learned > 0 && <p className="text-purple-200 text-sm">Изучено шагов: {stats.learned}</p>}
            {skillRows.length > 0 && (
              <div className="text-left text-xs space-y-1 pt-2 border-t border-white/10">
                {skillRows.slice(0, 8).map(([id, row]) => (
                  <p key={id} className="text-white/60">
                    {id}: ✓{row.ok} / ✗{row.fail}
                  </p>
                ))}
              </div>
            )}
            <p className="text-yellow-300 font-black text-xl mt-2">+{stats.earned} ₽</p>
            <p className="text-white/50 text-sm">Баланс {store.money} ₽</p>
          </div>
          <button
            type="button"
            className="play-cta btn-primary"
            onClick={() => {
              playClickSound();
              onSessionComplete?.();
              if (launch) onBackToSubjects();
              else setScreen({ name: "hub" });
            }}
          >
            Закончить
          </button>
          {!launch && (
            <button
              type="button"
              className="play-cta btn-secondary"
              onClick={() => {
                playClickSound();
                setScreen({ name: "play", exercises: buildTodaySession(5), title: "Ещё 5", mode: "train" });
              }}
            >
              Ещё 5 заданий
            </button>
          )}
        </div>
      </div>
    );
  }

  return null;
}

function openHub(id: MathHubId, setScreen: (s: Screen) => void) {
  switch (id) {
    case "learn":
      setScreen({ name: "learn" });
      break;
    case "train":
      setScreen({ name: "train" });
      break;
    case "table":
      setScreen({ name: "table" });
      break;
    case "tasks":
      setScreen({ name: "tasks" });
      break;
    case "check":
      setScreen({ name: "checkPick" });
      break;
    default: {
      const _exhaustive: never = id;
      return _exhaustive;
    }
  }
}

function trainTitle(cat: MathCategory): string {
  const map: Record<MathCategory, string> = {
    calc: "Вычисления",
    compare: "Сравнение",
    missing: "Найди число",
    word: "Задачи",
    series: "Ряды",
    multiply: "Умножение",
    length: "Величины",
    geometry: "Геометрия",
  };
  return map[cat];
}

function TrainPick({ onPick, onBack }: { onPick: (c: MathCategory) => void; onBack: () => void }) {
  const items: { id: MathCategory; emoji: string; title: string }[] = [
    { id: "calc", emoji: "➕", title: "Сложение и вычитание" },
    { id: "compare", emoji: "⚖️", title: "Сравнение" },
    { id: "missing", emoji: "⬜", title: "Найди число" },
    { id: "length", emoji: "📏", title: "Величины" },
    { id: "series", emoji: "🔢", title: "Ряды" },
    { id: "geometry", emoji: "➖", title: "Отрезки" },
    { id: "word", emoji: "📖", title: "Задачи" },
    { id: "multiply", emoji: "✖️", title: "Умножение" },
  ];
  return (
    <div className="app-screen">
      <div className="play-stage">
        <div className="play-badge bg-purple-500/15 border-purple-400/30 text-purple-100">🏋️ Тренируюсь</div>
        <div className="space-y-2 w-full max-h-[60vh] overflow-y-auto">
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

function TablePick({
  states,
  onPick,
  onBack,
}: {
  states: Record<string, SkillState>;
  onPick: (n: number) => void;
  onBack: () => void;
}) {
  return (
    <div className="app-screen">
      <div className="play-stage">
        <div className="play-badge bg-orange-500/15 border-orange-400/30 text-orange-100">✖️ Таблица</div>
        <p className="text-white/70 text-sm text-center mb-2">Выбери таблицу</p>
        <div className="grid grid-cols-3 gap-2 w-full">
          {[2, 3, 4, 5, 6, 7, 8, 9].map((n) => {
            const st = states[`times_${n}`] ?? "locked";
            const locked = st === "locked";
            return (
              <button
                key={n}
                type="button"
                className={`py-4 text-xl font-black ${locked ? "btn-secondary opacity-50" : "btn-primary"}`}
                onClick={() => {
                  if (locked) return;
                  onPick(n);
                }}
              >
                ×{n}
                {locked ? " 🔒" : ""}
              </button>
            );
          })}
        </div>
        <p className="text-white/40 text-[11px] text-center mt-2">Закрытые таблицы открывает папа</p>
        <button type="button" className="play-cta btn-secondary mt-2" onClick={onBack}>
          ← Назад
        </button>
      </div>
    </div>
  );
}

function DotGroups({ a, b }: { a: number; b: number }) {
  return (
    <div className="flex flex-col gap-2 items-center py-2">
      {Array.from({ length: a }, (_, gi) => (
        <div key={gi} className="flex gap-1.5 justify-center">
          {Array.from({ length: b }, (_, di) => (
            <span key={di} className="inline-block w-3.5 h-3.5 rounded-full bg-yellow-300/90" />
          ))}
        </div>
      ))}
      <p className="text-white/70 text-sm">{meaningText(a, b)}</p>
    </div>
  );
}

function TableLearnFlow({
  factor,
  progress,
  onProgress,
  onBack,
  onDone,
}: {
  factor: number;
  progress: MathProgressBundle;
  onProgress: (p: MathProgressBundle) => void;
  onBack: () => void;
  onDone: (stats: SessionStats) => void;
}) {
  const seen = useMemo(() => new Set(Object.keys(progress.tableFacts).filter((k) => k.startsWith(`${factor}x`))), [progress.tableFacts, factor]);
  const [pair, setPair] = useState(() => nextLearnPair(factor, seen));
  const [step, setStep] = useState<"meaning" | "sum" | "formula" | "try" | "help">("meaning");
  const [draft, setDraft] = useState("");
  const [stats, setStats] = useState(emptySessionStats);
  const [doneCount, setDoneCount] = useState(0);

  const product = pair.a * pair.b;

  const advancePair = () => {
    const nextSeen = new Set(seen);
    nextSeen.add(tableFactKey(pair.a, pair.b));
    setPair(nextLearnPair(factor, nextSeen));
    setStep("meaning");
    setDraft("");
    setDoneCount((c) => c + 1);
  };

  if (doneCount >= 5) {
    return (
      <div className="app-screen">
        <div className="play-stage">
          <div className="glass-card w-full text-center space-y-2">
            <p className="font-black text-xl">Хорошая работа!</p>
            <p className="text-white/70 text-sm">5 фактов по ×{factor}</p>
          </div>
          <button type="button" className="play-cta btn-primary" onClick={() => onDone(stats)}>
            Дальше
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="app-screen">
      <div className="play-stage">
        <div className="flex items-center justify-between w-full">
          <button type="button" className="btn-back" onClick={onBack}>
            ←
          </button>
          <div className="play-badge bg-orange-500/15 border-orange-400/30 text-orange-100">Учусь ×{factor}</div>
          <div className="w-10" />
        </div>

        <div className="glass-card w-full space-y-3 text-center">
          {step === "meaning" && (
            <>
              <p className="font-black text-2xl">{pair.a} × {pair.b}</p>
              <DotGroups a={pair.a} b={pair.b} />
              <button type="button" className="play-cta btn-primary" onClick={() => setStep("sum")}>
                Дальше
              </button>
            </>
          )}
          {step === "sum" && (
            <>
              <p className="font-black text-xl">{repeatedSum(pair.a, pair.b)} = {product}</p>
              <p className="text-white/60 text-sm">{meaningText(pair.a, pair.b)}</p>
              <button type="button" className="play-cta btn-primary" onClick={() => setStep("formula")}>
                Дальше
              </button>
            </>
          )}
          {step === "formula" && (
            <>
              <p className="font-black text-3xl">
                {pair.a} × {pair.b} = {product}
              </p>
              <button
                type="button"
                className="play-cta btn-primary"
                onClick={() => {
                  onProgress(
                    updateTableFact(progress, tableFactKey(pair.a, pair.b), { seen: 1 }),
                  );
                  setStep("try");
                }}
              >
                Попробую сам
              </button>
            </>
          )}
          {(step === "try" || step === "help") && (
            <>
              <p className="font-black text-3xl">
                {pair.a} × {pair.b} = ?
              </p>
              {step === "help" && (
                <div className="text-left text-sm space-y-2">
                  <DotGroups a={pair.a} b={pair.b} />
                  <p>{repeatedSum(pair.a, pair.b)} = {product}</p>
                  <p className="text-yellow-200">Ответ: {product}</p>
                </div>
              )}
              <p className="text-4xl font-black text-yellow-200 tabular-nums min-h-[2.5rem]">{draft || " "}</p>
            </>
          )}
        </div>

        {(step === "try" || step === "help") && (
          <>
            <NumPad value={draft} onChange={setDraft} onSubmit={() => undefined} />
            <button
              type="button"
              className="play-cta btn-primary"
              disabled={!draft}
              onClick={() => {
                playClickSound();
                const value = Number(draft);
                if (value === product) {
                  playCorrectSound();
                  onProgress(
                    updateTableFact(progress, tableFactKey(pair.a, pair.b), {
                      seen: 1,
                      correctFirstTry: step === "try" ? 1 : 0,
                    }),
                  );
                  setStats((s) => applyOutcome(s, "learned"));
                  advancePair();
                } else {
                  playWrongSound();
                  setDraft("");
                }
              }}
            >
              Проверить
            </button>
            <button
              type="button"
              className="play-cta btn-secondary"
              onClick={() => {
                playClickSound();
                setStep("help");
              }}
            >
              Не понимаю
            </button>
          </>
        )}
      </div>
    </div>
  );
}

function LearnFlow({
  skillId,
  rewards,
  onCredit,
  progress,
  onProgress,
  onBack,
  onDone,
}: {
  skillId: MathSkillId;
  rewards: ReturnType<typeof mathRewardsFromStore>;
  onCredit: (n: number, r: string) => Promise<void>;
  progress: MathProgressBundle;
  onProgress: (p: MathProgressBundle) => void;
  onBack: () => void;
  onDone: (s: SessionStats) => void;
}) {
  const [phase, setPhase] = useState<"explain" | "together" | "hint" | "solo">("explain");
  const [ex, setEx] = useState(() => makeBySkillId(skillId));
  const [draft, setDraft] = useState("");
  const [stats, setStats] = useState(emptySessionStats);
  const [showHelp, setShowHelp] = useState(false);

  const skill = MATH_CURRICULUM.find((s) => s.skillId === skillId);

  const goNextPhase = () => {
    if (phase === "explain") setPhase("together");
    else if (phase === "together") setPhase("hint");
    else if (phase === "hint") setPhase("solo");
    else onDone(stats);
    setEx(makeBySkillId(skillId));
    setDraft("");
    setShowHelp(false);
  };

  return (
    <div className="app-screen">
      <div className="play-stage">
        <div className="flex items-center justify-between w-full">
          <button type="button" className="btn-back" onClick={onBack}>
            ←
          </button>
          <div className="play-badge bg-purple-500/15 border-purple-400/30 text-purple-100">{skill?.shortTitle ?? skillId}</div>
          <div className="w-10" />
        </div>

        <div className="glass-card w-full space-y-3 text-center">
          {phase === "explain" && (
            <>
              <p className="font-black text-xl">{skill?.title}</p>
              <p className="text-white/70 text-sm">{skill?.description}</p>
              <p className="text-white/80 text-sm whitespace-pre-line">{ex.explanation}</p>
              <p className="font-black text-2xl">{ex.prompt}</p>
              <p className="text-yellow-200">Ответ: {formatAnswer(ex)}</p>
              <button type="button" className="play-cta btn-primary" onClick={goNextPhase}>
                Пример вместе
              </button>
            </>
          )}
          {phase !== "explain" && (
            <>
              {ex.lines?.map((line) => (
                <p key={line} className="text-white/80 text-base text-left">
                  {line}
                </p>
              ))}
              <p className="font-black text-3xl">{ex.prompt}</p>
              {showHelp && (
                <div className="text-left text-sm space-y-1">
                  <p className="text-blue-200">{ex.hint}</p>
                  <p className="text-white/80 whitespace-pre-line">{ex.explanation}</p>
                  <p className="text-yellow-200">Ответ: {formatAnswer(ex)}</p>
                </div>
              )}
              {phase === "hint" && !showHelp && <p className="text-blue-200 text-sm">{ex.hint}</p>}
              {ex.answerKind === "number" && (
                <p className="text-4xl font-black text-yellow-200 tabular-nums min-h-[2.5rem]">{draft || " "}</p>
              )}
            </>
          )}
        </div>

        {phase !== "explain" && ex.answerKind === "number" && (
          <>
            <NumPad value={draft} onChange={setDraft} onSubmit={() => undefined} />
            <button
              type="button"
              className="play-cta btn-primary"
              disabled={!draft}
              onClick={() => {
                playClickSound();
                const value = Number(draft.replace(",", "."));
                if (value === ex.answer) {
                  playCorrectSound();
                  const outcome: AttemptOutcome = phase === "solo" ? "first" : "learned";
                  const nextStats = applyOutcome(stats, outcome, rewards, skillId, true);
                  setStats(nextStats);
                  const pay = rewardFor(outcome, rewards);
                  if (pay > 0) void onCredit(pay, "Математика · урок");
                  onProgress(
                    applyMathAttempt(progress, {
                      skillId,
                      prompt: ex.prompt,
                      expectedAnswer: String(ex.answer),
                      userAnswer: draft,
                      attempts: 1,
                      hintUsed: phase === "hint" || showHelp,
                      outcome,
                      durationMs: 0,
                    }),
                  );
                  goNextPhase();
                } else {
                  playWrongSound();
                  setDraft("");
                }
              }}
            >
              Проверить
            </button>
            <button
              type="button"
              className="play-cta btn-secondary"
              onClick={() => {
                playClickSound();
                setShowHelp(true);
              }}
            >
              Не понимаю
            </button>
          </>
        )}

        {phase !== "explain" && ex.answerKind === "compare" && (
          <div className="grid grid-cols-3 gap-2 w-full">
            {(["<", "=", ">"] as CompareOp[]).map((op) => (
              <button
                key={op}
                type="button"
                className="btn-primary py-5 text-3xl font-black"
                onClick={() => {
                  if (op === ex.answer) {
                    playCorrectSound();
                    setStats((s) => applyOutcome(s, "learned", rewards, skillId));
                    goNextPhase();
                  } else playWrongSound();
                }}
              >
                {op}
              </button>
            ))}
          </div>
        )}

        {phase !== "explain" && (ex.answerKind === "done" || ex.answerKind === "pair") && (
          <button type="button" className="play-cta btn-primary" onClick={goNextPhase}>
            Понятно
          </button>
        )}
      </div>
    </div>
  );
}

function formatAnswer(ex: MathExercise): string {
  if (ex.answerKind === "pair" && typeof ex.answer === "object" && ex.answer && "dm" in ex.answer) {
    const p = ex.answer as LengthPair;
    return `${p.dm} дм ${p.cm} см`;
  }
  return String(ex.answer);
}

function MathPlay({
  title,
  exercises: initial,
  mode,
  rewards,
  progress: _progress,
  onProgress,
  onCredit,
  onDone,
  onExit,
}: {
  title: string;
  exercises: MathExercise[];
  mode: "train" | "check" | "learn";
  rewards: ReturnType<typeof mathRewardsFromStore>;
  progress: MathProgressBundle;
  onProgress: (p: MathProgressBundle) => void;
  onCredit: (amount: number, reason: string) => Promise<void>;
  onDone: (stats: SessionStats) => void;
  onExit: () => void;
}) {
  const [queue, setQueue] = useState(initial);
  const [index, setIndex] = useState(0);
  const [attempts, setAttempts] = useState(0);
  const [draft, setDraft] = useState("");
  const [pairDm, setPairDm] = useState("");
  const [pairCm, setPairCm] = useState("");
  const [flash, setFlash] = useState<"ok" | "soft" | "hint" | "explain" | null>(null);
  const [hintShown, setHintShown] = useState(false);
  const [askHint, setAskHint] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [stats, setStats] = useState<SessionStats>(emptySessionStats);
  const startedAt = useRef(Date.now());
  const creditedRef = useRef(false);
  const timersRef = useRef<number[]>([]);

  const current = queue[index];
  const total = queue.length;
  const isCheck = mode === "check";

  useEffect(() => {
    setDraft("");
    setPairDm("");
    setPairCm("");
    setAttempts(0);
    setFlash(null);
    setHintShown(false);
    setAskHint(false);
    setShowHelp(false);
    startedAt.current = Date.now();
    creditedRef.current = false;
  }, [index, current?.id]);

  useEffect(() => {
    return () => {
      for (const t of timersRef.current) window.clearTimeout(t);
      timersRef.current = [];
    };
  }, []);

  const later = (fn: () => void, ms: number) => {
    const id = window.setTimeout(fn, ms);
    timersRef.current.push(id);
  };

  const finishOutcome = async (outcome: AttemptOutcome, userAnswer = "") => {
    if (creditedRef.current) return;
    creditedRef.current = true;
    const pay = rewardFor(outcome, rewards);
    const nextStats = applyOutcome(stats, outcome, rewards, current?.skillId, outcome !== "gave_up");
    setStats(nextStats);
    if (current) {
      const fresh = loadMathProgress();
      onProgress(
        applyMathAttempt(fresh, {
          skillId: current.skillId,
          prompt: current.prompt,
          expectedAnswer: formatAnswer(current),
          userAnswer,
          attempts: attempts + 1,
          hintUsed: hintShown || showHelp,
          outcome,
          durationMs: Date.now() - startedAt.current,
        }),
      );
    }
    if (pay > 0) {
      playCoinSound();
      // Не ждём облако: иначе «✓ Верно» зависает на секунды при медленном KeyVal.
      void onCredit(pay, `Математика · ${title}`);
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
      const outcome = outcomeFromAttempts(attempts, hintShown || showHelp);
      later(() => void finishOutcome(outcome, draft), 700);
      return;
    }
    playWrongSound();
    if (isCheck) {
      const nextAttempts = attempts + 1;
      setAttempts(nextAttempts);
      setDraft("");
      setFlash("soft");
      if (nextAttempts >= 1) {
        later(() => void finishOutcome("gave_up", draft), 800);
      }
      return;
    }
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
    setFlash("explain");
    later(() => {
      if (current.similar) {
        setQueue((q) => withSimilarQueued(q, index, current));
      }
      void finishOutcome("gave_up", draft);
    }, 2200);
  };

  const checkPair = async () => {
    if (!current || current.answerKind !== "pair") return;
    const expected = current.answer as LengthPair;
    const dm = Number(pairDm);
    const cm = Number(pairCm);
    playClickSound();
    if (dm === expected.dm && cm === expected.cm) {
      playCorrectSound();
      setFlash("ok");
      later(() => void finishOutcome(outcomeFromAttempts(attempts, hintShown), `${dm}дм${cm}см`), 700);
      return;
    }
    playWrongSound();
    setAttempts((a) => a + 1);
    setFlash("soft");
  };

  const checkCompare = async (op: CompareOp) => {
    if (!current || current.answerKind !== "compare") return;
    playClickSound();
    if (op === current.answer) {
      playCorrectSound();
      setFlash("ok");
      const outcome = outcomeFromAttempts(attempts, hintShown);
      later(() => void finishOutcome(outcome, op), 700);
      return;
    }
    playWrongSound();
    if (isCheck) {
      later(() => void finishOutcome("gave_up", op), 600);
      return;
    }
    const nextAttempts = attempts + 1;
    setAttempts(nextAttempts);
    if (nextAttempts === 1) setFlash("soft");
    else if (nextAttempts === 2) {
      setAskHint(true);
      setFlash("soft");
    } else {
      setFlash("explain");
      later(() => void finishOutcome("gave_up", op), 2000);
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

          {current.answerKind === "pair" && (
            <p className="text-2xl font-black text-yellow-200">
              {pairDm || "?"} дм {pairCm || "?"} см
            </p>
          )}

          {flash === "ok" && <p className="text-green-300 font-black animate-fade-in-up">✓ Верно</p>}
          {flash === "soft" && !askHint && (
            <p className="text-orange-200 text-sm">Пока не получилось. Попробуй ещё раз.</p>
          )}
          {(flash === "hint" || showHelp) && !isCheck && <p className="text-blue-200 text-sm">{current.hint}</p>}
          {flash === "explain" && (
            <div className="text-left text-sm space-y-1">
              <p className="font-black">Разбор</p>
              <p className="text-white/80 whitespace-pre-line">{current.explanation}</p>
              <p className="text-yellow-200">Ответ: {formatAnswer(current)}</p>
            </div>
          )}
          {showHelp && (
            <div className="text-left text-sm space-y-1">
              <p className="text-white/80 whitespace-pre-line">{current.explanation}</p>
              <p className="text-yellow-200">Ответ: {formatAnswer(current)}</p>
            </div>
          )}
        </div>

        {askHint && !hintShown && !isCheck && (
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
            <NumPad value={draft} onChange={setDraft} onSubmit={() => void checkNumber()} />
            <button type="button" className="play-cta btn-primary" disabled={!draft} onClick={() => void checkNumber()}>
              Проверить
            </button>
          </>
        )}

        {current.answerKind === "pair" && flash !== "ok" && (
          <>
            <div className="grid grid-cols-2 gap-2 w-full">
              <div>
                <p className="field-label text-center">дм</p>
                <NumPad value={pairDm} onChange={setPairDm} onSubmit={() => undefined} />
              </div>
              <div>
                <p className="field-label text-center">см</p>
                <NumPad value={pairCm} onChange={setPairCm} onSubmit={() => undefined} />
              </div>
            </div>
            <button
              type="button"
              className="play-cta btn-primary"
              disabled={!pairDm || !pairCm}
              onClick={() => void checkPair()}
            >
              Проверить
            </button>
          </>
        )}

        {current.answerKind === "done" && (
          <button
            type="button"
            className="play-cta btn-primary"
            onClick={() => void finishOutcome("first", "done")}
          >
            Готово
          </button>
        )}

        {!isCheck && flash !== "ok" && flash !== "explain" && (
          <button
            type="button"
            className="play-cta btn-secondary"
            onClick={() => {
              playClickSound();
              setShowHelp(true);
              setFlash("hint");
            }}
          >
            Не понимаю
          </button>
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
