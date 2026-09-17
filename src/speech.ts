/** Озвучка для диктанта на слух — Web Speech API, работает с GitHub Pages. */

function stripStress(text: string): string {
  return text.replace(/\u0301/g, "");
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

/** Произнести слово по-русски. Вызывать после тапа (iPhone). */
export function speakRu(text: string): Promise<void> {
  return new Promise((resolve) => {
    if (!canSpeak()) {
      resolve();
      return;
    }
    try {
      window.speechSynthesis.cancel();
      const utter = new SpeechSynthesisUtterance(stripStress(text));
      utter.lang = "ru-RU";
      utter.rate = 0.88;
      utter.pitch = 1;
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
      window.setTimeout(finish, Math.max(2500, stripStress(text).length * 350));
    } catch {
      resolve();
    }
  });
}
