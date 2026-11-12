"use client";

import Link from "next/link";
import { FormEvent, useMemo, useState } from "react";
import {
  CalendarDays,
  Car,
  CheckCircle2,
  Clock3,
  DoorOpen,
  Dumbbell,
  LoaderCircle,
  MapPin,
  Plus,
  Sparkles,
  Users,
  Wrench,
  X,
  Zap,
} from "lucide-react";
import { useAppStore } from "@/stores/appStore";

type Tab = "schedule" | "booking" | "vehicles";
const kindMeta = {
  cleaning: { label: "Уборка", icon: Sparkles, tone: "bg-green-100 text-green-800" },
  maintenance: { label: "Работы", icon: Wrench, tone: "bg-violet-100 text-violet-800" },
  outage: { label: "Отключение", icon: Zap, tone: "bg-amber-100 text-amber-900" },
  event: { label: "Событие", icon: Users, tone: "bg-sky-100 text-sky-800" },
};

export default function ServicesPage() {
  const schedule = useAppStore((state) => state.scheduleItems);
  const resources = useAppStore((state) => state.amenityResources);
  const bookings = useAppStore((state) => state.amenityBookings);
  const vehicles = useAppStore((state) => state.residentVehicles);
  const createBooking = useAppStore((state) => state.createAmenityBooking);
  const addVehicle = useAppStore((state) => state.addResidentVehicle);
  const [tab, setTab] = useState<Tab>("schedule");
  const [dialog, setDialog] = useState<"booking" | "vehicle" | null>(null);
  const [resourceId, setResourceId] = useState(resources[0]?.id || "");
  const [startsAt, setStartsAt] = useState("");
  const [endsAt, setEndsAt] = useState("");
  const [vehiclePlate, setVehiclePlate] = useState("");
  const [vehicleLabel, setVehicleLabel] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const bookingResources = useMemo(() => new Map(resources.map((resource) => [resource.id, resource])), [resources]);

  const run = async (action: () => Promise<void>, nextTab: Tab) => {
    setBusy(true); setError("");
    try { await action(); setDialog(null); setTab(nextTab); } catch (cause) { setError(cause instanceof Error ? cause.message : "Не удалось сохранить"); } finally { setBusy(false); }
  };

  const submitBooking = (event: FormEvent) => {
    event.preventDefault();
    if (!resourceId || !startsAt || !endsAt || new Date(endsAt) <= new Date(startsAt)) { setError("Выберите объект и корректное время."); return; }
    void run(() => createBooking(resourceId, startsAt, endsAt), "booking");
  };
  const submitVehicle = (event: FormEvent) => {
    event.preventDefault();
    if (vehiclePlate.trim().length < 4) { setError("Введите государственный номер."); return; }
    void run(() => addVehicle(vehiclePlate.trim().toUpperCase(), vehicleLabel.trim() || "Автомобиль"), "vehicles");
  };

  return <div className="min-h-screen bg-[#f8f7f2]">
    <header className="border-b border-stone-200/80 px-4 py-5 sm:px-6 sm:py-7"><p className="text-xs font-extrabold uppercase tracking-[0.16em] text-green-800">Повседневные сервисы</p><h1 className="mt-1 text-2xl font-black tracking-[-0.035em] text-stone-950 sm:text-3xl">Сервисы дома</h1><p className="mt-1 text-sm leading-6 text-stone-600">Работы, бронирования и автомобили. Гостевые пропуска — в разделе <Link href="/operations" className="font-bold text-green-800 underline">«Доступ и парковка»</Link>.</p><div className="mt-5 grid grid-cols-3 gap-1 rounded-2xl bg-stone-200/65 p-1" role="tablist">{([
      ["schedule", "Календарь", CalendarDays], ["booking", "Бронь", DoorOpen], ["vehicles", "Авто", Car],
    ] as const).map(([id, label, Icon]) => <button key={id} role="tab" aria-selected={tab === id} onClick={() => setTab(id)} className={`flex min-h-12 flex-col items-center justify-center gap-1 rounded-xl px-1 text-[10px] font-extrabold transition sm:flex-row sm:text-xs ${tab === id ? "bg-white text-stone-950 shadow-sm" : "text-stone-500"}`}><Icon className="h-4 w-4" />{label}</button>)}</div></header>

    <section className="space-y-3 px-4 py-5 sm:px-6">
      {tab === "schedule" && <>{schedule.map((item, index) => { const meta = kindMeta[item.kind]; const Icon = meta.icon; return <article key={item.id} className="reveal-up flex items-start gap-3 rounded-[22px] border border-stone-200 bg-white p-4" style={{ animationDelay: `${index * 50}ms` }}><span className={`grid h-11 w-11 shrink-0 place-items-center rounded-2xl ${meta.tone}`}><Icon className="h-5 w-5" /></span><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center justify-between gap-2"><span className="text-[10px] font-extrabold uppercase tracking-[0.1em] text-stone-400">{meta.label}</span><span className="rounded-full bg-stone-100 px-2 py-1 text-[10px] font-bold text-stone-600">Запланировано</span></div><h2 className="mt-1 text-sm font-extrabold text-stone-950">{item.title}</h2><p className="mt-1 text-xs leading-5 text-stone-600">{item.description}</p><div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[11px] font-semibold text-stone-500"><span className="inline-flex items-center gap-1"><Clock3 className="h-3.5 w-3.5" />{item.startsAt}{item.endsAt ? ` — ${item.endsAt}` : ""}</span><span className="inline-flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{item.location}</span></div></div></article>; })}</>}

      {tab === "booking" && <><button onClick={() => { setError(""); setDialog("booking"); }} className="flex min-h-14 w-full items-center justify-center gap-2 rounded-2xl bg-green-800 text-sm font-extrabold text-white hover:bg-green-900"><Plus className="h-4 w-4" />Новое бронирование</button><section className="grid gap-3 sm:grid-cols-2">{resources.map((resource) => <div key={resource.id} className="rounded-[22px] border border-stone-200 bg-white p-4"><span className="grid h-11 w-11 place-items-center rounded-2xl bg-violet-100 text-violet-800"><Dumbbell className="h-5 w-5" /></span><div className="mt-3 flex items-center justify-between gap-2"><h2 className="text-sm font-extrabold text-stone-950">{resource.name}</h2>{resource.requiresApproval && <span className="rounded-full bg-amber-100 px-2 py-1 text-[9px] font-extrabold text-amber-900">Подтверждает ОСИ</span>}</div><p className="mt-1 text-xs leading-5 text-stone-600">{resource.description}</p><p className="mt-2 text-[11px] font-bold text-stone-500">{resource.location}{resource.capacity ? ` · до ${resource.capacity} человек` : ""}</p>{resource.rules && <p className="mt-2 rounded-xl bg-stone-50 p-2 text-[10px] leading-4 text-stone-600">Правила: {resource.rules}</p>}<p className="mt-3 text-sm font-black text-green-800">{resource.price ? `${resource.price.toLocaleString("ru-RU")} ₸` : "Бесплатно"}</p></div>)}</section>{bookings.length > 0 && <section className="rounded-[22px] border border-emerald-200 bg-emerald-50 p-4"><h2 className="text-xs font-extrabold uppercase tracking-[0.1em] text-emerald-800">Мои бронирования</h2>{bookings.map((booking) => <div key={booking.id} className="mt-3 flex items-center gap-3"><CheckCircle2 className="h-5 w-5 text-emerald-700" /><div><p className="text-sm font-extrabold text-emerald-950">{bookingResources.get(booking.resourceId)?.name || "Объект ЖК"}</p><p className="text-xs text-emerald-800">{booking.startsAt} — {booking.endsAt}</p><p className="mt-1 text-[10px] font-bold text-emerald-700">Напоминание включено · {bookingResources.get(booking.resourceId)?.price ? "оплата после подтверждения" : "без оплаты"}</p></div></div>)}</section>}</>}


      {tab === "vehicles" && <><button onClick={() => { setError(""); setDialog("vehicle"); }} className="flex min-h-14 w-full items-center justify-center gap-2 rounded-2xl bg-stone-900 text-sm font-extrabold text-white hover:bg-stone-800"><Plus className="h-4 w-4" />Добавить автомобиль</button>{vehicles.map((vehicle) => <article key={vehicle.id} className="flex items-center gap-4 rounded-[22px] border border-stone-200 bg-white p-4"><span className="grid h-12 w-12 place-items-center rounded-2xl bg-stone-100 text-stone-800"><Car className="h-5 w-5" /></span><div><p className="text-base font-black tracking-wide text-stone-950">{vehicle.plate}</p><p className="text-xs text-stone-500">{vehicle.label}</p></div></article>)}</>}
    </section>

    {dialog && <div className="fixed inset-0 z-[80] flex items-end justify-center bg-stone-950/45 backdrop-blur-sm sm:items-center sm:p-6" role="dialog" aria-modal="true"><form onSubmit={dialog === "booking" ? submitBooking : submitVehicle} className="sheet-enter w-full max-w-lg rounded-t-[30px] bg-white p-5 shadow-2xl sm:rounded-[30px] sm:p-6"><div className="flex items-start justify-between"><div><p className="text-xs font-extrabold uppercase tracking-[0.14em] text-green-800">Сервисы дома</p><h2 className="mt-1 text-xl font-black text-stone-950">{dialog === "booking" ? "Новое бронирование" : "Добавить автомобиль"}</h2></div><button type="button" onClick={() => setDialog(null)} className="grid h-11 w-11 place-items-center rounded-2xl bg-stone-100" aria-label="Закрыть"><X className="h-5 w-5" /></button></div>
      {dialog === "booking" && <div className="mt-5 space-y-4"><label className="block text-sm font-extrabold text-stone-900">Объект<select value={resourceId} onChange={(event) => setResourceId(event.target.value)} className="mt-2 min-h-12 w-full rounded-2xl border border-stone-200 bg-white px-4 text-sm"><option value="">Выберите объект</option>{resources.map((resource) => <option key={resource.id} value={resource.id}>{resource.name}</option>)}</select></label><label className="block text-sm font-extrabold text-stone-900">Начало<input type="datetime-local" value={startsAt} onChange={(event) => setStartsAt(event.target.value)} className="mt-2 min-h-12 w-full rounded-2xl border border-stone-200 px-4 text-sm" /></label><label className="block text-sm font-extrabold text-stone-900">Окончание<input type="datetime-local" value={endsAt} onChange={(event) => setEndsAt(event.target.value)} className="mt-2 min-h-12 w-full rounded-2xl border border-stone-200 px-4 text-sm" /></label></div>}
      {dialog === "vehicle" && <div className="mt-5 space-y-4"><label className="block text-sm font-extrabold text-stone-900">Государственный номер<input value={vehiclePlate} onChange={(event) => setVehiclePlate(event.target.value)} placeholder="777 ABC 02" className="mt-2 min-h-12 w-full rounded-2xl border border-stone-200 px-4 text-sm uppercase" /></label><label className="block text-sm font-extrabold text-stone-900">Описание<input value={vehicleLabel} onChange={(event) => setVehicleLabel(event.target.value)} placeholder="Белая Toyota" className="mt-2 min-h-12 w-full rounded-2xl border border-stone-200 px-4 text-sm" /></label></div>}
      {error && <p role="alert" className="mt-4 rounded-2xl bg-rose-50 p-3 text-xs font-bold text-rose-800">{error}</p>}<button disabled={busy} className="mt-5 flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-green-800 text-sm font-extrabold text-white hover:bg-green-900 disabled:opacity-50">{busy && <LoaderCircle className="h-4 w-4 animate-spin" />}{dialog === "booking" ? "Забронировать" : "Сохранить автомобиль"}</button></form></div>}
  </div>;
}
