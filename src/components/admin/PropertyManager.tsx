"use client";

import { FormEvent, useEffect, useState } from "react";
import { Building2, Car, Trash2 } from "lucide-react";
import {
  addParkingSpots, createBuilding, deleteParkingSpot, loadComplexBuildings, loadParkingSpots,
  type BuildingSummary, type ParkingSpotRow,
} from "@/lib/supabase/repository";

const KIND_LABELS: Record<ParkingSpotRow["kind"], string> = { guest: "Гостевое", resident: "Жильца", accessible: "Для МГН" };

/** Дома ЖК и парковочные места: то, что раньше заводилось только SQL-запросами. */
export default function PropertyManager() {
  const [buildings, setBuildings] = useState<BuildingSummary[]>([]);
  const [spots, setSpots] = useState<ParkingSpotRow[]>([]);
  const [version, setVersion] = useState(0);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);

  const [number, setNumber] = useState("");
  const [entrances, setEntrances] = useState("5");
  const [perEntrance, setPerEntrance] = useState("20");
  const [firstApartment, setFirstApartment] = useState("1");

  const [prefix, setPrefix] = useState("Г-");
  const [from, setFrom] = useState("1");
  const [to, setTo] = useState("10");
  const [zone, setZone] = useState("");
  const [kind, setKind] = useState<ParkingSpotRow["kind"]>("guest");

  useEffect(() => {
    const fail = (cause: unknown) => setError(cause instanceof Error ? cause.message : "Не удалось загрузить данные");
    void loadComplexBuildings().then(setBuildings).catch(fail);
    void loadParkingSpots().then(setSpots).catch(fail);
  }, [version]);

  const run = async (action: () => Promise<void>, done: string) => {
    setBusy(true); setError(""); setNotice("");
    try {
      await action();
      setNotice(done);
      setVersion((value) => value + 1);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Не удалось сохранить");
    } finally {
      setBusy(false);
    }
  };

  const submitBuilding = (event: FormEvent) => {
    event.preventDefault();
    const total = Number(entrances) * Number(perEntrance);
    void run(() => createBuilding(number.trim(), Number(entrances), Number(perEntrance), Number(firstApartment)),
      `Дом ${number.trim()} добавлен: ${entrances} подъездов, ${total} квартир`).then(() => setNumber(""));
  };

  const submitSpots = (event: FormEvent) => {
    event.preventDefault();
    if (!zone.trim() || Number(to) < Number(from) || Number(to) - Number(from) > 199) { setError("Укажите зону и диапазон до 200 мест"); return; }
    void run(() => addParkingSpots(prefix.trim(), Number(from), Number(to), zone.trim(), kind), "Места добавлены");
  };

  return (
    <div className="max-w-2xl space-y-4">
      {error && <p role="alert" className="rounded-xl bg-red-50 p-3 text-xs text-red-700">{error}</p>}
      {notice && <p role="status" className="rounded-xl bg-green-50 p-3 text-xs font-bold text-green-800">{notice}</p>}

      <section className="space-y-3 rounded-3xl border border-gray-200 bg-white p-5">
        <h2 className="flex items-center gap-2 text-sm font-bold text-gray-900"><Building2 className="h-4 w-4 text-green-700" />Дома ЖК</h2>
        {buildings.length > 0 && (
          <ul className="divide-y divide-gray-100 rounded-2xl border border-gray-100">
            {buildings.map((building) => (
              <li key={building.id} className="flex justify-between px-3 py-2 text-xs">
                <span className="font-bold text-gray-900">Дом {building.number}</span>
                <span className="text-gray-500">{building.entrances} подъездов · {building.apartments} квартир</span>
              </li>
            ))}
          </ul>
        )}
        <form onSubmit={submitBuilding} className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <label className="col-span-2 text-[11px] font-bold text-gray-600 sm:col-span-4">Номер или адрес дома<input required value={number} onChange={(event) => setNumber(event.target.value)} placeholder="Сатпаева 2" className="field mt-1" /></label>
          <label className="text-[11px] font-bold text-gray-600">Подъездов<input type="number" min={1} max={30} required value={entrances} onChange={(event) => setEntrances(event.target.value)} className="field mt-1" /></label>
          <label className="text-[11px] font-bold text-gray-600">Квартир в подъезде<input type="number" min={1} max={500} required value={perEntrance} onChange={(event) => setPerEntrance(event.target.value)} className="field mt-1" /></label>
          <label className="text-[11px] font-bold text-gray-600">Первая квартира<input type="number" min={1} required value={firstApartment} onChange={(event) => setFirstApartment(event.target.value)} className="field mt-1" /></label>
          <button disabled={busy} className="self-end rounded-xl bg-green-800 px-4 py-3 text-xs font-extrabold text-white disabled:opacity-50">Добавить дом</button>
        </form>
        <p className="text-[11px] text-gray-500">Квартиры нумеруются сквозь подъезды: при 20 квартирах в подъезде второй начнётся с 21-й.</p>
      </section>

      <section className="space-y-3 rounded-3xl border border-gray-200 bg-white p-5">
        <h2 className="flex items-center gap-2 text-sm font-bold text-gray-900"><Car className="h-4 w-4 text-green-700" />Парковочные места · {spots.length}</h2>
        <form onSubmit={submitSpots} className="grid grid-cols-2 gap-2 sm:grid-cols-5">
          <label className="text-[11px] font-bold text-gray-600">Префикс<input value={prefix} onChange={(event) => setPrefix(event.target.value)} className="field mt-1" /></label>
          <label className="text-[11px] font-bold text-gray-600">С номера<input type="number" min={1} value={from} onChange={(event) => setFrom(event.target.value)} className="field mt-1" /></label>
          <label className="text-[11px] font-bold text-gray-600">По номер<input type="number" min={1} value={to} onChange={(event) => setTo(event.target.value)} className="field mt-1" /></label>
          <label className="text-[11px] font-bold text-gray-600">Зона<input value={zone} onChange={(event) => setZone(event.target.value)} placeholder="Двор, въезд с Аль-Фараби" className="field mt-1" /></label>
          <label className="text-[11px] font-bold text-gray-600">Тип<select value={kind} onChange={(event) => setKind(event.target.value as ParkingSpotRow["kind"])} className="field mt-1">{Object.entries(KIND_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
          <button disabled={busy} className="col-span-2 rounded-xl bg-green-800 px-4 py-3 text-xs font-extrabold text-white disabled:opacity-50 sm:col-span-5">Добавить места</button>
        </form>
        {spots.length > 0 && (
          <ul className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {spots.map((spot) => (
              <li key={spot.id} className="flex items-center justify-between gap-1 rounded-xl bg-gray-50 px-3 py-2 text-xs">
                <span><span className="font-bold text-gray-900">{spot.label}</span><span className="block text-[10px] text-gray-500">{KIND_LABELS[spot.kind]} · {spot.zone}</span></span>
                <button type="button" aria-label={`Удалить место ${spot.label}`} disabled={busy} onClick={() => void run(() => deleteParkingSpot(spot.id), `Место ${spot.label} удалено`)} className="text-gray-400 hover:text-red-600"><Trash2 className="h-3.5 w-3.5" /></button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
