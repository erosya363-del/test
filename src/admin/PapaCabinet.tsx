import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { useGameStore } from "../data/GameStore";
import { DEFAULT_SETTINGS, type PhotoItem, type Settings } from "../data/types";
import { gradePay } from "../data/modes";
import { photoUploadReady } from "../photos";

type Notice = {
  title: string;
  message?: string;
  tone: "ok" | "wait" | "bad";
  busy?: boolean;
};

function formatTime(ts?: number) {
  if (!ts) return "—";
  return new Date(ts).toLocaleString("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function kindLabel(kind: string) {
  switch (kind) {
    case "ok":
      return "✅ Верно";
    case "bad":
      return "❌ Ошибка";
    case "hint":
      return "💡 Подсказка";
    case "shop":
      return "🛒 Магазин";
    case "pay":
      return "💸 Снятие";
    case "add":
      return "🎁 Начисление";
    case "rst":
      return "🔄 Сброс";
    case "seed":
      return "🌱 Старт";
    case "set":
      return "⚙️ Настройка";
    case "dic":
      return "📝 Диктант";
    case "photo":
      return "📷 Фото";
    default:
      return kind;
  }
}

/** Только цифры. Пустое поле остаётся пустым, пока печатают. */
function digitsOnly(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (!digits) return "";
  return String(parseInt(digits, 10));
}

/** Цифры со знаком минус — для оценок 1–2. */
function signedDigitsOnly(raw: string): string {
  const neg = raw.trim().startsWith("-");
  const digits = raw.replace(/\D/g, "");
  if (!digits) return neg ? "-" : "";
  return `${neg ? "-" : ""}${String(parseInt(digits, 10))}`;
}

function moneyFromDraft(raw: string): number {
  const n = parseInt(digitsOnly(raw), 10);
  return Number.isFinite(n) ? Math.max(0, n) : 0;
}

function signedMoneyFromDraft(raw: string): number {
  const n = parseInt(signedDigitsOnly(raw), 10);
  return Number.isFinite(n) ? n : 0;
}

function formatPay(pay: number): string {
  if (pay > 0) return `+${pay} ₽`;
  if (pay < 0) return `${pay} ₽`;
  return "0 ₽";
}

function gradeHint(grade: number): string {
  if (grade === 1) return "кол";
  if (grade === 2) return "двойка";
  if (grade === 3) return "нейтрально";
  if (grade === 4) return "хорошо";
  if (grade === 5) return "отлично";
  return "";
}

function settingsToDraft(settings: Settings) {
  return {
    rewardCorrect: String(settings.rewardCorrect),
    rewardStreak: String(settings.rewardStreak),
    penaltyWrong: String(settings.penaltyWrong),
    listenRewardCorrect: String(settings.listenRewardCorrect),
    listenRewardStreak: String(settings.listenRewardStreak),
    listenPenaltyWrong: String(settings.listenPenaltyWrong),
    stressRewardCorrect: String(settings.stressRewardCorrect),
    stressRewardStreak: String(settings.stressRewardStreak),
    stressPenaltyWrong: String(settings.stressPenaltyWrong),
    letterRewardCorrect: String(settings.letterRewardCorrect),
    letterRewardStreak: String(settings.letterRewardStreak),
    letterPenaltyWrong: String(settings.letterPenaltyWrong),
    hintPrice: String(settings.hintPrice),
    hintPackPrice: String(settings.hintPackPrice),
    grade1: String(settings.grade1),
    grade2: String(settings.grade2),
    grade3: String(settings.grade3),
    grade4: String(settings.grade4),
    grade5: String(settings.grade5),
  };
}

function sameRewards(a: Settings, b: Settings) {
  return (
    a.rewardCorrect === b.rewardCorrect &&
    a.rewardStreak === b.rewardStreak &&
    a.penaltyWrong === b.penaltyWrong &&
    a.listenRewardCorrect === b.listenRewardCorrect &&
    a.listenRewardStreak === b.listenRewardStreak &&
    a.listenPenaltyWrong === b.listenPenaltyWrong &&
    a.stressRewardCorrect === b.stressRewardCorrect &&
    a.stressRewardStreak === b.stressRewardStreak &&
    a.stressPenaltyWrong === b.stressPenaltyWrong &&
    a.letterRewardCorrect === b.letterRewardCorrect &&
    a.letterRewardStreak === b.letterRewardStreak &&
    a.letterPenaltyWrong === b.letterPenaltyWrong &&
    a.hintPrice === b.hintPrice &&
    a.hintPackPrice === b.hintPackPrice &&
    a.grade1 === b.grade1 &&
    a.grade2 === b.grade2 &&
    a.grade3 === b.grade3 &&
    a.grade4 === b.grade4 &&
    a.grade5 === b.grade5 &&
    a.parentPassword === b.parentPassword
  );
}

function photoStatusLabel(status: PhotoItem["status"]) {
  if (status === "wait") return "Ждёт";
  if (status === "done") return "Оценено";
  return "Удалено";
}

function readImgbbKey(): string {
  try {
    return localStorage.getItem("dictation_imgbb")?.trim() || "";
  } catch {
    return "";
  }
}

export function PapaCabinet({ onClose }: { onClose: () => void }) {
  const store = useGameStore();
  const [authed, setAuthed] = useState(() => sessionStorage.getItem("dictation_papa") === "1");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [tab, setTab] = useState<"stat" | "log" | "photo" | "pay" | "set">("stat");
  const [rewardTab, setRewardTab] = useState<"eye" | "listen" | "stress" | "letter" | "shop" | "grade">("eye");
  const [payout, setPayout] = useState("100");
  const [payReason, setPayReason] = useState("Снятие денег для сына");
  const [creditAmount, setCreditAmount] = useState("50");
  const [creditReason, setCreditReason] = useState("За заслугу");
  const [settings, setSettings] = useState<Settings>(store.settings);
  const [draft, setDraft] = useState(() => settingsToDraft(store.settings));
  const [newPass, setNewPass] = useState("");
  const [newPass2, setNewPass2] = useState("");
  const [notice, setNotice] = useState<Notice | null>(null);
  const [busy, setBusy] = useState(false);
  const [bellOpen, setBellOpen] = useState(false);
  const [gradePick, setGradePick] = useState<Record<string, number>>({});
  const [imgbbKey, setImgbbKey] = useState(() => readImgbbKey());
  /** Пока папа правит премии — облачный refresh не затирает поле обратно. */
  const draftDirtyRef = useRef(false);

  useEffect(() => {
    setSettings((prev) => (sameRewards(prev, store.settings) ? prev : store.settings));
    if (!draftDirtyRef.current) {
      setDraft(settingsToDraft(store.settings));
    }
  }, [store.settings]);

  useEffect(() => {
    if (!authed) return;
    void store.refresh();
    const timer = window.setInterval(() => {
      void store.refresh();
    }, 8000);
    return () => window.clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authed]);

  useEffect(() => {
    if (!notice || notice.busy || notice.tone === "bad") return;
    const timer = window.setTimeout(() => setNotice(null), 1800);
    return () => window.clearTimeout(timer);
  }, [notice]);

  const report = useMemo(() => {
    const earned = store.events.filter((event) => event.kind === "ok").reduce((sum, event) => sum + event.moneyDelta, 0);
    const penalties = store.events.filter((event) => event.kind === "bad").reduce((sum, event) => sum + event.moneyDelta, 0);
    const shop = store.events.filter((event) => event.kind === "shop").reduce((sum, event) => sum + event.moneyDelta, 0);
    const gifted = store.events.filter((event) => event.kind === "add").reduce((sum, event) => sum + event.moneyDelta, 0);
    const withdrawn = store.events
      .filter((event) => event.kind === "pay" || event.kind === "rst")
      .reduce((sum, event) => sum + event.moneyDelta, 0);
    const answers = store.events.filter((event) => event.kind === "ok" || event.kind === "bad");
    const hard = Object.values(store.wordStats)
      .filter((row) => row.seen >= 2 && row.bad / row.seen >= 0.5)
      .sort((a, b) => b.bad / b.seen - a.bad / a.seen || b.bad - a.bad);
    const worst = Object.values(store.wordStats).sort((a, b) => b.bad - a.bad || b.seen - a.seen);
    return { earned, penalties, shop, gifted, withdrawn, answers, hard, worst };
  }, [store.events, store.wordStats]);

  const bellEvents = useMemo(() => {
    return [...store.events]
      .filter((event) => event.kind === "ok" || event.kind === "bad" || event.kind === "dic" || event.kind === "photo")
      .sort((a, b) => b.ts - a.ts)
      .slice(0, 20);
  }, [store.events]);

  const bellUnread = useMemo(
    () => bellEvents.filter((event) => event.ts > store.bellSeenTs).length,
    [bellEvents, store.bellSeenTs],
  );

  const waitingPhotos = useMemo(
    () =>
      store.photos.filter((photo) => photo.status === "wait").length +
      store.dics.filter((dic) => dic.status === "wait").length,
    [store.photos, store.dics],
  );

  const login = (event: FormEvent) => {
    event.preventDefault();
    if (password.trim() === store.settings.parentPassword) {
      sessionStorage.setItem("dictation_papa", "1");
      setAuthed(true);
      setError("");
    } else {
      setError("Неверный пароль");
    }
  };

  const showOk = (title: string, message?: string) => {
    setNotice({ title, message, tone: "ok" });
  };

  const showBad = (title: string, message?: string) => {
    setNotice({ title, message, tone: "bad" });
  };

  const runAction = async (waiting: Notice, action: () => Promise<void>, done: Notice) => {
    if (busy) return;
    setBusy(true);
    setNotice({ ...waiting, busy: true, tone: "wait" });
    try {
      await action();
      setNotice({ ...done, tone: "ok", busy: false });
    } catch {
      showBad("Не вышло", "Проверьте интернет и попробуйте ещё раз");
    } finally {
      setBusy(false);
    }
  };

  const patchDraft = (patch: Partial<ReturnType<typeof settingsToDraft>>) => {
    draftDirtyRef.current = true;
    setDraft((prev) => ({ ...prev, ...patch }));
  };

  const draftToSettings = (): Settings => ({
    ...settings,
    rewardCorrect: moneyFromDraft(draft.rewardCorrect),
    rewardStreak: moneyFromDraft(draft.rewardStreak),
    penaltyWrong: moneyFromDraft(draft.penaltyWrong),
    listenRewardCorrect: moneyFromDraft(draft.listenRewardCorrect),
    listenRewardStreak: moneyFromDraft(draft.listenRewardStreak),
    listenPenaltyWrong: moneyFromDraft(draft.listenPenaltyWrong),
    stressRewardCorrect: moneyFromDraft(draft.stressRewardCorrect),
    stressRewardStreak: moneyFromDraft(draft.stressRewardStreak),
    stressPenaltyWrong: moneyFromDraft(draft.stressPenaltyWrong),
    letterRewardCorrect: moneyFromDraft(draft.letterRewardCorrect),
    letterRewardStreak: moneyFromDraft(draft.letterRewardStreak),
    letterPenaltyWrong: moneyFromDraft(draft.letterPenaltyWrong),
    hintPrice: moneyFromDraft(draft.hintPrice),
    hintPackPrice: moneyFromDraft(draft.hintPackPrice),
    grade1: signedMoneyFromDraft(draft.grade1),
    grade2: signedMoneyFromDraft(draft.grade2),
    grade3: signedMoneyFromDraft(draft.grade3),
    grade4: signedMoneyFromDraft(draft.grade4),
    grade5: signedMoneyFromDraft(draft.grade5),
  });

  const openBell = () => {
    setBellOpen((prev) => !prev);
    if (!bellOpen && bellUnread > 0) {
      void store.markBellSeen();
    }
  };

  if (!authed) {
    return (
      <div className="app-screen">
        <div className="play-stage">
          <div className="text-center">
            <div className="play-emoji">🔐</div>
            <h1 className="text-3xl font-black bg-gradient-to-r from-yellow-200 via-pink-200 to-purple-200 bg-clip-text text-transparent">
              Кабинет папы
            </h1>
            <p className="text-purple-200/80 mt-2">Сын сюда не зайдёт без пароля</p>
          </div>
          <form onSubmit={login} className="glass-card w-full space-y-3">
            <input
              className="game-input"
              type="password"
              inputMode="numeric"
              autoComplete="off"
              placeholder="Пароль"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
            {error && <p className="text-red-300 font-bold text-center">{error}</p>}
            <button type="submit" className="w-full btn-primary play-cta">
              Войти
            </button>
          </form>
          <button type="button" className="play-cta btn-secondary" onClick={onClose}>
            ← Назад
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="app-screen">
      <div className="play-stage papa-stage">
        <div className="text-center relative w-full">
          <div className="flex items-center justify-center gap-2">
            <div className="play-badge bg-yellow-500/15 border-yellow-400/30 text-yellow-100">🔐 Кабинет папы</div>
            <button
              type="button"
              className="relative rounded-2xl bg-white/10 border border-white/15 px-3 py-2 text-xl active:scale-95"
              aria-label="Уведомления"
              onClick={openBell}
            >
              🔔
              {bellUnread > 0 && (
                <span className="absolute -top-1 -right-1 min-w-5 h-5 px-1 rounded-full bg-red-500 text-white text-xs font-black flex items-center justify-center">
                  {bellUnread > 9 ? "9+" : bellUnread}
                </span>
              )}
            </button>
          </div>
          <p className="text-white/60 text-sm mt-2">{store.syncing || busy ? "Сохраняем…" : "Общая база с любого телефона"}</p>
        </div>

        {bellOpen && (
          <div className="glass-card w-full space-y-2">
            <p className="font-black text-lg">Последние действия</p>
            {bellEvents.length === 0 ? (
              <p className="text-white/50 text-sm">Пока тихо</p>
            ) : (
              bellEvents.slice(0, 12).map((event) => (
                <div
                  key={event.id}
                  className={`rounded-2xl p-3 border ${event.ts > store.bellSeenTs ? "bg-yellow-500/10 border-yellow-400/30" : "bg-white/5 border-white/10"}`}
                >
                  <div className="flex justify-between gap-2">
                    <p className="font-black text-sm">{kindLabel(event.kind)}</p>
                    <p className="text-white/40 text-xs">{formatTime(event.ts)}</p>
                  </div>
                  {event.word && <p className="text-sm">Слово: {event.word}</p>}
                  {event.reason && <p className="text-white/60 text-sm">{event.reason}</p>}
                </div>
              ))
            )}
            <button type="button" className="w-full btn-secondary py-2.5" onClick={() => setBellOpen(false)}>
              Закрыть
            </button>
          </div>
        )}

        <div className="grid grid-cols-3 gap-2 w-full">
          <div className="glass-card !p-3 text-center">
            <p className="text-white/50 text-xs">Сейчас</p>
            <p className="font-black text-yellow-300 text-lg tabular-nums">{store.money} ₽</p>
          </div>
          <div className="glass-card !p-3 text-center">
            <p className="text-white/50 text-xs">Заработал</p>
            <p className="font-black text-green-300 text-lg tabular-nums">{report.earned} ₽</p>
          </div>
          <div className="glass-card !p-3 text-center">
            <p className="text-white/50 text-xs">Фото</p>
            <p className="font-black text-orange-300 text-lg tabular-nums">{waitingPhotos}</p>
          </div>
        </div>

        <div className="papa-tabs w-full">
          <button type="button" className={tab === "stat" ? "btn-primary papa-tab" : "btn-secondary papa-tab"} onClick={() => setTab("stat")}>
            📊
          </button>
          <button type="button" className={tab === "log" ? "btn-primary papa-tab" : "btn-secondary papa-tab"} onClick={() => setTab("log")}>
            📝
          </button>
          <button type="button" className={tab === "photo" ? "btn-primary papa-tab" : "btn-secondary papa-tab"} onClick={() => setTab("photo")}>
            📷{waitingPhotos > 0 ? ` ${waitingPhotos}` : ""}
          </button>
          <button type="button" className={tab === "pay" ? "btn-primary papa-tab" : "btn-secondary papa-tab"} onClick={() => setTab("pay")}>
            💸
          </button>
          <button type="button" className={tab === "set" ? "btn-primary papa-tab" : "btn-secondary papa-tab"} onClick={() => setTab("set")}>
            ⚙️
          </button>
        </div>

        {tab === "stat" && (
          <div className="w-full space-y-4">
            <div className="glass-card w-full space-y-2">
              <p className="font-black text-lg">Сводка</p>
              <RuleMini label="Верных" value={String(report.answers.filter((event) => event.kind === "ok").length)} />
              <RuleMini label="Ошибок" value={String(report.answers.filter((event) => event.kind === "bad").length)} />
              <RuleMini label="Штрафы" value={`${report.penalties} ₽`} />
              <RuleMini label="Начислили" value={`+${report.gifted} ₽`} />
              <RuleMini label="Магазин" value={`${Math.abs(report.shop)} ₽`} />
            </div>
            <div className="glass-card w-full">
              <p className="font-black text-lg mb-2">Слова с ошибками</p>
              {report.hard.length === 0 ? (
                <p className="text-white/50">Пока нет слов, которые ломаются снова и снова.</p>
              ) : (
                <div className="space-y-2">
                  {report.hard.map((row) => (
                    <div key={row.word} className="bg-white/5 rounded-2xl p-3 border border-white/10">
                      <p className="font-black">{row.word}</p>
                      <p className="text-red-300 text-sm">{row.bad}/{row.seen} ошибок · было: {row.lastShown || "—"}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="glass-card w-full">
              <p className="font-black text-lg mb-2">Все слова</p>
              {report.worst.length === 0 ? (
                <p className="text-white/50">После обновления ещё не играли.</p>
              ) : (
                <div className="space-y-2">
                  {report.worst.map((row) => (
                    <div key={row.word} className="bg-white/5 rounded-2xl p-3 border border-white/10 flex justify-between gap-2">
                      <div>
                        <p className="font-black">{row.word}</p>
                        <p className="text-white/50 text-sm">верно {row.ok} · ошибка {row.bad}</p>
                      </div>
                      <p className="text-purple-200 font-bold">{row.seen}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {tab === "log" && (
          <div className="glass-card w-full">
            <p className="font-black text-lg mb-2">Журнал ответов</p>
            {store.events.length === 0 ? (
              <p className="text-white/50">Журнал пуст.</p>
            ) : (
              <div className="space-y-2">
                {[...store.events].reverse().map((event) => (
                  <div key={event.id} className="bg-white/5 rounded-2xl p-3 border border-white/10">
                    <div className="flex justify-between gap-2 mb-1">
                      <p className="font-black">{kindLabel(event.kind)}</p>
                      <p className="text-white/40 text-sm">{formatTime(event.ts)}</p>
                    </div>
                    {event.word && <p>Слово: <b>{event.word}</b></p>}
                    {event.shown && <p>Показали: <b>{event.shown}</b></p>}
                    {event.expected && <p>Правильно: <b>{event.expected}</b></p>}
                    {event.choice && <p>Ответ: <b>{event.choice}</b></p>}
                    {event.reason && <p className="text-white/60">{event.reason}</p>}
                    <p className={event.moneyDelta >= 0 ? "text-green-300 font-black" : "text-orange-300 font-black"}>
                      {event.moneyDelta > 0 ? "+" : ""}
                      {event.moneyDelta} ₽
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {tab === "photo" && (
          <div className="w-full space-y-3">
            <div className="glass-card w-full space-y-2">
              <p className="font-black text-lg">На проверку</p>
              <p className="text-white/60 text-sm">Фото с бумаги и диктанты с клавиатуры. Оценка 1–5.</p>
              {!photoUploadReady() && (
                <p className="text-orange-300 text-sm">Ключ ImgBB ещё не задан — фото с бумаги не загрузится. Вкладка ⚙️.</p>
              )}
            </div>

            {store.dics.map((dic) => {
              const pick = gradePick[dic.id] ?? (dic.grade || 5);
              const pay = gradePay(store.settings, pick);
              const mistakes = dic.answers.filter((row) => !row.ok);
              return (
                <div key={dic.id} className="glass-card w-full space-y-3">
                  <div className="flex justify-between gap-2 items-start">
                    <div>
                      <p className="font-black">⌨️ Диктант · {photoStatusLabel(dic.status)}</p>
                      <p className="text-white/40 text-sm">{formatTime(dic.ts)}</p>
                      <p className="text-yellow-300 font-black text-sm mt-1">
                        {dic.ok}/{dic.total} верно
                      </p>
                    </div>
                    {dic.status === "done" && (
                      <p className="text-yellow-300 font-black">{dic.grade}/5</p>
                    )}
                  </div>
                  {mistakes.length > 0 ? (
                    <div className="space-y-2">
                      <p className="text-white/60 text-sm">Ошибки</p>
                      {mistakes.map((row) => (
                        <div key={`${dic.id}-${row.word}`} className="bg-white/5 rounded-2xl p-3 border border-white/10">
                          <p className="font-black">{row.word}</p>
                          <p className="text-red-300 text-sm">Написал: {row.input || "—"}</p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-green-300 text-sm">Без ошибок</p>
                  )}
                  {dic.status === "wait" && (
                    <>
                      <GradePicker
                        value={pick}
                        onChange={(g) => setGradePick((prev) => ({ ...prev, [dic.id]: g }))}
                        settings={store.settings}
                      />
                      <button
                        type="button"
                        className="w-full btn-primary play-cta"
                        disabled={busy}
                        onClick={() => {
                          void runAction(
                            { title: "Сохраняем…", message: `Оценка ${pick} · ${formatPay(pay)}`, tone: "wait", busy: true },
                            async () => {
                              await store.gradeDic(dic.id, pick);
                            },
                            { title: "Оценено", message: formatPay(pay), tone: "ok" },
                          );
                        }}
                      >
                        Поставить {pick} · {formatPay(pay)}
                      </button>
                    </>
                  )}
                  <button
                    type="button"
                    className="w-full btn-danger py-2.5"
                    disabled={busy}
                    onClick={() => {
                      void runAction(
                        { title: "Удаляем…", tone: "wait", busy: true },
                        async () => {
                          await store.removeDic(dic.id);
                        },
                        { title: "Удалено", tone: "ok" },
                      );
                    }}
                  >
                    Удалить запись
                  </button>
                </div>
              );
            })}

            {store.photos.map((photo) => {
              const pick = gradePick[photo.id] ?? (photo.grade || 5);
              const pay = gradePay(store.settings, pick);
              return (
                <div key={photo.id} className="glass-card w-full space-y-3">
                  <div className="flex justify-between gap-2 items-start">
                    <div>
                      <p className="font-black">📷 Фото · {photoStatusLabel(photo.status)}</p>
                      <p className="text-white/40 text-sm">{formatTime(photo.ts)}</p>
                      {photo.note && <p className="text-white/60 text-sm">{photo.note}</p>}
                    </div>
                    {photo.status === "done" && (
                      <p className="text-yellow-300 font-black">{photo.grade}/5</p>
                    )}
                  </div>
                  <a href={photo.url} target="_blank" rel="noreferrer" className="block">
                    <img
                      src={photo.url}
                      alt="Фото тетради"
                      className="w-full max-h-56 object-contain rounded-2xl bg-black/30 border border-white/10"
                    />
                  </a>
                  {photo.status === "wait" && (
                    <>
                      <GradePicker
                        value={pick}
                        onChange={(g) => setGradePick((prev) => ({ ...prev, [photo.id]: g }))}
                        settings={store.settings}
                      />
                      <button
                        type="button"
                        className="w-full btn-primary play-cta"
                        disabled={busy}
                        onClick={() => {
                          void runAction(
                            { title: "Сохраняем…", message: `Оценка ${pick} · ${formatPay(pay)}`, tone: "wait", busy: true },
                            async () => {
                              await store.gradePhoto(photo.id, pick);
                            },
                            { title: "Оценено", message: formatPay(pay), tone: "ok" },
                          );
                        }}
                      >
                        Поставить {pick} · {formatPay(pay)}
                      </button>
                    </>
                  )}
                  <button
                    type="button"
                    className="w-full btn-danger py-2.5"
                    disabled={busy}
                    onClick={() => {
                      void runAction(
                        { title: "Удаляем…", tone: "wait", busy: true },
                        async () => {
                          await store.removePhoto(photo.id);
                        },
                        { title: "Удалено", message: "Запись снята из облака", tone: "ok" },
                      );
                    }}
                  >
                    Удалить запись
                  </button>
                </div>
              );
            })}

            {store.photos.length === 0 && store.dics.length === 0 && (
              <div className="glass-card w-full">
                <p className="text-white/50">Пока нет загрузок и диктантов.</p>
              </div>
            )}
          </div>
        )}

        {tab === "pay" && (
          <div className="w-full space-y-4">
            <div className="glass-card w-full space-y-3">
              <p className="font-black text-lg">🎁 Начислить деньги</p>
              <p className="text-white/60 text-sm">За заслугу, подарок, помощь по дому</p>
              <label className="block">
                <span className="field-label">Сколько начислить, ₽</span>
                <input
                  className="game-input"
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  autoComplete="off"
                  value={creditAmount}
                  onChange={(event) => setCreditAmount(digitsOnly(event.target.value))}
                  onBlur={() => setCreditAmount((prev) => digitsOnly(prev) || "0")}
                />
              </label>
              <label className="block">
                <span className="field-label">За что</span>
                <input className="game-input" value={creditReason} onChange={(event) => setCreditReason(event.target.value)} />
              </label>
              <button
                type="button"
                className="w-full btn-primary play-cta"
                disabled={busy}
                onClick={() => {
                  const amount = moneyFromDraft(creditAmount);
                  if (amount <= 0) {
                    showBad("Укажите сумму", "Сколько начислить?");
                    return;
                  }
                  void runAction(
                    { title: "Начисляем…", message: `+${amount} ₽`, tone: "wait", busy: true },
                    async () => {
                      await store.credit(amount, creditReason);
                    },
                    { title: "Начислено", message: `+${amount} ₽`, tone: "ok" },
                  );
                }}
              >
                Начислить
              </button>
            </div>

            <div className="glass-card w-full space-y-3">
              <p className="font-black text-lg">💸 Снять деньги</p>
              <label className="block">
                <span className="field-label">Сколько снять, ₽</span>
                <input
                  className="game-input"
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  autoComplete="off"
                  value={payout}
                  onChange={(event) => setPayout(digitsOnly(event.target.value))}
                  onBlur={() => setPayout((prev) => digitsOnly(prev) || "0")}
                />
              </label>
              <label className="block">
                <span className="field-label">За что</span>
                <input className="game-input" value={payReason} onChange={(event) => setPayReason(event.target.value)} />
              </label>
              <button
                type="button"
                className="w-full btn-primary play-cta"
                disabled={busy}
                onClick={() => {
                  const amount = moneyFromDraft(payout);
                  if (amount <= 0) {
                    showBad("Укажите сумму", "Сколько снять с баланса?");
                    return;
                  }
                  if (amount > store.money) {
                    showBad("Мало денег", `Сейчас только ${store.money} ₽`);
                    return;
                  }
                  void runAction(
                    { title: "Снимаем…", message: `${amount} ₽`, tone: "wait", busy: true },
                    async () => {
                      await store.payout(amount, payReason);
                    },
                    { title: "Перевод готов", message: `Сняли ${amount} ₽`, tone: "ok" },
                  );
                }}
              >
                Снять с баланса
              </button>
            </div>

            <div className="glass-card w-full space-y-3">
              <p className="font-black text-lg">Сброс</p>
              <p className="text-white/60">Обнуляет деньги и ставит 3 подсказки. Журнал остаётся.</p>
              <button
                type="button"
                className="w-full btn-danger play-cta"
                disabled={busy}
                onClick={() => {
                  void runAction(
                    { title: "Сбрасываем…", message: "Деньги → 0", tone: "wait", busy: true },
                    async () => {
                      await store.resetProgress("Сброс прогресса / снятие всех денег");
                    },
                    { title: "Готово", message: "Баланс обнулён\nПодсказки: 3", tone: "ok" },
                  );
                }}
              >
                Сбросить деньги сына
              </button>
            </div>
          </div>
        )}

        {tab === "set" && (
          <div className="w-full space-y-4">
            <div className="glass-card w-full space-y-4">
              <p className="font-black text-lg">Премии по режимам</p>
              <p className="text-white/60">Штраф плюсом: 3 значит −3 ₽. У каждого режима свои цифры.</p>
              <div className="papa-tabs">
                {(
                  [
                    ["eye", "👁️ Глаз"],
                    ["listen", "🔊 Слух"],
                    ["stress", "🎵 Удар."],
                    ["letter", "🔤 Буквы"],
                    ["shop", "🛒 Магаз"],
                    ["grade", "⭐ Оценки"],
                  ] as const
                ).map(([id, label]) => (
                  <button
                    key={id}
                    type="button"
                    className={rewardTab === id ? "btn-primary papa-tab" : "btn-secondary papa-tab"}
                    onClick={() => setRewardTab(id)}
                  >
                    {label}
                  </button>
                ))}
              </div>

              {rewardTab === "eye" && (
                <>
                  <MoneyField label="Верно, ₽" value={draft.rewardCorrect} onChange={(value) => patchDraft({ rewardCorrect: value })} />
                  <MoneyField label="Серия 3+, ₽" value={draft.rewardStreak} onChange={(value) => patchDraft({ rewardStreak: value })} />
                  <MoneyField label="Штраф, ₽" value={draft.penaltyWrong} onChange={(value) => patchDraft({ penaltyWrong: value })} />
                </>
              )}
              {rewardTab === "listen" && (
                <>
                  <MoneyField label="Верно, ₽" value={draft.listenRewardCorrect} onChange={(value) => patchDraft({ listenRewardCorrect: value })} />
                  <MoneyField label="Серия 3+, ₽" value={draft.listenRewardStreak} onChange={(value) => patchDraft({ listenRewardStreak: value })} />
                  <MoneyField label="Штраф, ₽" value={draft.listenPenaltyWrong} onChange={(value) => patchDraft({ listenPenaltyWrong: value })} />
                </>
              )}
              {rewardTab === "stress" && (
                <>
                  <MoneyField label="Верно, ₽" value={draft.stressRewardCorrect} onChange={(value) => patchDraft({ stressRewardCorrect: value })} />
                  <MoneyField label="Серия 3+, ₽" value={draft.stressRewardStreak} onChange={(value) => patchDraft({ stressRewardStreak: value })} />
                  <MoneyField label="Штраф, ₽" value={draft.stressPenaltyWrong} onChange={(value) => patchDraft({ stressPenaltyWrong: value })} />
                </>
              )}
              {rewardTab === "letter" && (
                <>
                  <MoneyField label="Верно, ₽" value={draft.letterRewardCorrect} onChange={(value) => patchDraft({ letterRewardCorrect: value })} />
                  <MoneyField label="Серия 3+, ₽" value={draft.letterRewardStreak} onChange={(value) => patchDraft({ letterRewardStreak: value })} />
                  <MoneyField label="Штраф, ₽" value={draft.letterPenaltyWrong} onChange={(value) => patchDraft({ letterPenaltyWrong: value })} />
                </>
              )}
              {rewardTab === "shop" && (
                <>
                  <MoneyField label="Цена подсказки, ₽" value={draft.hintPrice} onChange={(value) => patchDraft({ hintPrice: value })} />
                  <MoneyField label="Набор +3, ₽" value={draft.hintPackPrice} onChange={(value) => patchDraft({ hintPackPrice: value })} />
                </>
              )}
              {rewardTab === "grade" && (
                <>
                  <p className="text-white/60 text-sm">Минус для 1–2, ноль для 3, плюс для 4–5. Можно писать −20.</p>
                  <SignedMoneyField label="1 кол, ₽" value={draft.grade1} onChange={(value) => patchDraft({ grade1: value })} />
                  <SignedMoneyField label="2 двойка, ₽" value={draft.grade2} onChange={(value) => patchDraft({ grade2: value })} />
                  <SignedMoneyField label="3 нейтрально, ₽" value={draft.grade3} onChange={(value) => patchDraft({ grade3: value })} />
                  <SignedMoneyField label="4 хорошо, ₽" value={draft.grade4} onChange={(value) => patchDraft({ grade4: value })} />
                  <SignedMoneyField label="5 отлично, ₽" value={draft.grade5} onChange={(value) => patchDraft({ grade5: value })} />
                </>
              )}

              <button
                type="button"
                className="w-full btn-primary play-cta"
                disabled={busy}
                onClick={() => {
                  const next = draftToSettings();
                  setSettings(next);
                  setDraft(settingsToDraft(next));
                  void runAction(
                    { title: "Сохраняем…", message: "Премии режимов", tone: "wait", busy: true },
                    async () => {
                      await store.saveSettings(next);
                      draftDirtyRef.current = false;
                    },
                    { title: "Сохранено", message: "Премии на всех телефонах", tone: "ok" },
                  );
                }}
              >
                Сохранить премии
              </button>
              <button
                type="button"
                className="w-full btn-secondary py-3"
                disabled={busy}
                onClick={() => {
                  const next = { ...DEFAULT_SETTINGS, parentPassword: settings.parentPassword };
                  draftDirtyRef.current = true;
                  setSettings(next);
                  setDraft(settingsToDraft(next));
                  showOk("Вернули как было", "Нажмите «Сохранить премии»");
                }}
              >
                Вернуть по умолчанию
              </button>
            </div>
            <div className="glass-card w-full space-y-4">
              <p className="font-black text-lg">Ключ фото (ImgBB)</p>
              <p className="text-white/60 text-sm">Один ключ на семью: сохранил здесь — сын грузит фото с любого телефона. Сайт imgbb.com → раздел API.</p>
              <label className="block">
                <span className="field-label">Ключ ImgBB</span>
                <input
                  className="game-input"
                  type="text"
                  autoComplete="off"
                  spellCheck={false}
                  value={imgbbKey}
                  onChange={(event) => setImgbbKey(event.target.value)}
                  placeholder="вставь ключ"
                />
              </label>
              <button
                type="button"
                className="w-full btn-primary play-cta"
                disabled={busy}
                onClick={() => {
                  void runAction(
                    { title: "Сохраняем ключ…", tone: "wait", busy: true },
                    async () => {
                      await store.saveImgbbKey(imgbbKey);
                      setImgbbKey(readImgbbKey());
                    },
                    {
                      title: imgbbKey.trim() ? "Ключ сохранён" : "Ключ очищен",
                      message: imgbbKey.trim() ? "Сын сможет грузить фото" : undefined,
                      tone: "ok",
                    },
                  );
                }}
              >
                Сохранить ключ
              </button>
            </div>
            <div className="glass-card w-full space-y-4">
              <p className="font-black text-lg">Сменить пароль</p>
              <p className="text-white/60">Пароль один на все телефоны.</p>
              <label className="block">
                <span className="field-label">Новый пароль</span>
                <input className="game-input" type="password" inputMode="numeric" autoComplete="off" placeholder="Новый пароль" value={newPass} onChange={(event) => setNewPass(event.target.value)} />
              </label>
              <label className="block">
                <span className="field-label">Ещё раз</span>
                <input className="game-input" type="password" inputMode="numeric" autoComplete="off" placeholder="Ещё раз" value={newPass2} onChange={(event) => setNewPass2(event.target.value)} />
              </label>
              <button
                type="button"
                className="w-full btn-primary play-cta"
                disabled={busy}
                onClick={() => {
                  if (!newPass.trim() || newPass !== newPass2) {
                    showBad("Пароли не совпали", "Введите один и тот же пароль два раза");
                    return;
                  }
                  const next = { ...draftToSettings(), parentPassword: newPass.trim() };
                  setSettings(next);
                  void runAction(
                    { title: "Меняем пароль…", tone: "wait", busy: true },
                    async () => {
                      await store.saveSettings(next);
                      setNewPass("");
                      setNewPass2("");
                      draftDirtyRef.current = false;
                    },
                    { title: "Пароль изменён", message: "Уже на всех телефонах", tone: "ok" },
                  );
                }}
              >
                Сохранить пароль
              </button>
            </div>
          </div>
        )}

        <button type="button" className="play-cta btn-secondary papa-back" onClick={onClose}>
          ← В игру
        </button>
      </div>

      {notice && (
        <NoticeSheet
          notice={notice}
          onOk={() => {
            if (!notice.busy) setNotice(null);
          }}
        />
      )}
    </div>
  );
}

function GradePicker({
  value,
  onChange,
  settings,
}: {
  value: number;
  onChange: (grade: number) => void;
  settings: Settings;
}) {
  return (
    <div>
      <div className="ios-grade-row" role="group" aria-label="Оценка">
        {[1, 2, 3, 4, 5].map((g) => (
          <button
            key={g}
            type="button"
            className={`ios-grade-btn g${g}${value === g ? " is-on" : ""}`}
            aria-pressed={value === g}
            onClick={() => onChange(g)}
          >
            {g}
          </button>
        ))}
      </div>
      <p className="ios-grade-hint">
        {gradeHint(value)} · {formatPay(gradePay(settings, value))}
      </p>
    </div>
  );
}

function MoneyField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block papa-field">
      <span className="field-label">{label}</span>
      <input
        className="game-input"
        type="text"
        inputMode="numeric"
        pattern="[0-9]*"
        autoComplete="off"
        enterKeyHint="done"
        value={value}
        onChange={(event) => onChange(digitsOnly(event.target.value))}
        onBlur={() => {
          if (value === "") onChange("0");
          else onChange(digitsOnly(value));
        }}
      />
    </label>
  );
}

function SignedMoneyField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block papa-field">
      <span className="field-label">{label}</span>
      <input
        className="game-input"
        type="text"
        inputMode="text"
        autoComplete="off"
        enterKeyHint="done"
        value={value}
        onChange={(event) => onChange(signedDigitsOnly(event.target.value))}
        onBlur={() => {
          if (value === "" || value === "-") onChange("0");
          else onChange(signedDigitsOnly(value));
        }}
      />
    </label>
  );
}

function NoticeSheet({ notice, onOk }: { notice: Notice; onOk: () => void }) {
  const emoji = notice.tone === "ok" ? "✅" : notice.tone === "bad" ? "⚠️" : "⏳";
  return (
    <div className="ios-notice-root" role="dialog" aria-modal="true" aria-labelledby="ios-notice-title">
      <button type="button" className="ios-notice-dim" aria-label="Закрыть" disabled={notice.busy} onClick={onOk} />
      <div className={`ios-notice-card ios-notice-${notice.tone}`}>
        <div className={`ios-notice-emoji ${notice.busy ? "ios-notice-spin" : ""}`}>{emoji}</div>
        <p id="ios-notice-title" className="ios-notice-title">
          {notice.title}
        </p>
        {notice.message && <p className="ios-notice-message">{notice.message}</p>}
        {!notice.busy && (
          <button type="button" className="ios-notice-ok" onClick={onOk}>
            OK
          </button>
        )}
      </div>
    </div>
  );
}

function RuleMini({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between bg-white/5 rounded-2xl px-3 py-2 border border-white/10">
      <span className="text-white/60">{label}</span>
      <span className="font-black">{value}</span>
    </div>
  );
}
