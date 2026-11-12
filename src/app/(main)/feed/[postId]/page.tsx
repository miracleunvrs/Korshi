"use client";

import { useState, use } from "react";
import Link from "next/link";
import NextImage from "next/image";
import Avatar from "@/components/ui/Avatar";
import { ArrowLeft, Send, Heart, Share2, MoreHorizontal, ShieldCheck, CheckCircle2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ru } from "date-fns/locale";
import { useAppStore } from "@/stores/appStore";

export default function PostDetailPage({ params }: { params: Promise<{ postId: string }> }) {
  const resolvedParams = use(params);
  const postId = resolvedParams.postId;

  const { posts, postComments, addComment, deleteComment, currentUser } = useAppStore();
  const [commentText, setCommentText] = useState("");

  const post = posts.find((p) => p.id === postId);

  if (!post) {
    return (
      <div className="min-h-screen bg-white flex flex-col">
        <div className="sticky top-0 z-20 bg-white/95 backdrop-blur-md border-b border-gray-100 px-6 py-3.5 flex items-center gap-3 shadow-xs">
          <Link href="/feed" className="text-gray-600 p-1 -ml-1 hover:text-gray-900 transition">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <h1 className="font-bold text-gray-900 text-sm">Публикация</h1>
        </div>
        <div className="flex-1 flex items-center justify-center p-6 text-center">
          <div className="space-y-2">
            <p className="text-sm font-bold text-gray-900">Публикация не найдена</p>
            <p className="text-xs text-gray-500">Она могла быть удалена или ещё загружается.</p>
            <Link href="/feed" className="inline-block mt-3 text-xs font-bold text-green-600 hover:text-green-700">
              Вернуться в ленту
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const comments = postComments[post.id] || [];

  const handleSendComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim()) return;

    addComment(post.id, commentText.trim());
    setCommentText("");
  };

  return (
    <div className="min-h-screen bg-white pb-24 flex flex-col">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-white/95 backdrop-blur-md border-b border-gray-100 px-6 py-3.5 flex items-center justify-between shadow-xs">
        <Link href="/feed" className="text-gray-600 p-1 -ml-1 hover:text-gray-900 transition">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <h1 className="font-bold text-gray-900 text-sm">Обсуждение публикации</h1>
        <button className="text-gray-400 p-1 hover:text-gray-600">
          <Share2 className="w-4 h-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* Карточка поста */}
        <div className="p-6 border-b border-gray-100 space-y-4">
          <div className="flex items-center gap-3">
            <Avatar url={post.author?.avatar_url} name={post.author?.full_name || "Сосед"} size={44} className="w-11 h-11 rounded-2xl ring-2 ring-gray-100 shadow-xs" />
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold text-sm text-gray-900">
                  {post.author?.full_name || (post.is_official ? "Управление ЖК" : "Сосед")}
                </span>
                {post.is_official ? (
                  <ShieldCheck className="w-4 h-4 text-green-600 inline" />
                ) : (
                  <CheckCircle2 className="w-3.5 h-3.5 text-green-600 inline" />
                )}
              </div>
              <p className="text-[11px] text-gray-400">
                {formatDistanceToNow(new Date(post.created_at), { addSuffix: true, locale: ru })}
              </p>
            </div>
          </div>

          {post.title && (
            <h2 className="font-black text-gray-900 text-base leading-snug">{post.title}</h2>
          )}

          <p className="text-xs sm:text-sm text-gray-800 leading-relaxed whitespace-pre-line">
            {post.content}
          </p>

          {post.attachments && post.attachments.length > 0 && (
            <div className="rounded-3xl overflow-hidden mt-2 shadow-xs">
              <NextImage
                src={post.attachments[0].url}
                alt="Фото"
                width={1200}
                height={800}
                sizes="(max-width: 768px) 100vw, 768px"
                unoptimized
                className="h-auto w-full max-h-80 object-cover rounded-3xl"
              />
            </div>
          )}
        </div>

        {/* Секция комментариев */}
        <div className="p-6 space-y-4">
          <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">
            Комментарии ({comments.length})
          </h3>

          <div className="space-y-3">
            {comments.length === 0 ? (
              <div className="p-8 text-center bg-gray-50 rounded-2xl text-gray-400 text-xs">
                Пока нет комментариев. Напишите первым!
              </div>
            ) : (
              comments.map((c) => (
                <div key={c.id} className="flex gap-3 bg-gray-50/80 p-3.5 rounded-2xl border border-gray-100">
                  <div className="w-8 h-8 rounded-xl bg-green-100 text-green-800 flex items-center justify-center text-xs font-bold shrink-0">
                    {c.authorName.charAt(0)}
                  </div>
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-gray-900 flex items-center gap-1">
                        {c.authorName}
                        {c.isOfficial && <ShieldCheck className="w-3.5 h-3.5 text-green-600 inline" />}
                      </span>
                      <span className="text-[10px] text-gray-400">{c.time}</span>
                    </div>
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-xs text-gray-700 leading-relaxed">{c.text}</p>
                      {(c.authorId ? c.authorId === currentUser.id : c.authorName === currentUser.fullName) && (
                        <button
                          type="button"
                          onClick={() => deleteComment(post.id, c.id)}
                          className="text-[10px] text-red-500 hover:text-red-700 shrink-0"
                        >
                          Удалить
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Input bar для комментария */}
      <form
        onSubmit={handleSendComment}
        className="fixed bottom-0 left-0 right-0 max-w-2xl mx-auto bg-white/95 backdrop-blur-xl border-t border-gray-200 p-3 flex items-center gap-2 z-30"
      >
        <input
          type="text"
          value={commentText}
          onChange={(e) => setCommentText(e.target.value)}
          placeholder={`Написать комментарий от лица ${currentUser.fullName.split(" ")[0]}...`}
          className="flex-1 px-4 py-2.5 bg-gray-100 rounded-full text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-green-500 focus:bg-white transition"
        />
        <button
          type="submit"
          disabled={!commentText.trim()}
          className="w-10 h-10 bg-green-600 text-white rounded-full flex items-center justify-center disabled:opacity-40 hover:bg-green-700 active:scale-90 shadow-md transition shrink-0"
        >
          <Send className="w-4 h-4 ml-0.5" />
        </button>
      </form>
    </div>
  );
}
