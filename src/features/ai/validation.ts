export const AI_REQUEST_LIMIT = 7_050_000;
export const AI_TIMEOUT_MS = 25_000;
const tasks = new Set(["request_triage", "image_analysis", "similar_requests"]);
const categories = new Set(["utilities", "cleaning", "repair", "safety", "territory", "other"]);
const priorities = new Set(["normal", "important", "emergency"]);

export type AiInput = { task: "request_triage" | "image_analysis" | "similar_requests"; prompt: string; imageDataUrl?: string };
export type AiResult = { title: string; answer: string; category: string | null; priority: string | null; suggested_duplicates: string[]; citations: string[]; needs_human_review: boolean };
type InputResult = { ok: true; value: AiInput } | { ok: false; status: number; error: string };

export async function readAiInput(request: Request): Promise<InputResult> {
  const invalid = { ok: false, status: 400, error: "Некорректный AI-запрос" } as const;
  const tooLarge = { ok: false, status: 413, error: "AI-запрос слишком большой" } as const;
  if (Number(request.headers.get("content-length")) > AI_REQUEST_LIMIT) return tooLarge;
  const reader = request.body?.getReader();
  if (!reader) return invalid;
  let bytes = 0;
  let text = "";
  const decoder = new TextDecoder();
  try {
    while (true) {
      const chunk = await reader.read();
      if (chunk.done) break;
      bytes += chunk.value.byteLength;
      if (bytes > AI_REQUEST_LIMIT) { await reader.cancel(); return tooLarge; }
      text += decoder.decode(chunk.value, { stream: true });
    }
    text += decoder.decode();
    const body: unknown = JSON.parse(text);
    if (!body || typeof body !== "object" || Array.isArray(body)) return invalid;
    const input = body as Record<string, unknown>;
    if (typeof input.task !== "string" || !tasks.has(input.task) || typeof input.prompt !== "string" || !input.prompt.trim()) return invalid;
    if (input.prompt.length > 12_000) return tooLarge;
    if (input.imageDataUrl !== undefined && (typeof input.imageDataUrl !== "string" ||
        !/^data:image\/(?:jpeg|png|webp|gif);base64,[A-Za-z0-9+/]+={0,2}$/.test(input.imageDataUrl) || input.imageDataUrl.length > 7_000_000)) return invalid;
    return { ok: true, value: { task: input.task as AiInput["task"], prompt: input.prompt.trim(), ...(input.imageDataUrl ? { imageDataUrl: input.imageDataUrl as string } : {}) } };
  } catch { return invalid; }
  finally { reader.releaseLock(); }
}

export function parseAiResult(text: string, sourceIds: string[]): AiResult | null {
  try {
    const value: unknown = JSON.parse(text);
    if (!value || typeof value !== "object" || Array.isArray(value)) return null;
    const result = value as Record<string, unknown>;
    if (typeof result.title !== "string" || typeof result.answer !== "string" ||
        !(result.category === null || (typeof result.category === "string" && categories.has(result.category))) ||
        !(result.priority === null || (typeof result.priority === "string" && priorities.has(result.priority))) ||
        typeof result.needs_human_review !== "boolean") return null;
    const sources = new Set(sourceIds);
    for (const key of ["suggested_duplicates", "citations"]) {
      if (!Array.isArray(result[key]) || !result[key].every((item: unknown) => typeof item === "string" && sources.has(item))) return null;
    }
    return { title: result.title, answer: result.answer, category: result.category as string | null, priority: result.priority as string | null,
      suggested_duplicates: result.suggested_duplicates as string[], citations: result.citations as string[], needs_human_review: true };
  } catch { return null; }
}
