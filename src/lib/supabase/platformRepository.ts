import { createClient } from "@/lib/supabase/client";
import { requireBackend } from "@/lib/supabase/config";
import type { Database, Json } from "@/types/database.types";
import { afterFailure, classifyFailure, enqueue, type QueueItem } from "@/features/sync/queue";

export type PlatformMutation = {
  operation: "insert" | "upsert" | "update" | "delete" | "rpc";
  table: keyof Database["public"]["Tables"] | keyof Database["public"]["Functions"];
  recordId?: string;
  match?: Record<string, Json>;
  payload?: Record<string, Json | undefined>;
};
export type PendingMutation = QueueItem<PlatformMutation>;
const QUEUE_KEY = "korshi-platform-sync-queue-v2";
let activeScope: { userId: string; complexId: string } | null = null;
let flushing: Promise<{ synced: number; pending: number }> | null = null;

const SCOPE_KEY = "korshi-platform-scope-v1";

export function clearPlatformScope() { activeScope = null; }

// Последний известный ЖК пользователя: без сети по нему ставится очередь.
// Сервер всё равно сверяет ЖК при отправке (execute_platform_mutation).
function rememberScope(scope: { userId: string; complexId: string }) {
  activeScope = scope;
  try { localStorage.setItem(SCOPE_KEY, JSON.stringify(scope)); } catch { /* storage unavailable */ }
}

function storedScope(userId: string) {
  try {
    const value = JSON.parse(localStorage.getItem(SCOPE_KEY) || "null");
    return value?.userId === userId && typeof value.complexId === "string" ? value as { userId: string; complexId: string } : null;
  } catch { return null; }
}
/**
 * Блокирует отложенные действия текущего пользователя, привязанные к другому
 * ЖК. Вызывается после переключения активного объекта: молчаливое выполнение
 * со старым контекстом запрещено, сервер такие операции всё равно отклонит.
 * Возвращает число заблокированных действий.
 */
export function quarantineStaleScopeActions() {
  if (typeof window === "undefined" || !activeScope) return 0;
  const { userId, complexId } = activeScope;
  const queue = readQueue();
  let quarantined = 0;
  const next = queue.map((item) => {
    if (item.userId === userId && item.complexId !== complexId && item.status === "pending") {
      quarantined++;
      return { ...item, status: "blocked" as const, error: "Активный ЖК изменён. Проверьте действие и отправьте его заново." };
    }
    return item;
  });
  if (quarantined) writeQueue(next);
  return quarantined;
}
function readQueue(): PendingMutation[] {
  if (typeof window === "undefined") return [];
  const raw = window.localStorage.getItem(QUEUE_KEY);
  if (!raw) return [];
  const value: unknown = JSON.parse(raw);
  if (!Array.isArray(value) || !value.every((item) => typeof item.id === "string" && typeof item.userId === "string" && typeof item.complexId === "string" && item.mutation && Number.isInteger(item.attempts))) {
    throw new Error("Не удалось прочитать очередь. Данные сохранены на устройстве для восстановления.");
  }
  return value as PendingMutation[];
}
function writeQueue(queue: PendingMutation[]) {
  window.localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
  window.dispatchEvent(new Event("korshi-queue-change"));
}
export function getPendingPlatformActions() {
  return readQueue().filter((item) => item.userId === activeScope?.userId && item.complexId === activeScope?.complexId);
}
export function getPendingPlatformMutations() { return getPendingPlatformActions().length; }
export function discardPlatformAction(id: string) {
  writeQueue(readQueue().filter((item) => !(item.id === id && item.userId === activeScope?.userId && item.complexId === activeScope?.complexId)));
}
export function retryPlatformAction(id: string) {
  writeQueue(readQueue().map((item) => item.id === id && item.userId === activeScope?.userId && item.complexId === activeScope?.complexId
    ? { ...item, attempts: 0, nextAttemptAt: 0, status: "pending", error: undefined } : item));
}
async function executeMutation(item: PendingMutation) {
  const { data, error, status } = await createClient().rpc("execute_platform_mutation", {
    p_id: item.id, p_complex_id: item.complexId, p_mutation: item.mutation as Json,
  });
  if (error) throw Object.assign(new Error(error.message), { code: error.code, status });
  return data;
}
export async function loadPlatformSnapshot() {
  requireBackend();
  const supabase = createClient();
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError) throw authError;
  if (!authData.user) throw new Error("Требуется авторизация");
  const context = await supabase.rpc("auth_user_complex_id");
  if (context.error) throw context.error;
  // До подтверждения проживания контекста ЖК нет и загружать нечего.
  if (!context.data) return null;
  rememberScope({ userId: authData.user.id, complexId: context.data });

  const queries = await Promise.all([
    supabase.from("complex_memberships").select("*, complex:complexes(name,address), apartment:apartments(number, entrance:entrances(number, building:buildings(number)))").order("created_at"),
    supabase.from("access_passes").select("*").order("created_at", { ascending: false }),
    supabase.from("access_events").select("*").order("occurred_at", { ascending: false }).limit(100),
    supabase.from("parking_spots").select("*").order("label"),
    supabase.from("parking_bookings").select("*").order("starts_at", { ascending: false }),
    supabase.from("work_orders").select("*, checklist:work_order_checklist_items(*), attachments:work_order_attachments(*), ratings:work_ratings(user_id,rating)").order("starts_at", { ascending: false }),
    supabase.from("marketplace_favorites").select("classified_id"),
    supabase.from("marketplace_reviews").select("*, author:profiles(full_name)").order("created_at", { ascending: false }),
    supabase.from("complex_settings").select("*").maybeSingle(),
    supabase.from("notification_preferences").select("*").maybeSingle(),
  ] as const);

  const failed = queries.find((query) => query.error);
  if (failed?.error) throw new Error(`Не удалось загрузить данные: ${failed.error.message}`);
  return {
    userId: authData.user.id as string,
    memberships: queries[0].data, passes: queries[1].data, accessEvents: queries[2].data, parkingSpots: queries[3].data,
    parkingBookings: queries[4].data, works: queries[5].data,
    favorites: queries[6].data, reviews: queries[7].data, complexSettings: queries[8].data, notificationPreferences: queries[9].data,
  };
}

