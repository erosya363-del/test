import { useState } from "react";
import { speakRu, stopSpeaking } from "./speech";
import { photoUploadReady, uploadPhotoToImgbb } from "./photos";
import { answersMatch } from "./data/modes";
import { playClickSound, playCorrectSound, playWrongSound, resumeAudio } from "./sounds";

type WordLike = {
  correct: string;
  correctPlain: string;
  emoji: string;
};

type Props = {
  words: WordLike[];
  onFinished: (okCount: number, total: number) => void;
  onUploadPhoto: (url: string) => Promise<void>;
  onBack: () => void;
};

export function DictationGame({ words, onFinished, onUploadPhoto, onBack }: Props) {
  const [index, setIndex] = useState(0);
  const [draft, setDraft] = useState("");
  const [answers, setAnswers] = useState<{ word: string; input: string; ok: boolean }[]>([]);
  const [phase, setPhase] = useState<"play" | "done" | "upload">("play");
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState("");
  const [error, setError] = useState("");

  const current = words[index];
  const total = words.length;

  const speak = async () => {
    if (!current) return;
    resumeAudio();
    playClickSound();
    await speakRu(current.correctPlain);
  };

  const goNext = () => {
    if (!current) return;
    playClickSound();
    const ok = answersMatch(draft, current.correct) || answersMatch(draft, current.correctPlain);
    if (ok) playCorrectSound();
    else playWrongSound();
    const row = { word: current.correctPlain, input: draft.trim(), ok };
    const nextAnswers = [...answers, row];
    setAnswers(nextAnswers);
    setDraft("");
    if (index + 1 >= total) {
      stopSpeaking();
      const okCount = nextAnswers.filter((item) => item.ok).length;
      onFinished(okCount, total);
      setPhase("done");
      return;
    }
    setIndex((prev) => prev + 1);
  };

  const pickFile = async (file: File | null) => {
    if (!file) return;
    setError("");
    setBusy(true);
    try {
      if (!photoUploadReady()) {
        throw new Error("Нет ключа ImgBB. Папа вставит ключ в кабинете.");
      }
      const url = await uploadPhotoToImgbb(file);
      await onUploadPhoto(url);
      setNote("Фото у папы — можно проверить в кабинете");
      setPhase("done");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не загрузилось");
    } finally {
      setBusy(false);
    }
  };

  if (phase === "upload") {
    return (
      <div className="app-screen">
        <div className="play-stage">
          <div className="play-badge bg-yellow-500/15 border-yellow-400/30 text-yellow-100">📷 Фото папе</div>
          <div className="glass-card w-full space-y-3">
            <p className="text-white/70 text-sm">Сфотографируй тетрадь или выбери снимок. Папа увидит на другом телефоне.</p>
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

  if (phase === "done") {
    const okCount = answers.filter((item) => item.ok).length;
    return (
      <div className="app-screen">
        <div className="play-stage">
          <div className="play-emoji">🏆</div>
          <div className="glass-card w-full text-center space-y-2">
            <p className="font-black text-2xl">Диктант готов</p>
            <p className="text-yellow-300 font-black text-xl">
              {okCount}/{total} верно
            </p>
            {note && <p className="text-green-300 text-sm">{note}</p>}
          </div>
          <button type="button" className="play-cta btn-primary" onClick={() => setPhase("upload")}>
            📷 Загрузить фото папе
          </button>
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
          <span>📝</span>
          <span>
            Диктант {index + 1}/{total}
          </span>
        </div>
        <div className="play-hero">
          <button type="button" className="play-cta btn-primary" onClick={() => void speak()}>
            🔊 Слушать слово
          </button>
          <p className="play-tip">Слово не показывают — только слух</p>
        </div>
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
        <button type="button" className="play-cta btn-primary" onClick={goNext} disabled={!draft.trim()}>
          {index + 1 >= total ? "Готово" : "Далее →"}
        </button>
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
          <p className="text-white/70 text-sm">Можно загрузить в любой момент — не только после диктанта.</p>
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
                  if (!photoUploadReady()) throw new Error("Нет ключа ImgBB в кабинете папы");
                  const url = await uploadPhotoToImgbb(file);
                  await onUpload(url);
                  setOk(true);
                } catch (err) {
                  setError(err instanceof Error ? err.message : "Ошибка");
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
