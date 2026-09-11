"use client";

import { ChangeEvent, FormEvent, useState } from "react";
import { Bot, CheckCircle2, FileSearch, ImagePlus, LoaderCircle, ShieldAlert, Sparkles, ThumbsDown, ThumbsUp } from "lucide-react";
import { syncPlatformMutation } from "@/lib/supabase/platformRepository";

const tools = [
  { id: "request_triage", label: "Разобрать заявку", description: "Категория, срочность и следующий шаг", icon: ShieldAlert },
  { id: "similar_requests", label: "Найти дубли", description: "Похожие обращения для объединения", icon: FileSearch },
] as const;

type AiResult = { title: string; answer: string; category: string | null; priority: string | null; suggested_duplicates: string[]; citations: string[]; needs_human_review: boolean };

export default function AiPage() {
  const [task, setTask] = useState<(typeof tools)[number]["id"]>("request_triage");
  const [prompt, setPrompt] = useState("");
  const [imageDataUrl, setImageDataUrl] = useState("");
  const [fileName, setFileName] = useState("");
  const [result, setResult] = useState<AiResult | null>(null);
  const [responseId, setResponseId] = useState("");
  const [jobId, setJobId] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const pickImage = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/") || file.size > 5 * 1024 * 1024) return setError("Можно загрузить изображение до 5 МБ");
    const reader = new FileReader();
    reader.onload = () => { setImageDataUrl(String(reader.result)); setFileName(file.name); };
    reader.readAsDataURL(file);
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (prompt.trim().length < 10) return setError("Добавьте немного больше контекста");
    setBusy(true); setError(""); setResult(null);
    try {
      const response = await fetch("/api/ai", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ task: imageDataUrl ? "image_analysis" : task, prompt, imageDataUrl: imageDataUrl || undefined }) });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Не удалось получить ответ");
      setResult(payload.result); setResponseId(payload.id || ""); setJobId(payload.jobId || "");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Ошибка AI"); } finally { setBusy(false); }
  };

  const feedback = async (helpful: boolean) => {
    await syncPlatformMutation({ operation: "insert", table: "ai_feedback", payload: { job_id: jobId || null, response_id: responseId || null, feature: task, helpful } });
  };

  return <div className="min-h-screen bg-[#f8f7f2] pb-10">
    <header className="border-b border-stone-200/80 px-4 py-6 sm:px-6"><div className="flex items-start justify-between gap-4"><div><p className="text-xs font-extrabold uppercase tracking-[.16em] text-violet-700">Korshi AI</p><h1 className="mt-1 text-2xl font-black tracking-[-.035em] text-stone-950 sm:text-3xl">Помощник диспетчера</h1><p className="mt-1 max-w-xl text-sm leading-6 text-stone-600">Классифицирует обращения, предлагает приоритет и находит возможные дубли. Итог всегда подтверждает человек.</p></div><span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-violet-600 text-white shadow-lg shadow-violet-200"><Sparkles className="h-5 w-5" /></span></div></header>
    <main className="space-y-5 px-4 py-5 sm:px-6">
      <section className="grid grid-cols-2 gap-2">{tools.map(({ id, label, description, icon: Icon }) => <button key={id} onClick={() => setTask(id)} className={`min-h-28 rounded-[22px] border p-3 text-left transition hover:-translate-y-0.5 ${task === id ? "border-violet-300 bg-violet-50 ring-2 ring-violet-200" : "border-stone-200 bg-white"}`}><Icon className={`h-5 w-5 ${task === id ? "text-violet-700" : "text-stone-500"}`} /><span className="mt-3 block text-xs font-black text-stone-950">{label}</span><span className="mt-1 block text-[10px] leading-4 text-stone-500">{description}</span></button>)}</section>
      <form onSubmit={submit} className="rounded-[28px] border border-stone-200 bg-white p-4 sm:p-5"><label className="text-sm font-black text-stone-950">Материал для анализа<textarea value={prompt} onChange={(event) => setPrompt(event.target.value)} rows={7} placeholder="Опишите проблему, вставьте обсуждение или задайте вопрос по документу..." className="mt-3 w-full resize-y rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3 text-sm leading-6 outline-none transition focus:border-violet-400 focus:ring-2 focus:ring-violet-100" /></label><div className="mt-3 flex flex-wrap items-center gap-3"><label className="flex min-h-11 cursor-pointer items-center gap-2 rounded-xl border border-stone-200 px-3 text-xs font-extrabold text-stone-700 hover:bg-stone-50"><ImagePlus className="h-4 w-4" />{fileName || "Добавить фото"}<input type="file" accept="image/*" onChange={pickImage} className="sr-only" /></label>{fileName && <button type="button" onClick={() => { setImageDataUrl(""); setFileName(""); }} className="text-xs font-bold text-rose-700">Убрать фото</button>}</div>{error && <p role="alert" className="mt-4 rounded-2xl bg-rose-50 p-3 text-xs font-bold text-rose-800">{error}</p>}<button disabled={busy} className="mt-4 flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-violet-700 text-sm font-extrabold text-white hover:bg-violet-800 disabled:opacity-50">{busy ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}{busy ? "Анализирую…" : "Запустить анализ"}</button></form>
      {result && <section className="reveal-up rounded-[28px] border border-violet-200 bg-white p-5"><div className="flex items-start gap-3"><span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-violet-100 text-violet-800"><Bot className="h-5 w-5" /></span><div><p className="text-[10px] font-extrabold uppercase tracking-[.12em] text-violet-700">Результат AI</p><h2 className="mt-1 text-lg font-black text-stone-950">{result.title}</h2></div></div><p className="mt-4 whitespace-pre-wrap text-sm leading-6 text-stone-700">{result.answer}</p>{(result.category || result.priority) && <div className="mt-4 flex flex-wrap gap-2">{result.category && <span className="rounded-full bg-stone-100 px-3 py-1.5 text-xs font-extrabold text-stone-700">Категория: {result.category}</span>}{result.priority && <span className="rounded-full bg-amber-100 px-3 py-1.5 text-xs font-extrabold text-amber-900">Срочность: {result.priority}</span>}</div>}{result.suggested_duplicates.length > 0 && <div className="mt-4 rounded-2xl bg-sky-50 p-4"><p className="text-xs font-black text-sky-900">Похожие обращения</p>{result.suggested_duplicates.map((item) => <p key={item} className="mt-2 text-xs text-sky-800">• {item}</p>)}</div>}{result.citations.length > 0 && <div className="mt-4"><p className="text-xs font-black">Источники</p><div className="mt-2 flex flex-wrap gap-2">{result.citations.map((item) => <span key={item} className="rounded-lg bg-stone-100 px-2 py-1 text-[10px] font-bold text-stone-600">{item}</span>)}</div></div>}{result.needs_human_review && <p className="mt-4 flex items-center gap-2 rounded-2xl bg-amber-50 p-3 text-xs font-bold text-amber-900"><ShieldAlert className="h-4 w-4 shrink-0" />Требуется проверка ответственным сотрудником</p>}<div className="mt-4 flex items-center gap-2 border-t border-stone-100 pt-4"><span className="text-xs font-bold text-stone-500">Ответ полезен?</span><button onClick={() => void feedback(true)} className="grid h-9 w-9 place-items-center rounded-xl bg-stone-100" aria-label="Полезно"><ThumbsUp className="h-4 w-4" /></button><button onClick={() => void feedback(false)} className="grid h-9 w-9 place-items-center rounded-xl bg-stone-100" aria-label="Не полезно"><ThumbsDown className="h-4 w-4" /></button></div></section>}
      <section className="rounded-[24px] border border-stone-200 bg-stone-100 p-4"><p className="flex items-center gap-2 text-xs font-black text-stone-800"><CheckCircle2 className="h-4 w-4 text-green-700" />Приватность по умолчанию</p><p className="mt-1 text-xs leading-5 text-stone-600">Запросы не сохраняются у AI-провайдера (`store: false`). Не отправляйте ИИН, номера документов и платёжные реквизиты.</p></section>
    </main>
  </div>;
}
