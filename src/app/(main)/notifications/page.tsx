"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  Bell,
  Building2,
  CheckCheck,
  ChevronRight,
  FileText,
  MessageSquareText,
  Settings2,
  ShieldAlert,
  Vote,
  Wrench,
} from "lucide-react";
import { useAppStore, type AppNotification } from "@/stores/appStore";
import { reportBackendError } from "@/lib/reportError";

const deliveredEvents = [
  ["Заявки", "Новые заявки, назначения, смена статуса и просьба оценить работу"],
  ["Аварии", "Аварийные сообщения ОСИ и их обновления"],
  ["Документы и решения ОСИ", "Новые документы, рассылки управления, подтверждение взносов"],
  ["Личные сообщения", "Сообщения в личных чатах; в общих чатах — счётчик непрочитанного"],
  ["Подтверждение проживания", "Решение управления по вашей заявке"],
] as const;

function notificationMeta(notification: AppNotification) {
  if (notification.type === "service_request") return { icon: Wrench, tone: "bg-green-100 text-green-800", href: "/requests" };
  if (notification.type === "message" || notification.type === "comment") return { icon: MessageSquareText, tone: "bg-sky-100 text-sky-800", href: typeof notification.data?.chat_id === "string" ? `/chats/${notification.data.chat_id}` : "/chats" };
  if (notification.type === "vote") return { icon: Vote, tone: "bg-amber-100 text-amber-900", href: typeof notification.data?.post_id === "string" ? `/feed/${notification.data.post_id}` : "/votes" };
  if (notification.type === "document") return { icon: FileText, tone: "bg-violet-100 text-violet-800", href: "/documents" };
  if (notification.type === "emergency") return { icon: ShieldAlert, tone: "bg-rose-100 text-rose-800", href: "/emergency" };
  if (notification.type === "verification") return { icon: ShieldAlert, tone: "bg-green-100 text-green-800", href: "/verify-resident" };
  if (typeof notification.data?.fundraiser_id === "string") return { icon: Building2, tone: "bg-emerald-100 text-emerald-800", href: `/hoa/fundraisers/${notification.data.fundraiser_id}` };
  return { icon: Building2, tone: "bg-stone-100 text-stone-700", href: "/feed" };
}

export default function NotificationsPage() {
  const notifications = useAppStore((state) => state.notifications);
  const markRead = useAppStore((state) => state.markNotificationRead);
  const markAllRead = useAppStore((state) => state.markAllNotificationsRead);
  const [tab, setTab] = useState<"all" | "unread" | "settings">("all");
  const [error, setError] = useState("");
  const unreadCount = notifications.filter((item) => !item.isRead).length;
  const visible = useMemo(() => tab === "unread" ? notifications.filter((item) => !item.isRead) : notifications, [notifications, tab]);

  const markAll = async () => {
    setError("");
    try {
      await markAllRead();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Не удалось обновить уведомления");
    }
  };

  return (
    <div className="min-h-screen bg-[#f8f7f2]">
      <header className="border-b border-stone-200/80 px-4 py-5 sm:px-6 sm:py-7">
        <div className="flex items-start justify-between gap-4">
          <div><p className="text-xs font-extrabold uppercase tracking-[0.16em] text-green-800">Центр событий</p><h1 className="mt-1 text-2xl font-black tracking-[-0.035em] text-stone-950 sm:text-3xl">Уведомления</h1><p className="mt-1 text-sm leading-6 text-stone-600">Только важные изменения по вашему дому.</p></div>
          {unreadCount > 0 && <button type="button" onClick={() => void markAll()} className="inline-flex min-h-11 items-center gap-2 rounded-2xl bg-white px-3 text-xs font-extrabold text-green-800 shadow-sm ring-1 ring-stone-200 hover:bg-green-50"><CheckCheck className="h-4 w-4" />Прочитать все</button>}
        </div>
        <div className="mt-5 flex gap-1 rounded-2xl bg-stone-200/65 p-1" role="tablist" aria-label="Раздел уведомлений">
          {([["all", "Все"], ["unread", `Новые · ${unreadCount}`], ["settings", "Настройки"]] as const).map(([id, label]) => <button key={id} role="tab" aria-selected={tab === id} onClick={() => setTab(id)} className={`min-h-10 flex-1 rounded-xl px-2 text-xs font-extrabold transition ${tab === id ? "bg-white text-stone-950 shadow-sm" : "text-stone-500 hover:text-stone-800"}`}>{label}</button>)}
        </div>
      </header>

      {error && <p role="alert" className="mx-4 mt-4 rounded-2xl bg-rose-50 px-4 py-3 text-sm font-bold text-rose-800 sm:mx-6">{error}</p>}

      <section className="px-4 py-5 sm:px-6">
        {tab === "settings" ? <section className="overflow-hidden rounded-[24px] border border-stone-200 bg-white" aria-labelledby="notification-settings-title">
          <div className="border-b border-stone-100 p-5"><div className="flex items-center gap-3"><span className="grid h-11 w-11 place-items-center rounded-2xl bg-violet-100 text-violet-800"><Settings2 className="h-5 w-5" /></span><div><h2 id="notification-settings-title" className="font-extrabold text-stone-950">Что приходит в приложение</h2><p className="text-xs leading-5 text-stone-500">Уведомления видны здесь и в счётчике в меню.</p></div></div></div>
          <ul className="divide-y divide-stone-100">{deliveredEvents.map(([title, description]) => <li key={title} className="px-5 py-3"><span className="block text-sm font-extrabold text-stone-900">{title}</span><span className="block text-xs leading-5 text-stone-500">{description}</span></li>)}</ul>
          <p className="border-t border-stone-100 bg-stone-50/70 p-5 text-xs leading-5 text-stone-600">Push-уведомления, email и SMS пока не подключены. Чтобы не пропустить аварию, заглядывайте в приложение или включите уведомления браузера, когда они появятся.</p>
        </section> : visible.length === 0 ? <div className="rounded-[24px] border border-dashed border-stone-300 bg-white px-6 py-16 text-center"><Bell className="mx-auto h-9 w-9 text-stone-300" /><h2 className="mt-4 font-extrabold text-stone-900">Новых уведомлений нет</h2><p className="mt-1 text-sm text-stone-500">Всё важное уже просмотрено.</p></div> : <div className="space-y-2">{visible.map((notification, index) => {
          const meta = notificationMeta(notification);
          const Icon = meta.icon;
          return <Link key={notification.id} href={meta.href} onClick={() => void markRead(notification.id).catch(reportBackendError("Уведомление не отмечено прочитанным"))} className={`reveal-up flex min-h-[88px] items-start gap-3 rounded-[22px] border p-4 transition hover:-translate-y-0.5 hover:border-stone-300 ${notification.isRead ? "border-stone-200 bg-white/70" : "border-green-200 bg-white shadow-[0_10px_30px_rgba(22,101,52,.07)]"}`} style={{ animationDelay: `${index * 45}ms` }}>
            <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-2xl ${meta.tone}`}><Icon className="h-5 w-5" aria-hidden="true" /></span><span className="min-w-0 flex-1"><span className="flex items-start justify-between gap-3"><span className="text-sm font-extrabold text-stone-950">{notification.title}</span><span className="shrink-0 text-[10px] font-semibold text-stone-400">{notification.createdAt}</span></span><span className="mt-1 block text-xs leading-5 text-stone-600">{notification.body}</span></span><ChevronRight className="mt-3 h-4 w-4 shrink-0 text-stone-300" aria-hidden="true" />
          </Link>;
        })}</div>}
      </section>
    </div>
  );
}

