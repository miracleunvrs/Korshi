"use client";

import { useState } from "react";
import Link from "next/link";
import { 
  Building2, 
  ShieldCheck, 
  Newspaper, 
  FileText, 
  BarChart3, 
  Lightbulb, 
  Coins, 
  ChevronRight, 
  ArrowRight,
  Plus
  ,Grid2X2
} from "lucide-react";
import { useAppStore } from "@/stores/appStore";
import { useOperationsStore } from "@/stores/operationsStore";
import { complexName } from "@/lib/appConfig";

export default function HoaPage() {
  const [activeTab, setActiveTab] = useState("Новости");
  const { posts, documents, currentUser } = useAppStore();
  const canManage = currentUser.role === "admin" || currentUser.role === "hoa_official";
  const settings = useOperationsStore((state) => state.complexSettings);

  const categories = [
    { label: "Новости", icon: Newspaper },
    { label: "Документы", icon: FileText },
    { label: "Опросы", icon: BarChart3 },
    { label: "Инициативы", icon: Lightbulb },
    { label: "Сборы", icon: Coins },
  ];

  const officialPosts = posts.filter((p) => (p.is_official || p.type === "official_news") && p.type !== "fundraiser" && p.type !== "official_poll");
  const initiatives = posts.filter((p) => p.type === "initiative" && p.initiative);
  const activeDocuments = documents.filter((document) => document.status === "active");
  const activeFundraisers = posts.filter((p) => p.type === "fundraiser" && p.fundraiser);
  const activePolls = posts.filter((p) => (p.type === "poll" || p.type === "official_poll") && p.poll);

  return (
    <div className="min-h-screen bg-[#fffefb] pb-16">
      {/* Шапка */}
      <div className="glass-nav sticky top-16 z-20 flex items-center justify-between border-b border-stone-200/80 px-4 py-4 shadow-xs sm:px-6 md:top-0">
        <h1 className="font-extrabold text-gray-900 text-lg">Мой ЖК (ОСИ)</h1>
        {canManage && <Link
          href="/hoa/manage"
          className="px-3.5 py-1.5 bg-green-600 hover:bg-green-700 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-xs transition"
        >
          <Plus className="w-4 h-4" /> Запустить сбор
        </Link>}
      </div>

      <div className="p-6 space-y-6">
        {/* Карточка ОСИ */}
        <div className="p-5 bg-gradient-to-r from-emerald-500 to-green-600 text-white rounded-3xl shadow-lg shadow-green-600/20 flex items-center justify-between">
          <div className="flex items-center gap-3.5">
            <div className="w-13 h-13 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center text-white shadow-inner">
              <Building2 className="w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h2 className="font-black text-white text-lg">ОСИ «{complexName(currentUser.complexName)}»</h2>
                <ShieldCheck className="w-5 h-5 text-white fill-white/20" />
              </div>
              <p className="text-xs text-green-100 font-medium">Официальный аккаунт управления ЖК</p>
            </div>
          </div>
        </div>

        <div className="grid gap-2 sm:grid-cols-2">
          <Link href="/documents" className="flex min-h-20 items-center justify-between rounded-3xl border border-violet-100 bg-violet-50 p-4 text-violet-950 transition hover:-translate-y-0.5 hover:border-violet-200">
            <span className="flex items-center gap-3"><span className="grid h-11 w-11 place-items-center rounded-2xl bg-violet-700 text-white"><FileText className="h-5 w-5" /></span><span><span className="block text-sm font-extrabold">Документы</span><span className="block text-xs text-violet-700">Архив дома</span></span></span><ChevronRight className="h-5 w-5" />
          </Link>
          <Link href="/votes" className="flex min-h-20 items-center justify-between rounded-3xl border border-amber-100 bg-amber-50 p-4 text-amber-950 transition hover:-translate-y-0.5 hover:border-amber-200">
            <span className="flex items-center gap-3"><span className="grid h-11 w-11 place-items-center rounded-2xl bg-amber-500 text-white"><BarChart3 className="h-5 w-5" /></span><span><span className="block text-sm font-extrabold">Голосования</span><span className="block text-xs text-amber-700">Кворум и решения</span></span></span><ChevronRight className="h-5 w-5" />
          </Link>
          <Link href="/finance" className="flex min-h-20 items-center justify-between rounded-3xl border border-emerald-100 bg-emerald-50 p-4 text-emerald-950 transition hover:-translate-y-0.5 hover:border-emerald-200">
            <span className="flex items-center gap-3"><span className="grid h-11 w-11 place-items-center rounded-2xl bg-emerald-700 text-white"><Coins className="h-5 w-5" /></span><span><span className="block text-sm font-extrabold">Финансы</span><span className="block text-xs text-emerald-700">Бюджет и расходы</span></span></span><ChevronRight className="h-5 w-5" />
          </Link>
          <Link href="/services" className="flex min-h-20 items-center justify-between rounded-3xl border border-sky-100 bg-sky-50 p-4 text-sky-950 transition hover:-translate-y-0.5 hover:border-sky-200">
            <span className="flex items-center gap-3"><span className="grid h-11 w-11 place-items-center rounded-2xl bg-sky-700 text-white"><Grid2X2 className="h-5 w-5" /></span><span><span className="block text-sm font-extrabold">Сервисы</span><span className="block text-xs text-sky-700">Пропуска и бронь</span></span></span><ChevronRight className="h-5 w-5" />
          </Link>
        </div>

        {(settings.managementPhone || settings.managementEmail || settings.houseRules) && <div className="rounded-3xl border border-gray-100 bg-gray-50 p-4 space-y-2">
          <h3 className="text-sm font-bold text-gray-900">Управление и правила дома</h3>
          {settings.managementPhone && <a href={`tel:${settings.managementPhone.replace(/[^+\d]/g, "")}`} className="block text-xs font-bold text-green-800">{settings.managementPhone}</a>}
          {settings.managementEmail && <a href={`mailto:${settings.managementEmail}`} className="block text-xs font-bold text-green-800">{settings.managementEmail}</a>}
          {settings.houseRules && <p className="whitespace-pre-line text-xs leading-relaxed text-gray-600">{settings.houseRules}</p>}
        </div>}

        {/* Быстрые категории */}
        <div className="grid grid-cols-5 gap-2 text-center">
          {categories.map((cat) => {
            const Icon = cat.icon;
            const isActive = activeTab === cat.label;
            return (
              <button
                key={cat.label}
                onClick={() => setActiveTab(cat.label)}
                className={`flex flex-col items-center gap-1.5 p-3 rounded-2xl transition ${
                  isActive
                    ? "bg-green-50 text-green-700 font-bold"
                    : "hover:bg-gray-50 text-gray-600"
                }`}
              >
                <div
                  className={`w-10 h-10 rounded-2xl flex items-center justify-center transition ${
                    isActive ? "bg-green-600 text-white shadow-sm" : "bg-gray-100 text-gray-600"
                  }`}
                >
                  <Icon className="w-5 h-5" />
                </div>
                <span className="text-[11px] font-bold tracking-tight">{cat.label}</span>
              </button>
            );
          })}
        </div>

        {activeTab === "Новости" && <TabList empty="ОСИ пока не публиковало новостей." items={officialPosts.map((post) => ({ id: post.id, href: `/feed/${post.id}`, title: post.title || "Сообщение ОСИ", text: post.content, meta: new Date(post.created_at).toLocaleDateString("ru-RU") }))} />}
        {activeTab === "Документы" && <TabList empty="Документы ещё не опубликованы." items={activeDocuments.slice(0, 10).map((document) => ({ id: document.id, href: "/documents", title: document.title, text: document.description, meta: `${document.publishedAt}${document.requiresAcknowledgement && !document.acknowledged ? " · требует ознакомления" : ""}` }))} />}
        {activeTab === "Опросы" && <TabList empty="Активных опросов нет." items={activePolls.map((post) => ({ id: post.id, href: `/feed/${post.id}`, title: post.title || "Опрос", text: post.content, meta: `${post.poll?.total_votes ?? 0} голосов` }))} />}
        {activeTab === "Инициативы" && <TabList empty="Инициатив жителей пока нет." items={initiatives.map((post) => ({ id: post.id, href: `/initiatives/${post.initiative!.id}`, title: post.title || "Инициатива", text: post.content, meta: `Поддержали: ${post.initiative?.supporters ?? 0}` }))} />}

        {activeTab === "Сборы" && <div className="space-y-3">
          {activeFundraisers.length === 0 && <p className="rounded-2xl bg-gray-50 p-4 text-xs text-gray-500">Активных сборов нет.</p>}
            {activeFundraisers.map((f) => {
              const current = f.fundraiser?.current_amount || 0;
              const target = f.fundraiser?.target_amount || 1;
              const percent = Math.round((current / target) * 100);

              return (
                <div key={f.id} className="p-4 bg-white border border-gray-200 rounded-3xl space-y-3 shadow-xs">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-green-700">Официальный сбор</span>
                      <h4 className="font-bold text-gray-900 text-base mt-1">{f.title}</h4>
                    </div>
                    <span className="text-sm font-black text-green-700">{percent}%</span>
                  </div>
                  <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden">
                    <div className="bg-green-600 h-full rounded-full" style={{ width: `${Math.min(100, percent)}%` }} />
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <div><span className="text-gray-400">Подтверждено: </span><strong className="text-gray-900 font-bold">{current.toLocaleString("ru-RU")} ₸</strong></div>
                    <div><span className="text-gray-400">Цель: </span><strong className="text-gray-900 font-bold">{target.toLocaleString("ru-RU")} ₸</strong></div>
                  </div>
                  <Link
                    href={`/hoa/fundraisers/${f.fundraiser!.id}`}
                    className="w-full py-3 bg-green-600 hover:bg-green-700 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 shadow-xs transition"
                  >
                    Подробнее и взнос <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              );
            })}
        </div>}
      </div>
    </div>
  );
}

function TabList({ items, empty }: { items: Array<{ id: string; href: string; title: string; text: string; meta: string }>; empty: string }) {
  if (items.length === 0) return <p className="rounded-2xl bg-gray-50 p-4 text-xs text-gray-500">{empty}</p>;
  return (
    <div className="space-y-2">
      {items.map((item) => (
        <Link key={item.id} href={item.href} className="block rounded-2xl border border-gray-100 bg-gray-50 p-4 transition hover:border-green-200">
          <p className="text-[11px] text-gray-400">{item.meta}</p>
          <h4 className="mt-1 text-sm font-bold text-gray-900">{item.title}</h4>
          {item.text && <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-gray-600">{item.text}</p>}
        </Link>
      ))}
    </div>
  );
}
