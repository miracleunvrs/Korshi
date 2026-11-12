"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import NextImage from "next/image";
import { 
  ShieldCheck, 
  Users, 
  FileCheck, 
  AlertTriangle, 
  Check, 
  X, 
  Building2, 
  Eye, 
  Search,
  Bell,
  Sparkles,
  ChevronRight,
  ClipboardList,
  Clock3,
  Star,
  TrendingUp,
  Vote,
  WalletCards,
  Send,
  Download,
  Settings2,
  Shield,
} from "lucide-react";
import { useAppStore } from "@/stores/appStore";
import { useOperationsStore } from "@/stores/operationsStore";
import { syncPlatformMutation } from "@/lib/supabase/platformRepository";
import { loadResidents, revokeMemberAccess, setMemberRole, type ResidentRecord } from "@/lib/supabase/repository";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { activeVotes } from "@/features/dashboard/summary";
import ContentManager from "@/components/admin/ContentManager";
import InviteManager from "@/components/admin/InviteManager";
import PropertyManager from "@/components/admin/PropertyManager";

const roleLabels: Record<string, string> = {
  owner: "Собственник", tenant: "Арендатор", family: "Член семьи", chair: "Председатель ОСИ",
  admin: "Администратор", dispatcher: "Диспетчер", executor: "Исполнитель", guard: "Охрана", concierge: "Консьерж",
};

