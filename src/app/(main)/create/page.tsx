"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { 
  FileText, 
  Tag, 
  Wrench, 
  HelpCircle, 
  BarChart3, 
  Lightbulb, 
  Calendar,
  Image as ImageIcon,
  ArrowLeft
} from "lucide-react";
import type { PostType, TerritoryType } from "@/types/domain";
import type { PostWithAuthor } from "@/types";
import { useAppStore } from "@/stores/appStore";
import { createClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { IMAGE_UPLOAD_TYPES, validateUploadFile } from "@/lib/uploadLimits";
import { uploadWithRetry } from "@/lib/supabase/uploadWithRetry";

export default function CreatePostPage() {
  const router = useRouter();
  const { addPost, addClassified, currentUser } = useAppStore();

  const [type, setType] = useState<PostType>("post");
  const [territory, setTerritory] = useState<TerritoryType>("complex");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [price, setPrice] = useState("");
  const [pollOptions, setPollOptions] = useState<string[]>(["", ""]);
  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);

  const postTypes: { id: PostType; label: string; icon: typeof FileText; desc: string }[] = [
    { id: "post", label: "Публикация", icon: FileText, desc: "Обычный пост, новость или вопрос соседям" },
    { id: "announcement", label: "Объявление", icon: Tag, desc: "Продажа, покупка или передача вещей" },
    { id: "service", label: "Услуга", icon: Wrench, desc: "Предложение услуг или мастерских работ" },
    { id: "help_request", label: "Помощь", icon: HelpCircle, desc: "Просьба о помощи у соседей" },
    { id: "poll", label: "Опрос", icon: BarChart3, desc: "Узнать мнение жителей дома или ЖК" },
    { id: "initiative", label: "Инициатива", icon: Lightbulb, desc: "Предложить улучшение для двора или дома" },
    { id: "event", label: "Событие", icon: Calendar, desc: "Субботник, праздник или встреча" },
  ];

  useEffect(() => {
    const requestedType = new URLSearchParams(window.location.search).get("type");
    const validTypes: PostType[] = ["post", "announcement", "service", "help_request", "poll", "initiative", "event"];
    if (!validTypes.includes(requestedType as PostType)) return;
    const timer = window.setTimeout(() => setType(requestedType as PostType), 0);
    return () => window.clearTimeout(timer);
  }, []);

  const handleAddPollOption = () => {
    if (pollOptions.length < 6) {
      setPollOptions([...pollOptions, ""]);
    }
  };

  const handlePollOptionChange = (index: number, value: string) => {
    const next = [...pollOptions];
    next[index] = value;
    setPollOptions(next);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;
    if (!currentUser.verified) {
      setFormError("Сначала подтвердите статус жителя, чтобы публиковать записи.");
      return;
    }
    setFormError("");

    if (imageFile) {
      const uploadError = validateUploadFile(imageFile, IMAGE_UPLOAD_TYPES);
      if (uploadError) {
        setFormError(uploadError);
        return;
      }
    }

    setLoading(true);

    let imagePath = "";
    try {
      if (imageFile && isSupabaseConfigured()) {
        imagePath = `${currentUser.id}/posts/${crypto.randomUUID()}-${imageFile.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
        await uploadWithRetry(() => createClient().storage.from("house-media").upload(imagePath, imageFile, {
          contentType: imageFile.type || "application/octet-stream",
          upsert: false,
        }));
      }

    const newPostId = `post-${Date.now()}`;
    const validOptions = pollOptions.filter((o) => o.trim().length > 0);

    if (type === 'poll' && validOptions.length < 2) {
      setFormError('Добавьте минимум 2 варианта ответа для опроса.');
      setLoading(false);
      return;
    }

    const newPost: PostWithAuthor = {
      id: newPostId,
      author_id: currentUser.id,
      complex_id: currentUser.complexId || "complex-1",
      building_id: territory === "building" || territory === "entrance" ? (currentUser.buildingId || `building-${currentUser.buildingNumber}`) : null,
      entrance_id: territory === "entrance" ? (currentUser.entranceId || `entrance-${currentUser.entranceNumber}`) : null,
      type,
      title: title.trim() ? title.trim() : null,
      content: content.trim(),
      status: "active",
      is_official: currentUser.role === "hoa_official",
      territory,
      price: price ? parseFloat(price) : null,
      currency: price ? "₸" : null,
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
      attachments: imagePath
        ? [{
            id: crypto.randomUUID(),
            post_id: newPostId,
            url: imagePath,
            type: "image",
            name: imageFile?.name || null,
            size: imageFile?.size || null,
            created_at: new Date().toISOString(),
          }]
        : [],
      poll:
        type === "poll" && validOptions.length >= 2
          ? {
              id: `poll-${Date.now()}`,
              post_id: newPostId,
              is_multiple: false,
              ends_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
              total_votes: 0,
              options: validOptions.map((opt, idx) => ({
                id: `opt-${idx}-${Date.now()}`,
                poll_id: `poll-${Date.now()}`,
                text: opt.trim(),
                votes_count: 0,
                position: idx,
              })),
            }
          : undefined,
      initiative:
        type === "initiative"
          ? {
              id: `init-${Date.now()}`,
              post_id: newPostId,
              stage: "proposal",
              goal: title || "Предложение жителей",
              supporters: 1,
              updated_at: new Date().toISOString(),
            }
          : undefined,
    };

    addPost(newPost);
    if (type === "announcement" || type === "service") {
      addClassified({
        id: `item-${Date.now()}`,
        title: title.trim() || "Объявление жителя",
        category: type === "service" ? "Услуги" : "Объявления",
        price: price ? `${Number(price).toLocaleString("ru-RU")} ₸` : "Договорная",
        location: `Дом ${currentUser.buildingNumber}, кв. ${currentUser.apartmentNumber}`,
        image: "",
        description: content.trim(),
        authorId: currentUser.id,
        authorName: currentUser.fullName,
        authorPhone: currentUser.phone,
        createdAt: "Только что",
      }, { price: price ? parseFloat(price) : null, imagePath: imagePath || undefined });
    }
      router.push("/feed");
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "Не удалось сохранить публикацию");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#fffefb] pb-12">
      {/* Шапка */}
      <div className="glass-nav sticky top-16 z-20 flex items-center justify-between border-b border-stone-200/80 px-4 py-3 shadow-xs md:top-0">
        <Link href="/feed" className="text-gray-600 p-1 -ml-1 hover:text-gray-900 transition">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <h1 className="font-bold text-gray-900 text-sm">Новая публикация</h1>
        <button
          onClick={handleSubmit}
          disabled={loading || !content.trim() || !currentUser.verified}
          className="min-h-10 rounded-xl bg-green-800 px-3.5 py-1.5 text-xs font-bold text-white shadow-xs transition hover:bg-green-900 disabled:opacity-40"
        >
          {loading ? "Публикация..." : "Опубликовать"}
        </button>
      </div>

      <div className="p-4 space-y-6">
        {!currentUser.verified && (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-xs text-amber-800">
            <p className="font-bold">Публикации доступны подтверждённым жителям</p>
            <p className="mt-1">Подтвердите статус, чтобы писать в ленту и размещать объявления.</p>
            <Link href="/verify-resident" className="mt-2 inline-block font-bold text-amber-900 underline">
              Перейти к подтверждению
            </Link>
          </div>
        )}
        {formError && <p className="rounded-xl bg-red-50 p-3 text-xs font-semibold text-red-700">{formError}</p>}
        {/* Выбор типа публикации */}
        <div>
          <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2.5">
            Тип публикации
          </label>
          <div className="grid grid-cols-2 gap-2">
            {postTypes.map((item) => {
              const Icon = item.icon;
              const isSelected = type === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setType(item.id)}
                  className={`flex items-center gap-2.5 p-3 rounded-2xl border text-left transition ${
                    isSelected
                      ? "border-green-600 bg-green-50/70 text-green-900 shadow-xs"
                      : "border-gray-200 hover:border-gray-300 text-gray-700"
                  }`}
                >
                  <div
                    className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                      isSelected ? "bg-green-600 text-white" : "bg-gray-100 text-gray-500"
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                  </div>
                  <span className="text-xs font-bold">{item.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Выбор территории показа */}
        <div>
          <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2.5">
            Аудитория публикации
          </label>
          <div className="flex gap-2">
            {[
              { id: "complex", label: "Весь ЖК" },
              { id: "building", label: "Мой дом" },
              { id: "entrance", label: "Мой подъезд" },
            ].map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setTerritory(t.id as TerritoryType)}
                className={`flex-1 py-2.5 px-3 rounded-2xl border text-xs font-semibold transition ${
                  territory === t.id
                    ? "border-green-600 bg-green-600 text-white shadow-xs"
                    : "border-gray-200 text-gray-700 hover:border-gray-300"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Заголовок */}
        {(type === "announcement" || type === "service" || type === "initiative" || type === "event") && (
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1.5">
              Заголовок
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Кратко опишите суть..."
              className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl text-xs focus:outline-none focus:ring-2 focus:ring-green-500 focus:bg-white transition"
            />
          </div>
        )}

        {/* Цена */}
        {(type === "announcement" || type === "service") && (
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1.5">
              Цена (тенге, ₸)
            </label>
            <input
              type="number"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder="0 (оставьте пустым если бесплатно/договорная)"
              className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl text-xs focus:outline-none focus:ring-2 focus:ring-green-500 focus:bg-white transition"
            />
          </div>
        )}

        {/* Основной текст */}
        <div>
          <label className="block text-xs font-bold text-gray-700 mb-1.5">
            Текст сообщения
          </label>
          <textarea
            rows={4}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Что нового в ЖК? Расскажите соседям..."
            className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl text-xs focus:outline-none focus:ring-2 focus:ring-green-500 focus:bg-white resize-none transition"
            required
          />
        </div>

        {/* Варианты опроса */}
        {type === "poll" && (
          <div className="space-y-2.5">
            <label className="block text-xs font-bold text-gray-700">
              Варианты ответа
            </label>
            {pollOptions.map((opt, idx) => (
              <input
                key={idx}
                type="text"
                value={opt}
                onChange={(e) => handlePollOptionChange(idx, e.target.value)}
                placeholder={`Вариант ${idx + 1}`}
                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-2xl text-xs focus:outline-none focus:ring-2 focus:ring-green-500 focus:bg-white transition"
              />
            ))}
            {pollOptions.length < 6 && (
              <button
                type="button"
                onClick={handleAddPollOption}
                className="text-xs font-bold text-green-600 hover:text-green-700 pt-1"
              >
                + Добавить вариант
              </button>
            )}
          </div>
        )}

        {/* Фото */}
        <label className="w-full flex items-center justify-center gap-2 py-3.5 border-2 border-dashed border-gray-200 rounded-2xl text-xs font-semibold text-gray-500 hover:border-gray-400 hover:text-gray-700 transition cursor-pointer">
          <ImageIcon className="w-4 h-4 text-green-600" />
          <span>{imageFile ? imageFile.name : "Прикрепить фото к публикации"}</span>
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="sr-only"
            onChange={(e) => {
              const file = e.target.files?.[0] || null;
              if (file) {
                const uploadError = validateUploadFile(file, IMAGE_UPLOAD_TYPES);
                if (uploadError) {
                  setFormError(uploadError);
                  e.currentTarget.value = "";
                  return;
                }
              }
              setFormError("");
              setImageFile(file);
            }}
          />
        </label>
      </div>
    </div>
  );
}
