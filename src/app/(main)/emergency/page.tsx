"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  BadgeCheck,
  Building2,
  CheckCircle2,
  Clock3,
  MapPin,
  Phone,
  ShieldCheck,
  Radio,
  Send,
} from "lucide-react";
import { useAppStore } from "@/stores/appStore";
import { useOperationsStore } from "@/stores/operationsStore";
import { APP_CONFIG } from "@/lib/appConfig";
import { createClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/config";

type IncidentUpdate = { id: string; message: string; createdAt: string };
const UUID_RE = /^[0-9a-f]{8}-([0-9a-f]{4}-){3}[0-9a-f]{12}$/i;

const phoneHref = (phone: string) => `tel:${phone.replace(/[^+\d]/g, "")}`;

export default function EmergencyPage() {
  const alert = useAppStore((state) => state.urgentAlert);
  const managementPhone = useOperationsStore((state) => state.complexSettings.managementPhone);
  const contactPhone = alert?.contactPhone?.trim() || managementPhone.trim();
  const acknowledge = useAppStore((state) => state.acknowledgeUrgentAlert);
  const currentUser = useAppStore((state) => state.currentUser);
  const canManage = currentUser.role === "admin" || currentUser.role === "hoa_official" || currentUser.membershipRole === "dispatcher";
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [updates, setUpdates] = useState<IncidentUpdate[]>([]);
  const [updatesVersion, setUpdatesVersion] = useState(0);
  const [updateText, setUpdateText] = useState("");
  const alertId = alert?.active && UUID_RE.test(alert.id) ? alert.id : null;

  useEffect(() => {
    if (!alertId || !isSupabaseConfigured()) return;
    void (async () => {
      const { data, error: loadError } = await createClient().from("emergency_updates")
        .select("id, message, created_at").eq("alert_id", alertId).order("created_at", { ascending: false });
      if (loadError) return;
      setUpdates((data || []).map((row) => ({ id: row.id, message: row.message, createdAt: new Date(row.created_at).toLocaleString("ru-RU") })));
    })();
  }, [alertId, updatesVersion]);

  const publishUpdate = async (event: FormEvent) => {
    event.preventDefault();
    const message = updateText.trim();
    if (!message || !alertId) return;
    setBusy(true); setError("");
    try {
      const { error: insertError } = await createClient().from("emergency_updates").insert({ alert_id: alertId, message });
      if (insertError) throw insertError;
      setUpdateText("");
      setUpdatesVersion((version) => version + 1);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Не удалось опубликовать обновление"); } finally { setBusy(false); }
  };

  const confirm = async () => {
    setBusy(true); setError("");
    try { await acknowledge(); } catch (cause) { setError(cause instanceof Error ? cause.message : "Не удалось подтвердить ознакомление"); } finally { setBusy(false); }
  };

  return <div className="min-h-screen bg-[#f8f7f2]">
    <header className="border-b border-stone-200/80 px-4 py-5 sm:px-6 sm:py-7"><p className="text-xs font-extrabold uppercase tracking-[0.16em] text-rose-700">Безопасность дома</p><h1 className="mt-1 text-2xl font-black tracking-[-0.035em] text-stone-950 sm:text-3xl">Аварийный центр</h1><p className="mt-1 text-sm leading-6 text-stone-600">Проверенная информация, зона события и быстрые контакты.</p></header>
    <section className="space-y-4 px-4 py-5 sm:px-6">
      {alert?.active ? <>
        <section className="incident-pulse overflow-hidden rounded-[28px] bg-rose-600 p-5 text-white shadow-[0_18px_50px_rgba(225,29,72,.2)] sm:p-6"><div className="flex items-start gap-3"><span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-white/15"><AlertTriangle className="h-6 w-6" /></span><div><div className="flex flex-wrap items-center gap-2"><span className="rounded-full bg-white/20 px-2 py-1 text-[10px] font-black uppercase tracking-[0.1em]">Активный инцидент</span><span className="text-[11px] font-semibold text-rose-100">{alert.createdAt}</span></div><h2 className="mt-3 text-xl font-black tracking-tight sm:text-2xl">{alert.title}</h2><p className="mt-2 max-w-xl text-sm leading-6 text-rose-50">{alert.message}</p><p className="mt-4 flex items-center gap-2 text-[11px] font-bold text-rose-100"><Radio className="h-4 w-4 animate-pulse" />Обновления появляются ниже и в центре уведомлений</p></div></div></section>

        <section className="grid gap-3 sm:grid-cols-2"><div className="rounded-[22px] border border-stone-200 bg-white p-4"><span className="grid h-10 w-10 place-items-center rounded-xl bg-rose-50 text-rose-700"><MapPin className="h-5 w-5" /></span><p className="mt-3 text-xs font-extrabold uppercase tracking-[0.1em] text-stone-400">Затронутые зоны</p><div className="mt-2 flex flex-wrap gap-2">{(alert.affectedAreas.length ? alert.affectedAreas : ["Весь жилой комплекс"]).map((area) => <span key={area} className="rounded-full bg-stone-100 px-3 py-1.5 text-xs font-bold text-stone-700">{area}</span>)}</div></div><div className="rounded-[22px] border border-stone-200 bg-white p-4"><span className="grid h-10 w-10 place-items-center rounded-xl bg-amber-50 text-amber-800"><Clock3 className="h-5 w-5" /></span><p className="mt-3 text-xs font-extrabold uppercase tracking-[0.1em] text-stone-400">Ожидаемое восстановление</p><p className="mt-2 text-sm font-black text-stone-900">{alert.expectedResolution || "Время уточняется"}</p></div></section>


        <section className="rounded-[24px] border border-stone-200 bg-white p-5">
          <h2 className="text-sm font-extrabold text-stone-950">Хронология обновлений</h2>
          <ol className="mt-4 space-y-4">
            {updates.map((update) => <li key={update.id} className="flex gap-3"><span className="mt-1 h-3 w-3 shrink-0 rounded-full bg-amber-500 ring-4 ring-amber-100" /><div><p className="text-sm font-extrabold text-stone-900">{update.message}</p><p className="text-xs text-stone-500">{update.createdAt}</p></div></li>)}
            <li className="flex gap-3"><span className="mt-1 h-3 w-3 shrink-0 rounded-full bg-rose-500 ring-4 ring-rose-100" /><div><p className="text-sm font-extrabold text-stone-900">ОСИ опубликовало сообщение об аварии</p><p className="text-xs text-stone-500">{alert.createdAt}</p></div></li>
          </ol>
          {canManage && alertId && <form onSubmit={publishUpdate} className="mt-4 flex gap-2"><input value={updateText} onChange={(event) => setUpdateText(event.target.value)} placeholder="Новое обновление для жителей" className="min-h-11 flex-1 rounded-xl border border-stone-200 px-3 text-sm" /><button disabled={busy || !updateText.trim()} className="grid h-11 w-11 place-items-center rounded-xl bg-rose-600 text-white disabled:opacity-50" aria-label="Опубликовать обновление"><Send className="h-4 w-4" /></button></form>}
        </section>

        {!alert.acknowledged ? <button disabled={busy} onClick={() => void confirm()} className="flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-green-800 text-sm font-extrabold text-white hover:bg-green-900 disabled:opacity-50"><ShieldCheck className="h-5 w-5" />{busy ? "Сохраняем…" : "Я ознакомился"}</button> : <div className="flex items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-extrabold text-emerald-900"><BadgeCheck className="h-5 w-5" />Вы подтвердили ознакомление</div>}
      </> : <><section className="rounded-[28px] border border-emerald-200 bg-emerald-50 px-6 py-14 text-center"><CheckCircle2 className="mx-auto h-12 w-12 text-emerald-700" /><h2 className="mt-4 text-xl font-black text-emerald-950">В доме всё спокойно</h2><p className="mt-2 text-sm text-emerald-800">Активных аварийных событий нет.</p><Link href="/requests?create=1" className="mt-5 inline-flex min-h-11 items-center rounded-xl bg-emerald-800 px-4 text-xs font-extrabold text-white">Сообщить о проблеме</Link></section></>}

      <section className="rounded-[24px] border border-stone-200 bg-white p-5"><h2 className="font-extrabold text-stone-950">Экстренные контакты</h2><div className="mt-4 grid gap-2 sm:grid-cols-3"><a href="tel:112" className="flex min-h-16 items-center gap-3 rounded-2xl bg-rose-50 p-3 text-rose-900"><span className="grid h-10 w-10 place-items-center rounded-xl bg-rose-600 text-white"><Phone className="h-4 w-4" /></span><span><span className="block text-sm font-black">112</span><span className="block text-[11px]">Угроза жизни</span></span></a><a href={phoneHref(APP_CONFIG.emergencyPhone)} className="flex min-h-16 items-center gap-3 rounded-2xl bg-amber-50 p-3 text-amber-950"><span className="grid h-10 w-10 place-items-center rounded-xl bg-amber-500 text-white"><Building2 className="h-4 w-4" /></span><span><span className="block text-sm font-black">{APP_CONFIG.emergencyPhone}</span><span className="block text-[11px]">Городская служба</span></span></a>{contactPhone ? <a href={phoneHref(contactPhone)} className="flex min-h-16 items-center gap-3 rounded-2xl bg-green-50 p-3 text-green-950"><span className="grid h-10 w-10 place-items-center rounded-xl bg-green-800 text-white"><Phone className="h-4 w-4" /></span><span><span className="block text-sm font-black">Диспетчерская</span><span className="block text-[11px]">Связаться с ОСИ</span></span></a> : <p className="rounded-2xl bg-stone-50 p-3 text-sm text-stone-600">Контакт управления ЖК пока не указан.</p>}</div></section>
      {error && <p role="alert" className="rounded-2xl bg-rose-50 p-3 text-xs font-bold text-rose-800">{error}</p>}
    </section>
  </div>;
}
