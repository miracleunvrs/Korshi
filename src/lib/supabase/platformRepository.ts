import { createClient } from "@/lib/supabase/client";
import { isDemoMode, requireBackend } from "@/lib/supabase/config";
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

export function clearPlatformScope() { activeScope = null; }
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
  if (isDemoMode()) return null;
  requireBackend();
  const supabase = createClient();
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError) throw authError;
  if (!authData.user) throw new Error("Требуется авторизация");
  const context = await supabase.rpc("auth_user_complex_id");
  if (context.error) throw context.error;
  if (!context.data) throw new Error("Профиль не привязан к ЖК");
  activeScope = { userId: authData.user.id, complexId: context.data };

  const queries = await Promise.all([
    supabase.from("complex_memberships").select("*, complex:complexes(name,address), apartment:apartments(number, entrance:entrances(number, building:buildings(number)))").order("created_at"),
    supabase.from("access_passes").select("*").order("created_at", { ascending: false }),
    supabase.from("access_events").select("*").order("occurred_at", { ascending: false }).limit(100),
    supabase.from("parking_spots").select("*").order("label"),
    supabase.from("parking_bookings").select("*").order("starts_at", { ascending: false }),
    supabase.from("work_orders").select("*, checklist:work_order_checklist_items(*), attachments:work_order_attachments(*)").order("starts_at", { ascending: false }),
    supabase.from("community_events").select("*, rsvps:community_event_rsvps(user_id,choice), albums:community_event_albums(id)").order("starts_at"),
    supabase.from("community_clubs").select("*, members:community_club_members(user_id)").order("name"),
    supabase.from("community_notices").select("*").order("created_at", { ascending: false }),
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
    parkingBookings: queries[4].data, works: queries[5].data, events: queries[6].data, clubs: queries[7].data, notices: queries[8].data,
    favorites: queries[9].data, reviews: queries[10].data, complexSettings: queries[11].data, notificationPreferences: queries[12].data,
  };
}

export async function syncPlatformMutation(mutation: PlatformMutation) {
  if (isDemoMode()) return { queued: false, demo: true, data: null as Json };
  requireBackend();
  const supabase = createClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error("Требуется авторизация");
  if (!activeScope || activeScope.userId !== session.user.id) {
    const { data, error } = await supabase.rpc("auth_user_complex_id");
    if (error) throw error;
    if (!data) throw new Error("Профиль не привязан к ЖК");
    activeScope = { userId: session.user.id, complexId: data };
  }
  const item: PendingMutation = { id: crypto.randomUUID(), ...activeScope, mutation,
    createdAt: new Date().toISOString(), attempts: 0, status: "pending", nextAttemptAt: 0 };
  // Save before transmission: a lost response must not cause a second server operation.
  writeQueue(enqueue(readQueue(), item));
  if (!navigator.onLine) return { queued: true, demo: false, data: null as Json };
  try {
    const data = await executeMutation(item);
    writeQueue(readQueue().filter((entry) => entry.id !== item.id));
    return { queued: false, demo: false, data };
  } catch (error) {
    if (classifyFailure(error) !== "transient") {
      writeQueue(readQueue().filter((entry) => entry.id !== item.id));
      throw error;
    }
    writeQueue(readQueue().map((entry) => entry.id === item.id ? afterFailure(item, error) : entry));
    return { queued: true, demo: false, data: null as Json };
  }
}

export async function flushPlatformQueue() {
  if (flushing) return flushing;
  flushing = flush().finally(() => { flushing = null; });
  return flushing;
}
async function flush() {
  if (isDemoMode() || !activeScope || !navigator.onLine) return { synced: 0, pending: getPendingPlatformMutations() };
  const scope = { ...activeScope };
  const { data: { session } } = await createClient().auth.getSession();
  if (!session || session.user.id !== scope.userId) return { synced: 0, pending: 0 };
  let synced = 0;
  for (const item of getPendingPlatformActions()) {
    if (item.status !== "pending" || item.nextAttemptAt > Date.now()) continue;
    if (scope.userId !== activeScope?.userId || scope.complexId !== activeScope?.complexId) break;
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
