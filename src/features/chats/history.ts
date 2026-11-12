import { createClient } from "@/lib/supabase/client";
import { requireBackend } from "@/lib/supabase/config";
import type { MessageItem } from "@/types/app";

export const CHAT_PAGE_SIZE = 50;
export type MessageCursor = { id: string; createdAt: string };

export async function loadChatMessages(chatId: string, userId: string, before?: MessageCursor): Promise<MessageItem[]> {
  if (!requireBackend()) return [];
  let query = createClient().from("messages")
    .select("*, sender:profiles(full_name, avatar_url, role)")
    .eq("chat_id", chatId);
  if (before) {
    query = query.or(`created_at.lt.${before.createdAt},and(created_at.eq.${before.createdAt},id.lt.${before.id})`);
  }
  const { data, error } = await query.order("created_at", { ascending: false })
    .order("id", { ascending: false }).limit(CHAT_PAGE_SIZE);
  if (error) throw error;
  // Mobile clients send photos and PDFs as storage paths; resolve them to signed links.
  const attachmentPaths = (data || [])
    .filter((message) => (message.type === "image" || message.type === "document") && !message.is_deleted && message.content)
    .map((message) => message.content as string);
  const signed = new Map<string, string>();
  if (attachmentPaths.length) {
    const { data: urls } = await createClient().storage.from("house-media").createSignedUrls(attachmentPaths, 60 * 60);
    for (const entry of urls || []) if (entry.path && entry.signedUrl) signed.set(entry.path, entry.signedUrl);
  }
  return (data || []).reverse().map((message) => ({
    id: message.id, chatId: message.chat_id, senderId: message.sender_id,
    senderName: message.sender?.full_name || "Сосед",
    senderAvatar: message.sender?.avatar_url || undefined,
    isOfficial: message.sender?.role === "hoa_official", isMe: message.sender_id === userId,
    text: message.is_deleted ? "Сообщение удалено"
      : message.type === "image" ? "Фото" : message.type === "document" ? "Документ" : message.content || "",
    kind: message.is_deleted ? "text" : message.type === "image" || message.type === "document" ? message.type : "text",
    attachmentUrl: message.is_deleted ? undefined : signed.get(message.content || ""),
    createdAt: message.created_at,
    time: new Date(message.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
  }));
}

export function mergeChatMessages(older: MessageItem[], latest: MessageItem[]): MessageItem[] {
  return [...new Map([...older, ...latest].map((message) => [message.id, message])).values()]
    .sort((a, b) => (a.createdAt || "").localeCompare(b.createdAt || "") || a.id.localeCompare(b.id));
}
