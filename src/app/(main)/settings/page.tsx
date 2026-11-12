"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Bell, Building2, KeyRound, LogOut, UserRound } from "lucide-react";
import Avatar from "@/components/ui/Avatar";
import { useAppStore } from "@/stores/appStore";
import { useOperationsStore, type NotificationChannels } from "@/stores/operationsStore";
import { createClient } from "@/lib/supabase/client";
import { resizeAvatar, uploadAvatar } from "@/lib/avatar";

const CHANNELS: Array<{ key: keyof NotificationChannels; label: string; hint: string }> = [
  { key: "push", label: "Push-уведомления", hint: "Сообщения, заявки и ответы ОСИ на телефон" },
  { key: "voting", label: "Голосования", hint: "Новые голосования и итоги" },
  { key: "payments", label: "Сборы и платежи", hint: "Новые сборы и подтверждения оплат" },
  { key: "emailCritical", label: "Важное на email", hint: "Аварии и отключения" },
  { key: "smsCritical", label: "Важное по SMS", hint: "Аварии и отключения" },
];

function Section({ icon: Icon, title, children }: { icon: typeof Bell; title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-3xl border border-stone-200 bg-white p-4">
      <h2 className="flex items-center gap-2 text-sm font-black text-stone-950"><Icon className="h-4 w-4 text-green-800" />{title}</h2>
      <div className="mt-3 space-y-3">{children}</div>
    </section>
  );
}

