"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { 
  Building2, 
  Coins, 
  FileText, 
  BarChart3, 
  ArrowLeft, 
  CheckCircle2, 
  ShieldCheck,
  Plus
} from "lucide-react";
import { useAppStore } from "@/stores/appStore";

export default function HoaManagePage() {
  const router = useRouter();
  const { createFundraiser, currentUser } = useAppStore();
  const canManage = currentUser.role === "admin" || currentUser.role === "hoa_official";
  const [paymentUrl, setPaymentUrl] = useState("");
  const [endsOn, setEndsOn] = useState("");

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [targetAmount, setTargetAmount] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [formError, setFormError] = useState("");

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading || !title.trim() || !content.trim()) return;
    const link = paymentUrl.trim();
    if (link && !/^https:\/\/\S+$/i.test(link)) {
      setFormError("Ссылка для перевода должна начинаться с https://");
      return;
    }
    const amount = parseFloat(targetAmount);
    if (!(amount > 0)) {
      setFormError("Укажите цель сбора в тенге");
      return;
    }

    setLoading(true);
    setFormError("");

    try {
      await createFundraiser({
        title: title.trim(),
        content: content.trim(),
        targetAmount: amount,
        currency: "₸",
        paymentUrl: link || undefined,
        endsAt: endsOn ? new Date(`${endsOn}T23:59:59`).toISOString() : undefined,
      });
      setSuccess(true);
      setTimeout(() => {
        router.push("/hoa");
      }, 1200);
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "Не удалось сохранить сбор");
      setLoading(false);
    }
  };

  if (!canManage) {
    return (
      <div className="min-h-screen bg-white p-8 flex flex-col items-center justify-center text-center gap-4">
        <ShieldCheck className="w-10 h-10 text-gray-300" />
        <p className="text-sm font-semibold text-gray-600">Запускать сборы может только управление ЖК</p>
        <Link href="/hoa" className="text-sm font-bold text-green-700">Вернуться</Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white pb-16">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-white/95 backdrop-blur-md border-b border-gray-100 px-6 py-4 flex items-center justify-between shadow-xs">
        <div className="flex items-center gap-3">
          <Link href="/hoa" className="text-gray-600 p-1 -ml-1 hover:text-gray-900 transition">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="font-extrabold text-gray-900 text-base">Управление ОСИ</h1>
            <p className="text-xs text-gray-400">Запуск официального сбора средств</p>
          </div>
        </div>

        <span className="px-3 py-1 bg-green-50 text-green-700 text-xs font-bold rounded-full border border-green-200">
          Официальный аккаунт
        </span>
      </div>

      <div className="p-6 max-w-xl space-y-6">
        {success ? (
          <div className="p-8 text-center bg-green-50 border border-green-200 rounded-3xl space-y-2">
            <CheckCircle2 className="w-12 h-12 text-green-600 mx-auto" />
            <h2 className="text-lg font-bold text-green-900">Сбор средств успешно запущен!</h2>
            <p className="text-xs text-green-700">Публикация появилась в ленте и разделе «Мой ЖК».</p>
          </div>
        ) : (
          <form onSubmit={handleCreate} className="space-y-4">
            {formError && (
              <p role="alert" className="rounded-xl bg-red-50 p-3 text-xs text-red-700">
                {formError}
              </p>
            )}
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1.5">
                Название сбора
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Например: Замена освещения в паркинге"
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-green-500"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1.5">
                Целевая сумма (тенге, ₸)
              </label>
              <input
                type="number"
                value={targetAmount}
                onChange={(e) => setTargetAmount(e.target.value)}
                placeholder="500000"
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-green-500"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1.5">
                Описание цели и обоснование сметы
              </label>
              <textarea
                rows={4}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Подробно опишите, на что пойдут собранные средства, какие материалы будут закуплены..."
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl text-xs focus:outline-none focus:ring-2 focus:ring-green-500 resize-none"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1.5">
                Ссылка для перевода на счёт ОСИ (Kaspi, банк) — необязательно
              </label>
              <input
                type="url"
                value={paymentUrl}
                onChange={(e) => setPaymentUrl(e.target.value)}
                placeholder="https://"
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1.5">
                Дата окончания — необязательно
              </label>
              <input
                type="date"
                value={endsOn}
                onChange={(e) => setEndsOn(e.target.value)}
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>
            <div className="p-4 bg-gray-50 border border-gray-200/80 rounded-2xl space-y-1">
              <div className="flex items-center gap-1.5 text-xs font-bold text-gray-800">
                <ShieldCheck className="w-4 h-4 text-green-600" />
                <span>Как учитываются взносы</span>
              </div>
              <p className="text-[11px] text-gray-500 leading-relaxed">
                Жители переводят деньги на счёт ОСИ и сообщают о переводе в приложении. В собранную сумму попадают только переводы, которые вы подтвердите на странице сбора после сверки с выпиской.
              </p>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 bg-green-600 hover:bg-green-700 active:scale-95 text-white font-bold text-sm rounded-2xl shadow-lg shadow-green-600/30 transition"
            >
              {loading ? "Запуск..." : "Запустить сбор средств в ЖК"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
