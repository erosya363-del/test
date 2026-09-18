/** Озвучка для диктанта на слух — Web Speech API, работает с GitHub Pages. */

function stripStress(text: string): string {
  return text.replace(/\u0301/g, "");
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

export function canSpeak(): boolean {
  return typeof window !== "undefined" && typeof window.speechSynthesis !== "undefined";
}

export function stopSpeaking(): void {
  if (!canSpeak()) return;
  try {
    window.speechSynthesis.cancel();
  } catch {
    /* ignore */
  }
}

function pickRuVoice(): SpeechSynthesisVoice | null {
  if (!canSpeak()) return null;
  try {
    const voices = window.speechSynthesis.getVoices();
    if (!voices.length) return null;
    const ru = voices.filter((v) => (v.lang || "").toLowerCase().startsWith("ru"));
    const prefer = ru.find((v) => /milena|yuri|katya|irina|elena|pavel|dmitri|microsoft/i.test(v.name));
    return prefer || ru[0] || null;
  } catch {
    return null;
  }
}

/** Прогрев списка голосов (iOS подгружает их лениво). */
export function warmVoices(): void {
  if (!canSpeak()) return;
  try {
    window.speechSynthesis.getVoices();
    window.speechSynthesis.addEventListener("voiceschanged", () => {
      window.speechSynthesis.getVoices();
    }, { once: true });
  } catch {
    /* ignore */
  }
}

/** Произнести слово по-русски. Вызывать после тапа (iPhone). */
export function speakRu(text: string): Promise<void> {
  return new Promise((resolve) => {
    if (!canSpeak()) {
      resolve();
      return;
    }
    try {
      window.speechSynthesis.cancel();
      const clean = stripStress(text);
      const utter = new SpeechSynthesisUtterance(clean);
      utter.lang = "ru-RU";
      utter.rate = 0.82;
      utter.pitch = 1;
      const voice = pickRuVoice();
      if (voice) utter.voice = voice;
      let done = false;
      const finish = () => {
        if (done) return;
        done = true;
        resolve();
      };
      utter.onend = finish;
      utter.onerror = finish;
      window.speechSynthesis.speak(utter);
      // На части iOS onend молчит — страховка
      window.setTimeout(finish, Math.max(2800, clean.length * 380));
    } catch {
      resolve();
    }
  });
}

/**
 * Пауза → слово → пауза → слово ещё раз.
 * Так ребёнку проще успеть услышать.
 */
export async function speakRuTwice(text: string): Promise<void> {
  if (!canSpeak()) return;
  await sleep(350);
  await speakRu(text);
  await sleep(500);
  await speakRu(text);
}
