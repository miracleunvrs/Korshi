/** Pure queue policy: no browser, auth or transport dependencies. */
export type FailureKind = "transient" | "auth" | "validation" | "conflict" | "permanent";
export function classifyFailure(error: unknown): FailureKind {
  const value = error as { status?: number; code?: string; message?: string } | null;
  const code = value?.code || "";
  const status = value?.status;
  if (status === 401 || status === 403 || code === "42501" || code === "PGRST301") return "auth";
  if (status === 409 || code === "23505" || code === "23P01" || code === "40001") return "conflict";
  if (status === 400 || status === 422 || code.startsWith("22") || code.startsWith("23") || code === "P0001") return "validation";
  if (status === 429 || (status && status >= 500) || code.startsWith("08") || error instanceof TypeError || /fetch failed|failed to fetch|network|timeout|networkerror/i.test(value?.message || "")) return "transient";
  return "permanent";
}

export type QueueItem<T> = {
  id: string; userId: string; complexId: string; mutation: T; createdAt: string;
  attempts: number; status: "pending" | "blocked"; nextAttemptAt: number; error?: string;
};
export const MAX_ATTEMPTS = 5;
export const MAX_PENDING = 100;

export function afterFailure<T>(item: QueueItem<T>, error: unknown, now = Date.now()): QueueItem<T> {
  const attempts = item.attempts + 1;
  const kind = classifyFailure(error);
  return { ...item, attempts, status: kind === "transient" && attempts < MAX_ATTEMPTS ? "pending" : "blocked",
    nextAttemptAt: now + Math.min(60_000, 1000 * 2 ** attempts),
    error: kind === "auth" ? "Недостаточно прав. Войдите снова или обратитесь к администратору." : kind === "conflict" ? "Данные изменились. Обновите страницу и проверьте действие." : kind === "validation" ? "Сервер отклонил данные. Проверьте действие." : "Не удалось отправить действие. Оно сохранено для проверки." };
}

export function enqueue<T>(queue: QueueItem<T>[], item: QueueItem<T>): QueueItem<T>[] {
  if (queue.some((existing) => existing.id === item.id)) return queue;
  if (queue.length >= MAX_PENDING) throw new Error("Очередь заполнена. Разберите неотправленные действия.");
  return [...queue, item];
}
