"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, CheckCircle2, Circle, ThumbsUp, XCircle } from "lucide-react";
import { useAppStore } from "@/stores/appStore";
import { createClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/config";

const STAGES = [
  { id: "proposal", title: "Предложение", desc: "Житель предложил идею" },
  { id: "discussion", title: "Обсуждение", desc: "Соседи обсуждают и поддерживают" },
  { id: "voting", title: "Голосование жителей", desc: "Решение принимают собственники" },
  { id: "hoa_review", title: "Рассмотрение в ОСИ", desc: "Смета и технические условия" },
  { id: "approved", title: "Одобрено", desc: "ОСИ приняло решение" },
  { id: "fundraising", title: "Сбор средств", desc: "Финансирование работ" },
  { id: "implementation", title: "Реализация", desc: "Работы выполняются" },
  { id: "completed", title: "Завершено", desc: "Работы приняты" },
] as const;

const UUID_RE = /^[0-9a-f]{8}-([0-9a-f]{4}-){3}[0-9a-f]{12}$/i;

export default function InitiativeDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { posts, supportInitiative, currentUser } = useAppStore();
  const post = posts.find((item) => item.initiative?.id === id);
  const initiative = post?.initiative;
  const [supported, setSupported] = useState(false);

  useEffect(() => {
    if (!isSupabaseConfigured() || !UUID_RE.test(id) || !currentUser.id) return;
    void (async () => {
      const { count } = await createClient().from("initiative_supports")
        .select("id", { count: "exact", head: true }).eq("initiative_id", id).eq("user_id", currentUser.id);
      if (count) setSupported(true);
    })();
  }, [currentUser.id, id]);

  if (!post || !initiative) {
    return (
      <div className="min-h-screen bg-white p-6 flex flex-col items-center justify-center text-center gap-4">
        <p className="text-sm font-semibold text-gray-600">Инициатива не найдена</p>
        <Link href="/feed" className="text-sm font-bold text-green-700">Вернуться в ленту</Link>
      </div>
    );
  }

  const rejected = initiative.stage === "rejected";
  const currentIndex = STAGES.findIndex((stage) => stage.id === initiative.stage);
  const stages = STAGES.map((stage, index) => ({
    ...stage,
    completed: !rejected && index < currentIndex,
    current: !rejected && index === currentIndex,
  }));
  const currentStage = rejected ? "Отклонено" : STAGES[currentIndex]?.title || "Предложение";
  const initials = (post.author.full_name || "Ж").split(" ").map((part) => part.charAt(0)).join("").slice(0, 2).toUpperCase();

  return (
    <div className="min-h-screen bg-white pb-24">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white border-b border-gray-100 px-4 py-3 flex items-center justify-between">
        <Link href="/feed" className="text-gray-600 p-1 -ml-1">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <h1 className="font-semibold text-gray-900 text-sm">Инициатива</h1>
        <div className="w-5" />
      </div>

      <div className="p-4 space-y-5">
        {/* Заголовок и автор */}
        <div>
          <div className={`inline-block px-2.5 py-0.5 text-xs font-semibold rounded-full mb-2 ${rejected ? "bg-red-50 text-red-700" : "bg-green-50 text-green-700"}`}>
            {currentStage}
          </div>
          <h2 className="text-lg font-bold text-gray-900 leading-snug">
            {post.title || "Инициатива жителей"}
          </h2>

          <div className="flex items-center gap-3 mt-3">
            <div className="w-9 h-9 bg-green-100 rounded-full flex items-center justify-center font-medium text-green-800 text-xs">
              {initials}
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-900">{post.author.full_name || "Житель ЖК"}</p>
              <p className="text-[11px] text-gray-400">{post.territory === "entrance" ? "Подъезд" : "ЖК"} • {post.author.role === "hoa_official" ? "ОСИ" : "Житель"}</p>
            </div>
          </div>
        </div>

        {/* Описание */}
        <div className="text-sm text-gray-700 leading-relaxed bg-gray-50 p-4 rounded-2xl">
          {post.content || initiative.goal || "Описание инициативы пока не добавлено."}
        </div>

        {/* Таймлайн этапов */}
        <div>
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4">
            Этапы инициативы
          </h3>

          {rejected && <p className="mb-4 flex items-center gap-2 rounded-2xl bg-red-50 p-3 text-xs font-semibold text-red-700"><XCircle className="h-4 w-4" />ОСИ отклонило инициативу.</p>}
          <div className="space-y-6 relative before:absolute before:left-[11px] before:top-2 before:bottom-2 before:w-[2px] before:bg-gray-100">
            {stages.map((stage, idx) => (
              <div key={idx} className="relative flex items-start gap-3 pl-1">
                {stage.completed ? (
                  <CheckCircle2 className="w-5 h-5 text-green-600 bg-white relative z-10 shrink-0" />
                ) : stage.current ? (
                  <div className="w-5 h-5 rounded-full border-2 border-green-600 bg-white flex items-center justify-center relative z-10 shrink-0">
                    <div className="w-2 h-2 rounded-full bg-green-600" />
                  </div>
                ) : (
                  <Circle className="w-5 h-5 text-gray-300 bg-white relative z-10 shrink-0" />
                )}
                <div>
                  <p className={`text-xs font-semibold leading-tight ${stage.current ? "text-green-700" : stage.completed ? "text-gray-900" : "text-gray-400"}`}>
                    {stage.title}
                  </p>
                  <p className="text-[11px] text-gray-500 mt-0.5">{stage.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Статистика */}
        <div className="flex items-center justify-between py-3 border-y border-gray-100 text-xs text-gray-500">
          <span>Поддержали: <strong className="text-gray-900">{initiative.supporters || 0}</strong></span>
          <span>Комментарии: <strong className="text-gray-900">{post.comments_count || 0}</strong></span>
        </div>
      </div>

      {/* Фиксированная кнопка внизу */}
      <div className="fixed bottom-0 left-0 right-0 max-w-lg mx-auto p-4 bg-white/95 backdrop-blur-md border-t border-gray-100">
        <button
          onClick={() => {
            if (supported) return;
            supportInitiative(initiative.id);
            setSupported(true);
          }}
          disabled={supported || rejected || currentUser.role === "service_provider"}
          className={`w-full py-3.5 rounded-xl font-medium text-sm flex items-center justify-center gap-2 transition ${
            supported
              ? "bg-green-100 text-green-800"
              : "bg-green-600 text-white shadow-md hover:bg-green-700"
          }`}
        >
          <ThumbsUp className="w-4 h-4" />
          <span>{supported ? "Вы поддержали инициативу" : "Поддержать инициативу"}</span>
        </button>
      </div>
    </div>
  );
}