export async function syncPlatformMutation(mutation: PlatformMutation) {
  requireBackend();
  const isSos = mutation.table === "sos_incidents";
  if (isSos && !navigator.onLine) throw new Error("Нет связи: SOS не отправлен. При опасности звоните 112.");
  const supabase = createClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error("Требуется авторизация");
  let scope = activeScope?.userId === session.user.id ? activeScope : null;
  if (!scope && !navigator.onLine) {
    scope = storedScope(session.user.id);
    if (!scope) throw new Error("Нет сети. Действие можно будет сохранить, когда приложение хотя бы раз загрузится онлайн.");
    activeScope = scope;
  }
  if (!scope) {
    const { data, error } = await supabase.rpc("auth_user_complex_id");
    if (error) throw error;
    if (!data) throw new Error("Действие станет доступно после подтверждения проживания");
    scope = { userId: session.user.id, complexId: data };
    rememberScope(scope);
  }
  const item: PendingMutation = { id: crypto.randomUUID(), ...scope, mutation,
    createdAt: new Date().toISOString(), attempts: 0, status: "pending", nextAttemptAt: 0 };
  // Emergency intent must never be replayed later as if it were a fresh incident.
  if (isSos) {
    try {
      const data = await executeMutation(item);
      return { queued: false, data };
    } catch {
      throw new Error("Нет подтверждения регистрации SOS. Сигнал не будет отправлен автоматически позже. При опасности звоните 112.");
    }
  }
  // Save before transmission: a lost response must not cause a second server operation.
  writeQueue(enqueue(readQueue(), item));
  if (!navigator.onLine) return { queued: true, data: null as Json };
  try {
    const data = await executeMutation(item);
    writeQueue(readQueue().filter((entry) => entry.id !== item.id));
    return { queued: false, data };
  } catch (error) {
    if (classifyFailure(error) !== "transient") {
      writeQueue(readQueue().filter((entry) => entry.id !== item.id));
      throw error;
    }
    writeQueue(readQueue().map((entry) => entry.id === item.id ? afterFailure(item, error) : entry));
    return { queued: true, data: null as Json };
  }
}

export async function flushPlatformQueue() {
  if (flushing) return flushing;
  flushing = flush().finally(() => { flushing = null; });
  return flushing;
}
async function flush() {
  if (!activeScope || !navigator.onLine) return { synced: 0, pending: getPendingPlatformMutations() };
  const scope = { ...activeScope };
  const { data: { session } } = await createClient().auth.getSession();
  if (!session || session.user.id !== scope.userId) return { synced: 0, pending: 0 };
  let synced = 0;
  for (const item of getPendingPlatformActions()) {
    if (item.status !== "pending" || item.nextAttemptAt > Date.now()) continue;
    if (scope.userId !== activeScope?.userId || scope.complexId !== activeScope?.complexId) break;
    if (item.mutation.table === "sos_incidents") {
      writeQueue(readQueue().map((entry) => entry.id === item.id
        ? { ...entry, status: "blocked", error: "Отложенная отправка SOS отключена. При опасности звоните 112." } : entry));
      continue;
    }
    try {
      await executeMutation(item);
      writeQueue(readQueue().filter((entry) => entry.id !== item.id));
      synced++;
    } catch (error) {
      writeQueue(readQueue().map((entry) => entry.id === item.id ? afterFailure(item, error) : entry));
    }
  }
  return { synced, pending: getPendingPlatformMutations() };
}
