import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useGameStore } from "../data/GameStore";
import { DEFAULT_SETTINGS, type Settings } from "../data/types";

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
    case "rst":
      return "🔄 Сброс";
    case "seed":
      return "🌱 Старт";
    case "set":
      return "⚙️ Настройка";
    default:
      return kind;
  }
}

/** Только цифры, без ведущих нулей: «02» → «2». */
function digitsOnly(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (!digits) return "";
  return String(parseInt(digits, 10));
}

function moneyFromDraft(raw: string): number {
  const n = parseInt(digitsOnly(raw), 10);
  return Number.isFinite(n) ? Math.max(0, n) : 0;
}

function settingsToDraft(settings: Settings) {
  return {
    rewardCorrect: String(settings.rewardCorrect),
    rewardStreak: String(settings.rewardStreak),
    penaltyWrong: String(settings.penaltyWrong),
    hintPrice: String(settings.hintPrice),
    hintPackPrice: String(settings.hintPackPrice),
  };
}

export function PapaCabinet({ onClose }: { onClose: () => void }) {
  const store = useGameStore();
  const [authed, setAuthed] = useState(() => sessionStorage.getItem("dictation_papa") === "1");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [tab, setTab] = useState<"stat" | "log" | "pay" | "set">("stat");
  const [payout, setPayout] = useState("100");
  const [reason, setReason] = useState("Снятие денег для сына");
  const [settings, setSettings] = useState<Settings>(store.settings);
  const [draft, setDraft] = useState(() => settingsToDraft(store.settings));
  const [newPass, setNewPass] = useState("");
  const [newPass2, setNewPass2] = useState("");
  const [notice, setNotice] = useState<Notice | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setSettings(store.settings);
    setDraft(settingsToDraft(store.settings));
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
    const timer = window.setTimeout(() => setNotice(null), 2200);
    return () => window.clearTimeout(timer);
  }, [notice]);

  const report = useMemo(() => {
    const earned = store.events.filter((event) => event.kind === "ok").reduce((sum, event) => sum + event.moneyDelta, 0);
    const penalties = store.events.filter((event) => event.kind === "bad").reduce((sum, event) => sum + event.moneyDelta, 0);
    const shop = store.events.filter((event) => event.kind === "shop").reduce((sum, event) => sum + event.moneyDelta, 0);
    const withdrawn = store.events
      .filter((event) => event.kind === "pay" || event.kind === "rst")
      .reduce((sum, event) => sum + event.moneyDelta, 0);
    const answers = store.events.filter((event) => event.kind === "ok" || event.kind === "bad");
    const hard = Object.values(store.wordStats)
      .filter((row) => row.seen >= 2 && row.bad / row.seen >= 0.5)
      .sort((a, b) => b.bad / b.seen - a.bad / a.seen || b.bad - a.bad);
    const worst = Object.values(store.wordStats).sort((a, b) => b.bad - a.bad || b.seen - a.seen);
    return { earned, penalties, shop, withdrawn, answers, hard, worst };
  }, [store.events, store.wordStats]);

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
      setNotice({ ...done, tone: "ok" });
    } catch {
      showBad("Не вышло", "Проверьте интернет и попробуйте ещё раз");
    } finally {
      setBusy(false);
    }
  };

  const draftToSettings = (): Settings => ({
    ...settings,
    rewardCorrect: moneyFromDraft(draft.rewardCorrect),
    rewardStreak: moneyFromDraft(draft.rewardStreak),
    penaltyWrong: moneyFromDraft(draft.penaltyWrong),
    hintPrice: moneyFromDraft(draft.hintPrice),
    hintPackPrice: moneyFromDraft(draft.hintPackPrice),
  });

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
        <div className="text-center">
          <div className="play-badge bg-yellow-500/15 border-yellow-400/30 text-yellow-100">🔐 Кабинет папы</div>
          <p className="text-white/60 text-sm mt-2">{store.syncing || busy ? "Сохраняем…" : "Общая база с любого телефона"}</p>
        </div>

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
            <p className="text-white/50 text-xs">Сняли</p>
            <p className="font-black text-orange-300 text-lg tabular-nums">{Math.abs(report.withdrawn)} ₽</p>
          </div>
        </div>

        <div className="papa-tabs w-full">
          <button type="button" className={tab === "stat" ? "btn-primary papa-tab" : "btn-secondary papa-tab"} onClick={() => setTab("stat")}>
            📊 Анализ
          </button>
          <button type="button" className={tab === "log" ? "btn-primary papa-tab" : "btn-secondary papa-tab"} onClick={() => setTab("log")}>
            📝 Ответы
          </button>
          <button type="button" className={tab === "pay" ? "btn-primary papa-tab" : "btn-secondary papa-tab"} onClick={() => setTab("pay")}>
            💸 Деньги
          </button>
          <button type="button" className={tab === "set" ? "btn-primary papa-tab" : "btn-secondary papa-tab"} onClick={() => setTab("set")}>
            ⚙️ Ещё
          </button>
        </div>

        {tab === "stat" && (
          <div className="w-full space-y-4">
            <div className="glass-card w-full space-y-2">
              <p className="font-black text-lg">Сводка</p>
              <RuleMini label="Верных" value={String(report.answers.filter((event) => event.kind === "ok").length)} />
              <RuleMini label="Ошибок" value={String(report.answers.filter((event) => event.kind === "bad").length)} />
              <RuleMini label="Штрафы" value={`${report.penalties} ₽`} />
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

        {tab === "pay" && (
          <div className="w-full space-y-4">
            <div className="glass-card w-full space-y-3">
              <p className="font-black text-lg">Снятие денег для сына</p>
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
                <input className="game-input" value={reason} onChange={(event) => setReason(event.target.value)} />
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
                      await store.payout(amount, reason);
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
              <p className="font-black text-lg">Премии</p>
              <p className="text-white/60">Штраф пишите плюсом: 3 значит −3 ₽</p>
              <MoneyField
                label="За верный ответ, ₽"
                value={draft.rewardCorrect}
                onChange={(value) => setDraft((prev) => ({ ...prev, rewardCorrect: value }))}
              />
              <MoneyField
                label="За серию 3+, ₽"
                value={draft.rewardStreak}
                onChange={(value) => setDraft((prev) => ({ ...prev, rewardStreak: value }))}
              />
              <MoneyField
                label="Штраф за ошибку, ₽"
                value={draft.penaltyWrong}
                onChange={(value) => setDraft((prev) => ({ ...prev, penaltyWrong: value }))}
              />
              <MoneyField
                label="Цена подсказки, ₽"
                value={draft.hintPrice}
                onChange={(value) => setDraft((prev) => ({ ...prev, hintPrice: value }))}
              />
              <MoneyField
                label="Набор +3, ₽"
                value={draft.hintPackPrice}
                onChange={(value) => setDraft((prev) => ({ ...prev, hintPackPrice: value }))}
              />
              <button
                type="button"
                className="w-full btn-primary play-cta"
                disabled={busy}
                onClick={() => {
                  const next = draftToSettings();
                  setSettings(next);
                  setDraft(settingsToDraft(next));
                  void runAction(
                    { title: "Сохраняем…", message: "Премии на все телефоны", tone: "wait", busy: true },
                    async () => {
                      await store.saveSettings(next);
                    },
                    {
                      title: "Сохранено",
                      message: `Верно +${next.rewardCorrect} · серия +${next.rewardStreak}\nШтраф −${next.penaltyWrong}`,
                      tone: "ok",
                    },
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
                  setSettings(next);
                  setDraft(settingsToDraft(next));
                  showOk("Вернули как было", "5 / 10 / −3 — нажмите «Сохранить премии»");
                }}
              >
                Вернуть 5 / 10 / −3
              </button>
            </div>
            <div className="glass-card w-full space-y-4">
              <p className="font-black text-lg">Сменить пароль</p>
              <p className="text-white/60">Пароль один на все телефоны. Сейчас сын без него сюда не зайдёт.</p>
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
        onBlur={() => onChange(digitsOnly(value) || "0")}
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
          <button type="button" className="ios-notice-ok btn-primary" onClick={onOk}>
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
