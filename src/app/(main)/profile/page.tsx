"use client";

import { useState } from "react";
import Link from "next/link";
import Avatar from "@/components/ui/Avatar";
import { useRouter } from "next/navigation";
import { 
  ShieldCheck, 
  MapPin, 
  Phone, 
  Edit3, 
  Tag, 
  CreditCard, 
  Bell, 
  X,
  CheckCircle2,
  Calendar,
  Building2,
  Share2,
  LogOut
} from "lucide-react";
import { useAppStore } from "@/stores/appStore";
import { useOperationsStore } from "@/stores/operationsStore";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { complexName } from "@/lib/appConfig";
import { resizeAvatar, uploadAvatar } from "@/lib/avatar";

export default function ProfilePage() {
  const router = useRouter();
  const { currentUser, updateUser, posts, classifieds, logoutUser } = useAppStore();
  const { memberships, switchMembership, inviteFamily, syncMessage } = useOperationsStore();

  const [activeTab, setActiveTab] = useState<"posts" | "announcements" | "payments" | "settings">("posts");
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [invitePhone, setInvitePhone] = useState("");
  const [avatarBusy, setAvatarBusy] = useState(false);
  const [avatarError, setAvatarError] = useState("");

  const changeAvatar = async (file: File) => {
    setAvatarBusy(true); setAvatarError("");
    try {
      const avatarUrl = await uploadAvatar(currentUser.id, await resizeAvatar(file));
      useAppStore.setState((state) => ({ currentUser: { ...state.currentUser, avatarUrl } }));
    } catch (error) {
      setAvatarError(error instanceof Error ? error.message : "Не удалось сменить аватар");
    } finally {
      setAvatarBusy(false);
    }
  };

  // Edit form state
  const [editName, setEditName] = useState(currentUser.fullName);
  const [editPhone, setEditPhone] = useState(currentUser.phone);
  const [editApartment, setEditApartment] = useState(currentUser.apartmentNumber);
  const [editBuilding, setEditBuilding] = useState(currentUser.buildingNumber);

  const myPosts = posts.filter((p) => p.author_id === currentUser.id);

  const myClassifieds = classifieds.filter((item) => item.authorId === currentUser.id);

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    updateUser({
      fullName: editName,
      phone: editPhone,
      ...(!isSupabaseConfigured() && {
        apartmentNumber: editApartment,
        buildingNumber: editBuilding,
      }),
    });
    setIsEditModalOpen(false);
  };

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

  return (
    <div className="min-h-screen bg-[#fffefb] pb-12">
      {/* Обложка профиля (Cover Banner) */}
      <div className="relative h-44 overflow-hidden bg-[#173f2a] sm:h-52">
        <div className="absolute -right-16 -top-20 h-64 w-64 rounded-full bg-violet-500/25 blur-3xl" />
        <div className="absolute inset-0 opacity-15 bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:16px_16px]" />
        <div className="absolute top-4 right-4 flex gap-2">
          <button className="px-3 py-1.5 bg-black/30 hover:bg-black/50 backdrop-blur-md text-white text-xs font-bold rounded-xl flex items-center gap-1.5 transition">
            <Share2 className="w-3.5 h-3.5" /> Поделиться
          </button>
        </div>
      </div>

      {/* Информационная шапка профиля */}
      <div className="px-6 pb-6 relative">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 -mt-16 sm:-mt-20 mb-4">
          <div className="relative inline-block">
            <label className="block cursor-pointer" title="Сменить аватар">
              <Avatar url={currentUser.avatarUrl} name={currentUser.fullName} size={128} className="w-28 h-28 sm:w-32 sm:h-32 rounded-3xl ring-4 ring-white shadow-xl bg-white" />
              <span className="absolute left-1/2 top-2 -translate-x-1/2 rounded-full bg-stone-950/70 px-2 py-0.5 text-[10px] font-bold text-white">{avatarBusy ? "Загрузка…" : "Сменить"}</span>
              <input type="file" accept="image/*" className="sr-only" disabled={avatarBusy} onChange={(e) => { const file = e.target.files?.[0]; if (file) void changeAvatar(file); e.target.value = ""; }} />
            </label>
            {avatarError && <p role="alert" className="mt-2 max-w-40 text-[11px] font-semibold text-rose-700">{avatarError}</p>}
            {currentUser.verified && (
              <div className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-green-600 text-white flex items-center justify-center shadow-lg ring-2 ring-white">
                <ShieldCheck className="w-5 h-5" />
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsEditModalOpen(true)}
              className="px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-800 text-xs font-bold rounded-xl flex items-center gap-1.5 transition"
            >
              <Edit3 className="w-3.5 h-3.5" /> Редактировать
            </button>
            {!currentUser.verified ? (
              <Link
                href="/verify-resident"
                className="px-4 py-2.5 bg-green-600 hover:bg-green-700 text-white text-xs font-bold rounded-xl shadow-xs transition"
              >
                Подтвердить статус
              </Link>
            ) : (
              <span className="px-3.5 py-2 bg-green-50 text-green-700 text-xs font-bold rounded-xl flex items-center gap-1 border border-green-200">
                <CheckCircle2 className="w-3.5 h-3.5" /> Житель подтверждён
              </span>
            )}
          </div>
        </div>

        {/* Имя и данные */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-black text-gray-900 tracking-tight">
              {currentUser.fullName}
            </h1>
          </div>

          <div className="flex flex-wrap items-center gap-y-2 gap-x-4 text-xs font-medium text-gray-500">
            <span className="flex items-center gap-1.5 text-gray-700">
              <Building2 className="w-4 h-4 text-green-600" />
              ЖК «{complexName(currentUser.complexName)}», Дом {currentUser.buildingNumber}, Подъезд {currentUser.entranceNumber}, кв. {currentUser.apartmentNumber}
            </span>
            <span className="flex items-center gap-1.5">
              <Phone className="w-3.5 h-3.5 text-gray-400" />
              {currentUser.phone}
            </span>
          </div>
        </div>

        {/* Статистика жителя */}
        <div className="grid grid-cols-3 gap-3 my-6">
          <div className="p-3.5 rounded-2xl bg-gray-50 border border-gray-100 text-center">
            <p className="text-lg font-black text-gray-900">{myPosts.length}</p>
            <p className="text-[11px] font-semibold text-gray-500">Публикаций</p>
          </div>
          <div className="p-3.5 rounded-2xl bg-gray-50 border border-gray-100 text-center">
            <p className="text-lg font-black text-gray-900">{myClassifieds.length}</p>
            <p className="text-[11px] font-semibold text-gray-500">Объявлений</p>
          </div>
          <div className="p-3.5 rounded-2xl bg-gray-50 border border-gray-100 text-center">
            <p className="text-lg font-black text-green-600">{currentUser.verified ? "Да" : "Нет"}</p>
            <p className="text-[11px] font-semibold text-gray-500">Статус подтверждён</p>
          </div>
        </div>

        {/* Вкладки профиля */}
        <div className="flex border-b border-gray-200 gap-6 text-sm font-bold">
          {[
            { id: "posts", label: "Мои записи" },
            { id: "announcements", label: "Объявления" },
            { id: "payments", label: "История взносов" },
            { id: "settings", label: "Настройки" },
          ].map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`pb-3 border-b-2 transition ${
                  isActive
                    ? "border-green-600 text-green-700 font-extrabold"
                    : "border-transparent text-gray-500 hover:text-gray-900"
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Контент активной вкладки */}
        <div className="pt-6">
          {activeTab === "posts" && (
            <div className="space-y-4">
              {myPosts.length === 0 ? (
                <div className="p-12 text-center text-gray-400 bg-gray-50 rounded-3xl">
                  <p className="text-xs font-semibold">У вас пока нет опубликованных записей</p>
                  <Link href="/create" className="text-xs text-green-600 font-bold underline mt-1 inline-block">
                    Создать первую запись
                  </Link>
                </div>
              ) : (
                myPosts.map((p) => (
                  <div key={p.id} className="p-4 rounded-3xl bg-gray-50 border border-gray-100 space-y-2">
                    <p className="text-xs text-gray-800 leading-relaxed">{p.content}</p>
                    <div className="flex justify-between items-center text-[11px] text-gray-400 pt-2 border-t border-gray-200/50">
                      <span>Лайков: {p.reactions_count || 0}</span>
                      <span>Комментариев: {p.comments_count || 0}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {activeTab === "announcements" && (
            <div className="space-y-3">
              {myClassifieds.length === 0 ? <p className="rounded-2xl bg-gray-50 p-4 text-sm text-gray-600">У вас пока нет объявлений.</p> : myClassifieds.map((item) => (
                <Link key={item.id} href={`/classifieds/${item.id}`} className="block rounded-2xl border border-gray-100 p-4">
                  <h2 className="font-bold">{item.title}</h2><p className="text-sm text-green-700">{item.price}</p>
                </Link>
              ))}
            </div>
          )}

          {activeTab === "payments" && (
            <p className="rounded-2xl bg-gray-50 p-4 text-sm text-gray-600">
              История личных взносов пока не подключена. Для уточнения оплаты обратитесь в управление ЖК.
            </p>
          )}

          {activeTab === "settings" && (
            <div className="space-y-4 max-w-md">
              <section className="rounded-3xl border border-stone-200 bg-white p-4"><div className="flex items-center gap-3"><Building2 className="h-5 w-5 text-green-800" /><div><p className="text-sm font-black text-stone-950">Мои объекты</p><p className="text-[10px] text-stone-500">Можно привязать несколько квартир и ЖК</p></div></div><div className="mt-3 space-y-2">{memberships.map((membership) => <button key={membership.id} onClick={() => switchMembership(membership.id)} className={`w-full rounded-2xl border p-3 text-left transition ${membership.isActive ? "border-green-300 bg-green-50" : "border-stone-200 bg-stone-50"}`}><span className="flex items-center justify-between gap-2"><span className="text-xs font-extrabold text-stone-900">ЖК «{membership.complexName}»</span>{membership.isActive && <span className="rounded-full bg-green-700 px-2 py-1 text-[9px] font-extrabold text-white">Активен</span>}</span><span className="mt-1 block text-[10px] text-stone-500">Дом {membership.building} · подъезд {membership.entrance} · кв. {membership.apartment} · {membership.role === "owner" ? "собственник" : "член семьи"}</span></button>)}</div></section>
              <form onSubmit={(event) => { event.preventDefault(); if (invitePhone.trim()) { void inviteFamily(invitePhone.trim()); setInvitePhone(""); } }} className="rounded-3xl border border-violet-200 bg-violet-50 p-4"><p className="text-sm font-black text-violet-950">Пригласить члена семьи</p><p className="mt-1 text-[10px] leading-4 text-violet-700">Приглашённый получит роль только в выбранной квартире.</p><div className="mt-3 flex gap-2"><input type="tel" value={invitePhone} onChange={(event) => setInvitePhone(event.target.value)} placeholder="+7 777 000 00 00" className="min-h-11 min-w-0 flex-1 rounded-xl border border-violet-200 bg-white px-3 text-xs" /><button className="rounded-xl bg-violet-700 px-4 text-xs font-extrabold text-white">Пригласить</button></div>{syncMessage && <p className="mt-2 text-[10px] font-bold text-violet-800">{syncMessage}</p>}</form>
              <div className="flex items-center justify-between p-3.5 bg-gray-50 rounded-2xl">
                <div>
                  <p className="font-bold text-xs text-gray-900">Уведомления ОСИ</p>
                  <p className="text-[10px] text-gray-400">Плановые работы, отключения воды и электричества</p>
                </div>
                <span className="text-[10px] font-bold text-gray-400">В настройках ОСИ</span>
              </div>
              <div className="flex items-center justify-between p-3.5 bg-gray-50 rounded-2xl">
                <div>
                  <p className="font-bold text-xs text-gray-900">Контактный телефон</p>
                  <p className="text-[10px] text-gray-400">Телефон используется только как контакт в профиле</p>
                </div>
                <span className="text-[10px] font-bold text-gray-400">Не для входа</span>
              </div>
              <button
                type="button"
                onClick={handleLogout}
                disabled={isLoggingOut}
                className="w-full flex items-center justify-center gap-2 p-3.5 bg-red-50 hover:bg-red-100 text-red-700 rounded-2xl text-xs font-bold disabled:opacity-50 transition"
              >
                <LogOut className="w-4 h-4" />
                {isLoggingOut ? "Выход..." : "Выйти из аккаунта"}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Модалка редактирования профиля */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-md bg-white rounded-3xl p-6 space-y-4 shadow-2xl">
            <div className="flex justify-between items-center pb-2 border-b border-gray-100">
              <h3 className="font-bold text-gray-900 text-sm">Редактирование профиля жителя</h3>
              <button onClick={() => setIsEditModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveProfile} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Имя и Фамилия</label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-green-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Номер телефона</label>
                <input
                  type="tel"
                  value={editPhone}
                  onChange={(e) => setEditPhone(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-green-500"
                  required
                />
              </div>

              {isSupabaseConfigured() ? (
                <p className="rounded-xl bg-gray-50 p-3 text-xs leading-5 text-gray-600">
                  Адрес меняется через{" "}
                  <Link href="/verify-resident" className="font-bold text-green-700">подтверждение проживания</Link>:
                  управление ЖК проверит новый адрес.
                </p>
              ) : (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Дом №</label>
                  <input
                    type="text"
                    value={editBuilding}
                    onChange={(e) => setEditBuilding(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-green-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Квартира №</label>
                  <input
                    type="text"
                    value={editApartment}
                    onChange={(e) => setEditApartment(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-green-500"
                    required
                  />
                </div>
              </div>
              )}

              <div className="pt-2">
                <button
                  type="submit"
                  className="w-full py-3 bg-green-600 hover:bg-green-700 text-white font-bold text-xs rounded-xl shadow-md transition"
                >
                  Сохранить изменения
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
