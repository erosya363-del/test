import { useEffect, useState } from "react";
import { speakRuTwice, stopSpeaking, warmVoices } from "./speech";
import { photoUploadReadyAsync, uploadPhotoToImgbb, friendlyNetworkError } from "./photos";
import { answersMatch } from "./data/modes";
import type { DicAnswer } from "./data/types";
import { playClickSound, playCorrectSound, playWrongSound, resumeAudio } from "./sounds";

type WordLike = {
  correct: string;
  correctPlain: string;
  emoji: string;
};

type DictMode = "paper" | "keys";

type Props = {
  words: WordLike[];
  onPaperDone: () => void;
  onUploadPhoto: (url: string) => Promise<void>;
  onSendKeys: (answers: DicAnswer[]) => Promise<void>;
  onBack: () => void;
};

export function DictationGame({ words, onPaperDone, onUploadPhoto, onSendKeys, onBack }: Props) {
  const [mode, setMode] = useState<DictMode | null>(null);
  const [index, setIndex] = useState(0);
  const [draft, setDraft] = useState("");
  const [answers, setAnswers] = useState<DicAnswer[]>([]);
  const [phase, setPhase] = useState<"play" | "review" | "done" | "upload">("play");
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const [speaking, setSpeaking] = useState(false);

  const current = words[index];
  const total = words.length;

  useEffect(() => {
    warmVoices();
  }, []);

  const speak = async () => {
    if (!current || speaking) return;
    resumeAudio();
    playClickSound();
    setSpeaking(true);
    try {
      await speakRuTwice(current.correctPlain);
    } finally {
      setSpeaking(false);
    }
  };

  const goNextPaper = () => {
    if (!current) return;
    playClickSound();
    if (index + 1 >= total) {
      stopSpeaking();
      onPaperDone();
      setPhase("done");
      return;
    }
    setIndex((prev) => prev + 1);
  };

  const goNextKeys = () => {
    if (!current || !draft.trim()) return;
    playClickSound();
    const ok = answersMatch(draft, current.correct) || answersMatch(draft, current.correctPlain);
    if (ok) playCorrectSound();
    else playWrongSound();
    const row: DicAnswer = { word: current.correctPlain, input: draft.trim(), ok };
    const nextAnswers = [...answers, row];
    setAnswers(nextAnswers);
    setDraft("");
    if (index + 1 >= total) {
      stopSpeaking();
      setPhase("review");
      return;
    }
    setIndex((prev) => prev + 1);
  };

  const pickFile = async (file: File | null) => {
    if (!file) return;
    setError("");
    setBusy(true);
    try {
      if (!(await photoUploadReadyAsync())) {
        throw new Error("Нет ключа ImgBB. Папа вставит ключ в кабинете.");
      }
      const url = await uploadPhotoToImgbb(file);
      await onUploadPhoto(url);
      setNote("Фото у папы — можно проверить в кабинете");
      setPhase("done");
    } catch (err) {
      setError(friendlyNetworkError(err, "Не загрузилось"));
    } finally {
      setBusy(false);
    }
  };

  const sendToPapa = async () => {
    setBusy(true);
    setError("");
    try {
      await onSendKeys(answers);
      setNote("Отправлено папе");
      setPhase("done");
    } catch (err) {
      setError(friendlyNetworkError(err, "Не отправилось"));
    } finally {
      setBusy(false);
    }
  };

  if (!mode) {
    return (
      <div className="app-screen">
        <div className="play-stage">
          <div className="text-center">
            <div className="play-emoji">📝</div>
            <h2 className="text-2xl font-black bg-gradient-to-r from-yellow-200 via-pink-200 to-purple-200 bg-clip-text text-transparent">
              Диктант 10
            </h2>
            <p className="text-white/60 text-sm mt-1">Как будешь писать?</p>
          </div>
          <button
            type="button"
            className="w-full text-left bg-white/5 border border-white/10 rounded-2xl p-3"
            onClick={() => {
              playClickSound();
              setMode("paper");
              setPhase("play");
            }}
          >
            <div className="flex items-center gap-3">
              <span className="text-2xl">📒</span>
              <div>
                <p className="font-black">На бумаге</p>
                <p className="text-white/55 text-sm">Слушай слово → пиши в тетрадь → Далее. Потом фото папе.</p>
              </div>
            </div>
          </button>
          <button
            type="button"
            className="w-full text-left bg-white/5 border border-white/10 rounded-2xl p-3"
            onClick={() => {
              playClickSound();
              setMode("keys");
              setPhase("play");
            }}
          >
            <div className="flex items-center gap-3">
              <span className="text-2xl">⌨️</span>
              <div>
                <p className="font-black">На клавиатуре</p>
                <p className="text-white/55 text-sm">Вводи слова на телефоне. Список ошибок — папе.</p>
              </div>
            </div>
          </button>
          <button type="button" className="play-cta btn-secondary" onClick={onBack}>
            ← Назад
          </button>
        </div>
      </div>
    );
  }

  if (phase === "upload") {
    return (
      <div className="app-screen">
        <div className="play-stage">
          <div className="play-badge bg-yellow-500/15 border-yellow-400/30 text-yellow-100">📷 Фото папе</div>
          <div className="glass-card w-full space-y-3">
            <p className="text-white/70 text-sm">Сфотографируй тетрадь. Папа увидит на другом телефоне.</p>
            <label className="w-full btn-primary play-cta text-center block cursor-pointer">
              {busy ? "Грузим…" : "📷 Выбрать фото"}
              <input
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                disabled={busy}
                onChange={(event) => void pickFile(event.target.files?.[0] ?? null)}
              />
            </label>
            {error && <p className="text-red-300 font-bold text-center text-sm">{error}</p>}
          </div>
          <button type="button" className="play-cta btn-secondary" onClick={() => setPhase("done")}>
            Позже
          </button>
        </div>
      </div>
    );
  }

  if (phase === "review" && mode === "keys") {
    const okCount = answers.filter((item) => item.ok).length;
    const mistakes = answers.filter((item) => !item.ok);
    return (
      <div className="app-screen">
        <div className="play-stage">
          <div className="play-badge bg-cyan-500/15 border-cyan-400/30 text-cyan-100">Результат</div>
          <div className="glass-card w-full text-center space-y-2">
            <p className="font-black text-2xl">Диктант готов</p>
            <p className="text-yellow-300 font-black text-xl">
              {okCount}/{total} верно
            </p>
          </div>
          <div className="glass-card w-full space-y-2">
            <p className="font-black">Ошибки</p>
            {mistakes.length === 0 ? (
              <p className="text-green-300 text-sm">Без ошибок — супер!</p>
            ) : (
              mistakes.map((row) => (
                <div key={`${row.word}-${row.input}`} className="bg-white/5 rounded-2xl p-3 border border-white/10 text-left">
                  <p className="font-black">{row.word}</p>
                  <p className="text-red-300 text-sm">Ты: {row.input || "—"}</p>
                </div>
              ))
            )}
          </div>
          {error && <p className="text-red-300 font-bold text-center text-sm">{error}</p>}
          <button type="button" className="play-cta btn-primary" disabled={busy} onClick={() => void sendToPapa()}>
            {busy ? "Отправляем…" : "Отправить папе"}
          </button>
          <button type="button" className="play-cta btn-secondary" onClick={onBack}>
            ← В меню
          </button>
        </div>
      </div>
    );
  }

  if (phase === "done") {
    return (
      <div className="app-screen">
        <div className="play-stage">
          <div className="play-emoji">🏆</div>
          <div className="glass-card w-full text-center space-y-2">
            <p className="font-black text-2xl">Готово</p>
            {mode === "keys" && (
              <p className="text-yellow-300 font-black text-xl">
                {answers.filter((item) => item.ok).length}/{total} верно
              </p>
            )}
            {note && <p className="text-green-300 text-sm">{note}</p>}
            {mode === "paper" && !note && (
              <p className="text-white/60 text-sm">Можно загрузить фото тетради папе</p>
            )}
          </div>
          {mode === "paper" && (
            <button type="button" className="play-cta btn-primary" onClick={() => setPhase("upload")}>
              📷 Загрузить фото папе
            </button>
          )}
          <button type="button" className="play-cta btn-secondary" onClick={onBack}>
            ← В меню
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="app-screen app-screen-hud">
      <div className="play-stage">
        <div className="play-badge bg-cyan-500/15 border-cyan-400/30 text-cyan-100">
          <span>{mode === "paper" ? "📒" : "⌨️"}</span>
          <span>
            Диктант {index + 1}/{total}
          </span>
        </div>
        <div className="play-hero">
          <button type="button" className="play-cta btn-primary" disabled={speaking} onClick={() => void speak()}>
            {speaking ? "Говорит…" : "🔊 Слушать слово"}
          </button>
          <p className="play-tip">
            {mode === "paper"
              ? "Напиши в тетрадь. Слово скажет два раза."
              : "Слово не показывают — скажет два раза"}
          </p>
        </div>
        {mode === "keys" ? (
          <>
            <label className="block w-full">
              <span className="field-label">Напиши слово</span>
              <input
                className="game-input"
                type="text"
                inputMode="text"
                autoComplete="off"
                autoCorrect="off"
                spellCheck={false}
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                placeholder="Как услышал"
              />
            </label>
            <button type="button" className="play-cta btn-primary" onClick={goNextKeys} disabled={!draft.trim()}>
              {index + 1 >= total ? "Готово" : "Далее →"}
            </button>
          </>
        ) : (
          <button type="button" className="play-cta btn-primary" onClick={goNextPaper}>
            {index + 1 >= total ? "Готово" : "Написал → Далее"}
          </button>
        )}
        <button
          type="button"
          className="btn-secondary py-2.5"
          onClick={() => {
            stopSpeaking();
            onBack();
          }}
        >
          ← Выйти
        </button>
      </div>
    </div>
  );
}

/** Отдельный экран «загрузить фото позже» с меню. */
export function PhotoUploadPanel({
  onUpload,
  onBack,
}: {
  onUpload: (url: string) => Promise<void>;
  onBack: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [ok, setOk] = useState(false);

  return (
    <div className="app-screen">
      <div className="play-stage">
        <div className="play-badge bg-yellow-500/15 border-yellow-400/30 text-yellow-100">📷 Фото папе</div>
        <div className="glass-card w-full space-y-3">
          <p className="text-white/70 text-sm">Для диктанта на бумаге или любого снимка тетради.</p>
          <label className="w-full btn-primary play-cta text-center block cursor-pointer">
            {busy ? "Грузим…" : "📷 Выбрать фото"}
            <input
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              disabled={busy}
              onChange={async (event) => {
                const file = event.target.files?.[0];
                if (!file) return;
                setBusy(true);
                setError("");
                try {
                  if (!(await photoUploadReadyAsync())) throw new Error("Нет ключа ImgBB в кабинете папы");
                  const url = await uploadPhotoToImgbb(file);
                  await onUpload(url);
                  setOk(true);
                } catch (err) {
                  setError(friendlyNetworkError(err, "Не загрузилось"));
                } finally {
                  setBusy(false);
                }
              }}
            />
          </label>
          {ok && <p className="text-green-300 font-bold text-center">Готово — папа увидит в кабинете</p>}
          {error && <p className="text-red-300 font-bold text-center text-sm">{error}</p>}
        </div>
        <button type="button" className="play-cta btn-secondary" onClick={onBack}>
          ← Назад
        </button>
      </div>
    </div>
  );
}
