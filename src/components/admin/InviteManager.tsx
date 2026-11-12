"use client";

import { useEffect, useState } from "react";
import { KeyRound } from "lucide-react";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createApartmentInvite, loadApartmentInvites, loadComplexApartments, type ApartmentInvite, type ApartmentOption } from "@/lib/supabase/repository";

/** One-time codes the HOA hands to an apartment so its residents get access without paperwork. */
export default function InviteManager() {
  const [apartments, setApartments] = useState<ApartmentOption[]>([]);
  const [invites, setInvites] = useState<ApartmentInvite[]>([]);
  const [version, setVersion] = useState(0);
  const [apartmentId, setApartmentId] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [issued, setIssued] = useState<{ code: string; apartment: string } | null>(null);

  useEffect(() => {
    if (!isSupabaseConfigured()) return;
    void loadComplexApartments().then(setApartments).catch((cause) => setError(cause instanceof Error ? cause.message : "Не удалось загрузить квартиры"));
  }, []);

  useEffect(() => {
    if (!isSupabaseConfigured()) return;
    void loadApartmentInvites().then(setInvites).catch((cause) => setError(cause instanceof Error ? cause.message : "Не удалось загрузить выданные коды"));
  }, [version]);

  const issue = async () => {
    if (!apartmentId) return;
    setBusy(true); setError(""); setIssued(null);
    try {
      const code = await createApartmentInvite(apartmentId);
      if (code) setIssued({ code, apartment: apartments.find((item) => item.id === apartmentId)?.label || "" });
      setVersion((value) => value + 1);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Не удалось выдать код");
    } finally {
      setBusy(false);
    }
  };

  if (!isSupabaseConfigured()) return <p className="rounded-3xl bg-gray-50 p-8 text-center text-xs text-gray-500">Коды доступны при подключённом сервере.</p>;

  return (
    <div className="space-y-4 max-w-xl">
      <div className="rounded-3xl border border-gray-200 bg-white p-5 space-y-3">
        <h2 className="flex items-center gap-2 text-sm font-bold text-gray-900"><KeyRound className="h-4 w-4 text-green-700" />Код для квартиры</h2>
        <p className="text-xs leading-5 text-gray-500">Передайте код жителю лично или положите в почтовый ящик квартиры. Житель вводит его на странице подтверждения и сразу получает доступ. Код одноразовый и действует 30 дней.</p>
        <div className="flex flex-col gap-2 sm:flex-row">
          <select value={apartmentId} onChange={(event) => setApartmentId(event.target.value)} className="field flex-1" aria-label="Квартира">
            <option value="">Выберите квартиру</option>
            {apartments.map((apartment) => <option key={apartment.id} value={apartment.id}>{apartment.label}</option>)}
          </select>
          <button type="button" disabled={busy || !apartmentId} onClick={() => void issue()} className="rounded-xl bg-green-800 px-4 py-3 text-xs font-extrabold text-white disabled:opacity-50">Выдать код</button>
        </div>
        {issued && <div className="rounded-2xl bg-green-50 p-4 text-center"><p className="text-xs text-green-800">{issued.apartment}</p><p className="mt-1 font-mono text-2xl font-black tracking-[0.2em] text-green-950">{issued.code}</p></div>}
        {error && <p role="alert" className="rounded-xl bg-red-50 p-3 text-xs text-red-700">{error}</p>}
      </div>

      {invites.length > 0 && (
        <div className="divide-y divide-gray-100 rounded-3xl border border-gray-200 bg-white">
          {invites.map((invite) => (
            <div key={invite.id} className="flex items-center justify-between gap-3 p-4">
              <div>
                <p className="text-xs font-bold text-gray-900">{invite.apartment}</p>
                <p className="text-[11px] text-gray-500">Выдан {invite.createdAt} · до {invite.expiresAt}</p>
              </div>
              <div className="text-right">
                <p className={`font-mono text-sm font-bold ${invite.used ? "text-gray-400 line-through" : "text-gray-900"}`}>{invite.code}</p>
                <p className="text-[10px] text-gray-500">{invite.used ? "Использован" : "Не использован"}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
