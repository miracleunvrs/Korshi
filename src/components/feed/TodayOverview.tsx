"use client";

import Link from "next/link";
import { ArrowUpRight, ClipboardPlus, Megaphone, MessageSquareText, Vote } from "lucide-react";
import { useAppStore } from "@/stores/appStore";
import { activeVotes } from "@/features/dashboard/summary";

export default function TodayOverview() {
  const requests = useAppStore((state) => state.serviceRequests);
  const notifications = useAppStore((state) => state.notifications);
  const votes = useAppStore((state) => state.officialVotes);
  const activeRequests = requests.filter((item) => item.status !== "resolved" && item.status !== "closed");
  const unread = notifications.filter((item) => !item.isRead).length;

  const actions = [
    { href: "/requests?create=1", label: "Сообщить о проблеме", short: "Заявка", icon: ClipboardPlus, tone: "bg-green-800 text-white" },
    { href: "/create?type=announcement", label: "Разместить объявление", short: "Объявление", icon: Megaphone, tone: "bg-white text-violet-700" },
    { href: "/create?type=poll", label: "Создать голосование", short: "Опрос", icon: Vote, tone: "bg-white text-amber-700" },
    { href: "/chats", label: "Написать соседям", short: "Чаты", icon: MessageSquareText, tone: "bg-white text-sky-700" },
  ];

  return (
    <section className="border-b border-stone-200/80 bg-[#f8f7f2] px-4 py-5 sm:px-6 sm:py-6" aria-labelledby="today-title">
      <div className="reveal-up overflow-hidden rounded-[28px] bg-[#173f2a] p-5 text-white shadow-[0_18px_50px_rgba(23,63,42,.18)] sm:p-6">
        <div className="flex items-start justify-between gap-5">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-emerald-200">Ваш дом сегодня</p>
            <h2 id="today-title" className="mt-2 text-2xl font-black tracking-[-0.03em] sm:text-3xl">Всё важное — в одном месте</h2>
            <p className="mt-2 max-w-xl text-sm leading-6 text-emerald-50/80">Следите за работами, решениями ОСИ и новостями соседей без лишнего шума.</p>
          </div>
          <Link href="/requests" className="hidden min-h-11 shrink-0 items-center gap-2 rounded-2xl bg-white/10 px-4 text-sm font-bold text-white transition hover:bg-white/16 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white sm:flex">
            Все заявки <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-3">
          <div className="rounded-2xl border border-white/10 bg-white/8 p-3.5">
            <p className="text-2xl font-black tabular-nums">{activeRequests.length}</p>
            <p className="mt-1 text-xs font-semibold text-emerald-100/75">заявки в работе</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/8 p-3.5">
            <p className="text-2xl font-black tabular-nums">{activeVotes(votes).length}</p>
            <p className="mt-1 text-xs font-semibold text-emerald-100/75">открытых голосований</p>
          </div>
          <div className="col-span-2 rounded-2xl border border-white/10 bg-white/8 p-3.5 sm:col-span-1">
            <p className="text-2xl font-black tabular-nums">{unread}</p>
            <p className="mt-1 text-xs font-semibold text-emerald-100/75">новых уведомлений</p>
          </div>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-4 gap-2" aria-label="Быстрые действия">
        {actions.map(({ href, label, short, icon: Icon, tone }, index) => (
          <Link key={href} href={href} aria-label={label} className={`reveal-up group flex min-h-[84px] flex-col items-center justify-center gap-2 rounded-2xl border border-stone-200/80 px-2 text-center shadow-[0_8px_24px_rgba(41,37,36,.04)] transition duration-200 hover:-translate-y-0.5 hover:border-stone-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-700 ${tone}`} style={{ animationDelay: `${80 + index * 55}ms` }}>
            <Icon className="h-5 w-5 transition-transform duration-200 group-hover:scale-110" aria-hidden="true" />
            <span className="text-[11px] font-extrabold leading-tight sm:text-xs">{short}</span>
          </Link>
        ))}
      </div>
    </section>
  );
}