export default function AdminPage() {
  const { 
    verificationRequests, 
    approveVerification, 
    rejectVerification, 
    urgentAlert, 
    setUrgentAlert,
    currentUser,
    serviceRequests,
    officialVotes,
    documents,
    finance,
  } = useAppStore();

  const [activeTab, setActiveTab] = useState<"requests" | "residents" | "alert" | "stats" | "content" | "invites" | "property">("stats");
  const [selectedDocImage, setSelectedDocImage] = useState<string | null>(null);
  const [rejecting, setRejecting] = useState<{ id: string; reason: string } | null>(null);
  const [broadcastStatus, setBroadcastStatus] = useState("");
  const accessEvents = useOperationsStore((state) => state.accessEvents);
  const works = useOperationsStore((state) => state.works);

  // Urgent alert form
  const [alertTitle, setAlertTitle] = useState(urgentAlert?.title || "");
  const [alertMessage, setAlertMessage] = useState(urgentAlert?.message || "");
  const [alertAreas, setAlertAreas] = useState(urgentAlert?.affectedAreas.join(", ") || "");
  const [alertResolution, setAlertResolution] = useState(urgentAlert?.expectedResolution || "");
  const [alertPhone, setAlertPhone] = useState(urgentAlert?.contactPhone || "");
  const [alertStatus, setAlertStatus] = useState<{ tone: "ok" | "error"; text: string } | null>(null);
  const [alertBusy, setAlertBusy] = useState(false);
  const [broadcastText, setBroadcastText] = useState("");
  const [broadcastOpen, setBroadcastOpen] = useState(false);

  const canAssignRoles = currentUser.membershipRole === "chair" || currentUser.membershipRole === "admin";
  const [residents, setResidents] = useState<ResidentRecord[]>([]);
  const [residentsError, setResidentsError] = useState("");
  const [residentsVersion, setResidentsVersion] = useState(0);
  const [residentBusy, setResidentBusy] = useState<string | null>(null);
  const isManager = currentUser.role === "admin" || currentUser.role === "hoa_official";

  // Ссылки вида /admin?tab=content открывают нужную вкладку.
  useEffect(() => {
    const requested = new URLSearchParams(window.location.search).get("tab");
    if (requested !== "content" && requested !== "invites" && requested !== "residents") return;
    const timer = window.setTimeout(() => setActiveTab(requested), 0);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!isManager || !isSupabaseConfigured()) return;
    void loadResidents().then((rows) => { setResidents(rows); setResidentsError(""); })
      .catch((cause) => setResidentsError(cause instanceof Error ? cause.message : "Не удалось загрузить реестр"));
  }, [isManager, residentsVersion]);

  const changeRole = async (resident: ResidentRecord, role: string) => {
    if (!resident.membershipId) return;
    setResidentBusy(resident.userId); setResidentsError("");
    try { await setMemberRole(resident.membershipId, role); setResidentsVersion((version) => version + 1); }
    catch (cause) { setResidentsError(cause instanceof Error ? cause.message : "Не удалось изменить роль"); }
    finally { setResidentBusy(null); }
  };

  const revokeAccess = async (resident: ResidentRecord) => {
    if (!resident.membershipId || !window.confirm(`Отозвать доступ ${resident.fullName}? Житель потеряет доступ к чатам и данным дома.`)) return;
    setResidentBusy(resident.userId); setResidentsError("");
    try { await revokeMemberAccess(resident.membershipId); setResidentsVersion((version) => version + 1); }
    catch (cause) { setResidentsError(cause instanceof Error ? cause.message : "Не удалось отозвать доступ"); }
    finally { setResidentBusy(null); }
  };

  if (!isManager) {
    return (
      <div className="min-h-screen bg-white p-8 flex flex-col items-center justify-center text-center gap-4">
        <ShieldCheck className="w-10 h-10 text-gray-300" />
        <p className="text-sm font-semibold text-gray-600">Доступ только для администратора</p>
        <Link href="/feed" className="text-sm font-bold text-green-700">Вернуться в ленту</Link>
      </div>
    );
  }

  const handleSaveAlert = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!alertTitle.trim()) return;
    setAlertBusy(true); setAlertStatus(null);
    try {
      await setUrgentAlert({
        id: `alert-${Date.now()}`,
        title: alertTitle.trim(),
        message: alertMessage.trim(),
        affectedAreas: alertAreas.split(",").map((area) => area.trim()).filter(Boolean),
        expectedResolution: alertResolution.trim() || undefined,
        contactPhone: alertPhone.trim() || undefined,
        active: true,
        acknowledged: false,
        createdAt: new Date().toLocaleString("ru-RU"),
      });
      setAlertStatus({ tone: "ok", text: "Оповещение опубликовано, жители получили уведомление." });
    } catch (cause) {
      setAlertStatus({ tone: "error", text: cause instanceof Error ? cause.message : "Не удалось опубликовать оповещение" });
    } finally { setAlertBusy(false); }
  };

  const handleDisableAlert = async () => {
    setAlertBusy(true); setAlertStatus(null);
    try {
      await setUrgentAlert(null);
      setAlertTitle(""); setAlertMessage(""); setAlertAreas(""); setAlertResolution(""); setAlertPhone("");
      setAlertStatus({ tone: "ok", text: "Оповещение снято." });
    } catch (cause) {
      setAlertStatus({ tone: "error", text: cause instanceof Error ? cause.message : "Не удалось снять оповещение" });
    } finally { setAlertBusy(false); }
  };

  const pendingRequests = verificationRequests.filter((r) => r.status === "pending");
  const activeServiceRequests = serviceRequests.filter((request) => request.status === "submitted" || request.status === "in_progress");
  const ratedRequests = serviceRequests.filter((request) => request.rating);
  const averageRating = ratedRequests.length
    ? ratedRequests.reduce((sum, request) => sum + (request.rating || 0), 0) / ratedRequests.length
    : 0;
  const attentionRequests = activeServiceRequests.filter((request) => request.priority === "emergency" || request.events.some((event) => event.kind === "reopened"));
  const verifiedResidents = residents.filter((resident) => resident.verified).length;

  const sendBroadcast = async (event: FormEvent) => {
    event.preventDefault();
    const text = broadcastText.trim();
    if (!text) return;
    setBroadcastStatus("");
    try {
      const result = await syncPlatformMutation({ operation: "insert", table: "notification_broadcasts", payload: { title: "Сообщение ОСИ", body: text, channels: ["in_app"] } });
      setBroadcastStatus(result.queued ? "Нет связи: рассылка уйдёт после синхронизации" : "Сообщение отправлено всем подтверждённым жителям");
      setBroadcastText(""); setBroadcastOpen(false);
    } catch (cause) {
      setBroadcastStatus(cause instanceof Error ? cause.message : "Не удалось отправить рассылку");
    }
  };

  const exportAdminReport = () => {
    const rows = [["Показатель", "Значение"], ["Открытые заявки", String(activeServiceRequests.length)], ["Аварийные и повторно открытые", String(attentionRequests.length)], ["Средняя оценка", averageRating.toFixed(1)], ["Жители в реестре", String(residents.length)], ["Подтверждённые жители", String(verifiedResidents)], ["События доступа", String(accessEvents.length)]];
    const blob = new Blob(["\uFEFF" + rows.map((row) => row.join(";")).join("\n")], { type: "text/csv;charset=utf-8" }); const url = URL.createObjectURL(blob); const anchor = document.createElement("a"); anchor.href = url; anchor.download = "korshi-admin-report.csv"; anchor.click(); URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-white pb-12">
      {/* Шапка админки */}
      <div className="sticky top-0 z-20 bg-white/95 backdrop-blur-md border-b border-gray-100 px-6 py-4 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-zinc-900 text-white flex items-center justify-center shadow-md">
              <ShieldCheck className="w-5 h-5 text-green-500" />
            </div>
            <div>
              <h1 className="font-extrabold text-gray-900 text-lg">Панель управления ЖК</h1>
              <p className="text-xs text-gray-500 font-medium">Администрирование и верификация жильцов</p>
            </div>
          </div>

          <span className="px-3 py-1 bg-green-50 text-green-700 text-xs font-bold rounded-full border border-green-200">
            {currentUser.role === "admin" ? "Администратор ЖК" : "Председатель ОСИ"}
          </span>
        </div>

        {/* Вкладки админки */}
        <div className="flex gap-2 overflow-x-auto whitespace-nowrap border-b border-gray-100 pb-1">
          {[
            { id: "stats", label: "Обзор" },
            { id: "requests", label: "Заявки на верификацию", badge: pendingRequests.length },
            { id: "residents", label: "Реестр жильцов" },
            { id: "property", label: "Дома и парковка" },
            { id: "invites", label: "Коды для квартир" },
            { id: "content", label: "Контент дома" },
            { id: "alert", label: "Экстренное оповещение" },
          ].map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition ${
                  isActive
                    ? "bg-zinc-900 text-white shadow-sm"
                    : "text-gray-600 hover:bg-gray-100"
                }`}
              >
                <span>{tab.label}</span>
                {tab.badge !== undefined && tab.badge > 0 && (
                  <span className="px-2 py-0.2 bg-green-600 text-white text-[10px] font-black rounded-full">
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Контент активной вкладки */}
      <div className="p-6">
        {activeTab === "stats" && (
          <div className="space-y-6">
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {[
                { label: "Активные заявки", value: activeServiceRequests.length, detail: `${serviceRequests.filter((request) => request.status === "submitted").length} новых`, icon: ClipboardList, tone: "bg-green-100 text-green-800" },
                { label: "Оценка сервиса", value: averageRating ? averageRating.toFixed(1) : "—", detail: `${ratedRequests.length} оценок`, icon: Star, tone: "bg-amber-100 text-amber-900" },
                { label: "Активные голосования", value: activeVotes(officialVotes).length, detail: "контроль кворума", icon: Vote, tone: "bg-violet-100 text-violet-800" },
                { label: "Баланс ОСИ", value: `${Math.round(finance.balance / 1000).toLocaleString("ru-RU")} тыс. ₸`, detail: "по журналу операций", icon: WalletCards, tone: "bg-sky-100 text-sky-800" },
              ].map((item) => <div key={item.label} className="rounded-[22px] border border-stone-200 bg-white p-4 shadow-sm"><span className={`grid h-10 w-10 place-items-center rounded-xl ${item.tone}`}><item.icon className="h-5 w-5" /></span><p className="mt-4 text-2xl font-black tracking-tight text-stone-950">{item.value}</p><p className="mt-1 text-xs font-extrabold text-stone-700">{item.label}</p><p className="text-[11px] text-stone-400">{item.detail}</p></div>)}
            </div>

            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{[
              ["Ждут проверки", String(pendingRequests.length), "заявки на подтверждение жителей"],
              ["Требуют внимания", String(attentionRequests.length), "аварийные и повторно открытые заявки"],
              ["Подтверждены", residents.length ? `${verifiedResidents} из ${residents.length}` : "—", "жители в реестре"],
              ["Пропущенные работы", String(works.filter((work) => work.status === "missed").length), "требуют переноса"],
            ].map(([label, value, detail]) => <article key={label} className="rounded-[22px] border border-stone-200 bg-stone-50 p-4"><p className="text-xl font-black text-stone-950">{value}</p><p className="mt-1 text-xs font-extrabold text-stone-800">{label}</p><p className="mt-1 text-[10px] text-stone-500">{detail}</p></article>)}</div>

            <div className="grid gap-4 xl:grid-cols-2">
              <section className="rounded-[24px] border border-stone-200 bg-white p-5"><div className="flex items-center justify-between"><div><h2 className="text-sm font-extrabold text-stone-950">Очередь обслуживания</h2><p className="text-xs text-stone-500">Заявки, требующие внимания</p></div><Link href="/requests" className="text-xs font-extrabold text-green-800">Открыть все</Link></div><div className="mt-4 space-y-2">{activeServiceRequests.slice(0, 4).map((request) => <Link key={request.id} href="/requests" className="flex min-h-16 items-center gap-3 rounded-2xl bg-stone-50 p-3 transition hover:bg-stone-100"><span className={`h-2.5 w-2.5 shrink-0 rounded-full ${request.priority === "emergency" ? "bg-rose-500" : request.status === "submitted" ? "bg-sky-500" : "bg-amber-500"}`} /><span className="min-w-0 flex-1"><span className="block truncate text-xs font-extrabold text-stone-900">{request.title}</span><span className="block truncate text-[11px] text-stone-500">{request.location}</span></span>{request.slaDueAt && <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-800"><Clock3 className="h-3 w-3" />{request.slaDueAt}</span>}</Link>)}</div></section>

              <section className="rounded-[24px] border border-stone-200 bg-white p-5"><div className="flex items-center justify-between"><div><h2 className="text-sm font-extrabold text-stone-950">Состояние дома</h2><p className="text-xs text-stone-500">Контент и участие жителей</p></div><TrendingUp className="h-5 w-5 text-green-700" /></div><dl className="mt-4 divide-y divide-stone-100">{[
                ["Подтверждённые жители", verifiedResidents],
                ["Действующие документы", documents.filter((document) => document.status === "active").length],
                ["Требуют ознакомления", documents.filter((document) => document.requiresAcknowledgement && !document.acknowledged).length],
                ["Завершённые заявки", serviceRequests.filter((request) => request.status === "resolved" || request.status === "closed").length],
              ].map(([label, value]) => <div key={label} className="flex min-h-12 items-center justify-between text-xs"><dt className="font-semibold text-stone-600">{label}</dt><dd className="font-black text-stone-950">{value}</dd></div>)}</dl><div className="mt-4 grid grid-cols-3 gap-2"><Link href="/documents" className="rounded-xl bg-violet-50 px-2 py-3 text-center text-[10px] font-extrabold text-violet-800">Документы</Link><Link href="/votes" className="rounded-xl bg-amber-50 px-2 py-3 text-center text-[10px] font-extrabold text-amber-900">Голосования</Link><Link href="/finance" className="rounded-xl bg-green-50 px-2 py-3 text-center text-[10px] font-extrabold text-green-800">Финансы</Link></div></section>
            </div>
            <section className="rounded-[24px] border border-stone-200 bg-white p-5"><div className="flex items-center justify-between gap-3"><div><h2 className="text-sm font-extrabold text-stone-950">Операции управления</h2><p className="text-xs text-stone-500">Коммуникации, отчёты и контроль</p></div><Settings2 className="h-5 w-5 text-stone-500" /></div><div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4"><button onClick={() => setBroadcastOpen((open) => !open)} className="flex min-h-14 flex-col items-center justify-center gap-1 rounded-2xl bg-green-800 px-2 text-[10px] font-extrabold text-white"><Send className="h-4 w-4" />Рассылка</button><button onClick={exportAdminReport} className="flex min-h-14 flex-col items-center justify-center gap-1 rounded-2xl bg-violet-50 px-2 text-[10px] font-extrabold text-violet-800"><Download className="h-4 w-4" />Экспорт</button><Link href="/operations" className="flex min-h-14 flex-col items-center justify-center gap-1 rounded-2xl bg-amber-50 px-2 text-[10px] font-extrabold text-amber-900"><Shield className="h-4 w-4" />Безопасность</Link><Link href="/admin/settings" className="flex min-h-14 flex-col items-center justify-center gap-1 rounded-2xl bg-stone-100 px-2 text-[10px] font-extrabold text-stone-800"><Settings2 className="h-4 w-4" />Настройки ЖК</Link></div>{broadcastOpen && <form onSubmit={sendBroadcast} className="mt-3 flex flex-col gap-2"><textarea value={broadcastText} onChange={(event) => setBroadcastText(event.target.value)} rows={3} placeholder="Текст сообщения для всех жителей ЖК" className="w-full rounded-xl border border-stone-200 p-3 text-xs" /><button disabled={!broadcastText.trim()} className="self-end rounded-xl bg-green-800 px-4 py-2 text-xs font-extrabold text-white disabled:opacity-50">Отправить</button></form>}{broadcastStatus && <p role="status" className="mt-3 rounded-xl bg-emerald-50 p-3 text-xs font-bold text-emerald-900">{broadcastStatus}</p>}<div className="mt-4 grid gap-2 sm:grid-cols-3"><p className="rounded-xl bg-stone-50 p-3 text-[10px] font-bold text-stone-600">Журнал безопасности: {accessEvents.length} событий</p><p className="rounded-xl bg-stone-50 p-3 text-[10px] font-bold text-stone-600">Ознакомление: {documents.filter((document) => document.acknowledged).length}/{documents.filter((document) => document.requiresAcknowledgement).length || documents.length}</p></div></section>
          </div>
        )}

        {/* Вкладка 1: Очередь верификации */}
        {activeTab === "requests" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-gray-900 text-sm">
                Входящие заявки жителей ({pendingRequests.length})
              </h2>
              <p className="text-xs text-gray-400">Проверьте документы и подтвердите статус</p>
            </div>

            {verificationRequests.length === 0 ? (
              <div className="p-12 text-center text-gray-400 bg-gray-50 rounded-3xl">
                <FileCheck className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                <p className="text-xs font-semibold">Все заявки рассмотрены</p>
              </div>
            ) : (
              <div className="space-y-3">
                {verificationRequests.map((req) => (
                  <div
                    key={req.id}
                    className={`p-4 rounded-3xl border transition flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                      req.status === "pending"
                        ? "bg-white border-gray-200/90 shadow-sm"
                        : req.status === "approved"
                        ? "bg-green-50/40 border-green-100 opacity-80"
                        : "bg-red-50/30 border-red-100 opacity-60"
                    }`}
                  >
                    <div className="flex items-start gap-3.5">
                      {req.documentType.startsWith("image/") ? (
                        <button
                          type="button"
                          onClick={() => setSelectedDocImage(req.documentUrl)}
                          className="w-16 h-16 rounded-2xl bg-gray-100 overflow-hidden ring-1 ring-black/5 cursor-pointer relative group shrink-0"
                          aria-label={`Открыть документ ${req.fullName}`}
                        >
                          <NextImage
                            src={req.documentUrl}
                            alt="Документ"
                            fill
                            sizes="64px"
                            unoptimized
                            className="object-cover group-hover:scale-105 transition"
                          />
                          <span className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white transition">
                            <Eye className="w-4 h-4" />
                          </span>
                        </button>
                      ) : (
                        <a
                          href={req.documentUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="w-16 h-16 rounded-2xl bg-gray-100 ring-1 ring-black/5 shrink-0 flex flex-col items-center justify-center gap-1 text-[10px] font-bold text-gray-600 hover:bg-gray-200"
                        >
                          <FileCheck className="w-5 h-5" />
                          PDF
                        </a>
                      )}

                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <h3 className="font-bold text-gray-900 text-sm">{req.fullName}</h3>
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            req.status === "approved"
                              ? "bg-green-100 text-green-800"
                              : req.status === "rejected"
                              ? "bg-red-100 text-red-800"
                              : "bg-amber-100 text-amber-800"
                          }`}>
                            {req.status === "approved" ? "Одобрено" : req.status === "rejected" ? "Отклонено" : "На проверке"}
                          </span>
                        </div>

                        <p className="text-xs text-gray-600 font-semibold flex items-center gap-1.5">
                          <Building2 className="w-3.5 h-3.5 text-green-600" />
                          Дом {req.buildingNumber}, подъезд {req.entranceNumber}, кв. {req.apartmentNumber}
                        </p>

                        <p className="text-[11px] text-gray-400">
                          Подана {req.submittedAt}
                        </p>
                        {req.status === "rejected" && req.reviewReason && (
                          <p className="text-[11px] text-red-700">Причина: {req.reviewReason}</p>
                        )}
                      </div>
                    </div>

                    {req.status === "pending" && rejecting?.id === req.id && (
                      <form
                        className="flex w-full flex-col gap-2 sm:w-72"
                        onSubmit={(event) => {
                          event.preventDefault();
                          rejectVerification(req.id, rejecting.reason.trim() || undefined);
                          setRejecting(null);
                        }}
                      >
                        <input
                          autoFocus
                          value={rejecting.reason}
                          onChange={(event) => setRejecting({ id: req.id, reason: event.target.value })}
                          placeholder="Причина отказа — её увидит житель"
                          className="w-full rounded-xl border border-gray-200 px-3 py-2 text-xs"
                        />
                        <div className="flex gap-2">
                          <button type="submit" className="flex-1 rounded-xl bg-red-600 px-3 py-2 text-xs font-bold text-white">Отклонить</button>
                          <button type="button" onClick={() => setRejecting(null)} className="rounded-xl bg-gray-100 px-3 py-2 text-xs font-bold text-gray-600">Отмена</button>
                        </div>
                      </form>
                    )}
                    {req.status === "pending" && rejecting?.id !== req.id && (
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          onClick={() => approveVerification(req.id)}
                          className="px-4 py-2 bg-green-600 hover:bg-green-700 active:scale-95 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 shadow-sm transition"
                        >
                          <Check className="w-3.5 h-3.5 stroke-[3]" /> Одобрить
                        </button>
                        <button
                          onClick={() => setRejecting({ id: req.id, reason: "" })}
                          className="px-3.5 py-2 bg-gray-100 hover:bg-red-50 hover:text-red-600 text-gray-600 font-bold text-xs rounded-xl flex items-center gap-1.5 transition"
                        >
                          <X className="w-3.5 h-3.5" /> Отклонить
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Вкладка 2: Реестр жильцов */}
        {activeTab === "residents" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-gray-900 text-sm">Реестр жителей ({residents.length})</h2>
              <span className="text-xs font-semibold text-green-600">{verifiedResidents} подтверждено</span>
            </div>
            {!canAssignRoles && <p className="text-xs text-gray-500">Назначать роли и отзывать доступ может председатель или администратор.</p>}
            {residentsError && <p role="alert" className="rounded-xl bg-red-50 p-3 text-xs text-red-700">{residentsError}</p>}
            {residents.length === 0 ? (
              <p className="rounded-3xl bg-gray-50 p-8 text-center text-xs text-gray-500">{isSupabaseConfigured() ? "В реестре пока нет жителей." : "Реестр доступен при подключённом сервере."}</p>
            ) : (
              <div className="divide-y divide-gray-100 rounded-3xl border border-gray-200 overflow-hidden bg-white">
                {residents.map((resident) => (
                  <div key={resident.userId} className="p-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-green-100 text-green-800 font-bold flex items-center justify-center text-xs">
                        {resident.fullName.charAt(0)}
                      </div>
                      <div>
                        <p className="font-bold text-gray-900 text-xs">{resident.fullName}{resident.userId === currentUser.id ? " · вы" : ""}</p>
                        <p className="text-[11px] text-gray-500">{resident.address}{resident.phone ? ` • ${resident.phone}` : ""}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${resident.verified ? "bg-green-50 text-green-700" : "bg-amber-50 text-amber-800"}`}>{resident.verified ? "Подтверждён" : "Не подтверждён"}</span>
                      {canAssignRoles && resident.membershipId && resident.userId !== currentUser.id ? (
                        <>
                          <select
                            value={resident.role}
                            disabled={residentBusy === resident.userId}
                            onChange={(event) => void changeRole(resident, event.target.value)}
                            className="rounded-xl border border-gray-200 bg-white px-2 py-1.5 text-[11px] font-bold text-gray-700"
                            aria-label={`Роль ${resident.fullName}`}
                          >
                            {Object.entries(roleLabels).filter(([role]) => role !== "admin" || currentUser.membershipRole === "admin" || resident.role === "admin").map(([role, label]) => <option key={role} value={role}>{label}</option>)}
                          </select>
                          {resident.verified && <button type="button" disabled={residentBusy === resident.userId} onClick={() => void revokeAccess(resident)} className="rounded-xl px-2 py-1.5 text-[11px] font-bold text-red-700 hover:bg-red-50">Выехал</button>}
                        </>
                      ) : (
                        <span className="px-2.5 py-1 bg-gray-100 text-gray-700 rounded-full text-[11px] font-bold">{roleLabels[resident.role] || resident.role}</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === "content" && <ContentManager />}
        {activeTab === "invites" && <InviteManager />}
        {activeTab === "property" && <PropertyManager />}

        {/* Вкладка 3: Экстренное оповещение */}
        {activeTab === "alert" && (
          <div className="space-y-5 max-w-xl">
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-3xl space-y-1">
              <div className="flex items-center gap-2 text-amber-900 font-bold text-xs">
                <AlertTriangle className="w-4 h-4 text-amber-600" />
                <span>Срочные уведомления жителям ЖК</span>
              </div>
              <p className="text-[11px] text-amber-700 leading-relaxed">
                Сообщение отобразится в красной плашке на главной странице у всех жителей дома и ЖК.
              </p>
            </div>

            <form onSubmit={(event) => void handleSaveAlert(event)} className="space-y-4 bg-white p-5 border border-gray-200 rounded-3xl shadow-xs">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Заголовок оповещения
                </label>
                <input
                  type="text"
                  value={alertTitle}
                  onChange={(e) => setAlertTitle(e.target.value)}
                  placeholder="Например: Отключение горячей воды 26 мая"
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-green-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Текст сообщения
                </label>
                <textarea
                  rows={3}
                  value={alertMessage}
                  onChange={(e) => setAlertMessage(e.target.value)}
                  placeholder="Укажите подробности, время возобновления подачи и контакты аварийной службы..."
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-green-500 resize-none"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Затронутые зоны (через запятую)</label>
                <input value={alertAreas} onChange={(e) => setAlertAreas(e.target.value)} placeholder="Дом 1, подъезд 2; паркинг" className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-green-500" />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Ожидаемое восстановление</label>
                  <input value={alertResolution} onChange={(e) => setAlertResolution(e.target.value)} placeholder="Сегодня к 18:00" className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-green-500" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Контактный телефон</label>
                  <input value={alertPhone} onChange={(e) => setAlertPhone(e.target.value)} placeholder="+7 ..." className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-green-500" />
                </div>
              </div>
              {alertStatus && <p role={alertStatus.tone === "error" ? "alert" : "status"} className={`rounded-xl p-3 text-xs font-semibold ${alertStatus.tone === "error" ? "bg-red-50 text-red-700" : "bg-green-50 text-green-800"}`}>{alertStatus.text}</p>}

              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  disabled={alertBusy}
                  className="flex-1 py-3 bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded-xl shadow-md transition disabled:opacity-50"
                >
                  Опубликовать экстренное оповещение
                </button>
                {urgentAlert && (
                  <button
                    type="button"
                    disabled={alertBusy}
                    onClick={() => void handleDisableAlert()}
                    className="px-4 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-xs rounded-xl transition"
                  >
                    Снять оповещение
                  </button>
                )}
              </div>
            </form>
          </div>
        )}
      </div>

      {/* Модалка просмотра документа */}
      {selectedDocImage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
          <div className="max-w-2xl w-full bg-white rounded-3xl overflow-hidden p-4 space-y-3">
            <div className="flex justify-between items-center pb-2 border-b border-gray-100">
              <h3 className="font-bold text-gray-900 text-sm">Просмотр документа жителя</h3>
              <button onClick={() => setSelectedDocImage(null)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <NextImage src={selectedDocImage} alt="Документ" width={1200} height={900} unoptimized className="h-auto w-full max-h-[70vh] object-contain rounded-2xl" />
          </div>
        </div>
      )}
    </div>
  );
}
