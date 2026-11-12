"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { ArrowLeft, CheckCircle2, LoaderCircle, Phone, Save, Settings2, ShieldCheck } from "lucide-react";
import { useAppStore } from "@/stores/appStore";
import { useOperationsStore, type ComplexSettings } from "@/stores/operationsStore";

export default function ComplexSettingsPage() {
  const currentUser = useAppStore((state) => state.currentUser);
  const saved = useOperationsStore((state) => state.complexSettings);

  if (!["admin", "hoa_official"].includes(currentUser.role)) return <div className="grid min-h-screen place-items-center p-6 text-center"><div><ShieldCheck className="mx-auto h-10 w-10 text-stone-300" /><p className="mt-3 text-sm font-bold">Доступ только для управления ЖК</p><Link href="/feed" className="mt-4 inline-block text-sm font-bold text-green-800">Вернуться</Link></div></div>;

  return <div className="min-h-screen bg-[#f8f7f2] pb-10">
    <header className="border-b border-stone-200/80 px-4 py-5 sm:px-6">
      <Link href="/admin" className="inline-flex min-h-10 items-center gap-2 text-xs font-extrabold text-stone-600"><ArrowLeft className="h-4 w-4" />Назад в управление</Link>
      <div className="mt-3 flex items-center gap-3"><span className="grid h-12 w-12 place-items-center rounded-2xl bg-green-800 text-white"><Settings2 className="h-5 w-5" /></span><div><h1 className="text-2xl font-black tracking-[-0.035em] text-stone-950">Настройки ЖК</h1><p className="text-sm text-stone-600">Контакты управления и правила дома, которые видят жители.</p></div></div>
    </header>
    {/* Форма пересоздаётся, когда настройки загрузились с сервера: иначе сохранение
        до загрузки затёрло бы их пустыми значениями. */}
    <SettingsForm key={JSON.stringify(saved)} saved={saved} />
  </div>;
}

function SettingsForm({ saved }: { saved: ComplexSettings }) {
  const update = useOperationsStore((state) => state.updateComplexSettings);
  const [form, setForm] = useState<ComplexSettings>(saved);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<{ tone: "ok" | "error"; text: string } | null>(null);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true); setStatus(null);
    try {
      await update(form);
      setStatus({ tone: "ok", text: "Настройки сохранены" });
    } catch (cause) {
      setStatus({ tone: "error", text: cause instanceof Error ? cause.message : "Не удалось сохранить настройки" });
    } finally {
      setBusy(false);
    }
  };

  return <main className="space-y-4 px-4 py-5 sm:px-6"><form onSubmit={(event) => void submit(event)} className="space-y-4">
    <section className="rounded-[28px] border border-stone-200 bg-white p-5">
      <h2 className="flex items-center gap-2 text-sm font-black"><Phone className="h-4 w-4 text-green-800" />Контакты управления</h2>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <Field label="Телефон управления"><input className="field" value={form.managementPhone} onChange={(e) => setForm({ ...form, managementPhone: e.target.value })} placeholder="+7 ..." /></Field>
        <Field label="Email управления"><input className="field" type="email" value={form.managementEmail} onChange={(e) => setForm({ ...form, managementEmail: e.target.value })} /></Field>
      </div>
    </section>
    <section className="rounded-[28px] border border-stone-200 bg-white p-5">
      <Field label="Правила дома"><textarea rows={6} className="field" value={form.houseRules} onChange={(e) => setForm({ ...form, houseRules: e.target.value })} placeholder="Тишина с 23:00 до 7:00, вывоз мусора, парковка…" /></Field>
    </section>
    <button disabled={busy} className="flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-green-800 text-sm font-extrabold text-white disabled:opacity-50">{busy ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}Сохранить настройки</button>
    {status && <p role={status.tone === "error" ? "alert" : "status"} className={`flex items-center justify-center gap-2 rounded-2xl p-3 text-sm font-bold ${status.tone === "error" ? "bg-rose-50 text-rose-800" : "bg-emerald-50 text-emerald-900"}`}>{status.tone === "ok" && <CheckCircle2 className="h-4 w-4" />}{status.text}</p>}
  </form></main>;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) { return <label className="block text-xs font-extrabold text-stone-800">{label}{children}</label>; }
