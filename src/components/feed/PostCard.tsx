"use client";

import { useState } from "react";
import Link from "next/link";
import NextImage from "next/image";
import { formatDistanceToNow } from "date-fns";
import { ru } from "date-fns/locale";
import { 
  Heart, 
  MessageCircle, 
  Share2, 
  MoreHorizontal, 
  CheckCircle2, 
  ShieldCheck, 
  ArrowRight,
  Sparkles
} from "lucide-react";
import type { PostWithAuthor } from "@/types";
import { POST_TYPE_LABELS, INITIATIVE_STAGE_LABELS } from "@/types";

interface PostCardProps {
  post: PostWithAuthor;
  onVote?: (pollId: string, optionId: string) => void;
  onSupportInitiative?: (initiativeId: string) => void;
  onLike?: (postId: string) => void;
  onUnlike?: (postId: string) => void;
  onDelete?: (postId: string) => void;
}

export default function PostCard({ post, onVote, onSupportInitiative, onLike, onUnlike, onDelete }: PostCardProps) {
  const isLiked = Boolean(post.liked_by_me);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [shareState, setShareState] = useState<"idle" | "done">("idle");

  const territoryBadge = {
    complex: "Весь ЖК",
    building: "Мой дом",
    entrance: "Мой подъезд",
  }[post.territory] || "ЖК";

  let timeAgo = '';
  try {
    timeAgo = formatDistanceToNow(new Date(post.created_at), { addSuffix: true, locale: ru });
  } catch {
    timeAgo = 'недавно';
  }

  const sharePost = async () => {
    const url = `${window.location.origin}/feed/${post.id}`;
    try {
      if (navigator.share) await navigator.share({ title: post.title || "Публикация в Korshi", text: post.content, url });
      else await navigator.clipboard.writeText(url);
      setShareState("done");
      window.setTimeout(() => setShareState("idle"), 1800);
    } catch {
      // Пользователь мог закрыть системный диалог — это не ошибка публикации.
    }
  };

  return (
    <article className="reveal-up space-y-3 border-b border-stone-200/80 bg-[#fffefb] p-4 sm:p-5">
      {/* Шапка карточки: автор, статус, меню */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="relative w-10 h-10 rounded-full bg-green-50 flex items-center justify-center text-green-700 font-semibold overflow-hidden shrink-0">
            {post.author?.avatar_url ? (
              <NextImage src={post.author.avatar_url} alt={post.author.full_name || ""} fill sizes="40px" unoptimized className="object-cover" />
            ) : (
              <span>{post.author?.full_name?.charAt(0) || "U"}</span>
            )}
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-semibold text-sm text-gray-900 leading-tight">
                {post.author?.full_name || (post.is_official ? "Управление ЖК" : "Сосед")}
              </span>
              {post.is_official && (
                <ShieldCheck className="w-4 h-4 text-green-600 inline shrink-0" />
              )}
              {post.author?.verified && !post.is_official && (
                <CheckCircle2 className="w-3.5 h-3.5 text-green-600 inline shrink-0" />
              )}
            </div>
            <div className="mt-0.5 flex items-center gap-2 text-xs text-gray-600">
              <span>{territoryBadge}</span>
              <span>•</span>
              <span>
                {timeAgo}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <span className="text-[11px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 font-medium">
            {POST_TYPE_LABELS[post.type] || post.type}
          </span>
          {onDelete && (
            <button
              className="p-1 text-gray-600 hover:text-gray-800"
              aria-label="Снять публикацию"
              onClick={() => {
                if (window.confirm("Снять эту публикацию? Она исчезнет из ленты.")) onDelete(post.id);
              }}
            >
              <MoreHorizontal className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Заголовок публикации (если есть) */}
      {post.title && (
        <h2 className="font-semibold text-gray-900 text-base leading-snug">
          {post.title}
        </h2>
      )}

      {/* Текст контента */}
      <p className="text-gray-800 text-sm whitespace-pre-line leading-relaxed">
        {post.content}
      </p>

      {/* Фотографии / вложения */}
      {post.attachments && post.attachments.length > 0 && (
        <div className="rounded-xl overflow-hidden grid gap-1 mt-2">
          {post.attachments.map((att) => (
            <NextImage key={att.id} src={att.url} alt={att.name || "Фото"} width={1200} height={800} sizes="(max-width: 768px) 100vw, 768px" unoptimized className="h-auto w-full max-h-80 object-cover rounded-xl" />
          ))}
        </div>
      )}

      {/* Виджет: Опрос */}
      {post.type === "poll" || post.type === "official_poll" ? (
        <div className="mt-3 p-3.5 bg-gray-50 border border-gray-100 rounded-2xl space-y-2.5">
          {post.poll?.options?.map((option) => {
            const total = post.poll?.total_votes || 1;
            const percent = Math.round((option.votes_count / (total === 0 ? 1 : total)) * 100);
            const isChosen = selectedOption === option.id;

            return (
              <button
                key={option.id}
                onClick={() => setSelectedOption(option.id)}
                className={`w-full text-left relative overflow-hidden rounded-xl border p-3 transition-all ${
                  isChosen
                    ? "border-green-600 bg-green-50/50"
                    : "border-gray-200 bg-white hover:border-gray-300"
                }`}
              >
                <div
                  className="absolute left-0 top-0 bottom-0 bg-green-100/60 transition-all duration-300"
                  style={{ width: `${percent}%` }}
                />
                <div className="relative flex justify-between items-center text-xs font-medium z-10">
                  <span className="text-gray-900">{option.text}</span>
                  <span className="text-gray-600">{percent}%</span>
                </div>
              </button>
            );
          })}
          
          <button
            onClick={() => selectedOption && onVote && post.poll && onVote(post.poll.id, selectedOption)}
            disabled={!selectedOption}
            className="mt-2 w-full rounded-xl bg-green-700 py-2.5 text-xs font-medium text-white shadow-sm transition hover:bg-green-800 disabled:opacity-50"
          >
            Проголосовать
          </button>
        </div>
      ) : null}

      {/* Виджет: Инициатива */}
      {post.type === "initiative" && (
        <div className="mt-3 p-3.5 bg-emerald-50/60 border border-emerald-100 rounded-2xl space-y-2.5">
          <div className="flex items-center justify-between text-xs">
            <span className="text-emerald-800 font-semibold flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5" /> Этап инициативы
            </span>
            <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-full font-medium text-[11px]">
              {post.initiative?.stage ? INITIATIVE_STAGE_LABELS[post.initiative.stage] : "На рассмотрении"}
            </span>
          </div>

          {post.initiative?.goal && <p className="text-xs text-gray-600">{post.initiative.goal}</p>}

          <div className="grid grid-cols-4 gap-1" aria-label="Этапы инициативы">
            {["Предложено", "Обсуждение", "Решение", "Реализация"].map((label, index) => {
              const current = post.initiative?.stage === "proposal" ? 0 : post.initiative?.stage === "discussion" ? 1 : ["voting", "hoa_review", "approved", "fundraising"].includes(post.initiative?.stage || "") ? 2 : 3;
              return <div key={label} className="min-w-0"><div className={`h-1.5 rounded-full transition-colors duration-500 ${index <= current ? "bg-green-700" : "bg-emerald-100"}`} /><p className={`mt-1 truncate text-[9px] font-bold ${index <= current ? "text-green-800" : "text-stone-600"}`}>{label}</p></div>;
            })}
          </div>

          <div className="flex items-center justify-between pt-1">
            <span className="text-xs font-medium text-gray-600">
              Поддержали: <strong className="text-gray-900">{post.initiative?.supporters || 0} соседей</strong>
            </span>
            <button
              onClick={() => post.initiative && onSupportInitiative && onSupportInitiative(post.initiative.id)}
              className="rounded-lg bg-green-700 px-3.5 py-1.5 text-xs font-medium text-white transition hover:bg-green-800 active:scale-95"
            >
              Поддержать
            </button>
          </div>
        </div>
      )}

      {/* Виджет: Сбор средств */}
      {post.type === "fundraiser" && post.fundraiser && (
        <div className="mt-3 p-3.5 bg-amber-50/60 border border-amber-200/60 rounded-2xl space-y-2.5">
          {(() => {
            const progress = post.fundraiser.target_amount > 0
              ? (post.fundraiser.current_amount / post.fundraiser.target_amount) * 100
              : 0;

            return (
              <>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-amber-900 font-semibold">Активный сбор</span>
                  <span className="text-amber-700 font-medium">
                    {Math.round(progress)}% собрано
                  </span>
                </div>

                <div className="w-full bg-gray-200 h-2 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full bg-green-700 transition-all"
                    style={{
                      width: `${Math.min(100, progress)}%`,
                    }}
                  />
                </div>

                <div className="flex justify-between items-baseline">
                  <span className="text-base font-bold text-gray-900">
                    {post.fundraiser.current_amount.toLocaleString("ru-RU")} ₸
                  </span>
                  <span className="text-xs text-gray-600">
                    из {post.fundraiser.target_amount.toLocaleString("ru-RU")} ₸
                  </span>
                </div>
              </>
            );
          })()}

          <Link
            href={`/hoa/fundraisers/${post.fundraiser.id}`}
            className="mt-1 flex w-full items-center justify-center gap-1.5 rounded-xl bg-green-700 py-2.5 text-xs font-medium text-white transition hover:bg-green-800"
          >
            Внести свой вклад <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      )}

      {/* Нижняя панель действий (Лайки, комментарии, поделиться) */}
      <div className="flex items-center justify-between border-t border-gray-50 pt-2 text-xs text-gray-600">
        <div className="flex items-center gap-4">
          <button
            onClick={() => {
              if (isLiked) onUnlike?.(post.id);
              else onLike?.(post.id);
            }}
            className={`flex items-center gap-1.5 hover:text-red-500 transition ${isLiked ? "text-red-500 font-semibold" : ""}`}
          >
            <Heart className={`w-4 h-4 ${isLiked ? "fill-red-500" : ""}`} />
            <span>{post.reactions_count || 0}</span>
          </button>

          <Link href={`/feed/${post.id}`} className="flex items-center gap-1.5 hover:text-green-600 transition">
            <MessageCircle className="w-4 h-4" />
            <span>{post.comments_count || 0}</span>
          </Link>
        </div>

        <button onClick={sharePost} className="flex min-h-10 items-center gap-1.5 rounded-xl px-2 transition hover:bg-stone-100 hover:text-stone-800" aria-label="Поделиться публикацией">
          {shareState === "done" ? <CheckCircle2 className="h-4 w-4 text-green-700" /> : <Share2 className="h-4 w-4" />}
          <span>{shareState === "done" ? "Ссылка скопирована" : "Поделиться"}</span>
        </button>
      </div>
    </article>
  );
}
