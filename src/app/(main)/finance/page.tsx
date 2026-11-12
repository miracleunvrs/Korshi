"use client";

import { FormEvent, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowDownRight,
  ArrowUpRight,
  Coins,
  FileSpreadsheet,
  LoaderCircle,
  Plus,
  ReceiptText,
  ShieldCheck,
  TrendingDown,
  TrendingUp,
  WalletCards,
  X,
  BarChart3,
  Download,
  LockKeyhole,
  CalendarDays,
} from "lucide-react";
import { useAppStore } from "@/stores/appStore";
import { monthlyTransactions } from "@/features/dashboard/summary";

const money = (value: number) => `${Math.round(value).toLocaleString("ru-RU")} ₸`;

export default function FinancePage() {
  const finance = useAppStore((state) => state.finance);
  const addTransaction = useAppStore((state) => state.addFinanceTransaction);
  const currentUser = useAppStore((state) => state.currentUser);
  const [showForm, setShowForm] = useState(false);
  const [direction, setDirection] = useState<"income" | "expense">("expense");
  const [category, setCategory] = useState("Содержание дома");
  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const canManage = currentUser.role === "admin" || currentUser.role === "hoa_official";
  const budgetTotal = useMemo(() => finance.budget.reduce((sum, item) => sum + item.planned, 0), [finance.budget]);
  const actualTotal = useMemo(() => finance.budget.reduce((sum, item) => sum + item.actual, 0), [finance.budget]);
  const monthly = useMemo(() => monthlyTransactions(finance.transactions), [finance.transactions]);
  const chartMax = Math.max(1, ...monthly.flatMap((item) => [item.income, item.expense]));

  const exportCsv = () => {
    const rows = [["Дата", "Тип", "Категория", "Назначение", "Сумма"], ...finance.transactions.map((item) => [item.occurredOn, item.direction === "income" ? "Доход" : "Расход", item.category, item.title, String(item.amount)])];
    const blob = new Blob(["\uFEFF" + rows.map((row) => row.map((cell) => `"${cell.replaceAll('"', '""')}"`).join(";")).join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob); const anchor = document.createElement("a"); anchor.href = url; anchor.download = "korshi-finance.csv"; anchor.click(); URL.revokeObjectURL(url);
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault(); setError("");
    const parsedAmount = Number(amount);
    if (title.trim().length < 3 || category.trim().length < 2 || !Number.isFinite(parsedAmount) || parsedAmount <= 0) { setError("Заполните назначение, категорию и корректную сумму."); return; }
    setBusy(true);
    try {
      await addTransaction({ direction, category: category.trim(), title: title.trim(), amount: parsedAmount, occurredOn: date });
      setTitle(""); setAmount(""); setShowForm(false);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Не удалось добавить операцию"); } finally { setBusy(false); }
  };

  return <div className="min-h-screen bg-[#f8f7f2]">
    <header className="border-b border-stone-200/80 px-4 py-5 sm:px-6 sm:py-7"><div className="flex items-start justify-between gap-4"><div><p className="text-xs font-extrabold uppercase tracking-[0.16em] text-green-800">Прозрачность ОСИ</p><h1 className="mt-1 text-2xl font-black tracking-[-0.035em] text-stone-950 sm:text-3xl">Финансы дома</h1><p className="mt-1 text-sm leading-6 text-stone-600">Баланс, операции и исполнение бюджета без непрозрачных таблиц.</p></div><div className="flex gap-2"><button onClick={exportCsv} className="grid h-11 w-11 place-items-center rounded-2xl border border-stone-200 bg-white text-stone-700" aria-label="Экспорт в CSV"><Download className="h-4 w-4" /></button>{canManage && <button onClick={() => setShowForm(true)} className="inline-flex min-h-11 items-center gap-2 rounded-2xl bg-green-800 px-4 text-xs font-extrabold text-white shadow-[0_10px_25px_rgba(22,101,52,.18)] hover:bg-green-900"><Plus className="h-4 w-4" /><span className="hidden sm:inline">Операция</span></button>}</div></div></header>

    <section className="space-y-5 px-4 py-5 sm:px-6">
      <section className="overflow-hidden rounded-[28px] bg-[#173f2a] p-5 text-white shadow-[0_18px_50px_rgba(23,63,42,.18)] sm:p-6"><div className="flex items-start justify-between"><div><p className="text-xs font-bold uppercase tracking-[0.14em] text-emerald-200">Остаток на счёте ОСИ</p><p className="mt-2 text-3xl font-black tabular-nums sm:text-4xl">{money(finance.balance)}</p><p className="mt-2 text-xs font-semibold text-emerald-100/70">Обновлено по опубликованным операциям</p></div><span className="grid h-12 w-12 place-items-center rounded-2xl bg-white/10"><WalletCards className="h-6 w-6" /></span></div><div className="mt-6 grid grid-cols-2 gap-2"><div className="rounded-2xl border border-white/10 bg-white/8 p-4"><p className="flex items-center gap-1.5 text-xs font-semibold text-emerald-100"><TrendingUp className="h-4 w-4" />Поступления</p><p className="mt-2 text-lg font-black">{money(finance.income)}</p></div><div className="rounded-2xl border border-white/10 bg-white/8 p-4"><p className="flex items-center gap-1.5 text-xs font-semibold text-emerald-100"><TrendingDown className="h-4 w-4" />Расходы</p><p className="mt-2 text-lg font-black">{money(finance.expense)}</p></div></div></section>

      <section className="rounded-[24px] border border-stone-200 bg-white p-5"><div className="flex items-center justify-between gap-3"><div><h2 className="font-extrabold text-stone-950">Бюджет {new Date().getFullYear()}</h2><p className="text-xs text-stone-500">Исполнено {budgetTotal ? Math.round((actualTotal / budgetTotal) * 100) : 0}% годового плана</p></div><Link href="/documents" className="inline-flex min-h-10 items-center gap-1.5 rounded-xl bg-violet-50 px-3 text-xs font-extrabold text-violet-800 hover:bg-violet-100"><FileSpreadsheet className="h-4 w-4" />Отчёты</Link></div><div className="mt-5 space-y-4">{finance.budget.map((item) => { const percent = item.planned ? Math.round((item.actual / item.planned) * 100) : 0; return <div key={item.id}><div className="flex items-end justify-between gap-3"><div><p className="text-sm font-extrabold text-stone-800">{item.category}</p><p className="text-[11px] text-stone-500">{money(item.actual)} из {money(item.planned)}</p></div><span className={`text-xs font-black ${percent > 100 ? "text-rose-700" : "text-green-800"}`}>{percent}%</span></div><div className="mt-2 h-2 overflow-hidden rounded-full bg-stone-100"><div className={`h-full rounded-full transition-[width] duration-700 ${percent > 100 ? "bg-rose-500" : "bg-green-700"}`} style={{ width: `${Math.min(100, percent)}%` }} /></div></div>; })}</div></section>

      <section className="rounded-[24px] border border-stone-200 bg-white p-5"><div className="flex items-center justify-between"><div><h2 className="flex items-center gap-2 font-extrabold text-stone-950"><BarChart3 className="h-4 w-4 text-violet-700" />Динамика по месяцам</h2><p className="mt-1 text-xs text-stone-500">По загруженным операциям, ₸</p></div><button onClick={() => window.print()} className="rounded-xl bg-stone-100 px-3 py-2 text-[10px] font-extrabold">PDF</button></div>{monthly.length === 0 && <p className="mt-4 text-sm text-stone-600">Нет опубликованных операций для построения графика.</p>}<div className="mt-5 flex h-40 items-end justify-between gap-2">{monthly.map((item, index) => <div key={item.key} title={`${item.label}: доход ${money(item.income)}, расход ${money(item.expense)}`} className="flex h-full flex-1 flex-col justify-end"><div className="flex h-[120px] items-end justify-center gap-1"><div className="chart-grow w-2.5 rounded-t bg-emerald-600" style={{ height: `${item.income / chartMax * 100}%`, animationDelay: `${index * 60}ms` }} /><div className="chart-grow w-2.5 rounded-t bg-violet-500" style={{ height: `${item.expense / chartMax * 100}%`, animationDelay: `${index * 60 + 40}ms` }} /></div><span className="mt-2 text-center text-[9px] font-bold text-stone-500">{item.label}</span></div>)}</div><div className="mt-3 flex gap-4 text-[10px] font-bold text-stone-500"><span><b className="text-emerald-600">●</b> Доходы</span><span><b className="text-violet-500">●</b> Расходы</span></div></section>

      <section className="rounded-[24px] border border-stone-200 bg-white p-5"><h2 className="text-sm font-extrabold">Личные платежи и задолженность</h2><p className="mt-2 text-sm text-stone-600">Данные о личных начислениях, оплатах и квитанциях пока не подключены. Отсутствие данных не означает отсутствие задолженности.</p></section>

      <section><div className="mb-3 flex items-center justify-between"><h2 className="font-extrabold text-stone-950">Последние операции</h2><span className="text-xs font-semibold text-stone-400">{finance.transactions.length} записей</span></div><div className="overflow-hidden rounded-[24px] border border-stone-200 bg-white divide-y divide-stone-100">{finance.transactions.map((transaction) => <div key={transaction.id} className="flex min-h-[76px] items-center gap-3 p-4"><span className={`grid h-11 w-11 shrink-0 place-items-center rounded-2xl ${transaction.direction === "income" ? "bg-emerald-100 text-emerald-800" : "bg-rose-50 text-rose-700"}`}>{transaction.direction === "income" ? <ArrowDownRight className="h-5 w-5" /> : <ArrowUpRight className="h-5 w-5" />}</span><div className="min-w-0 flex-1"><p className="truncate text-sm font-extrabold text-stone-900">{transaction.title}</p><p className="text-xs text-stone-500">{transaction.category} · {transaction.occurredOn}</p></div><div className="text-right"><p className={`text-sm font-black tabular-nums ${transaction.direction === "income" ? "text-emerald-800" : "text-stone-900"}`}>{transaction.direction === "income" ? "+" : "−"}{money(transaction.amount)}</p>{transaction.documentId && <Link href="/documents" className="mt-1 inline-flex items-center gap-1 text-[10px] font-bold text-violet-700"><ReceiptText className="h-3 w-3" />Документ</Link>}</div></div>)}</div></section>
    </section>

    {showForm && <div className="fixed inset-0 z-[80] flex items-end justify-center bg-stone-950/45 backdrop-blur-sm sm:items-center sm:p-6" role="dialog" aria-modal="true" aria-labelledby="finance-form-title"><form onSubmit={submit} className="sheet-enter w-full max-w-lg rounded-t-[30px] bg-white p-5 shadow-2xl sm:rounded-[30px] sm:p-6"><div className="flex items-start justify-between"><div><p className="text-xs font-extrabold uppercase tracking-[0.14em] text-green-800">Журнал ОСИ</p><h2 id="finance-form-title" className="mt-1 text-xl font-black text-stone-950">Добавить операцию</h2></div><button type="button" onClick={() => setShowForm(false)} className="grid h-11 w-11 place-items-center rounded-2xl bg-stone-100 text-stone-600" aria-label="Закрыть"><X className="h-5 w-5" /></button></div><div className="mt-5 space-y-4"><fieldset><legend className="text-sm font-extrabold text-stone-900">Тип</legend><div className="mt-2 grid grid-cols-2 gap-2">{(["income", "expense"] as const).map((value) => <button type="button" key={value} onClick={() => setDirection(value)} className={`min-h-11 rounded-xl text-xs font-extrabold ${direction === value ? value === "income" ? "bg-emerald-700 text-white" : "bg-rose-600 text-white" : "bg-stone-100 text-stone-600"}`}>{value === "income" ? "Поступление" : "Расход"}</button>)}</div></fieldset><label className="block text-sm font-extrabold text-stone-900">Назначение<input value={title} onChange={(event) => setTitle(event.target.value)} maxLength={160} className="mt-2 min-h-12 w-full rounded-2xl border border-stone-200 px-4 text-sm outline-none focus:border-green-700" /></label><div className="grid grid-cols-2 gap-3"><label className="block text-sm font-extrabold text-stone-900">Категория<input value={category} onChange={(event) => setCategory(event.target.value)} maxLength={80} className="mt-2 min-h-12 w-full rounded-2xl border border-stone-200 px-4 text-sm outline-none focus:border-green-700" /></label><label className="block text-sm font-extrabold text-stone-900">Сумма, ₸<input type="number" min="1" step="1" value={amount} onChange={(event) => setAmount(event.target.value)} className="mt-2 min-h-12 w-full rounded-2xl border border-stone-200 px-4 text-sm outline-none focus:border-green-700" /></label></div><label className="block text-sm font-extrabold text-stone-900">Дата<input type="date" value={date} onChange={(event) => setDate(event.target.value)} className="mt-2 min-h-12 w-full rounded-2xl border border-stone-200 px-4 text-sm outline-none focus:border-green-700" /></label></div>{error && <p role="alert" className="mt-4 rounded-2xl bg-rose-50 p-3 text-xs font-bold text-rose-800">{error}</p>}<button disabled={busy} className="mt-5 flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-green-800 text-sm font-extrabold text-white hover:bg-green-900 disabled:opacity-50">{busy ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}Сохранить операцию</button></form></div>}
  </div>;
}
