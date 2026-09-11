"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { flushPlatformQueue, getPendingPlatformMutations, clearPlatformScope } from "@/lib/supabase/platformRepository";
import { useOperationsStore } from "@/stores/operationsStore";
import { useAppStore } from "@/stores/appStore";
import { operationsFixturesInitial } from "@/demo/initialState";

export default function PlatformRuntime() {
  const userId = useAppStore((state) => state.supabaseUserId);
  const hydrate = useOperationsStore((state) => state.hydrateFromBackend);
  const syncMessage = useOperationsStore((state) => state.syncMessage);
  const [offline, setOffline] = useState(false);
  const [pending, setPending] = useState(0);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    clearPlatformScope();
    useOperationsStore.setState({ ...operationsFixturesInitial(), syncMessage: "" });
    const refresh = () => {
      if (!active) return;
      setOffline(!navigator.onLine);
      try { setPending(getPendingPlatformMutations()); } catch (cause) { setError(String(cause)); }
    };
    const sync = async () => {
      try {
        if (userId && navigator.onLine) {
          const result = await flushPlatformQueue();
          if (result.synced && active) {
            await hydrate();
            await useAppStore.getState().hydrateDomainData();
          }
        }
      } catch (cause) { if (active) setError(cause instanceof Error ? cause.message : "Ошибка синхронизации"); }
      refresh();
    };
    if (userId) void hydrate().then(() => { if (active) void sync(); });
    refresh();
    window.addEventListener("online", sync);
    window.addEventListener("offline", refresh);
    window.addEventListener("korshi-queue-change", refresh);
    window.addEventListener("storage", refresh);
    const timer = window.setInterval(sync, 15_000);
    return () => {
      active = false;
      window.clearInterval(timer);
      window.removeEventListener("online", sync);
      window.removeEventListener("offline", refresh);
      window.removeEventListener("korshi-queue-change", refresh);
      window.removeEventListener("storage", refresh);
    };
  }, [hydrate, userId]);

  if (!offline && pending === 0 && !error && !syncMessage) return null;
  return <div className="fixed inset-x-3 bottom-24 z-50 mx-auto max-w-lg rounded-2xl bg-stone-900 p-4 text-sm text-white shadow-2xl md:bottom-5" role="status">
    <p>{error || syncMessage || (offline ? "Нет сети. Сохранённые действия ожидают отправки." : `Неотправленных действий: ${pending}`)}</p>
    {pending > 0 && <Link href="/sync" className="mt-2 inline-block font-bold text-amber-200 underline">Просмотреть очередь ({pending})</Link>}
    {(syncMessage || error) && <button className="ml-4 underline" onClick={() => { setError(""); useOperationsStore.setState({ syncMessage: "" }); }}>Закрыть</button>}
  </div>;
}
