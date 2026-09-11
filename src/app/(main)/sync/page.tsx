"use client";
import { useEffect, useState } from "react";
import { discardPlatformAction, flushPlatformQueue, getPendingPlatformActions, retryPlatformAction, type PendingMutation } from "@/lib/supabase/platformRepository";
import { useOperationsStore } from "@/stores/operationsStore";
import { useAppStore } from "@/stores/appStore";

export default function SyncPage() {
  const [items, setItems] = useState<PendingMutation[]>(() => {
    try { return getPendingPlatformActions(); } catch { return []; }
  });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const userId = useAppStore((state) => state.supabaseUserId);
  const refresh = () => { try { setItems(getPendingPlatformActions()); } catch (cause) { setError(String(cause)); } };
  useEffect(() => {
    const timer = window.setInterval(refresh, 1000);
    window.addEventListener("korshi-queue-change", refresh);
    return () => { window.clearInterval(timer); window.removeEventListener("korshi-queue-change", refresh); };
  }, [userId]);
  async function retry(id: string) {
    setBusy(true); setError("");
    try {
      retryPlatformAction(id);
      await flushPlatformQueue();
      await useOperationsStore.getState().hydrateFromBackend();
      await useAppStore.getState().hydrateDomainData();
      refresh();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Ошибка отправки"); }
    finally { setBusy(false); }
  }
  return <div className="space-y-5 p-5">
    <h1 className="text-2xl font-black">Неотправленные действия</h1>
    <p className="text-sm text-stone-700">Здесь показаны действия текущего аккаунта и выбранного ЖК. Запись считается выполненной только после подтверждения сервера. После пяти неудачных попыток автоматическая отправка прекращается.</p>
    {error && <p role="alert" className="text-red-800">{error}</p>}
    {items.length === 0 && <p>Все действия отправлены.</p>}
    {items.map((item) => <article key={item.id} className="space-y-3 rounded-2xl border border-stone-300 p-4">
      <h2 className="font-bold">{item.mutation.table} · {item.mutation.operation}</h2>
      <p className="text-sm">{new Date(item.createdAt).toLocaleString("ru-RU")} · Попыток: {item.attempts}</p>
      <p>{item.status === "blocked" ? "Нужна проверка" : "Ожидает отправки"}</p>
      {item.error && <p className="text-sm text-red-800">{item.error}</p>}
      <div className="flex gap-3"><button disabled={busy} onClick={() => void retry(item.id)} className="rounded-xl bg-green-800 px-4 py-3 text-white disabled:opacity-50">Повторить</button><button disabled={busy} onClick={() => { if (window.confirm("Удалить сохранённое действие? Оно не будет отправлено.")) { discardPlatformAction(item.id); refresh(); } }} className="rounded-xl border border-stone-400 px-4 py-3">Удалить</button></div>
    </article>)}
  </div>;
}
