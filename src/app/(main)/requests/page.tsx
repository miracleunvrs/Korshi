"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import NextImage from "next/image";
import {
  AlertTriangle,
  ArrowRight,
  Check,
  CheckCircle2,
  ChevronDown,
  CircleDot,
  Clock3,
  Droplets,
  FileText,
  Image as ImageIcon,
  Lightbulb,
  LoaderCircle,
  MapPin,
  Plus,
  RotateCcw,
  Send,
  ShieldAlert,
  Star,
  Timer,
  Upload,
  UserRoundCheck,
  Users,
  Wrench,
  X,
  Search,
  Merge,
} from "lucide-react";
import {
  useAppStore,
  type ServiceRequestCategory,
  type ServiceRequestItem,
  type ServiceRequestPriority,
  type ServiceRequestStatus,
} from "@/stores/appStore";
import { REQUEST_UPLOAD_TYPES, validateUploadFile } from "@/lib/uploadLimits";
import { syncPlatformMutation } from "@/lib/supabase/platformRepository";

const categories: Array<{ id: ServiceRequestCategory; label: string; icon: typeof Wrench }> = [
  { id: "utilities", label: "Вода и электричество", icon: Droplets },
  { id: "repair", label: "Ремонт", icon: Wrench },
  { id: "cleaning", label: "Уборка", icon: ImageIcon },
  { id: "safety", label: "Безопасность", icon: ShieldAlert },
  { id: "territory", label: "Двор и территория", icon: Lightbulb },
  { id: "other", label: "Другое", icon: CircleDot },
];

const statusMeta: Record<ServiceRequestStatus, { label: string; tone: string; dot: string }> = {
  submitted: { label: "Принята", tone: "bg-sky-50 text-sky-800 border-sky-100", dot: "bg-sky-500" },
  in_progress: { label: "В работе", tone: "bg-amber-50 text-amber-950 border-amber-100", dot: "bg-amber-500" },
  resolved: { label: "Ждёт оценки", tone: "bg-emerald-50 text-emerald-900 border-emerald-100", dot: "bg-emerald-600" },
  closed: { label: "Закрыта", tone: "bg-stone-100 text-stone-700 border-stone-200", dot: "bg-stone-400" },
};

const priorityMeta: Record<ServiceRequestPriority, { label: string; tone: string }> = {
  normal: { label: "Обычная", tone: "bg-stone-100 text-stone-600" },
  important: { label: "Важная", tone: "bg-amber-100 text-amber-900" },
  emergency: { label: "Аварийная", tone: "bg-rose-100 text-rose-800" },
};

const eventLabels: Record<ServiceRequestItem["events"][number]["kind"], string> = {
  created: "Заявка создана",
  comment: "Комментарий",
  assigned: "Назначен исполнитель",
  status_changed: "Статус изменён",
  resolution: "Работа выполнена",
  rated: "Работа оценена",
  reopened: "Заявка открыта повторно",
};

function RequestTimeline({ status }: { status: ServiceRequestStatus }) {
  const steps: ServiceRequestStatus[] = ["submitted", "in_progress", "resolved"];
  const activeIndex = status === "closed" ? 2 : Math.max(0, steps.indexOf(status));
  return (
    <div className="mt-5 grid grid-cols-3" aria-label={`Текущий статус: ${statusMeta[status].label}`}>
      {steps.map((step, index) => {
        const complete = index <= activeIndex;
        return (
          <div key={step} className="relative flex flex-col items-center gap-2 text-center">
            {index > 0 && <span className={`absolute right-1/2 top-[7px] h-0.5 w-full transition-colors duration-500 ${index <= activeIndex ? "bg-green-700" : "bg-stone-200"}`} />}
            <span className={`relative z-10 grid h-4 w-4 place-items-center rounded-full border-2 transition duration-500 ${complete ? "border-green-700 bg-green-700" : "border-stone-300 bg-white"}`}>
              {index < activeIndex && <Check className="h-2.5 w-2.5 text-white" aria-hidden="true" />}
            </span>
            <span className={`text-[10px] font-bold ${complete ? "text-green-800" : "text-stone-600"}`}>{statusMeta[step].label}</span>
          </div>
        );
      })}
    </div>
  );
}

