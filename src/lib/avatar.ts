import { createClient } from "@/lib/supabase/client";

const PENDING_KEY = "korshi-pending-avatar";
const SIZE = 256;

/** Квадратный JPEG 256×256: аватар весит десятки килобайт, а не мегабайты. */
export async function resizeAvatar(file: File): Promise<Blob> {
  if (!file.type.startsWith("image/")) throw new Error("Выберите изображение");
  const bitmap = await createImageBitmap(file);
  const side = Math.min(bitmap.width, bitmap.height);
  const canvas = document.createElement("canvas");
  canvas.width = SIZE;
  canvas.height = SIZE;
  canvas.getContext("2d")!.drawImage(bitmap, (bitmap.width - side) / 2, (bitmap.height - side) / 2, side, side, 0, 0, SIZE, SIZE);
  bitmap.close();
  return new Promise((resolve, reject) => canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error("Не удалось обработать фото")), "image/jpeg", 0.85));
}

/** Загружает аватар в папку пользователя и записывает ссылку в профиль. */
export async function uploadAvatar(userId: string, avatar: Blob): Promise<string> {
  const supabase = createClient();
  const path = `${userId}/${crypto.randomUUID()}.jpg`;
  const upload = await supabase.storage.from("avatars").upload(path, avatar, { contentType: "image/jpeg", upsert: false });
  if (upload.error) throw upload.error;
  const url = supabase.storage.from("avatars").getPublicUrl(path).data.publicUrl;
  const { error } = await supabase.from("profiles").update({ avatar_url: url }).eq("id", userId);
  if (error) {
    await supabase.storage.from("avatars").remove([path]);
    throw error;
  }
  return url;
}

/** До подтверждения email загрузить нельзя: фото ждёт первого входа. */
export async function savePendingAvatar(avatar: Blob) {
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(avatar);
  });
  try { localStorage.setItem(PENDING_KEY, dataUrl); } catch { /* без хранилища аватар добавят в профиле */ }
}

export async function takePendingAvatar(): Promise<Blob | null> {
  let dataUrl: string | null = null;
  try {
    dataUrl = localStorage.getItem(PENDING_KEY);
    localStorage.removeItem(PENDING_KEY);
  } catch { return null; }
  if (!dataUrl) return null;
  const bytes = Uint8Array.from(atob(dataUrl.slice(dataUrl.indexOf(",") + 1)), (char) => char.charCodeAt(0));
  return new Blob([bytes], { type: "image/jpeg" });
}
