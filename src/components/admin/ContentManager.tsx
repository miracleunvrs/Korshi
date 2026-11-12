"use client";

import { FormEvent, useState } from "react";
import { CalendarDays, DoorOpen, PiggyBank, Vote } from "lucide-react";
import { useAppStore } from "@/stores/appStore";
import { createAmenityResource, createOfficialVote, createScheduleItem, saveBudgetItem } from "@/lib/supabase/repository";

type Section = "vote" | "schedule" | "resource" | "budget";
type Status = { tone: "ok" | "error"; text: string } | null;

const sections: Array<{ id: Section; label: string; icon: typeof Vote }> = [
  { id: "vote", label: "Голосование", icon: Vote },
  { id: "schedule", label: "Работы и отключения", icon: CalendarDays },
  { id: "resource", label: "Объект для брони", icon: DoorOpen },
  { id: "budget", label: "Статья бюджета", icon: PiggyBank },
];

/** Forms for content residents see but cannot create: votes, schedule, amenities, budget. */
export default function ContentManager() {
  const hydrateDomainData = useAppStore((state) => state.hydrateDomainData);
  const [section, setSection] = useState<Section>("vote");
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<Status>(null);

  const run = async (event: FormEvent<HTMLFormElement>, action: (form: FormData) => Promise<void>, done: string) => {
    event.preventDefault();
    const formElement = event.currentTarget;
    setBusy(true); setStatus(null);
    try {
      await action(new FormData(formElement));
      formElement.reset();
      setStatus({ tone: "ok", text: done });
      await hydrateDomainData().catch(() => undefined);
    } catch (cause) {
      setStatus({ tone: "error", text: cause instanceof Error ? cause.message : "Не удалось сохранить" });
    } finally {
      setBusy(false);
    }
  };
  const text = (form: FormData, key: string) => String(form.get(key) || "").trim();

  return (
    <div className="space-y-4 max-w-xl">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {sections.map(({ id, label, icon: Icon }) => (
          <button key={id} type="button" onClick={() => { setSection(id); setStatus(null); }} className={`flex min-h-16 flex-col items-center justify-center gap-1 rounded-2xl border text-[11px] font-bold ${section === id ? "border-green-700 bg-green-50 text-green-900" : "border-gray-200 bg-white text-gray-600"}`}>
            <Icon className="h-4 w-4" />{label}
          </button>
        ))}
      </div>

      {section === "vote" && (
        <form onSubmit={(event) => void run(event, (form) => createOfficialVote({
          title: text(form, "title"),
          description: text(form, "description"),
          basis: text(form, "basis") === "area" ? "area" : "owner",
          quorumPercent: Number(form.get("quorum")) || 51,
          startsAt: text(form, "startsAt"),
          endsAt: text(form, "endsAt"),
        }), "Голосование открыто, жители получили уведомление")} className="space-y-3 rounded-3xl border border-gray-200 bg-white p-5">
          <Field label="Вопрос голосования"><input name="title" required minLength={5} maxLength={200} className="field" placeholder="Утвердить смету ремонта крыши" /></Field>
          <Field label="Описание и материалы"><textarea name="description" required minLength={10} rows={4} className="field" /></Field>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Как считаются голоса"><select name="basis" className="field"><option value="owner">Одна квартира — один голос</option><option value="area">По площади квартир</option></select></Field>
            <Field label="Кворум, %"><input name="quorum" type="number" min={1} max={100} defaultValue={51} className="field" /></Field>
            <Field label="Начало"><input name="startsAt" type="datetime-local" required className="field" /></Field>
            <Field label="Окончание"><input name="endsAt" type="datetime-local" required className="field" /></Field>
          </div>
          <p className="text-[11px] text-gray-500">Число квартир и площадь для кворума берутся из реестра квартир ЖК.</p>
          <Submit busy={busy} label="Открыть голосование" />
        </form>
      )}

      {section === "schedule" && (
        <form onSubmit={(event) => void run(event, (form) => createScheduleItem({
          kind: (text(form, "kind") || "maintenance") as "cleaning" | "maintenance" | "outage" | "event",
          title: text(form, "title"),
          description: text(form, "description"),
          location: text(form, "location"),
          startsAt: text(form, "startsAt"),
          endsAt: text(form, "endsAt") || undefined,
        }), "Событие добавлено в календарь дома")} className="space-y-3 rounded-3xl border border-gray-200 bg-white p-5">
          <Field label="Тип"><select name="kind" className="field"><option value="outage">Отключение</option><option value="maintenance">Работы</option><option value="cleaning">Уборка</option><option value="event">Событие</option></select></Field>
          <Field label="Название"><input name="title" required minLength={3} maxLength={160} className="field" placeholder="Отключение горячей воды" /></Field>
          <Field label="Где"><input name="location" required className="field" placeholder="Дом 1, подъезды 1–2" /></Field>
          <Field label="Подробности"><textarea name="description" rows={3} className="field" /></Field>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Начало"><input name="startsAt" type="datetime-local" required className="field" /></Field>
            <Field label="Окончание (необязательно)"><input name="endsAt" type="datetime-local" className="field" /></Field>
          </div>
          <Submit busy={busy} label="Добавить в календарь" />
        </form>
      )}

      {section === "resource" && (
        <form onSubmit={(event) => void run(event, (form) => createAmenityResource({
          name: text(form, "name"),
          description: text(form, "description"),
          location: text(form, "location"),
          capacity: Number(form.get("capacity")) || undefined,
          price: Number(form.get("price")) || 0,
        }), "Объект доступен для бронирования")} className="space-y-3 rounded-3xl border border-gray-200 bg-white p-5">
          <Field label="Название"><input name="name" required className="field" placeholder="Комната для собраний" /></Field>
          <Field label="Где находится"><input name="location" required className="field" placeholder="Дом 2, 1 этаж" /></Field>
          <Field label="Описание и правила"><textarea name="description" rows={3} className="field" /></Field>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Вместимость (необязательно)"><input name="capacity" type="number" min={1} className="field" /></Field>
            <Field label="Стоимость, ₸"><input name="price" type="number" min={0} defaultValue={0} className="field" /></Field>
          </div>
          <Submit busy={busy} label="Добавить объект" />
        </form>
      )}

      {section === "budget" && (
        <form onSubmit={(event) => void run(event, (form) => saveBudgetItem({
          year: Number(form.get("year")) || new Date().getFullYear(),
          category: text(form, "category"),
          planned: Number(form.get("planned")) || 0,
          actual: Number(form.get("actual")) || 0,
        }), "Статья бюджета сохранена")} className="space-y-3 rounded-3xl border border-gray-200 bg-white p-5">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Год"><input name="year" type="number" min={2020} max={2200} defaultValue={new Date().getFullYear()} className="field" /></Field>
            <Field label="Статья"><input name="category" required className="field" placeholder="Уборка территории" /></Field>
            <Field label="План, ₸"><input name="planned" type="number" min={0} required className="field" /></Field>
            <Field label="Факт, ₸"><input name="actual" type="number" min={0} defaultValue={0} className="field" /></Field>
          </div>
          <p className="text-[11px] text-gray-500">Повторное сохранение статьи с тем же названием и годом обновит её.</p>
          <Submit busy={busy} label="Сохранить статью" />
        </form>
      )}

      {status && <p role={status.tone === "error" ? "alert" : "status"} className={`rounded-xl p-3 text-xs font-semibold ${status.tone === "error" ? "bg-red-50 text-red-700" : "bg-green-50 text-green-800"}`}>{status.text}</p>}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block text-xs font-bold text-gray-700">{label}{children}</label>;
}

function Submit({ busy, label }: { busy: boolean; label: string }) {
  return <button disabled={busy} className="w-full rounded-xl bg-green-800 py-3 text-xs font-extrabold text-white disabled:opacity-50">{busy ? "Сохраняем…" : label}</button>;
}
