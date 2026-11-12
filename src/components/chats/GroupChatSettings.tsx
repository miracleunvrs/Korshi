"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Settings2, X } from "lucide-react";
import { useAppStore } from "@/stores/appStore";
import { loadGroupMembers, loadNeighbours, manageGroupChat, type GroupMember, type Neighbour } from "@/lib/supabase/repository";

/** Настройки беседы: участники, название, выход и удаление. */
export default function GroupChatSettings({ chatId, name }: { chatId: string; name: string }) {
  const router = useRouter();
  const hydrateDomainData = useAppStore((state) => state.hydrateDomainData);
  const currentUserId = useAppStore((state) => state.currentUser.id);
  const [open, setOpen] = useState(false);
  const [members, setMembers] = useState<GroupMember[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [neighbours, setNeighbours] = useState<Neighbour[]>([]);
  const [title, setTitle] = useState(name);
  const [version, setVersion] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    const fail = (cause: unknown) => setError(cause instanceof Error ? cause.message : "Не удалось загрузить участников");
    void loadGroupMembers(chatId).then((result) => { setMembers(result.members); setIsAdmin(result.isAdmin); }).catch(fail);
    void loadNeighbours().then(setNeighbours).catch(fail);
  }, [open, chatId, version]);

  const run = async (action: Parameters<typeof manageGroupChat>[1], options: Parameters<typeof manageGroupChat>[2] = {}) => {
    setBusy(true); setError("");
    try {
      await manageGroupChat(chatId, action, options);
      await hydrateDomainData();
      if (action === "leave" || action === "delete") { router.push("/chats"); return; }
      setVersion((value) => value + 1);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Не удалось выполнить действие");
    } finally {
      setBusy(false);
    }
  };

  const memberIds = new Set(members.map((member) => member.id));
  const candidates = neighbours.filter((neighbour) => !memberIds.has(neighbour.id));

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} aria-label="Настройки беседы" className="grid h-9 w-9 place-items-center rounded-xl text-gray-600 hover:bg-gray-100">
        <Settings2 className="h-5 w-5" />
      </button>
      {open && (
        <div className="fixed inset-0 z-[80] flex items-end justify-center bg-stone-950/45 sm:items-center sm:p-6" role="dialog" aria-modal="true" aria-label="Настройки беседы">
          <div className="max-h-[85vh] w-full max-w-md overflow-y-auto rounded-t-[28px] bg-white p-5 sm:rounded-[28px]">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-black text-stone-950">Беседа</h2>
              <button type="button" onClick={() => setOpen(false)} aria-label="Закрыть" className="grid h-10 w-10 place-items-center rounded-xl bg-stone-100"><X className="h-5 w-5" /></button>
            </div>
            {error && <p role="alert" className="mt-3 rounded-xl bg-rose-50 p-3 text-xs font-bold text-rose-800">{error}</p>}

            {isAdmin && (
              <form onSubmit={(event) => { event.preventDefault(); void run("rename", { name: title.trim() }); }} className="mt-4 flex gap-2">
                <input value={title} onChange={(event) => setTitle(event.target.value)} maxLength={80} aria-label="Название беседы" className="min-h-11 min-w-0 flex-1 rounded-xl border border-stone-200 px-3 text-sm" />
                <button disabled={busy} className="rounded-xl bg-green-800 px-4 text-xs font-extrabold text-white disabled:opacity-50">Сохранить</button>
              </form>
            )}

            <p className="mt-5 text-[11px] font-bold uppercase tracking-wider text-stone-400">Участники · {members.length}</p>
            <ul className="mt-2 divide-y divide-stone-100">
              {members.map((member) => (
                <li key={member.id} className="flex items-center justify-between py-2 text-sm">
                  <span className="font-semibold text-stone-800">{member.name}{member.isAdmin && <span className="ml-2 text-[10px] font-bold text-green-800">админ</span>}</span>
                  {isAdmin && member.id !== currentUserId && (
                    <button type="button" disabled={busy} onClick={() => void run("remove", { memberIds: [member.id] })} className="text-xs font-bold text-rose-700">Убрать</button>
                  )}
                </li>
              ))}
            </ul>

            {isAdmin && candidates.length > 0 && (
              <>
                <p className="mt-5 text-[11px] font-bold uppercase tracking-wider text-stone-400">Добавить соседей</p>
                <ul className="mt-2 divide-y divide-stone-100">
                  {candidates.map((neighbour) => (
                    <li key={neighbour.id} className="flex items-center justify-between py-2 text-sm">
                      <span className="text-stone-800">{neighbour.name}</span>
                      <button type="button" disabled={busy} onClick={() => void run("add", { memberIds: [neighbour.id] })} className="text-xs font-bold text-green-800">Добавить</button>
                    </li>
                  ))}
                </ul>
              </>
            )}

            <div className="mt-6 space-y-2">
              <button type="button" disabled={busy} onClick={() => void run("leave")} className="w-full rounded-2xl bg-stone-100 py-3 text-sm font-bold text-stone-800">Выйти из беседы</button>
              {isAdmin && <button type="button" disabled={busy} onClick={() => { if (window.confirm("Удалить беседу для всех участников?")) void run("delete"); }} className="w-full rounded-2xl bg-rose-50 py-3 text-sm font-bold text-rose-700">Удалить беседу</button>}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
