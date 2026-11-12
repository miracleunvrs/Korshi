"use client";

import Link from "next/link";
import { ArrowRight, Building2, CheckCircle2, ClipboardCheck, PhoneCall, ShieldCheck, Vote } from "lucide-react";
import { usePathname } from "next/navigation";
import { APP_CONFIG, complexName } from "@/lib/appConfig";
import { useAppStore } from "@/stores/appStore";
import { useOperationsStore } from "@/stores/operationsStore";
import { activeVotes } from "@/features/dashboard/summary";

export default function RightWidgetPanel() {
  const pathname = usePathname();
  const currentUser = useAppStore((state) => state.currentUser);
  const requests = useAppStore((state) => state.serviceRequests);
  const activeRequests = requests.filter((item) => item.status === "submitted" || item.status === "in_progress");
  const latestRequest = activeRequests[0];
  const votes = useAppStore((state) => state.officialVotes);
  const alert = useAppStore((state) => state.urgentAlert);
  const managementPhone = useOperationsStore((state) => state.complexSettings.managementPhone);
  const currentVote = activeVotes(votes)[0];
  const isRequests = pathname.startsWith("/requests");

  return (
    <aside className="scrollbar-hide sticky top-0 hidden h-screen w-[324px] shrink-0 flex-col gap-3 overflow-y-auto bg-[#f8f7f2] p-4 lg:flex" aria-label="Актуальная информация о доме">
      <div className="rounded-[26px] bg-[#173f2a] p-4 text-white shadow-[0_16px_42px_rgba(23,63,42,.16)]">
        <div className="flex items-center gap-3">
          <div className="grid h-11 w-11 place-items-center rounded-2xl bg-white/12"><Building2 className="h-5 w-5" /></div>
          <div className="min-w-0">
            <div className="flex items-center gap-1"><h2 className="truncate text-sm font-extrabold">ОСИ «{complexName(currentUser.complexName)}»</h2><ShieldCheck className="h-4 w-4 text-emerald-300" /></div>
            <p className="mt-0.5 flex items-center gap-1.5 text-[11px] font-semibold text-emerald-100/75">Контакты управления ЖК</p>
          </div>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-2">
          <a href={`tel:${APP_CONFIG.emergencyPhone}`} className="rounded-2xl bg-white/9 p-3 transition hover:bg-white/14"><span className="block text-[10px] font-bold uppercase tracking-wider text-emerald-100/60">Аварийная</span><span className="mt-1 flex items-center gap-1.5 text-sm font-black"><PhoneCall className="h-3.5 w-3.5" />{APP_CONFIG.emergencyPhone}</span></a>
          {managementPhone.trim() ? <a href={`tel:${managementPhone.replace(/[^+\d]/g, "")}`} className="rounded-2xl bg-white/9 p-3"><span className="block text-[10px] font-bold uppercase">Управление</span><span className="mt-1 block break-words text-xs font-black">{managementPhone}</span></a> : <p className="rounded-2xl bg-white/9 p-3 text-xs">Телефон управления не указан</p>}
        </div>
      </div>

      <div className="rounded-[26px] border border-stone-200/80 bg-[#fffefb] p-4 shadow-[0_8px_30px_rgba(41,37,36,.045)]">
        <div className="flex items-center justify-between"><p className="flex items-center gap-2 text-xs font-extrabold text-stone-900"><ClipboardCheck className="h-4 w-4 text-green-800" />Мои заявки</p><span className="rounded-full bg-amber-50 px-2 py-1 text-[10px] font-black text-amber-800">{activeRequests.length} активных</span></div>
        {latestRequest ? <div className="mt-4"><p className="text-sm font-extrabold text-stone-900">{latestRequest.title}</p><p className="mt-1 text-xs leading-5 text-stone-500">{latestRequest.assigneeName ? `${latestRequest.assigneeName} · ` : ""}{latestRequest.status === "in_progress" ? "в работе" : "заявка принята"}</p><div className="mt-3 h-1.5 overflow-hidden rounded-full bg-stone-100"><div className={`h-full rounded-full bg-green-700 transition-all duration-700 ${latestRequest.status === "in_progress" ? "w-2/3" : "w-1/3"}`} /></div></div> : <p className="mt-4 text-xs text-stone-500">Активных заявок нет.</p>}
        <Link href="/requests" className="mt-4 flex min-h-10 items-center justify-between rounded-xl bg-stone-100 px-3 text-xs font-extrabold text-stone-800 transition hover:bg-stone-200">{isRequests ? "Создать новую" : "Открыть заявки"}<ArrowRight className="h-3.5 w-3.5" /></Link>
      </div>

      {currentVote && <div className="rounded-[26px] border border-violet-100 bg-violet-50/70 p-4">
        <p className="flex items-center gap-2 text-xs font-extrabold text-violet-950"><Vote className="h-4 w-4" />Открытое голосование</p>
        <h3 className="mt-3 text-sm font-extrabold text-stone-950">{currentVote.title}</h3>
        <p className="mt-1 text-xs text-stone-600">До {new Date(currentVote.endsAt).toLocaleDateString("ru-RU")}</p>
        <Link href="/votes" className="mt-4 flex min-h-10 items-center justify-center rounded-xl bg-violet-600 px-3 text-xs font-extrabold text-white">Открыть голосования</Link>
      </div>}

      <div className="rounded-[26px] border border-stone-200/80 bg-white p-4">
        <p className="flex items-center gap-2 text-xs font-extrabold text-stone-900"><CheckCircle2 className="h-4 w-4 text-green-700" />{alert?.active ? alert.title : "Аварийные сообщения"}</p>
        <p className="mt-2 text-xs leading-5 text-stone-500">{alert?.active ? alert.message : "Проверьте опубликованные сообщения и экстренные контакты."}</p>
        <Link href="/emergency" className="mt-3 inline-block text-xs font-bold text-green-800 underline">Открыть аварийный центр</Link>
      </div>
    </aside>
  );
}
