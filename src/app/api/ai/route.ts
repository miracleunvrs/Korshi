import { createHash, randomUUID } from "node:crypto";
import { createClient } from "@/lib/supabase/server";
import { isDemoMode, isSupabaseConfigured } from "@/lib/supabase/config";

export const runtime = "nodejs";

const demoWindows = new Map<string, { count: number; resetAt: number }>();
const allowedTasks = new Set(["request_triage", "image_analysis", "similar_requests"]);

type AiTask = "request_triage" | "image_analysis" | "similar_requests";
type AiResult = { title: string; answer: string; category: string | null; priority: string | null; suggested_duplicates: string[]; citations: string[]; needs_human_review: boolean };

function demoLimited(key: string) {
  const now = Date.now();
  const current = demoWindows.get(key);
  if (!current || current.resetAt <= now) {
    demoWindows.set(key, { count: 1, resetAt: now + 60_000 });
    return false;
  }
  current.count += 1;
  return current.count > 10;
}

function extractOutputText(payload: Record<string, unknown>) {
  if (typeof payload.output_text === "string") return payload.output_text;
  const output = Array.isArray(payload.output) ? payload.output : [];
  for (const item of output) {
    if (!item || typeof item !== "object") continue;
    const rawContent = (item as { content?: unknown }).content;
    const content = Array.isArray(rawContent) ? rawContent : [];
    for (const part of content) {
      if (part && typeof part === "object" && (part as { type?: unknown }).type === "output_text" && typeof (part as { text?: unknown }).text === "string") return (part as { text: string }).text;
    }
  }
  return "";
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null) as null | { task?: string; prompt?: string; imageDataUrl?: string };
  if (!body?.task || !allowedTasks.has(body.task) || !body.prompt?.trim()) return Response.json({ error: "Некорректный AI-запрос" }, { status: 400 });
  if (body.prompt.length > 12_000) return Response.json({ error: "Текст длиннее 12 000 символов" }, { status: 413 });
  if (body.imageDataUrl && (!body.imageDataUrl.startsWith("data:image/") || body.imageDataUrl.length > 7_000_000)) return Response.json({ error: "Изображение слишком большое или имеет неверный формат" }, { status: 413 });

  const task = body.task as AiTask;
  let userId = "demo-user";
  let jobId = "";
  let supabase: Awaited<ReturnType<typeof createClient>> | null = null;
  const sources: Array<{ id: string; title: string; excerpt: string }> = [];

  if (isSupabaseConfigured()) {
    supabase = await createClient();
    const { data } = await supabase.auth.getUser();
    if (!data.user) return Response.json({ error: "Нужна авторизация" }, { status: 401 });
    userId = data.user.id;

    const safetyIdentifier = createHash("sha256").update(userId).digest("hex").slice(0, 32);
    const rateLimit = await supabase.rpc("consume_rate_limit", { p_bucket_key: `ai:${safetyIdentifier}`, p_limit: 10, p_window_seconds: 60 });
    if (rateLimit.error) return Response.json({ error: "Не удалось проверить лимит AI-запросов" }, { status: 503 });
    if (!rateLimit.data) return Response.json({ error: "Слишком много запросов. Повторите через минуту." }, { status: 429 });

    if (task === "similar_requests") {
      const visible = await supabase.from("service_requests").select("id,title,description,location,status").order("created_at", { ascending: false }).limit(50);
      if (visible.error) return Response.json({ error: "Не удалось загрузить заявки для сравнения" }, { status: 503 });
      for (const row of visible.data || []) sources.push({ id: row.id, title: row.title, excerpt: `${row.description} · ${row.location} · ${row.status}` });
    }

    jobId = randomUUID();
    const inputHash = createHash("sha256").update(`${userId}\u0000${task}\u0000${body.prompt}`).digest("hex");
    const audit = await supabase.from("ai_jobs").insert({ id: jobId, feature: task, input_hash: inputHash, source_ids: sources.map((source) => source.id), status: "running" });
    if (audit.error) return Response.json({ error: "Не удалось создать журнал AI-запроса" }, { status: 503 });
  } else {
    if (!isDemoMode()) return Response.json({ error: "Backend не настроен" }, { status: 503 });
    const safetyIdentifier = createHash("sha256").update(userId).digest("hex").slice(0, 32);
    if (demoLimited(safetyIdentifier)) return Response.json({ error: "Слишком много запросов. Повторите через минуту." }, { status: 429 });
  }

  const failJob = async (code: string) => {
    if (supabase && jobId) await supabase.rpc("fail_ai_job", { p_job_id: jobId, p_error_code: code });
  };
  const apiKey = process.env.OPENAI_API_KEY;
  const model = process.env.OPENAI_MODEL;
  if (!apiKey || !model) {
    await failJob("provider_not_configured");
    return Response.json({ error: "AI не настроен. Добавьте OPENAI_API_KEY и OPENAI_MODEL на сервере.", jobId: jobId || null }, { status: 503 });
  }

  const sourceText = sources.map((source) => `[${source.id}] ${source.title}: ${source.excerpt}`).join("\n");
  const content: Array<Record<string, unknown>> = [{ type: "input_text", text: `${body.prompt.trim()}${sourceText ? `\n\nДоступные заявки этого ЖК:\n${sourceText}` : ""}` }];
  if (body.imageDataUrl) content.push({ type: "input_image", image_url: body.imageDataUrl, detail: "auto" });

  let upstream: Response;
  try {
    upstream = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        store: false,
        safety_identifier: createHash("sha256").update(userId).digest("hex").slice(0, 32),
        max_output_tokens: 700,
        instructions: "Ты классификатор обращений жителей многоквартирного дома. Определи категорию и приоритет, либо найди похожие заявки только среди переданных источников. Не принимай решение за диспетчера. Для дублей возвращай только UUID из источников. Любой результат требует подтверждения человеком. Отвечай по-русски и верни JSON строго по схеме.",
        input: [{ role: "user", content }],
        text: { format: { type: "json_schema", name: "korshi_request_triage", strict: true, schema: {
          type: "object", additionalProperties: false,
          properties: {
            title: { type: "string" }, answer: { type: "string" },
            category: { type: ["string", "null"], enum: ["utilities", "cleaning", "repair", "safety", "territory", "other", null] },
            priority: { type: ["string", "null"], enum: ["normal", "important", "emergency", null] },
            suggested_duplicates: { type: "array", items: { type: "string" } },
            citations: { type: "array", items: { type: "string" } },
            needs_human_review: { type: "boolean" },
          },
          required: ["title", "answer", "category", "priority", "suggested_duplicates", "citations", "needs_human_review"],
        } } },
        metadata: { feature: task },
      }),
    });
  } catch {
    await failJob("provider_network_error");
    return Response.json({ error: "AI-провайдер временно недоступен" }, { status: 502 });
  }

  const payload = await upstream.json().catch(() => ({})) as Record<string, unknown>;
  if (!upstream.ok) {
    await failJob(`provider_http_${upstream.status}`);
    return Response.json({ error: "AI-провайдер временно недоступен" }, { status: upstream.status });
  }

  let result: AiResult;
  try {
    result = JSON.parse(extractOutputText(payload)) as AiResult;
    result.needs_human_review = true;
  } catch {
    await failJob("invalid_structured_output");
    return Response.json({ error: "AI вернул ответ в неожиданном формате" }, { status: 502 });
  }

  if (supabase && jobId) {
    const completion = await supabase.rpc("complete_ai_job", {
      p_job_id: jobId,
      p_provider_response_id: typeof payload.id === "string" ? payload.id : "",
      p_result: result,
      p_human_review_required: true,
    });
    if (completion.error) return Response.json({ error: "AI-результат получен, но не записан в журнал" }, { status: 503 });
  }

  return Response.json({ id: typeof payload.id === "string" ? payload.id : "", jobId: jobId || null, result });
}
