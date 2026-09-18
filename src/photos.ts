import { IMGBB_API_KEY } from "./data/types";

const LS_KEY = "dictation_imgbb";

function resolveImgbbKey(): string {
  try {
    const fromLs = localStorage.getItem(LS_KEY)?.trim();
    if (fromLs) return fromLs;
  } catch {
    /* private mode */
  }
  return (IMGBB_API_KEY || "").trim();
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

export function photoUploadReady(): boolean {
  return Boolean(resolveImgbbKey());
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
  const key = resolveImgbbKey();
  if (!key) {
    throw new Error("Нет ключа ImgBB. Папа: кабинет → ключ фото");
  }
  const compressed = await compressImageFile(file);
  const base64 = await blobToBase64(compressed);
  const body = new FormData();
  body.append("image", base64);
  const response = await fetch(`https://api.imgbb.com/1/upload?key=${encodeURIComponent(key)}`, {
    method: "POST",
    body,
  });
  if (!response.ok) {
    throw new Error("ImgBB не принял фото");
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
