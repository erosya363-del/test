import { loadImgbbApiKey } from "./data/cloud";
import { IMGBB_API_KEY } from "./data/types";

const LS_KEY = "dictation_imgbb";

function readLocalKey(): string {
  try {
    return localStorage.getItem(LS_KEY)?.trim() || "";
  } catch {
    return "";
  }
}

function resolveImgbbKeySync(): string {
  return readLocalKey() || (IMGBB_API_KEY || "").trim();
}

/** Пишет ключ в localStorage (после загрузки из облака или сохранения папой). */
export function cacheImgbbKeyLocal(key: string): void {
  try {
    const trimmed = key.trim();
    if (trimmed) localStorage.setItem(LS_KEY, trimmed);
    else localStorage.removeItem(LS_KEY);
  } catch {
    /* private mode */
  }
}

/** Облако → localStorage → константа. Один ключ на семью. */
export async function resolveImgbbKey(): Promise<string> {
  try {
    const fromCloud = (await loadImgbbApiKey()).trim();
    if (fromCloud) {
      cacheImgbbKeyLocal(fromCloud);
      return fromCloud;
    }
  } catch {
    /* offline — ниже возьмём кэш телефона */
  }
  return resolveImgbbKeySync() || (IMGBB_API_KEY || "").trim();
}

export function photoUploadReady(): boolean {
  return Boolean(resolveImgbbKeySync());
}

export async function photoUploadReadyAsync(): Promise<boolean> {
  return Boolean(await resolveImgbbKey());
}

/** Safari часто пишет "Load failed" — переводим на русский. */
export function friendlyNetworkError(err: unknown, fallback: string): string {
  const raw = err instanceof Error ? err.message : String(err || "");
  const lower = raw.toLowerCase();
  if (!raw.trim()) return fallback;
  if (
    lower.includes("load failed") ||
    lower.includes("failed to fetch") ||
    lower.includes("networkerror") ||
    lower.includes("network request failed") ||
    lower.includes("the internet connection appears to be offline")
  ) {
    return "Сеть не ответила. Проверь интернет и попробуй ещё раз";
  }
  if (lower.includes("imgbb") || lower.includes("ключ")) return raw;
  if (/[а-яё]/i.test(raw)) return raw;
  return fallback;
}

/** Сжать фото для мобильного аплоада (макс. сторона 960px). */
export function compressImageFile(file: File, maxSide = 960, quality = 0.72): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      const scale = Math.min(1, maxSide / Math.max(img.width, img.height));
      const w = Math.max(1, Math.round(img.width * scale));
      const h = Math.max(1, Math.round(img.height * scale));
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("Нет canvas"));
        return;
      }
      ctx.drawImage(img, 0, 0, w, h);
      canvas.toBlob(
        (blob) => {
          if (!blob) reject(new Error("Не сжалось"));
          else resolve(blob);
        },
        "image/jpeg",
        quality,
      );
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Не открылось фото"));
    };
    img.src = url;
  });
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result || "");
      const comma = result.indexOf(",");
      resolve(comma >= 0 ? result.slice(comma + 1) : result);
    };
    reader.onerror = () => reject(new Error("Не прочиталось"));
    reader.readAsDataURL(blob);
  });
}

/** Загрузка на ImgBB → публичный URL (виден с другого телефона). */
export async function uploadPhotoToImgbb(file: File): Promise<string> {
  const key = await resolveImgbbKey();
  if (!key) {
    throw new Error("Нет ключа ImgBB. Папа: кабинет → ключ фото");
  }
  const compressed = await compressImageFile(file);
  const base64 = await blobToBase64(compressed);
  const body = new FormData();
  body.append("image", base64);
  let response: Response;
  try {
    response = await fetch(`https://api.imgbb.com/1/upload?key=${encodeURIComponent(key)}`, {
      method: "POST",
      body,
    });
  } catch (err) {
    throw new Error(friendlyNetworkError(err, "Не удалось отправить фото"));
  }
  if (!response.ok) {
    throw new Error("ImgBB не принял фото. Проверь ключ в кабинете папы");
  }
  const json = (await response.json()) as {
    success?: boolean;
    data?: { url?: string; display_url?: string };
  };
  const url = json.data?.display_url || json.data?.url;
  if (!json.success || !url) {
    throw new Error("ImgBB не вернул ссылку");
  }
  return url;
}
