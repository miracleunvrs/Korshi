import { createHash, randomUUID } from "node:crypto";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";

import { AI_TIMEOUT_MS, parseAiResult, readAiInput } from "@/features/ai/validation";

export const runtime = "nodejs";

function extractOutputText(payload: Record<string, unknown>) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) return "";
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
  const input = await readAiInput(request);
  if (!input.ok) return Response.json({ error: input.error }, { status: input.status });
  const body = input.value;
  const task = body.task;
  const sources: Array<{ id: string; title: string; excerpt: string }> = [];

  if (!isSupabaseConfigured()) return Response.json({ error: "Backend не настроен" }, { status: 503 });
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) return Response.json({ error: "Нужна авторизация" }, { status: 401 });
  const userId = data.user.id;

  const safetyIdentifier = createHash("sha256").update(userId).digest("hex").slice(0, 32);
  const rateLimit = await supabase.rpc("consume_rate_limit", { p_bucket_key: `ai:${safetyIdentifier}`, p_limit: 10, p_window_seconds: 60 });
  if (rateLimit.error) return Response.json({ error: "Не удалось проверить лимит AI-запросов" }, { status: 503 });
  if (!rateLimit.data) return Response.json({ error: "Слишком много запросов. Повторите через минуту." }, { status: 429 });

  if (task === "similar_requests") {
    const visible = await supabase.from("service_requests").select("id,title,description,location,status").order("created_at", { ascending: false }).limit(50);
    if (visible.error) return Response.json({ error: "Не удалось загрузить заявки для сравнения" }, { status: 503 });
    for (const row of visible.data || []) sources.push({ id: row.id, title: row.title, excerpt: `${row.description} · ${row.location} · ${row.status}` });
  }

  const jobId = randomUUID();
  const inputHash = createHash("sha256").update(`${userId}\u0000${task}\u0000${body.prompt}`).digest("hex");
  const audit = await supabase.from("ai_jobs").insert({ id: jobId, feature: task, input_hash: inputHash, source_ids: sources.map((source) => source.id), status: "running" });
  if (audit.error) return Response.json({ error: "Не удалось создать журнал AI-запроса" }, { status: 503 });

  const failJob = async (code: string) => {
    await supabase.rpc("fail_ai_job", { p_job_id: jobId, p_error_code: code });
  };
  const apiKey = process.env.OPENAI_API_KEY;
  const model = process.env.OPENAI_MODEL;
  if (!apiKey || !model) {
    await failJob("provider_not_configured");
    return Response.json({ error: "AI не настроен. Добавьте OPENAI_API_KEY и OPENAI_MODEL на сервере.", jobId }, { status: 503 });
  }

  const sourceText = sources.map((source) => `[${source.id}] ${source.title}: ${source.excerpt}`).join("\n");
  const content: Array<Record<string, unknown>> = [{ type: "input_text", text: `${body.prompt.trim()}${sourceText ? `\n\nДоступные заявки этого ЖК:\n${sourceText}` : ""}` }];
  if (body.imageDataUrl) content.push({ type: "input_image", image_url: body.imageDataUrl, detail: "auto" });

  let upstream: Response;
  try {
    upstream = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      signal: AbortSignal.timeout(AI_TIMEOUT_MS),
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        store: false,
        safety_identifier: createHash("sha256").update(userId).digest("hex").slice(0, 32),
        max_output_tokens: 700,
        instructions: "Ты классификатор обращений жителей многоквартирного дома. Определи категорию и приоритет, либо найди похожие заявки только среди переданных источников. Не принимай решение за диспетчера. Для suggested_duplicates и citations возвращай только UUID из переданных источников; если источников нет, верни пустые массивы. Любой результат требует подтверждения человеком. Отвечай по-русски и верни JSON строго по схеме.",
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
  } catch (error) {
    if (error instanceof Error && (error.name === "TimeoutError" || error.name === "AbortError")) {
      await failJob("provider_timeout");
      return Response.json({ error: "AI не ответил вовремя. Попробуйте ещё раз.", jobId }, { status: 504 });
    }
    await failJob("provider_network_error");
    return Response.json({ error: "AI-провайдер временно недоступен" }, { status: 502 });
  }

  const payload = await upstream.json().catch(() => ({})) as Record<string, unknown>;
  if (!upstream.ok) {
    await failJob(`provider_http_${upstream.status}`);
    // Статус провайдера (401/429 и т.п.) относится к серверному ключу, а не к сессии клиента.
    return Response.json({ error: "AI-провайдер временно недоступен" }, { status: 502 });
  }

  const result = parseAiResult(extractOutputText(payload), sources.map((source) => source.id));
  if (!result) {
    await failJob("invalid_structured_output");
    return Response.json({ error: "AI вернул ответ в неожиданном формате" }, { status: 502 });
  }

  const completion = await supabase.rpc("complete_ai_job", {
    p_job_id: jobId,
    p_provider_response_id: typeof payload.id === "string" ? payload.id : "",
    p_result: result,
    p_human_review_required: true,
  });
  if (completion.error) return Response.json({ error: "AI-результат получен, но не записан в журнал" }, { status: 503 });

  return Response.json({ id: typeof payload.id === "string" ? payload.id : "", jobId, result });
}
