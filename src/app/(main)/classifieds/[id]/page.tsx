"use client";

import { FormEvent, use, useState } from "react";
import Link from "next/link";
import NextImage from "next/image";
import { useRouter } from "next/navigation";
import { 
  ArrowLeft, 
  Phone, 
  MessageSquare, 
  ShieldCheck, 
  MapPin, 
  Share2, 
  Building2,
  Clock,
  Trash2,
  Heart,
  Flag,
  Archive,
  Star,
} from "lucide-react";
import { useAppStore } from "@/stores/appStore";
import { useOperationsStore } from "@/stores/operationsStore";

export default function ClassifiedDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const router = useRouter();
  const { classifieds, createDirectChatWith, deleteClassified, currentUser } = useAppStore();
  const { marketplace, toggleFavorite, archiveListing, reportListing, reviewListing } = useOperationsStore();

  const item = classifieds.find((c) => c.id === resolvedParams.id);

  const handleStartChat = async () => {
    if (!item) return;
    const chatId = await createDirectChatWith(item.authorId, item.authorName);
    router.push(`/chats/${chatId}`);
  };

  const isOwner = item?.authorId === currentUser.id;
  const isFavorite = item ? marketplace.favoriteIds.includes(item.id) : false;
  const itemReviews = item ? marketplace.reviews.filter((review) => review.listingId === item.id) : [];
  const averageRating = itemReviews.length ? itemReviews.reduce((sum, review) => sum + review.rating, 0) / itemReviews.length : 0;
  const [panel, setPanel] = useState<"review" | "report" | null>(null);
  const [rating, setRating] = useState(5);
  const [panelText, setPanelText] = useState("");
  const [panelStatus, setPanelStatus] = useState<{ tone: "ok" | "error"; text: string } | null>(null);

  const submitPanel = async (event: FormEvent) => {
    event.preventDefault();
    const text = panelText.trim();
    if (!item || !panel || !text) return;
    try {
      if (panel === "review") await reviewListing(item.id, rating, text);
      else await reportListing(item.id, text);
      setPanelStatus({ tone: "ok", text: panel === "review" ? "Спасибо за отзыв" : "Жалоба отправлена модераторам ЖК" });
      setPanel(null); setPanelText(""); setRating(5);
    } catch (cause) {
      setPanelStatus({ tone: "error", text: cause instanceof Error ? cause.message : "Не удалось отправить" });
    }
  };
  const handleRemove = () => {
    if (!item || !isOwner || !window.confirm("Снять объявление? Оно исчезнет из списка.")) return;
    deleteClassified(item.id);
    router.push("/classifieds");
  };

  if (!item) {
    return (
      <div className="min-h-screen bg-white p-6 flex flex-col items-center justify-center text-center gap-4">
        <p className="text-sm font-semibold text-gray-600">Объявление не найдено</p>
        <Link href="/classifieds" className="text-sm font-bold text-green-700">Вернуться к объявлениям</Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white pb-24">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-white/95 backdrop-blur-md border-b border-gray-100 px-6 py-3.5 flex items-center justify-between shadow-xs">
        <Link href="/classifieds" className="text-gray-600 p-1 -ml-1 hover:text-gray-900 transition">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <h1 className="font-bold text-gray-900 text-sm truncate max-w-[200px]">{item.title}</h1>
        <div className="flex items-center gap-1">
          <button onClick={() => toggleFavorite(item.id)} className={`p-1 ${isFavorite ? "text-rose-600" : "text-gray-400 hover:text-rose-600"}`} aria-label={isFavorite ? "Убрать из избранного" : "Добавить в избранное"}>
            <Heart className={`h-4 w-4 ${isFavorite ? "fill-current" : ""}`} />
          </button>
          <button className="text-gray-400 p-1 hover:text-gray-600" aria-label="Поделиться">
            <Share2 className="w-4 h-4" />
          </button>
          {isOwner && (
            <button onClick={handleRemove} className="text-gray-400 p-1 hover:text-red-600" aria-label="Снять объявление">
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* Фото */}
        <div className="relative aspect-[16/10] max-h-80 overflow-hidden rounded-3xl bg-gray-100 shadow-sm">
          <NextImage src={item.image} alt={item.title} fill sizes="(max-width: 768px) 100vw, 768px" unoptimized className="object-cover" />
        </div>

        {/* Цена и заголовок */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="px-3 py-1 bg-green-50 text-green-700 rounded-full font-bold text-xs">
              {item.category}
            </span>
            <span className="text-xs text-gray-400 flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" /> {item.createdAt}
            </span>
          </div>

          <h2 className="text-xl font-black text-gray-900 tracking-tight">{item.title}</h2>
          <p className="text-2xl font-black text-green-700">{item.price}</p>
        </div>

        {/* Описание */}
        <div className="space-y-2 pt-2 border-t border-gray-100">
          <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Описание</h3>
          <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-line">
            {item.description}
          </p>
        </div>

        {/* Карточка автора */}
        <div className="p-4 rounded-3xl bg-gray-50 border border-gray-200/80 space-y-3">
          <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Контакты жителя</h3>

          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-green-100 text-green-800 font-black flex items-center justify-center text-sm shadow-xs">
              {item.authorName.charAt(0)}
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <p className="font-bold text-gray-900 text-sm">{item.authorName}</p>
                <ShieldCheck className="w-4 h-4 text-green-600" />
              </div>
              <p className="text-xs text-gray-500">{item.location}</p>
              {averageRating > 0 && <p className="mt-1 flex items-center gap-1 text-[11px] font-extrabold text-amber-700"><Star className="h-3.5 w-3.5 fill-amber-400" />{averageRating.toFixed(1)} · отзывов: {itemReviews.length}</p>}
            </div>
          </div>
        </div>

        {!isOwner && <div className="grid grid-cols-2 gap-2">
          <button onClick={() => { setPanelStatus(null); setPanel(panel === "review" ? null : "review"); }} className="flex min-h-11 items-center justify-center gap-2 rounded-2xl bg-amber-50 text-xs font-extrabold text-amber-900"><Star className="h-4 w-4" />Оставить отзыв</button>
          <button onClick={() => { setPanelStatus(null); setPanel(panel === "report" ? null : "report"); }} className="flex min-h-11 items-center justify-center gap-2 rounded-2xl bg-rose-50 text-xs font-extrabold text-rose-800"><Flag className="h-4 w-4" />Пожаловаться</button>
        </div>}
        {panel && <form onSubmit={(event) => void submitPanel(event)} className="space-y-3 rounded-2xl border border-stone-200 bg-white p-4">
          {panel === "review" && <div className="flex gap-1" role="radiogroup" aria-label="Оценка">{[1, 2, 3, 4, 5].map((value) => <button key={value} type="button" role="radio" aria-checked={rating === value} aria-label={`${value} из 5`} onClick={() => setRating(value)} className="grid h-10 w-10 place-items-center rounded-xl hover:bg-amber-50"><Star className={`h-5 w-5 ${value <= rating ? "fill-amber-400 text-amber-400" : "text-stone-300"}`} /></button>)}</div>}
          <textarea value={panelText} onChange={(event) => setPanelText(event.target.value)} rows={3} placeholder={panel === "review" ? "Как прошла сделка или услуга?" : "Что не так с объявлением?"} className="w-full rounded-xl border border-stone-200 p-3 text-xs" />
          <button disabled={!panelText.trim()} className="w-full rounded-xl bg-green-800 py-2.5 text-xs font-extrabold text-white disabled:opacity-50">{panel === "review" ? "Отправить отзыв" : "Отправить жалобу"}</button>
        </form>}
        {panelStatus && <p role={panelStatus.tone === "error" ? "alert" : "status"} className={`rounded-xl p-3 text-xs font-semibold ${panelStatus.tone === "error" ? "bg-red-50 text-red-700" : "bg-green-50 text-green-800"}`}>{panelStatus.text}</p>}
        {isOwner && <button onClick={() => { archiveListing(item.id); router.push("/classifieds"); }} className="flex min-h-11 w-full items-center justify-center gap-2 rounded-2xl border border-stone-200 text-xs font-extrabold text-stone-700"><Archive className="h-4 w-4" />Перенести в архив</button>}

        {itemReviews.length > 0 && <section className="space-y-2"><h3 className="text-xs font-black uppercase tracking-wider text-stone-400">Отзывы жителей</h3>{itemReviews.map((review) => <article key={review.id} className="rounded-2xl bg-stone-50 p-4"><div className="flex items-center justify-between"><p className="text-xs font-extrabold">{review.author}</p><span className="flex items-center gap-1 text-xs font-bold text-amber-700"><Star className="h-3.5 w-3.5 fill-amber-400" />{review.rating}</span></div><p className="mt-2 text-xs leading-5 text-stone-600">{review.text}</p></article>)}</section>}
      </div>

      {/* Фиксированный бар действий */}
      <div className="fixed bottom-0 left-0 right-0 max-w-2xl mx-auto bg-white/95 backdrop-blur-xl border-t border-gray-200 p-4 flex gap-3 z-30">
        <a
          href={`tel:${item.authorPhone}`}
          className="flex-1 py-3.5 bg-gray-100 hover:bg-gray-200 text-gray-900 font-bold text-xs rounded-2xl flex items-center justify-center gap-2 transition"
        >
          <Phone className="w-4 h-4 text-green-600" />
          <span>Позвонить</span>
        </a>

        <button
          onClick={handleStartChat}
          disabled={item.authorId === currentUser.id}
          className="flex-1 py-3.5 bg-green-600 hover:bg-green-700 active:scale-95 text-white font-bold text-xs rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-green-600/30 transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <MessageSquare className="w-4 h-4" />
          <span>Написать в чат</span>
        </button>
      </div>
    </div>
  );
}
