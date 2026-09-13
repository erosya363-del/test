import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useGameStore } from "../data/GameStore";
import { DEFAULT_SETTINGS, PARENT_PASSWORD, type Settings } from "../data/types";

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
      return "Верно";
    case "bad":
      return "Ошибка";
    case "hint":
      return "Подсказка";
    case "shop":
      return "Магазин";
    case "pay":
      return "Снятие";
    case "rst":
      return "Сброс";
    case "seed":
      return "Старт";
    case "set":
      return "Премии";
    default:
      return kind;
  }
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
  const [savedNote, setSavedNote] = useState("");

  useEffect(() => {
    setSettings(store.settings);
  }, [store.settings]);

  useEffect(() => {
    if (!authed) return;
    void store.refresh();
    const timer = window.setInterval(() => {
      void store.refresh();
    }, 8000);
    return () => window.clearInterval(timer);
    // refresh is stable enough for a parent monitor
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authed]);

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
    if (password.trim() === PARENT_PASSWORD) {
      sessionStorage.setItem("dictation_papa", "1");
      setAuthed(true);
      setError("");
    } else {
      setError("Неверный пароль");
    }
  };

  if (!authed) {
    return (
      <div className="cabinet">
        <div className="cabinet-sheet cabinet-login">
          <p className="cabinet-kicker">Только для родителей</p>
          <h1>Кабинет папы</h1>
          <p className="cabinet-lead">Сюда сын не заходит. Пароль тот, что договорились.</p>
          <form onSubmit={login} className="cabinet-form">
            <input
              type="password"
              inputMode="numeric"
              autoComplete="off"
              placeholder="Пароль"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
            {error && <p className="cabinet-error">{error}</p>}
            <button type="submit" className="cabinet-btn">
              Войти
            </button>
          </form>
          <button type="button" className="cabinet-link" onClick={onClose}>
            Вернуться в игру
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="cabinet">
      <header className="cabinet-top">
        <div>
          <p className="cabinet-kicker">Журнал семьи</p>
          <h1>Кабинет папы</h1>
        </div>
        <button type="button" className="cabinet-link" onClick={onClose}>
          В игру
        </button>
      </header>

      <section className="cabinet-balance">
        <div>
          <span>Сейчас у сына</span>
          <strong>{store.money} ₽</strong>
        </div>
        <div>
          <span>Заработал в игре</span>
          <strong>{report.earned} ₽</strong>
        </div>
        <div>
          <span>Сняли / сбросили</span>
          <strong>{Math.abs(report.withdrawn)} ₽</strong>
        </div>
        <p className="cabinet-sync">{store.syncing ? "Сохраняем…" : "Общая база, видно с любого телефона"}</p>
      </section>

      <nav className="cabinet-tabs">
        <button type="button" className={tab === "stat" ? "on" : ""} onClick={() => setTab("stat")}>
          Анализ
        </button>
        <button type="button" className={tab === "log" ? "on" : ""} onClick={() => setTab("log")}>
          Ответы
        </button>
        <button type="button" className={tab === "pay" ? "on" : ""} onClick={() => setTab("pay")}>
          Деньги
        </button>
        <button type="button" className={tab === "set" ? "on" : ""} onClick={() => setTab("set")}>
          Премии
        </button>
      </nav>

      {tab === "stat" && (
        <div className="cabinet-stack">
          <article className="cabinet-card">
            <h2>Сводка</h2>
            <ul className="cabinet-grid">
              <li>
                <b>{report.answers.filter((event) => event.kind === "ok").length}</b>
                <span>верных</span>
              </li>
              <li>
                <b>{report.answers.filter((event) => event.kind === "bad").length}</b>
                <span>ошибок</span>
              </li>
              <li>
                <b>{report.penalties} ₽</b>
                <span>штрафы</span>
              </li>
              <li>
                <b>{Math.abs(report.shop)} ₽</b>
                <span>магазин</span>
              </li>
            </ul>
          </article>

          <article className="cabinet-card">
            <h2>Слова, которые постоянно ломаются</h2>
            {report.hard.length === 0 ? (
              <p className="cabinet-empty">Пока нет устойчивых ошибок. Нужно хотя бы 2 попытки на слово.</p>
            ) : (
              <ul className="cabinet-words">
                {report.hard.map((row) => (
                  <li key={row.word}>
                    <div>
                      <b>{row.word}</b>
                      <span>последний показ: {row.lastShown || "—"}</span>
                    </div>
                    <em>
                      {row.bad}/{row.seen} ошибок
                    </em>
                  </li>
                ))}
              </ul>
            )}
          </article>

          <article className="cabinet-card">
            <h2>Все слова</h2>
            {report.worst.length === 0 ? (
              <p className="cabinet-empty">Ещё не играли после включения общей базы.</p>
            ) : (
              <ul className="cabinet-words">
                {report.worst.map((row) => (
                  <li key={row.word}>
                    <div>
                      <b>{row.word}</b>
                      <span>
                        верно {row.ok} · ошибка {row.bad}
                      </span>
                    </div>
                    <em>{row.seen} раз</em>
                  </li>
                ))}
              </ul>
            )}
          </article>
        </div>
      )}

      {tab === "log" && (
        <article className="cabinet-card">
          <h2>Журнал ответов</h2>
          <p className="cabinet-lead">Можно проверить, что именно видел сын и что ответил.</p>
          {store.events.length === 0 ? (
            <p className="cabinet-empty">Журнал пуст.</p>
          ) : (
            <ul className="cabinet-log">
              {[...store.events].reverse().map((event) => (
                <li key={event.id} className={event.kind}>
                  <div className="cabinet-log-top">
                    <b>{kindLabel(event.kind)}</b>
                    <span>{formatTime(event.ts)}</span>
                  </div>
                  {event.word && (
                    <p>
                      Слово: <b>{event.word}</b>
                    </p>
                  )}
                  {event.shown && (
                    <p>
                      Показали: <b>{event.shown}</b>
                    </p>
                  )}
                  {event.expected && (
                    <p>
                      Правильно: <b>{event.expected}</b>
                    </p>
                  )}
                  {event.choice && (
                    <p>
                      Ответ сына: <b>{event.choice}</b>
                    </p>
                  )}
                  {event.errorType && <p>Тип ошибки в задании: {event.errorType}</p>}
                  {event.reason && <p>{event.reason}</p>}
                  <p className={event.moneyDelta >= 0 ? "plus" : "minus"}>
                    {event.moneyDelta > 0 ? "+" : ""}
                    {event.moneyDelta} ₽
                  </p>
                </li>
              ))}
            </ul>
          )}
        </article>
      )}

      {tab === "pay" && (
        <div className="cabinet-stack">
          <article className="cabinet-card">
            <h2>Снятие денег для сына</h2>
            <p className="cabinet-lead">Списывается с общего баланса. На всех телефонах сумма станет меньше.</p>
            <label>
              Сумма
              <input type="number" min={0} value={payout} onChange={(event) => setPayout(event.target.value)} />
            </label>
            <label>
              За что
              <input value={reason} onChange={(event) => setReason(event.target.value)} />
            </label>
            <button
              type="button"
              className="cabinet-btn"
              onClick={async () => {
                await store.payout(Number(payout) || 0, reason);
                setSavedNote("Снятие записано в журнал");
              }}
            >
              Снять с баланса
            </button>
          </article>

          <article className="cabinet-card">
            <h2>Сброс</h2>
            <p className="cabinet-lead">Обнуляет карманные в игре и возвращает 3 подсказки. История ответов остаётся.</p>
            <button
              type="button"
              className="cabinet-btn danger"
              onClick={async () => {
                await store.resetProgress("Сброс прогресса / снятие всех денег");
                setSavedNote("Баланс обнулён");
              }}
            >
              Сбросить деньги сына
            </button>
          </article>
          {savedNote && <p className="cabinet-note">{savedNote}</p>}
        </div>
      )}

      {tab === "set" && (
        <article className="cabinet-card">
          <h2>Премии</h2>
          <p className="cabinet-lead">Минус за ошибку пишите плюсом: 3 значит −3 ₽.</p>
          <div className="cabinet-fields">
            <label>
              За правильный ответ
              <input
                type="number"
                value={settings.rewardCorrect}
                onChange={(event) => setSettings({ ...settings, rewardCorrect: Number(event.target.value) })}
              />
            </label>
            <label>
              За серию
              <input
                type="number"
                value={settings.rewardStreak}
                onChange={(event) => setSettings({ ...settings, rewardStreak: Number(event.target.value) })}
              />
            </label>
            <label>
              Штраф за ошибку
              <input
                type="number"
                value={settings.penaltyWrong}
                onChange={(event) => setSettings({ ...settings, penaltyWrong: Number(event.target.value) })}
              />
            </label>
            <label>
              Цена подсказки
              <input
                type="number"
                value={settings.hintPrice}
                onChange={(event) => setSettings({ ...settings, hintPrice: Number(event.target.value) })}
              />
            </label>
            <label>
              Набор +3
              <input
                type="number"
                value={settings.hintPackPrice}
                onChange={(event) => setSettings({ ...settings, hintPackPrice: Number(event.target.value) })}
              />
            </label>
          </div>
          <button
            type="button"
            className="cabinet-btn"
            onClick={async () => {
              await store.saveSettings(settings);
              setSavedNote("Премии обновлены на всех телефонах");
            }}
          >
            Сохранить премии
          </button>
          <button type="button" className="cabinet-link" onClick={() => setSettings({ ...DEFAULT_SETTINGS })}>
            Вернуть обычные 5 / 10 / −3
          </button>
          {savedNote && <p className="cabinet-note">{savedNote}</p>}
        </article>
      )}
    </div>
  );
}