function RequestCard({ request, index, canManage }: { request: ServiceRequestItem; index: number; canManage: boolean }) {
  const addComment = useAppStore((state) => state.addServiceRequestComment);
  const rateRequest = useAppStore((state) => state.rateServiceRequest);
  const reopenRequest = useAppStore((state) => state.reopenServiceRequest);
  const updateStatus = useAppStore((state) => state.updateServiceRequestStatus);
  const [expanded, setExpanded] = useState(false);
  const [comment, setComment] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const category = categories.find((item) => item.id === request.category) || categories.at(-1)!;
  const Icon = category.icon;
  const status = statusMeta[request.status];
  const priority = priorityMeta[request.priority] || priorityMeta.normal;

  const run = async (action: () => Promise<void>) => {
    setBusy(true);
    setError("");
    try {
      await action();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Не удалось обновить заявку");
    } finally {
      setBusy(false);
    }
  };

  const mergeDuplicate = async () => {
    const duplicateId = window.prompt("ID дублирующей заявки");
    if (!duplicateId?.trim()) return;
    setBusy(true); setError("");
    try {
      const result = await syncPlatformMutation({ operation: "rpc", table: "merge_service_requests", payload: { p_primary_id: request.id, p_duplicate_id: duplicateId.trim() } });
      if (result.queued) setError("Связь с сервером недоступна: объединение поставлено в очередь");
    } finally { setBusy(false); }
  };

  const submitComment = (event: FormEvent) => {
    event.preventDefault();
    const message = comment.trim();
    if (!message) return;
    void run(async () => {
      await addComment(request.id, message);
      setComment("");
    });
  };

  return (
    <article className="reveal-up overflow-hidden rounded-[24px] border border-stone-200/90 bg-white shadow-[0_10px_35px_rgba(41,37,36,.055)]" style={{ animationDelay: `${index * 55}ms` }}>
      <button type="button" onClick={() => setExpanded((value) => !value)} className="w-full p-4 text-left sm:p-5" aria-expanded={expanded}>
        <div className="flex items-start gap-3">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-stone-100 text-green-800"><Icon className="h-5 w-5" aria-hidden="true" /></span>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-1.5">
                <p className="text-[11px] font-extrabold uppercase tracking-[0.1em] text-stone-600">№ {request.id.replace(/[^0-9]/g, "").slice(-6) || request.id.slice(0, 6)}</p>
                {request.priority !== "normal" && <span className={`rounded-full px-2 py-0.5 text-[10px] font-extrabold ${priority.tone}`}>{priority.label}</span>}
                {request.publicForComplex && <span className="inline-flex items-center gap-1 rounded-full bg-violet-50 px-2 py-0.5 text-[10px] font-extrabold text-violet-800"><Users className="h-3 w-3" />Общедомовая</span>}
              </div>
              <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-extrabold ${status.tone}`}><span className={`h-1.5 w-1.5 rounded-full ${status.dot}`} />{status.label}</span>
            </div>
            <h2 className="mt-2 text-base font-extrabold tracking-[-0.01em] text-stone-950">{request.title}</h2>
            <p className="mt-1 line-clamp-2 text-sm leading-6 text-stone-600">{request.description}</p>
            <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-xs font-semibold text-stone-500">
              <span className="inline-flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5" aria-hidden="true" />{request.location}</span>
              <span className="inline-flex items-center gap-1.5"><Clock3 className="h-3.5 w-3.5" aria-hidden="true" />Обновлено {request.updatedAt}</span>
            </div>
            {(request.assigneeName || request.slaDueAt) && <div className="mt-3 flex flex-wrap gap-2">
              {request.assigneeName && <span className="inline-flex items-center gap-1.5 rounded-xl bg-stone-50 px-3 py-2 text-xs font-semibold text-stone-700"><UserRoundCheck className="h-3.5 w-3.5 text-green-700" />{request.assigneeName}</span>}
              {request.slaDueAt && <span className="inline-flex items-center gap-1.5 rounded-xl bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-950"><Timer className="h-3.5 w-3.5" />До {request.slaDueAt}</span>}
            </div>}
            <RequestTimeline status={request.status} />
          </div>
          <ChevronDown className={`mt-1 h-5 w-5 shrink-0 text-stone-400 transition-transform ${expanded ? "rotate-180" : ""}`} aria-hidden="true" />
        </div>
      </button>

      {expanded && <div className="border-t border-stone-100 bg-stone-50/65 p-4 sm:p-5">
        {request.attachments.length > 0 && <section aria-labelledby={`attachments-${request.id}`}>
          <h3 id={`attachments-${request.id}`} className="text-xs font-extrabold uppercase tracking-[0.12em] text-stone-500">Вложения</h3>
          <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
            {request.attachments.map((attachment) => attachment.mimeType.startsWith("image/") ? <a key={attachment.id} href={attachment.url} target="_blank" rel="noreferrer" className="group relative aspect-[4/3] overflow-hidden rounded-2xl bg-stone-200"><NextImage src={attachment.url} alt={attachment.name} fill sizes="(max-width: 640px) 50vw, 240px" unoptimized className="object-cover transition duration-300 group-hover:scale-105" /><span className="absolute bottom-2 left-2 rounded-lg bg-black/60 px-2 py-1 text-[9px] font-extrabold text-white">{attachment.kind === "resolution" ? "После" : "До"}</span></a> : attachment.mimeType.startsWith("video/") ? <video key={attachment.id} controls preload="metadata" className="aspect-[4/3] w-full rounded-2xl bg-stone-900" aria-label={attachment.name}><source src={attachment.url} type={attachment.mimeType} /></video> : <a key={attachment.id} href={attachment.url} target="_blank" rel="noreferrer" className="flex min-h-24 flex-col justify-between rounded-2xl border border-stone-200 bg-white p-3 text-xs font-bold text-stone-700 hover:border-green-300"><FileText className="h-5 w-5 text-green-700" /><span className="line-clamp-2">{attachment.name}</span></a>)}
          </div>
        </section>}

        {request.resolutionNote && <div className="mt-4 rounded-2xl border border-emerald-100 bg-emerald-50 p-4"><p className="text-xs font-extrabold uppercase tracking-[0.1em] text-emerald-800">Результат работы</p><p className="mt-1 text-sm leading-6 text-emerald-950">{request.resolutionNote}</p></div>}

        <section className="mt-5" aria-labelledby={`history-${request.id}`}>
          <h3 id={`history-${request.id}`} className="text-xs font-extrabold uppercase tracking-[0.12em] text-stone-500">История</h3>
          <ol className="mt-3 space-y-3">{request.events.map((event) => <li key={event.id} className="flex gap-3"><span className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full bg-green-700 ring-4 ring-green-100" /><div className="min-w-0"><div className="flex flex-wrap items-baseline gap-x-2"><p className="text-sm font-extrabold text-stone-900">{eventLabels[event.kind]}</p><span className="text-[11px] text-stone-400">{event.createdAt}</span></div><p className="text-xs font-semibold text-stone-500">{event.actorName}</p>{event.message && <p className="mt-1 text-sm leading-6 text-stone-600">{event.message}</p>}</div></li>)}</ol>
        </section>

        {canManage && request.status !== "closed" && <div className="mt-5 rounded-2xl border border-violet-100 bg-violet-50 p-4"><p className="text-xs font-extrabold uppercase tracking-[0.1em] text-violet-800">{request.assigneeName ? "Кабинет исполнителя" : "Кабинет диспетчера"}</p><div className="mt-3 flex flex-wrap gap-2">{request.status === "submitted" && <button disabled={busy} onClick={() => void run(() => updateStatus(request.id, "in_progress", { assigneeName: "Служба эксплуатации", slaDueAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), note: "Заявка принята в работу" }))} className="min-h-11 rounded-xl bg-violet-700 px-4 text-xs font-extrabold text-white hover:bg-violet-800 disabled:opacity-50">Принять в работу</button>}{request.status === "in_progress" && <button disabled={busy} onClick={() => void run(() => updateStatus(request.id, "resolved", { note: "Работа выполнена. Пожалуйста, подтвердите результат." }))} className="min-h-11 rounded-xl bg-green-800 px-4 text-xs font-extrabold text-white hover:bg-green-900 disabled:opacity-50">Отметить выполненной</button>}<button disabled={busy} onClick={() => void mergeDuplicate()} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-white px-4 text-xs font-extrabold text-violet-800 ring-1 ring-violet-200"><Merge className="h-4 w-4" />Объединить дубль</button></div></div>}

        {request.status === "resolved" && <div className="mt-5 rounded-2xl border border-amber-100 bg-amber-50 p-4"><p className="text-sm font-extrabold text-amber-950">Как выполнена работа?</p><div className="mt-3 flex flex-wrap items-center gap-2">{[1, 2, 3, 4, 5].map((value) => <button key={value} disabled={busy} onClick={() => void run(() => rateRequest(request.id, value))} className="grid h-11 w-11 place-items-center rounded-xl bg-white text-amber-500 ring-1 ring-amber-200 transition hover:-translate-y-0.5 hover:bg-amber-100" aria-label={`Поставить ${value}`}><Star className="h-5 w-5" /></button>)}<button disabled={busy} onClick={() => void run(() => reopenRequest(request.id, "Работа требует исправления"))} className="ml-auto inline-flex min-h-11 items-center gap-2 rounded-xl px-3 text-xs font-extrabold text-rose-700 hover:bg-rose-50"><RotateCcw className="h-4 w-4" />Открыть повторно</button></div></div>}
        {request.rating && <p className="mt-4 inline-flex items-center gap-2 rounded-xl bg-amber-50 px-3 py-2 text-xs font-extrabold text-amber-900"><Star className="h-4 w-4 fill-amber-400 text-amber-400" />Ваша оценка: {request.rating} из 5</p>}

        <form onSubmit={submitComment} className="mt-5 flex gap-2"><label className="sr-only" htmlFor={`comment-${request.id}`}>Комментарий к заявке</label><input id={`comment-${request.id}`} value={comment} onChange={(event) => setComment(event.target.value)} maxLength={2000} placeholder="Написать комментарий…" className="min-h-11 min-w-0 flex-1 rounded-xl border border-stone-200 bg-white px-4 text-sm outline-none focus:border-green-700 focus:ring-2 focus:ring-green-700/15" /><button disabled={busy || !comment.trim()} className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-green-800 text-white hover:bg-green-900 disabled:opacity-40" aria-label="Отправить комментарий">{busy ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}</button></form>
        {error && <p role="alert" className="mt-3 rounded-xl bg-rose-50 px-3 py-2 text-xs font-bold text-rose-800">{error}</p>}
      </div>}
    </article>
  );
}

export default function RequestsPage() {
  const requests = useAppStore((state) => state.serviceRequests);
  const createServiceRequest = useAppStore((state) => state.createServiceRequest);
  const currentUser = useAppStore((state) => state.currentUser);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [filter, setFilter] = useState<"active" | "completed" | "all">("active");
  const [categoryFilter, setCategoryFilter] = useState<"all" | ServiceRequestCategory>("all");
  const [priorityFilter, setPriorityFilter] = useState<"all" | ServiceRequestPriority>("all");
  const [scopeFilter, setScopeFilter] = useState<"all" | "building" | "entrance">("all");
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [category, setCategory] = useState<ServiceRequestCategory>("repair");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState(`Дом ${currentUser.buildingNumber} · подъезд ${currentUser.entranceNumber}`);
  const [priority, setPriority] = useState<ServiceRequestPriority>("normal");
  const [publicForComplex, setPublicForComplex] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const canManage = currentUser.membershipRole === "dispatcher" || currentUser.role === "admin" || currentUser.role === "hoa_official" || currentUser.role === "service_provider";

  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("create") !== "1") return;
    const timer = window.setTimeout(() => setShowForm(true), 0);
    return () => window.clearTimeout(timer);
  }, []);

  const filtered = useMemo(() => requests.filter((item) => {
    if (filter === "active" && !(item.status === "submitted" || item.status === "in_progress")) return false;
    if (filter === "completed" && !(item.status === "resolved" || item.status === "closed")) return false;
    if (categoryFilter !== "all" && item.category !== categoryFilter) return false;
    if (priorityFilter !== "all" && item.priority !== priorityFilter) return false;
    if (scopeFilter === "building" && !item.location.includes(`Дом ${currentUser.buildingNumber}`)) return false;
    if (scopeFilter === "entrance" && !item.location.includes(`подъезд ${currentUser.entranceNumber}`)) return false;
    const query = search.trim().toLowerCase();
    return !query || `${item.title} ${item.description} ${item.location}`.toLowerCase().includes(query);
  }), [categoryFilter, currentUser.buildingNumber, currentUser.entranceNumber, filter, priorityFilter, requests, scopeFilter, search]);

  const addFiles = (selected: FileList | null) => {
    if (!selected) return;
    setError("");
    const next = [...files];
    for (const file of Array.from(selected)) {
      const uploadError = validateUploadFile(file, REQUEST_UPLOAD_TYPES);
      if (uploadError) { setError(`${file.name}: ${uploadError}`); return; }
      if (next.length >= 4) { setError("К заявке можно приложить не более четырёх файлов."); return; }
      next.push(file);
    }
    setFiles(next);
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError("");
    if (title.trim().length < 4 || description.trim().length < 8 || location.trim().length < 2) { setError("Заполните название, описание и место проблемы."); return; }
    setLoading(true);
    try {
      await createServiceRequest({ category, title: title.trim(), description: description.trim(), location: location.trim(), priority, publicForComplex }, files);
      setTitle(""); setDescription(""); setPriority("normal"); setPublicForComplex(false); setFiles([]); setShowForm(false); setSuccess(true); setFilter("active");
      window.setTimeout(() => setSuccess(false), 3500);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Не удалось отправить заявку");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f8f7f2]">
      <header className="border-b border-stone-200/80 bg-[#f8f7f2]/95 px-4 py-5 backdrop-blur-xl sm:px-6 sm:py-7">
        <div className="flex items-start justify-between gap-4"><div><p className="text-xs font-extrabold uppercase tracking-[0.16em] text-green-800">Сервис дома</p><h1 className="mt-1 text-2xl font-black tracking-[-0.035em] text-stone-950 sm:text-3xl">Заявки</h1><p className="mt-1 text-sm leading-6 text-stone-600">Фото, комментарии, срок исполнения и оценка результата — в одной истории.</p></div><button onClick={() => setShowForm(true)} className="inline-flex min-h-11 shrink-0 items-center gap-2 rounded-2xl bg-green-800 px-4 text-sm font-extrabold text-white shadow-[0_10px_25px_rgba(22,101,52,.2)] transition hover:-translate-y-0.5 hover:bg-green-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-700 focus-visible:ring-offset-2"><Plus className="h-4 w-4" aria-hidden="true" /><span className="hidden sm:inline">Новая заявка</span><span className="sm:hidden">Создать</span></button></div>
        <div className="mt-5 flex gap-1 rounded-2xl bg-stone-200/65 p-1" role="tablist" aria-label="Фильтр заявок">{([["active", "Активные"], ["completed", "Завершённые"], ["all", "Все"]] as const).map(([id, label]) => <button key={id} role="tab" aria-selected={filter === id} onClick={() => setFilter(id)} className={`min-h-10 flex-1 rounded-xl px-3 text-xs font-extrabold transition ${filter === id ? "bg-white text-stone-950 shadow-sm" : "text-stone-700 hover:text-stone-900"}`}>{label}</button>)}</div>
        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4"><label className="relative col-span-2 sm:col-span-1"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-600" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Поиск" aria-label="Поиск заявок" className="min-h-10 w-full rounded-xl border border-stone-200 bg-white pl-9 pr-3 text-xs" /></label><select aria-label="Категория заявок" value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value as typeof categoryFilter)} className="min-h-10 rounded-xl border border-stone-200 bg-white px-2 text-xs font-bold"><option value="all">Все категории</option>{categories.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}</select><select aria-label="Приоритет заявок" value={priorityFilter} onChange={(event) => setPriorityFilter(event.target.value as typeof priorityFilter)} className="min-h-10 rounded-xl border border-stone-200 bg-white px-2 text-xs font-bold"><option value="all">Любой приоритет</option><option value="normal">Обычные</option><option value="important">Важные</option><option value="emergency">Аварийные</option></select><select aria-label="Область заявок" value={scopeFilter} onChange={(event) => setScopeFilter(event.target.value as typeof scopeFilter)} className="min-h-10 rounded-xl border border-stone-200 bg-white px-2 text-xs font-bold"><option value="all">Весь ЖК</option><option value="building">Мой дом</option><option value="entrance">Мой подъезд</option></select></div>
      </header>

      {success && <div role="status" className="mx-4 mt-4 flex items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-900 sm:mx-6"><CheckCircle2 className="h-5 w-5" />Заявка принята. Изменения появятся в её истории и уведомлениях.</div>}
      <section className="space-y-3 px-4 py-5 sm:px-6">{filtered.length === 0 ? <div className="rounded-[24px] border border-dashed border-stone-300 bg-white px-6 py-14 text-center"><CheckCircle2 className="mx-auto h-10 w-10 text-green-700" /><h2 className="mt-4 text-base font-extrabold text-stone-900">Здесь всё спокойно</h2><p className="mt-1 text-sm text-stone-500">Заявок в этой категории пока нет.</p></div> : filtered.map((request, index) => <RequestCard key={request.id} request={request} index={index} canManage={canManage} />)}</section>

      {showForm && <div className="fixed inset-0 z-[80] flex items-end justify-center bg-stone-950/45 p-0 backdrop-blur-sm sm:items-center sm:p-6" role="dialog" aria-modal="true" aria-labelledby="request-form-title"><form onSubmit={submit} className="sheet-enter max-h-[92dvh] w-full max-w-xl overflow-y-auto rounded-t-[30px] bg-[#fffefb] p-5 shadow-2xl sm:rounded-[30px] sm:p-6">
        <div className="flex items-start justify-between gap-4"><div><p className="text-xs font-extrabold uppercase tracking-[0.14em] text-green-800">Новая заявка</p><h2 id="request-form-title" className="mt-1 text-xl font-black text-stone-950">Что случилось?</h2></div><button type="button" onClick={() => setShowForm(false)} className="grid h-11 w-11 place-items-center rounded-2xl bg-stone-100 text-stone-600 hover:bg-stone-200" aria-label="Закрыть форму"><X className="h-5 w-5" /></button></div>
        <fieldset className="mt-5"><legend className="text-sm font-extrabold text-stone-900">Категория</legend><div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">{categories.map(({ id, label, icon: CategoryIcon }) => <button type="button" key={id} onClick={() => setCategory(id)} className={`flex min-h-20 flex-col items-start justify-between rounded-2xl border p-3 text-left text-xs font-bold transition ${category === id ? "border-green-700 bg-green-50 text-green-900 ring-1 ring-green-700" : "border-stone-200 bg-white text-stone-600 hover:border-stone-300"}`}><CategoryIcon className="h-5 w-5" aria-hidden="true" />{label}</button>)}</div></fieldset>
        <div className="mt-5 space-y-4">
          <label className="block text-sm font-extrabold text-stone-900">Короткое название<input value={title} onChange={(event) => setTitle(event.target.value)} maxLength={120} placeholder="Например, не работает свет" className="mt-2 min-h-12 w-full rounded-2xl border border-stone-200 bg-white px-4 text-sm font-medium outline-none transition placeholder:text-stone-400 focus:border-green-700 focus:ring-2 focus:ring-green-700/15" /></label>
          <label className="block text-sm font-extrabold text-stone-900">Описание<textarea value={description} onChange={(event) => setDescription(event.target.value)} maxLength={2000} rows={4} placeholder="Опишите проблему и когда вы её заметили" className="mt-2 w-full resize-none rounded-2xl border border-stone-200 bg-white p-4 text-sm font-medium leading-6 outline-none transition placeholder:text-stone-400 focus:border-green-700 focus:ring-2 focus:ring-green-700/15" /></label>
          <label className="block text-sm font-extrabold text-stone-900">Где это?<span className="relative mt-2 block"><MapPin className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" /><input value={location} onChange={(event) => setLocation(event.target.value)} maxLength={160} className="min-h-12 w-full rounded-2xl border border-stone-200 bg-white pl-11 pr-4 text-sm font-medium outline-none transition focus:border-green-700 focus:ring-2 focus:ring-green-700/15" /></span></label>
          <fieldset><legend className="text-sm font-extrabold text-stone-900">Приоритет</legend><div className="mt-2 grid grid-cols-3 gap-2">{(["normal", "important", "emergency"] as const).map((value) => <button type="button" key={value} onClick={() => setPriority(value)} className={`min-h-11 rounded-xl px-2 text-xs font-extrabold transition ${priority === value ? priorityMeta[value].tone + " ring-2 ring-current/20" : "bg-white text-stone-500 ring-1 ring-stone-200"}`}>{priorityMeta[value].label}</button>)}</div></fieldset>
          <div><p className="text-sm font-extrabold text-stone-900">Фото, видео или документ</p><input ref={fileInputRef} type="file" multiple accept={REQUEST_UPLOAD_TYPES.join(",")} onChange={(event) => addFiles(event.target.files)} className="sr-only" /><button type="button" onClick={() => fileInputRef.current?.click()} className="mt-2 flex min-h-14 w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-stone-300 bg-white text-sm font-bold text-stone-600 hover:border-green-500 hover:text-green-800"><Upload className="h-4 w-4" />Добавить файлы · фото, MP4/WebM, PDF · до 4 × 10 МБ</button>{files.length > 0 && <ul className="mt-2 space-y-1">{files.map((file, index) => <li key={`${file.name}-${index}`} className="flex items-center justify-between rounded-xl bg-stone-100 px-3 py-2 text-xs font-semibold text-stone-700"><span className="truncate">{file.name}</span><button type="button" onClick={() => setFiles((current) => current.filter((_, itemIndex) => itemIndex !== index))} className="grid h-8 w-8 place-items-center rounded-lg hover:bg-stone-200" aria-label={`Удалить ${file.name}`}><X className="h-3.5 w-3.5" /></button></li>)}</ul>}</div>
          <label className="flex min-h-16 cursor-pointer items-center justify-between gap-4 rounded-2xl border border-stone-200 bg-white px-4"><span><span className="block text-sm font-extrabold text-stone-900">Видно соседям</span><span className="block text-xs leading-5 text-stone-500">Подходит для общедомовой проблемы без личных данных</span></span><input type="checkbox" checked={publicForComplex} onChange={(event) => setPublicForComplex(event.target.checked)} className="h-5 w-5 shrink-0 accent-green-800" /></label>
        </div>
        {priority === "emergency" && <p className="mt-4 flex items-start gap-2 rounded-2xl bg-rose-50 p-3 text-xs font-semibold leading-5 text-rose-950"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />При непосредственной угрозе жизни сначала звоните 112 или в аварийную службу.</p>}
        {error && <p role="alert" className="mt-4 rounded-2xl bg-rose-50 px-4 py-3 text-sm font-bold text-rose-800">{error}</p>}
        <button disabled={loading} className="mt-5 flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-green-800 px-5 text-sm font-extrabold text-white transition hover:bg-green-900 disabled:cursor-wait disabled:opacity-60">{loading ? <><LoaderCircle className="h-4 w-4 animate-spin" />Отправляем…</> : <>Отправить заявку<ArrowRight className="h-4 w-4" /></>}</button>
      </form></div>}
    </div>
  );
}
