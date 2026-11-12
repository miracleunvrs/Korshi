"use client";

import { useState } from "react";
import Link from "next/link";
import Avatar from "@/components/ui/Avatar";
import { usePathname, useRouter } from "next/navigation";
import {
  Home,
  MessageSquare,
  Tag,
  Building2,
  User,
  Plus,
  ShieldCheck,
  Settings,
  ShieldAlert,
  LogOut,
  ClipboardList,
  Bell,
  Siren,
  Grid2X2,
  KeyRound,
  Sparkles,
} from "lucide-react";
import { useAppStore } from "@/stores/appStore";
import { AI_ENABLED, complexName } from "@/lib/appConfig";

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const currentUser = useAppStore((s) => s.currentUser);
  const chats = useAppStore((s) => s.chats);
  const verificationRequests = useAppStore((s) => s.verificationRequests);
  const logoutUser = useAppStore((s) => s.logoutUser);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await logoutUser();
      router.replace("/login");
      router.refresh();
    } finally {
      setIsLoggingOut(false);
    }
  };

  const totalUnread = chats.reduce((acc, c) => acc + c.unreadCount, 0);
  const pendingRequests = verificationRequests.filter((r) => r.status === "pending").length;
  const activeServiceRequests = useAppStore((s) => s.serviceRequests.filter((request) => request.status === "submitted" || request.status === "in_progress").length);
  const unreadNotifications = useAppStore((s) => s.notifications.filter((notification) => !notification.isRead).length);

  // Документы, голосования, финансы и сборы собраны в «Мой дом»; доступ и
  // эксплуатация — в панели управления. Разделы без наполнения в меню не выводим.
  const isManager = currentUser.role === "admin" || currentUser.role === "hoa_official";
  const isDispatcher = currentUser.membershipRole === "dispatcher";
  const menuItems = [
    { href: "/feed", label: "Сегодня", icon: Home },
    { href: "/requests", label: "Заявки", icon: ClipboardList, badge: activeServiceRequests > 0 ? activeServiceRequests : undefined },
    { href: "/chats", label: "Чаты", icon: MessageSquare, badge: totalUnread > 0 ? totalUnread : undefined },
    { href: "/notifications", label: "Уведомления", icon: Bell, badge: unreadNotifications > 0 ? unreadNotifications : undefined },
    { href: "/hoa", label: "Мой дом", icon: Building2 },
    { href: "/services", label: "Сервисы дома", icon: Grid2X2 },
    { href: "/operations", label: "Доступ и парковка", icon: KeyRound },
    { href: "/classifieds", label: "Объявления и услуги", icon: Tag },
    { href: "/emergency", label: "Аварийный центр", icon: Siren },
    { href: "/profile", label: "Моя страница", icon: User },
    { href: "/settings", label: "Настройки", icon: Settings },
    { href: "/admin", label: "Панель управления", icon: ShieldAlert, badge: pendingRequests > 0 ? pendingRequests : undefined, visible: isManager },
    { href: "/ai", label: "Korshi AI", icon: Sparkles, visible: AI_ENABLED && (isManager || isDispatcher) },
  ];

  const visibleMenuItems = menuItems.filter((item) => item.visible !== false);

  return (
    <>
      <aside className="sticky top-0 hidden h-screen w-[270px] shrink-0 select-none flex-col justify-between overflow-y-auto border-r border-stone-200/80 bg-[#f8f7f2] p-4 md:flex">
        <div className="space-y-4">
          {/* Логотип ЖК */}
          <Link href="/feed" className="flex items-center gap-3 px-2 py-1 group">
            <div className="grid h-11 w-11 place-items-center rounded-2xl bg-[#173f2a] text-sm font-black text-white shadow-[0_10px_28px_rgba(23,63,42,.18)] transition-transform duration-200 group-hover:-translate-y-0.5">
              K
            </div>
            <div>
              <div className="flex items-center gap-1">
                <span className="text-base font-black leading-tight text-stone-950">{complexName(currentUser.complexName)}</span>
                <ShieldCheck className="h-4 w-4 shrink-0 text-green-700" />
              </div>
              <p className="text-[11px] font-semibold text-stone-600">Пространство соседей</p>
            </div>
          </Link>

          {/* Мини-профиль с кнопкой быстрой смены аккаунта */}
          <div className="space-y-2 rounded-[22px] border border-stone-200/80 bg-white p-2.5 shadow-[0_8px_28px_rgba(41,37,36,.04)]">
            <Link href="/profile" className="flex items-center gap-2.5 group">
              <Avatar url={currentUser.avatarUrl} name={currentUser.fullName} size={40} className="w-10 h-10 rounded-xl ring-2 ring-white shadow-xs shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="font-bold text-gray-900 text-xs truncate group-hover:text-green-700 transition">
                  {currentUser.fullName}
                </p>
                <p className="text-[10px] font-semibold text-green-700 truncate">
                  {currentUser.roleLabel || `Дом ${currentUser.buildingNumber}, кв. ${currentUser.apartmentNumber}`}
                </p>
              </div>
            </Link>

          </div>

          {/* Меню навигации */}
          <nav className="space-y-1">
            {visibleMenuItems.map((item) => {
              const isActive = pathname === item.href || (item.href !== "/feed" && pathname.startsWith(item.href));
              const Icon = item.icon;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex min-h-11 items-center justify-between rounded-2xl px-3.5 py-2.5 text-xs font-semibold transition duration-200 sm:text-sm ${
                    isActive
                      ? item.href === "/admin" ? "bg-stone-900 text-white font-bold" : "bg-green-800 text-white font-bold shadow-[0_8px_22px_rgba(22,101,52,.14)]"
                      : "text-stone-600 hover:bg-white hover:text-stone-950"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon className={`h-4 w-4 sm:h-5 sm:w-5 ${isActive ? "text-white stroke-[2.4]" : "text-stone-400 stroke-[1.8]"}`} />
                    <span>{item.label}</span>
                  </div>
                  {item.badge !== undefined && (
                    <span className={`px-2 py-0.5 rounded-full text-white text-[10px] font-black ${item.href === "/admin" ? "bg-amber-700" : "bg-green-700"}`}>
                      {item.badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>

          {/* Кнопка создания записи */}
          <Link
            href="/create"
            className="btn-press flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-violet-600 px-4 py-3 text-sm font-extrabold text-white shadow-[0_10px_24px_rgba(124,58,237,.18)] transition hover:-translate-y-0.5 hover:bg-violet-700"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>Создать запись</span>
          </Link>
        </div>

        {/* Футер сайдбара */}
        <div className="pt-4 border-t border-gray-100 space-y-3 px-2">
          <button
            type="button"
            onClick={handleLogout}
            disabled={isLoggingOut}
            className="w-full flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-bold text-red-600 hover:bg-red-50 disabled:opacity-50 transition"
          >
            <LogOut className="w-4 h-4" />
            {isLoggingOut ? "Выход..." : "Выйти из аккаунта"}
          </button>
          <div className="text-xs text-gray-600 flex items-center justify-between">
            <span>© 2026 Korshi</span>
            <Link href="/profile" className="hover:text-gray-800" aria-label="Настройки профиля">
              <Settings className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </aside>

    </>
  );
}
