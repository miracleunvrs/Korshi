"use client";

import { useState } from "react";
import NextImage from "next/image";
import { 
  Bell, 
  SlidersHorizontal, 
  Image as ImageIcon, 
  BarChart3, 
  Lightbulb, 
  Tag, 
  Send,
  Sparkles,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2
} from "lucide-react";
import Link from "next/link";
import PostCard from "@/components/feed/PostCard";
import FeedFilterModal from "@/components/feed/FeedFilterModal";
import { useAppStore } from "@/stores/appStore";
import type { PostWithAuthor } from "@/types";
import TodayOverview from "@/components/feed/TodayOverview";
import { complexName } from "@/lib/appConfig";

export default function FeedPage() {
  const [activeChip, setActiveChip] = useState("Весь ЖК");
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const [selectedTerritory, setSelectedTerritory] = useState("all");
  const [selectedType, setSelectedType] = useState("all");
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [visibleCount, setVisibleCount] = useState(12);

  // Quick post creator state
  const [quickPostText, setQuickPostText] = useState("");
  const [quickPostType, setQuickPostType] = useState<"post" | "announcement" | "poll">("post");

  const { posts, addPost, deletePost, likePost, unlikePost, votePoll, supportInitiative, currentUser, urgentAlert, acknowledgeUrgentAlert, notifications, markNotificationRead } = useAppStore();
  const unreadNotifications = notifications.filter((notification) => !notification.isRead).length;

  const chips = ["Весь ЖК", "Мой дом", "Мой подъезд", "Официальное", "Объявления", "Опросы"];

  const handleQuickPostSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickPostText.trim()) return;

    const newPost: PostWithAuthor = {
      id: `post-${Date.now()}`,
      author_id: currentUser.id,
      complex_id: currentUser.complexId || "complex-1",
      building_id: currentUser.buildingId || `building-${currentUser.buildingNumber}`,
      entrance_id: null,
      type: quickPostType,
      title: null,
      content: quickPostText.trim(),
      status: "active",
      is_official: currentUser.role === "hoa_official",
      territory: "complex",
      price: null,
      currency: null,
      views_count: 1,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      author: {
        id: currentUser.id,
        full_name: currentUser.fullName,
        avatar_url: currentUser.avatarUrl || null,
        role: currentUser.role,
        verified: currentUser.verified,
      },
      reactions_count: 0,
      comments_count: 0,
    };

    addPost(newPost);
    setQuickPostText("");
  };

  const filteredPosts = posts.filter((post) => {
    // Чип фильтрация
    if (activeChip === "Мой дом" && post.territory !== "building" && post.territory !== "complex") return false;
    if (activeChip === "Мой подъезд" && post.territory !== "entrance") return false;
    if (activeChip === "Официальное" && !post.is_official) return false;
    if (activeChip === "Объявления" && post.type !== "announcement" && post.type !== "service") return false;
    if (activeChip === "Опросы" && post.type !== "poll" && post.type !== "official_poll") return false;

    // Модальные фильтры
    if (selectedTerritory === "building" && post.territory !== "building") return false;
    if (selectedTerritory === "entrance" && post.territory !== "entrance") return false;

    if (selectedType === "post" && post.type !== "post") return false;
    if (selectedType === "announcement" && post.type !== "announcement") return false;
    if (selectedType === "service" && post.type !== "service") return false;
    if (selectedType === "poll_initiative" && post.type !== "poll" && post.type !== "official_poll" && post.type !== "initiative") return false;
    if (selectedType === "official" && !post.is_official) return false;

    return true;
  });

  const handleResetFilters = () => {
    setSelectedTerritory("all");
    setSelectedType("all");
    setActiveChip("Весь ЖК");
    setVisibleCount(12);
  };

  return (
    <div className="min-h-screen min-w-0 bg-[#fffefb]">
      <TodayOverview />
      {/* Шапка ленты */}
      <div className="glass-nav sticky top-16 z-20 space-y-3 border-b border-stone-200/80 px-4 py-3.5 sm:px-6 md:top-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-black tracking-[-0.02em] text-stone-950 sm:text-xl">Лента соседей</h1>
            <span className="hidden rounded-full bg-green-50 px-2 py-0.5 text-xs font-bold text-green-800 min-[430px]:inline">
              {complexName(currentUser.complexName)}
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setIsFilterModalOpen(true)}
              className="flex min-h-10 items-center gap-1.5 rounded-xl bg-stone-100 px-3 py-1.5 text-xs font-bold text-stone-700 transition hover:bg-stone-200"
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span className="hidden min-[370px]:inline">Фильтры</span>
            </button>
            <button
              onClick={() => setNotificationsOpen((open) => !open)}
              className="relative w-8 h-8 flex items-center justify-center text-gray-600 hover:bg-gray-100 rounded-full transition"
              aria-label="Уведомления"
              aria-expanded={notificationsOpen}
            >
              <Bell className="w-4 h-4" />
              {unreadNotifications > 0 && (
                <span className="absolute mt-[-18px] ml-5 min-w-4 h-4 px-1 rounded-full bg-red-500 text-white text-[9px] font-black leading-4">
                  {unreadNotifications > 9 ? "9+" : unreadNotifications}
                </span>
              )}
            </button>
          </div>
        </div>

        {notificationsOpen && (
          <div className="absolute right-4 sm:right-6 top-14 z-30 w-[min(22rem,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
              <p className="text-sm font-extrabold text-gray-900">Уведомления</p>
              {unreadNotifications > 0 && <span className="text-xs font-bold text-green-800">{unreadNotifications} новых</span>}
            </div>
            <div className="max-h-80 overflow-y-auto">
              {notifications.length === 0 ? (
                <p className="px-4 py-8 text-center text-sm text-gray-500">Пока уведомлений нет</p>
              ) : notifications.map((notification) => (
                <button
                  key={notification.id}
                  onClick={() => { void markNotificationRead(notification.id).catch(() => undefined); }}
                  className={`w-full border-b border-gray-50 px-4 py-3 text-left transition hover:bg-gray-50 ${notification.isRead ? "opacity-60" : "bg-green-50/60"}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <p className="text-sm font-bold text-gray-900">{notification.title}</p>
                    <span className="shrink-0 text-[10px] text-gray-600">{notification.createdAt}</span>
                  </div>
                  {notification.body && <p className="mt-1 text-xs leading-relaxed text-gray-600">{notification.body}</p>}
                </button>
              ))}
            </div>
            <Link href="/notifications" className="flex min-h-11 items-center justify-center border-t border-stone-100 text-xs font-extrabold text-green-800 transition hover:bg-green-50">
              Все уведомления и настройки
            </Link>
          </div>
        )}

        {/* Чипы фильтрации по аудитории */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-hide">
          {chips.map((chip) => {
            const isActive = activeChip === chip;
            return (
              <button
                key={chip}
                onClick={() => setActiveChip(chip)}
                className={`min-h-9 shrink-0 rounded-full px-3.5 py-1.5 text-xs font-bold transition ${
                  isActive
                    ? "bg-green-800 text-white shadow-sm"
                    : "bg-stone-100 text-stone-600 hover:bg-stone-200 hover:text-stone-900"
                }`}
              >
                {chip}
              </button>
            );
          })}
        </div>
      </div>

      {/* Экстренное оповещение ОСИ (Красная плашка) */}
      {urgentAlert?.active && (
        <div className="reveal-up m-4 flex items-start justify-between gap-3 rounded-[24px] bg-rose-700 p-4 text-white shadow-[0_16px_38px_rgba(190,18,60,.18)] sm:m-5">
          <div className="flex min-w-0 items-start gap-3">
            <div className="w-9 h-9 rounded-2xl bg-white/20 flex items-center justify-center shrink-0">
              <AlertTriangle className="w-5 h-5 text-white" />
            </div>
            <div className="min-w-0 space-y-0.5">
              <div className="flex items-center gap-2">
                <span className="rounded-full bg-rose-950/40 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-white">
                  Срочно от ОСИ
                </span>
                <span className="text-[10px] text-white">{urgentAlert.createdAt}</span>
              </div>
              <h3 className="font-extrabold text-sm leading-snug">{urgentAlert.title}</h3>
              <p className="pt-0.5 text-xs leading-relaxed text-white">{urgentAlert.message}</p>
              <Link href="/emergency" className="mt-2 inline-flex min-h-9 items-center rounded-xl bg-rose-950/40 px-3 text-[11px] font-extrabold text-white hover:bg-rose-950/55">Подробнее и контакты</Link>
            </div>
          </div>
          <button
            onClick={() => { void acknowledgeUrgentAlert().catch(() => undefined); }}
            className="text-white/80 hover:text-white p-1 hover:bg-white/10 rounded-full transition"
            aria-label="Подтвердить ознакомление"
          >
            <CheckCircle2 className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Быстрое создание записи (как в ВК) */}
      <div className="border-b border-stone-200/80 bg-[#fffefb] p-4 sm:p-5">
        <form onSubmit={handleQuickPostSubmit} className="space-y-3">
          <div className="flex min-w-0 items-start gap-3">
            <NextImage
              src={currentUser.avatarUrl || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80"}
              alt=""
              width={40}
              height={40}
              unoptimized
              className="h-10 w-10 shrink-0 rounded-xl object-cover ring-2 ring-stone-100"
            />
            <textarea
              rows={2}
              value={quickPostText}
              onChange={(e) => setQuickPostText(e.target.value)}
              placeholder={`Что нового в ЖК, ${currentUser.fullName.split(" ")[0]}? Поделитесь с соседями...`}
              className="min-w-0 flex-1 resize-none rounded-2xl border border-stone-200 bg-stone-50 p-3 text-sm outline-none transition hover:bg-stone-100/70 focus:border-green-700 focus:bg-white focus:ring-2 focus:ring-green-700/15"
            />
          </div>

          <div className="flex min-w-0 items-center justify-between gap-2 pt-1">
            <div className="flex min-w-0 items-center gap-0.5 sm:gap-1.5">
              <button
                type="button"
                onClick={() => setQuickPostType("post")}
                className={`flex min-h-10 items-center gap-1.5 rounded-xl px-2 py-1.5 text-xs font-semibold transition sm:px-3 ${
                  quickPostType === "post" ? "bg-green-50 text-green-700 font-bold" : "text-gray-500 hover:bg-gray-100"
                }`}
              >
                <ImageIcon className="w-3.5 h-3.5 text-green-800" />
                <span className="hidden min-[360px]:inline">Фото</span>
              </button>
              <Link
                href="/create"
                aria-label="Создать опрос"
                className="flex min-h-10 items-center gap-1.5 rounded-xl px-2 py-1.5 text-xs font-semibold text-stone-500 transition hover:bg-stone-100 sm:px-3"
              >
                <BarChart3 className="w-3.5 h-3.5 text-blue-600" />
                <span className="hidden min-[420px]:inline">Опрос</span>
              </Link>
              <Link
                href="/create"
                aria-label="Создать инициативу"
                className="flex min-h-10 items-center gap-1.5 rounded-xl px-2 py-1.5 text-xs font-semibold text-stone-500 transition hover:bg-stone-100 sm:px-3"
              >
                <Lightbulb className="w-3.5 h-3.5 text-amber-600" />
                <span className="hidden min-[520px]:inline">Инициатива</span>
              </Link>
            </div>

            <button
              type="submit"
              disabled={!quickPostText.trim()}
              className="flex min-h-10 shrink-0 items-center gap-1.5 rounded-xl bg-green-800 px-3 py-2 text-xs font-bold text-white shadow-sm transition hover:bg-green-900 active:scale-95 disabled:opacity-40 sm:px-4"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Опубликовать</span>
            </button>
          </div>
        </form>
      </div>

      {/* Список постов */}
      <div className="divide-y divide-gray-100">
        {filteredPosts.length === 0 ? (
          <div className="p-16 text-center text-gray-600 space-y-3">
            <p className="text-sm font-semibold">Публикаций по выбранным фильтрам не найдено</p>
            <button
              onClick={handleResetFilters}
              className="text-xs text-green-800 font-bold underline"
            >
              Сбросить фильтры
            </button>
          </div>
        ) : (
          <>
            {filteredPosts.slice(0, visibleCount).map((post) => (
              <div key={post.id} className="virtual-feed-item border-b border-stone-100 last:border-b-0">
                <PostCard
                  post={post}
                  onVote={(pollId, optionId) => votePoll(post.id, optionId)}
                  onSupportInitiative={(initiativeId) => supportInitiative(initiativeId)}
                  onLike={likePost}
                  onUnlike={unlikePost}
                  onDelete={post.author_id === currentUser.id ? deletePost : undefined}
                />
              </div>
            ))}
            {visibleCount < filteredPosts.length && <div className="p-4"><button onClick={() => setVisibleCount((value) => value + 12)} className="min-h-12 w-full rounded-2xl border border-stone-200 bg-white text-sm font-extrabold text-green-800 hover:bg-green-50">Показать ещё</button></div>}
          </>
        )}
      </div>

      {/* Модалка фильтров */}
      <FeedFilterModal
        isOpen={isFilterModalOpen}
        onClose={() => setIsFilterModalOpen(false)}
        selectedTerritory={selectedTerritory}
        onSelectTerritory={setSelectedTerritory}
        selectedType={selectedType}
        onSelectType={setSelectedType}
        onReset={handleResetFilters}
      />
    </div>
  );
}