export default function SettingsPage() {
  const router = useRouter();
  const { currentUser, updateUser, logoutUser } = useAppStore();
  const { memberships, switchMembership, inviteFamily, syncMessage, notificationChannels, setNotificationChannel } = useOperationsStore();
  const [fullName, setFullName] = useState(currentUser.fullName);
  const [phone, setPhone] = useState(currentUser.phone);
  const [bio, setBio] = useState(currentUser.bio ?? "");
  const [profileSaved, setProfileSaved] = useState("");
  const [avatarBusy, setAvatarBusy] = useState(false);
  const [password, setPassword] = useState("");
  const [passwordState, setPasswordState] = useState("");
  const [invitePhone, setInvitePhone] = useState("");
  const [error, setError] = useState("");

  const changeAvatar = async (file: File) => {
    setAvatarBusy(true); setError("");
    try {
      const avatarUrl = await uploadAvatar(currentUser.id, await resizeAvatar(file));
      useAppStore.setState((state) => ({ currentUser: { ...state.currentUser, avatarUrl } }));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Не удалось сменить аватар");
    } finally {
      setAvatarBusy(false);
    }
  };

  const saveProfile = (event: React.FormEvent) => {
    event.preventDefault();
    if (fullName.trim().length < 2) { setError("Укажите имя"); return; }
    setError("");
    updateUser({ fullName: fullName.trim(), phone: phone.trim(), bio: bio.trim() });
    setProfileSaved("Сохранено");
  };

  const changePassword = async (event: React.FormEvent) => {
    event.preventDefault();
    if (password.length < 8) { setPasswordState("Пароль — минимум 8 символов"); return; }
    const { error: updateError } = await createClient().auth.updateUser({ password });
    setPassword("");
    setPasswordState(updateError ? updateError.message : "Пароль изменён");
  };

  const toggleChannel = (key: keyof NotificationChannels) =>
    void setNotificationChannel(key, !notificationChannels[key]).catch((cause) => setError(cause instanceof Error ? cause.message : "Не удалось сохранить настройку"));

  const logout = async () => {
    await logoutUser();
    router.replace("/login");
    router.refresh();
  };

  return (
    <div className="min-h-screen bg-[#fffefb] px-4 py-5 sm:px-6">
      <h1 className="text-2xl font-black tracking-[-0.035em] text-stone-950">Настройки</h1>
      {error && <p role="alert" className="mt-3 rounded-2xl bg-rose-50 p-3 text-xs font-bold text-rose-800">{error}</p>}

      <div className="mt-5 max-w-xl space-y-4">
        <Section icon={UserRound} title="Профиль">
          <label className="flex cursor-pointer items-center gap-3">
            <Avatar url={currentUser.avatarUrl} name={currentUser.fullName} size={64} className="h-16 w-16 rounded-2xl" />
            <span className="text-xs font-bold text-green-800">{avatarBusy ? "Загрузка…" : "Сменить аватар"}</span>
            <input type="file" accept="image/*" className="sr-only" disabled={avatarBusy}
              onChange={(event) => { const file = event.target.files?.[0]; if (file) void changeAvatar(file); event.target.value = ""; }} />
          </label>
          <form onSubmit={saveProfile} className="space-y-3">
            <label className="block text-xs font-bold text-stone-700">Имя<input value={fullName} onChange={(event) => { setFullName(event.target.value); setProfileSaved(""); }} className="mt-1 min-h-11 w-full rounded-xl border border-stone-200 px-3 text-sm" /></label>
            <label className="block text-xs font-bold text-stone-700">Телефон<input type="tel" value={phone} onChange={(event) => { setPhone(event.target.value); setProfileSaved(""); }} className="mt-1 min-h-11 w-full rounded-xl border border-stone-200 px-3 text-sm" /></label>
            <label className="block text-xs font-bold text-stone-700">О себе<textarea value={bio} onChange={(event) => { setBio(event.target.value); setProfileSaved(""); }} rows={2} maxLength={300} className="mt-1 w-full rounded-xl border border-stone-200 px-3 py-2 text-sm" /></label>
            <div className="flex items-center gap-3"><button className="rounded-xl bg-green-800 px-4 py-2.5 text-xs font-extrabold text-white hover:bg-green-900">Сохранить</button>{profileSaved && <span className="text-xs font-bold text-green-800">{profileSaved}</span>}</div>
          </form>
        </Section>

        <Section icon={Bell} title="Уведомления">
          {CHANNELS.map((channel) => (
            <button key={channel.key} type="button" role="switch" aria-checked={notificationChannels[channel.key]} onClick={() => toggleChannel(channel.key)}
              className="flex w-full items-center justify-between gap-3 rounded-2xl bg-stone-50 p-3 text-left">
              <span><span className="block text-xs font-bold text-stone-900">{channel.label}</span><span className="block text-[11px] text-stone-500">{channel.hint}</span></span>
              <span className={`relative h-6 w-11 shrink-0 rounded-full transition ${notificationChannels[channel.key] ? "bg-green-700" : "bg-stone-300"}`}>
                <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition ${notificationChannels[channel.key] ? "left-[22px]" : "left-0.5"}`} />
              </span>
            </button>
          ))}
        </Section>

        <Section icon={Building2} title="Мои объекты и семья">
      <section className="rounded-3xl border border-stone-200 bg-white p-4"><div className="flex items-center gap-3"><Building2 className="h-5 w-5 text-green-800" /><div><p className="text-sm font-black text-stone-950">Мои объекты</p><p className="text-[10px] text-stone-500">Можно привязать несколько квартир и ЖК</p></div></div><div className="mt-3 space-y-2">{memberships.map((membership) => <button key={membership.id} onClick={() => switchMembership(membership.id)} className={`w-full rounded-2xl border p-3 text-left transition ${membership.isActive ? "border-green-300 bg-green-50" : "border-stone-200 bg-stone-50"}`}><span className="flex items-center justify-between gap-2"><span className="text-xs font-extrabold text-stone-900">ЖК «{membership.complexName}»</span>{membership.isActive && <span className="rounded-full bg-green-700 px-2 py-1 text-[9px] font-extrabold text-white">Активен</span>}</span><span className="mt-1 block text-[10px] text-stone-500">Дом {membership.building} · подъезд {membership.entrance} · кв. {membership.apartment} · {membership.role === "owner" ? "собственник" : "член семьи"}</span></button>)}</div></section>
      <form onSubmit={(event) => { event.preventDefault(); if (invitePhone.trim()) { void inviteFamily(invitePhone.trim()); setInvitePhone(""); } }} className="rounded-3xl border border-violet-200 bg-violet-50 p-4"><p className="text-sm font-black text-violet-950">Пригласить члена семьи</p><p className="mt-1 text-[10px] leading-4 text-violet-700">Приглашённый получит роль только в выбранной квартире.</p><div className="mt-3 flex gap-2"><input type="tel" value={invitePhone} onChange={(event) => setInvitePhone(event.target.value)} placeholder="+7 777 000 00 00" className="min-h-11 min-w-0 flex-1 rounded-xl border border-violet-200 bg-white px-3 text-xs" /><button className="rounded-xl bg-violet-700 px-4 text-xs font-extrabold text-white">Пригласить</button></div>{syncMessage && <p className="mt-2 text-[10px] font-bold text-violet-800">{syncMessage}</p>}</form>
        </Section>

        <Section icon={KeyRound} title="Безопасность">
          <p className="text-xs text-stone-600">Вход: {currentUser.email}</p>
          <form onSubmit={(event) => void changePassword(event)} className="flex gap-2">
            <input type="password" autoComplete="new-password" value={password} onChange={(event) => { setPassword(event.target.value); setPasswordState(""); }} placeholder="Новый пароль"
              className="min-h-11 min-w-0 flex-1 rounded-xl border border-stone-200 px-3 text-sm" />
            <button className="rounded-xl bg-stone-900 px-4 text-xs font-extrabold text-white">Сменить</button>
          </form>
          {passwordState && <p className="text-xs font-bold text-stone-700">{passwordState}</p>}
        </Section>

        <button type="button" onClick={() => void logout()}
          className="flex w-full items-center justify-center gap-2 rounded-2xl bg-red-50 p-3.5 text-xs font-bold text-red-700 hover:bg-red-100">
          <LogOut className="h-4 w-4" /> Выйти из аккаунта
        </button>
      </div>
    </div>
  );
}
