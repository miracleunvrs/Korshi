"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Check, Search, Users } from "lucide-react";
import Avatar from "@/components/ui/Avatar";
import { useAppStore } from "@/stores/appStore";
import { createGroupChat, loadNeighbours, type Neighbour } from "@/lib/supabase/repository";

/** Как в Telegram: нажать на соседа — личный чат, «Создать беседу» — группа из выбранных. */
export default function NewChatPage() {
  const router = useRouter();
  const hydrateDomainData = useAppStore((state) => state.hydrateDomainData);
  const createDirectChatWith = useAppStore((state) => state.createDirectChatWith);
  const [neighbours, setNeighbours] = useState<Neighbour[] | null>(null);
  const [query, setQuery] = useState("");
  const [groupMode, setGroupMode] = useState(false);
  const [name, setName] = useState("");
  const [selected, setSelected] = useState<Set<string>>(() => new Set());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    void loadNeighbours().then(setNeighbours).catch((cause) => {
      setNeighbours([]);
      setError(cause instanceof Error ? cause.message : "Не удалось загрузить соседей");
    });
  }, []);

  const visible = (neighbours ?? []).filter((neighbour) => neighbour.name.toLowerCase().includes(query.trim().toLowerCase()));

  const openDirect = async (neighbour: Neighbour) => {
    setBusy(true); setError("");
    try {
      router.push(`/chats/${await createDirectChatWith(neighbour.id, neighbour.name)}`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Не удалось открыть чат");
      setBusy(false);
    }
  };

  const toggle = (id: string) => setSelected((current) => {
    const next = new Set(current);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  });

  const createGroup = async () => {
    if (name.trim().length < 2) { setError("Название беседы — минимум 2 символа"); return; }
    setBusy(true); setError("");
    try {
      const chatId = await createGroupChat(name.trim(), [...selected]);
      await hydrateDomainData();
      router.push(`/chats/${chatId}`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Не удалось создать беседу");
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#fffefb]">
      <div className="glass-nav sticky top-16 z-20 space-y-3 border-b border-stone-200/80 px-4 py-4 md:top-0">
        <div className="flex items-center gap-3">
          <Link href="/chats" aria-label="Назад к чатам" className="grid h-9 w-9 place-items-center rounded-xl hover:bg-stone-100"><ArrowLeft className="h-5 w-5" /></Link>
          <h1 className="text-lg font-bold text-gray-900">{groupMode ? "Новая беседа" : "Новый чат"}</h1>
        </div>
        <div className="relative">
          <Search className="absolute left-3.5 top-3 h-4 w-4 text-gray-400" />
          <input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Поиск по соседям"
            className="w-full rounded-xl border border-gray-200 bg-gray-50 py-2.5 pl-10 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
        </div>
      </div>

      <div className="space-y-3 px-4 py-4">
        {groupMode ? (
          <div className="space-y-2 rounded-2xl border border-green-200 bg-green-50 p-3">
            <input value={name} onChange={(event) => setName(event.target.value)} maxLength={80} placeholder="Название беседы"
              className="w-full rounded-xl border border-green-200 bg-white px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
            <div className="flex gap-2">
              <button type="button" onClick={() => void createGroup()} disabled={busy}
                className="flex-1 rounded-xl bg-green-800 py-2.5 text-sm font-extrabold text-white hover:bg-green-900 disabled:opacity-60">
                {busy ? "Создаём…" : `Создать · участников ${selected.size + 1}`}
              </button>
              <button type="button" onClick={() => { setGroupMode(false); setSelected(new Set()); }} className="rounded-xl px-3 text-sm font-bold text-stone-600 hover:bg-white">Отмена</button>
            </div>
          </div>
        ) : (
          <button type="button" onClick={() => setGroupMode(true)}
            className="flex w-full items-center gap-3 rounded-2xl px-2 py-2 text-left hover:bg-stone-50">
            <span className="grid h-11 w-11 place-items-center rounded-2xl bg-green-100 text-green-800"><Users className="h-5 w-5" /></span>
            <span className="text-sm font-extrabold text-green-800">Создать беседу</span>
          </button>
        )}

        {error && <p role="alert" className="text-xs font-semibold text-rose-700">{error}</p>}

        <p className="px-2 text-[11px] font-bold uppercase tracking-wider text-stone-400">Соседи по ЖК</p>
        {neighbours === null ? (
          <p className="px-2 text-sm text-stone-500">Загружаем…</p>
        ) : visible.length === 0 ? (
          <p className="rounded-2xl bg-stone-50 p-3 text-xs text-stone-600">
            {neighbours.length === 0
              ? "Пока некому написать: подтверждённых соседей ещё нет. Беседу можно создать и без участников."
              : "Никого не нашли."}
          </p>
        ) : (
          <ul className="divide-y divide-stone-100">
            {visible.map((neighbour) => {
              const checked = selected.has(neighbour.id);
              return (
                <li key={neighbour.id}>
                  <button type="button" disabled={busy} aria-pressed={groupMode ? checked : undefined}
                    onClick={() => groupMode ? toggle(neighbour.id) : void openDirect(neighbour)}
                    className="flex w-full items-center gap-3 rounded-2xl px-2 py-2.5 text-left hover:bg-stone-50 disabled:opacity-60">
                    <Avatar url={neighbour.avatarUrl} name={neighbour.name} size={44} className="h-11 w-11 shrink-0 rounded-2xl" />
                    <span className="min-w-0 flex-1 truncate text-sm font-semibold text-stone-800">{neighbour.name}</span>
                    {groupMode && (
                      <span className={`grid h-5 w-5 place-items-center rounded-md border ${checked ? "border-green-700 bg-green-700 text-white" : "border-stone-300"}`}>
                        {checked && <Check className="h-3.5 w-3.5" />}
                      </span>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
