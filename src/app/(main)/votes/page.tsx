"use client";

import { useMemo, useState } from "react";
import {
  BadgeCheck,
  CalendarClock,
  Check,
  Download,
  FileSignature,
  LoaderCircle,
  LockKeyhole,
  Scale,
  Users,
  Vote,
} from "lucide-react";
import { useAppStore, type OfficialVoteChoice, type OfficialVoteItem } from "@/stores/appStore";
import { useOperationsStore } from "@/stores/operationsStore";
import { activeVotes, dateTimeLabel } from "@/features/dashboard/summary";
import Link from "next/link";

const choices: Array<{ id: OfficialVoteChoice; label: string }> = [
  { id: "yes", label: "За" },
  { id: "no", label: "Против" },
  { id: "abstain", label: "Воздержаться" },
];

function VoteCard({ vote }: { vote: OfficialVoteItem }) {
  const castVote = useAppStore((state) => state.castOfficialVote);
  const isOwner = useOperationsStore((state) => state.memberships.some((membership) => membership.isActive && membership.role === "owner"));
  const [selected, setSelected] = useState<OfficialVoteChoice | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const totalWeight = vote.results.yes + vote.results.no + vote.results.abstain;
  const resultUnit = vote.basis === "area" ? "м²" : "голосов";
  const quorumReached = vote.participationPercent >= vote.quorumPercent;
  const showResults = Boolean(vote.userChoice) || vote.status === "completed";

  const submit = async () => {
    if (!selected || vote.userChoice || !isOwner) return;
    setBusy(true); setError("");
    try { await castVote(vote.id, selected); } catch (cause) { setError(cause instanceof Error ? cause.message : "Не удалось зарегистрировать голос"); } finally { setBusy(false); }
  };

  const exportCsv = () => {
    const lines = [["Вариант", "Вес"], ...choices.map((choice) => [choice.label, String(vote.results[choice.id])])];
    const blob = new Blob(["\uFEFF" + lines.map((row) => row.map((cell) => `"${cell.replaceAll('"', '""')}"`).join(";")).join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob); const anchor = document.createElement("a"); anchor.href = url; anchor.download = `korshi-vote-${vote.id}.csv`; anchor.click(); URL.revokeObjectURL(url);
  };

  const printProtocol = () => {
    // С noopener window.open всегда возвращает null, и документ некуда записать.
    const popup = window.open("", "_blank");
    const escapeHtml = (value: string) => value.replace(/[&<>"']/g, (char) => `&#${char.charCodeAt(0)};`);
    if (!popup) return setError("Разрешите всплывающие окна для формирования протокола");
    popup.document.write(`<!doctype html><html lang="ru"><head><meta charset="utf-8"><title>Протокол — ${escapeHtml(vote.title)}</title><style>body{font:14px Arial;max-width:760px;margin:48px auto;line-height:1.5}h1{font-size:24px}.meta{color:#666}.result{display:grid;grid-template-columns:1fr auto;padding:10px 0;border-bottom:1px solid #ddd}.sign{margin-top:64px;border-top:1px solid #222;padding-top:10px}</style></head><body><p class="meta">Korshi · проект протокола</p><h1>${escapeHtml(vote.title)}</h1><p>${escapeHtml(vote.description)}</p><p class="meta">Период: ${dateTimeLabel(vote.startsAt)} — ${dateTimeLabel(vote.endsAt)}<br>Основа: ${vote.basis === "area" ? "по площади" : "одна квартира — один голос"}<br>Кворум: ${vote.participationPercent}% при требовании ${vote.quorumPercent}%</p>${choices.map((choice) => `<div class="result"><b>${choice.label}</b><span>${vote.results[choice.id]} ${resultUnit}</span></div>`).join("")}<p class="sign">Подпись председателя / ЭЦП: ____________________</p><script>window.onload=()=>window.print()</script></body></html>`); popup.document.close();
  };

  return <article className="reveal-up rounded-[26px] border border-stone-200 bg-white p-5 shadow-[0_12px_36px_rgba(41,37,36,.05)] sm:p-6">
    <div className="flex flex-wrap items-center gap-2"><span className={`rounded-full px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-[0.08em] ${vote.status === "active" ? "bg-green-100 text-green-800" : "bg-stone-100 text-stone-600"}`}>{vote.status === "active" ? "Идёт голосование" : "Завершено"}</span><span className="inline-flex items-center gap-1 rounded-full bg-violet-50 px-2.5 py-1 text-[10px] font-extrabold text-violet-800"><Scale className="h-3 w-3" />{vote.basis === "area" ? "По площади" : "Одна квартира — один голос"}</span></div>
    <h2 className="mt-3 text-lg font-black tracking-[-0.02em] text-stone-950">{vote.title}</h2><p className="mt-2 text-sm leading-6 text-stone-600">{vote.description}</p>
    <div className="mt-4 rounded-2xl border border-stone-200 bg-stone-50 p-4"><p className="text-[10px] font-extrabold uppercase tracking-[.12em] text-stone-400">Повестка и материалы</p><p className="mt-2 text-xs font-bold text-stone-800">1. {vote.title}</p><a href="/documents" className="mt-2 inline-flex items-center gap-1 text-xs font-extrabold text-violet-700"><FileSignature className="h-4 w-4" />Открыть связанные документы</a></div>
    <div className="mt-4 flex flex-wrap gap-3 text-xs font-semibold text-stone-500"><span className="inline-flex items-center gap-1.5"><CalendarClock className="h-4 w-4" />До {dateTimeLabel(vote.endsAt)}</span><span className="inline-flex items-center gap-1.5"><Users className="h-4 w-4" />{vote.basis === "area" ? `${vote.eligibleWeight.toLocaleString("ru-RU")} м²` : `${vote.eligibleUnits} квартир`}</span></div>

    <div className="mt-5 rounded-2xl bg-stone-50 p-4"><div className="flex items-center justify-between text-xs"><span className="font-extrabold text-stone-800">Кворум</span><span className={`font-black ${quorumReached ? "text-green-800" : "text-amber-800"}`}>{vote.participationPercent.toFixed(0)}% из {vote.quorumPercent}%</span></div><div className="mt-2 h-2.5 overflow-hidden rounded-full bg-stone-200"><div className={`h-full rounded-full transition-[width] duration-700 ${quorumReached ? "bg-green-700" : "bg-amber-500"}`} style={{ width: `${Math.min(100, vote.participationPercent)}%` }} /></div><p className="mt-2 text-[11px] font-semibold text-stone-500">{quorumReached ? "Кворум достигнут" : "Голосование станет состоявшимся после достижения кворума"}</p></div>

    {vote.status === "active" && !vote.userChoice && <div className="mt-5"><p className="text-sm font-extrabold text-stone-900">Ваше решение</p>{!isOwner && <p className="mt-2 rounded-xl bg-amber-50 p-3 text-xs font-bold text-amber-900">Голосовать может только подтверждённый собственник активной квартиры.</p>}<div className="mt-2 grid grid-cols-3 gap-2">{choices.map((choice) => <button key={choice.id} disabled={!isOwner} onClick={() => setSelected(choice.id)} className={`min-h-12 rounded-xl px-2 text-xs font-extrabold transition disabled:opacity-40 ${selected === choice.id ? "bg-violet-700 text-white ring-2 ring-violet-700 ring-offset-2" : "bg-stone-100 text-stone-700 hover:bg-stone-200"}`}>{choice.label}</button>)}</div><button disabled={!selected || busy || !isOwner} onClick={() => void submit()} className="mt-3 flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-green-800 text-sm font-extrabold text-white hover:bg-green-900 disabled:opacity-40">{busy ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <LockKeyhole className="h-4 w-4" />}Подтвердить неизменяемый голос</button><p className="mt-2 text-center text-[11px] leading-5 text-stone-500">После подтверждения изменить выбор нельзя. Напоминания придут непроголосовавшим автоматически.</p></div>}

    {vote.userChoice && <div className="mt-5 flex items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4"><span className="grid h-10 w-10 place-items-center rounded-xl bg-emerald-700 text-white"><Check className="h-5 w-5" /></span><div><p className="text-sm font-extrabold text-emerald-950">Ваш голос учтён: {choices.find((choice) => choice.id === vote.userChoice)?.label}</p><p className="text-xs text-emerald-800">Запись сохранена в журнале голосования.</p></div></div>}

    {showResults && <div className="mt-5 space-y-3"><p className="text-xs font-extrabold uppercase tracking-[0.1em] text-stone-500">Предварительный результат · {totalWeight.toLocaleString("ru-RU")} {resultUnit}</p>{choices.map((choice) => { const value = vote.results[choice.id]; const percent = totalWeight ? Math.round((value / totalWeight) * 100) : 0; return <div key={choice.id}><div className="flex justify-between text-xs font-bold text-stone-700"><span>{choice.label}</span><span>{value.toLocaleString("ru-RU")} {vote.basis === "area" ? "м²" : ""} · {percent}%</span></div><div className="mt-1.5 h-2 overflow-hidden rounded-full bg-stone-100"><div className={`h-full rounded-full ${choice.id === "yes" ? "bg-green-700" : choice.id === "no" ? "bg-rose-500" : "bg-stone-400"}`} style={{ width: `${percent}%` }} /></div></div>; })}</div>}
    {vote.status === "completed" && <div className="mt-5 grid grid-cols-2 gap-2"><button onClick={printProtocol} className="flex min-h-11 items-center justify-center gap-2 rounded-xl border border-stone-200 text-xs font-extrabold text-stone-700 hover:bg-stone-50"><FileSignature className="h-4 w-4" />PDF-протокол</button><button onClick={exportCsv} className="flex min-h-11 items-center justify-center gap-2 rounded-xl border border-stone-200 text-xs font-extrabold text-stone-700 hover:bg-stone-50"><Download className="h-4 w-4" />Экспорт CSV</button></div>}
    {vote.protocolUrl && <a href={vote.protocolUrl} target="_blank" rel="noreferrer" className="mt-2 flex min-h-11 items-center justify-center gap-2 rounded-xl border border-stone-200 text-xs font-extrabold text-stone-700 hover:bg-stone-50"><Download className="h-4 w-4" />Скачать подписанный протокол</a>}
    {error && <p role="alert" className="mt-4 rounded-xl bg-rose-50 px-3 py-2 text-xs font-bold text-rose-800">{error}</p>}
  </article>;
}

export default function VotesPage() {
  const votes = useAppStore((state) => state.officialVotes);
  const currentUser = useAppStore((state) => state.currentUser);
  const canManage = currentUser.role === "admin" || currentUser.role === "hoa_official";
  const [tab, setTab] = useState<"active" | "completed">("active");
  // Голосование с истёкшим сроком считается завершённым, даже если сервер ещё не закрыл его.
  const [renderedAt] = useState(() => Date.now());
  const visible = useMemo(() => {
    const open = new Set(activeVotes(votes, renderedAt).map((vote) => vote.id));
    return votes.filter((vote) => tab === "active" ? open.has(vote.id) : vote.status === "completed" || (vote.status === "active" && Date.parse(vote.endsAt) <= renderedAt));
  }, [renderedAt, tab, votes]);

  return <div className="min-h-screen bg-[#f8f7f2]">
    <header className="border-b border-stone-200/80 px-4 py-5 sm:px-6 sm:py-7"><div className="flex items-start gap-3"><span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-violet-700 text-white shadow-[0_10px_26px_rgba(124,58,237,.2)]"><Vote className="h-5 w-5" /></span><div><p className="text-xs font-extrabold uppercase tracking-[0.16em] text-green-800">Решения собственников</p><h1 className="mt-1 text-2xl font-black tracking-[-0.035em] text-stone-950 sm:text-3xl">Голосования</h1>{canManage && <Link href="/admin?tab=content" className="mt-2 inline-flex min-h-10 items-center rounded-xl bg-violet-700 px-3 text-xs font-extrabold text-white">Создать голосование</Link>}<p className="mt-1 max-w-xl text-sm leading-6 text-stone-600">Кворум, неизменяемый голос и прозрачный результат отдельно от обычных опросов.</p></div></div><div className="mt-5 flex gap-1 rounded-2xl bg-stone-200/65 p-1" role="tablist">{([["active", "Активные"], ["completed", "Завершённые"]] as const).map(([id, label]) => <button key={id} role="tab" aria-selected={tab === id} onClick={() => setTab(id)} className={`min-h-10 flex-1 rounded-xl text-xs font-extrabold ${tab === id ? "bg-white text-stone-950 shadow-sm" : "text-stone-500"}`}>{label}</button>)}</div></header>
    <section className="space-y-3 px-4 py-5 sm:px-6"><div className="flex items-start gap-3 rounded-[22px] border border-violet-100 bg-violet-50 p-4"><FileSignature className="mt-0.5 h-5 w-5 shrink-0 text-violet-700" /><p className="text-xs font-semibold leading-5 text-violet-950"><strong>Официальное голосование</strong> фиксирует квартиру, вес голоса и время решения. Подписание протокола через ЭЦП пока недоступно.</p></div>{visible.length === 0 ? <div className="rounded-[24px] border border-dashed border-stone-300 bg-white px-6 py-16 text-center"><BadgeCheck className="mx-auto h-10 w-10 text-stone-300" /><p className="mt-4 text-sm font-extrabold text-stone-900">В этом разделе пока пусто</p></div> : visible.map((vote) => <VoteCard key={vote.id} vote={vote} />)}</section>
  </div>;
}
