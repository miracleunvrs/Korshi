"use client";

import { useState, useRef, useEffect, useLayoutEffect, use, useMemo } from "react";
import Link from "next/link";
import NextImage from "next/image";
import { ArrowLeft, Send, ShieldCheck, CheckCheck, FileText } from "lucide-react";
import { useAppStore } from "@/stores/appStore";
import GroupChatSettings from "@/components/chats/GroupChatSettings";
import { CHAT_PAGE_SIZE, loadChatMessages, mergeChatMessages, type MessageCursor } from "@/features/chats/history";
import type { MessageItem } from "@/types/app";

export default function ChatRoomPage({ params }: { params: Promise<{ chatId: string }> }) {
  const resolvedParams = use(params);
  const chatId = resolvedParams.chatId;
  return <ChatRoom key={chatId} chatId={chatId} />;
}

function ChatRoom({ chatId }: { chatId: string }) {

  const { chats, messages, sendMessage, deleteMessage, markChatRead, currentUser } = useAppStore();
  const [inputText, setInputText] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const streamRef = useRef<HTMLDivElement>(null);
  const anchorRef = useRef<{ height: number; top: number } | null>(null);
  const [history, setHistory] = useState<MessageItem[]>([]);
  const [cursor, setCursor] = useState<MessageCursor>();
  const [historyEnded, setHistoryEnded] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [historyError, setHistoryError] = useState("");
  const loadingRef = useRef(false);

  const currentChat = chats.find((c) => c.id === chatId) || {
    id: chatId,
    name: "Чат сообщества",
    icon: "💬",
  };

  const chatMessages = useMemo(() => mergeChatMessages(history, messages[chatId] || []), [history, chatId, messages]);
  const newestId = chatMessages.at(-1)?.id;

  const loadOlder = async () => {
    if (loadingRef.current) return;
    const first = cursor || chatMessages[0];
    if (!first?.createdAt) return;
    loadingRef.current = true;
    setLoadingHistory(true);
    setHistoryError("");
    try {
      const rows = await loadChatMessages(chatId, currentUser.id, { id: first.id, createdAt: first.createdAt });
      const stream = streamRef.current;
      if (stream) anchorRef.current = { height: stream.scrollHeight, top: stream.scrollTop };
      setHistory(mergeChatMessages(rows, chatMessages));
      setHistoryEnded(rows.length < CHAT_PAGE_SIZE);
      if (rows[0]?.createdAt) setCursor({ id: rows[0].id, createdAt: rows[0].createdAt });
    } catch {
      setHistoryError("Не удалось загрузить историю. Попробуйте ещё раз.");
    } finally {
      loadingRef.current = false;
      setLoadingHistory(false);
    }
  };

  useLayoutEffect(() => {
    const stream = streamRef.current;
    const anchor = anchorRef.current;
    if (stream && anchor) stream.scrollTop = anchor.top + stream.scrollHeight - anchor.height;
    anchorRef.current = null;
  }, [history]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [newestId]);

  // Открытый чат прочитан, в том числе когда в нём появляются новые сообщения.
  const unread = chats.find((chat) => chat.id === chatId)?.unreadCount || 0;
  useEffect(() => {
    if (unread > 0) markChatRead(chatId);
  }, [chatId, unread, markChatRead]);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    sendMessage(chatId, inputText.trim());
    setInputText("");
  };

  return (
    <div className="flex flex-col h-screen bg-[#f4f5f7]">
      {/* Chat header */}
      <div className="sticky top-0 z-20 bg-white/95 backdrop-blur-md border-b border-gray-100 px-4 py-3 flex items-center justify-between shadow-xs">
        <div className="flex items-center gap-3">
          <Link href="/chats" className="text-gray-600 p-1 -ml-1 hover:text-gray-900 transition">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h2 className="font-bold text-gray-900 text-sm leading-tight">
              {currentChat.name}
            </h2>
            <p className="text-[11px] text-gray-500 font-medium mt-0.5">
              {"type" in currentChat && currentChat.type === "direct" ? "Личный чат" : "Чат соседей"}
            </p>
          </div>
        </div>
        {"type" in currentChat && currentChat.type === "thematic" ? <GroupChatSettings chatId={chatId} name={currentChat.name} /> : <span className="w-7" />}
      </div>

      {/* Message stream */}
      <div ref={streamRef} className="flex-1 overflow-y-auto p-4 space-y-3">
        {!historyEnded && chatMessages[0]?.createdAt && <button type="button" disabled={loadingHistory} onClick={() => void loadOlder()} className="block mx-auto rounded-xl bg-white px-4 py-3 text-sm text-green-800 disabled:opacity-50">{loadingHistory ? "Загрузка…" : "Более ранние сообщения"}</button>}
        {historyError && <p role="alert" className="text-sm text-red-800">{historyError}</p>}
        {historyEnded && <p className="text-center text-xs text-gray-600">Начало переписки</p>}
        {chatMessages.length === 0 ? (
          <div className="text-center py-12 text-gray-400 text-xs">
            Сообщений пока нет. Напишите первым!
          </div>
        ) : (
          chatMessages.map((m) => {
            const isMe = m.isMe || m.senderId === currentUser.id;
            return (
              <div
                key={m.id}
                className={`flex flex-col ${isMe ? "items-end" : "items-start"}`}
              >
                {!isMe && (
                  <span className="text-[11px] font-medium text-gray-500 mb-1 flex items-center gap-1 ml-1">
                    {m.senderName}
                    {m.isOfficial && (
                      <ShieldCheck className="w-3.5 h-3.5 text-green-600 inline" />
                    )}
                  </span>
                )}
                <div
                  className={`max-w-[82%] rounded-2xl px-4 py-2.5 text-xs leading-relaxed shadow-sm transition ${
                    isMe
                      ? "bg-green-600 text-white rounded-br-xs"
                      : "bg-white text-gray-800 border border-gray-100 rounded-bl-xs"
                  }`}
                >
                  <div className="flex items-end gap-2">
                    {m.kind === "image" && m.attachmentUrl ? (
                      <a href={m.attachmentUrl} target="_blank" rel="noreferrer" className="block">
                        <NextImage src={m.attachmentUrl} alt="Фото из чата" width={240} height={180} unoptimized className="max-h-60 w-auto rounded-xl object-cover" />
                      </a>
                    ) : m.kind === "document" && m.attachmentUrl ? (
                      <a href={m.attachmentUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 underline">
                        <FileText className="h-4 w-4" /> Открыть документ
                      </a>
                    ) : (
                      <p className="whitespace-pre-line">{m.text}</p>
                    )}
                    {isMe && m.senderId === currentUser.id && (
                      <button
                        type="button"
                        onClick={() => deleteMessage(chatId, m.id)}
                        className="text-[9px] text-green-100/80 hover:text-white"
                      >
                        Удалить
                      </button>
                    )}
                  </div>
                  <div
                    className={`flex items-center justify-end gap-1 text-[10px] mt-1 ${
                      isMe ? "text-green-100" : "text-gray-400"
                    }`}
                  >
                    <span>{m.time}</span>
                    {isMe && <CheckCheck className="w-3 h-3" />}
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input bar */}
      <form
        onSubmit={handleSend}
        className="bg-white border-t border-gray-100 p-3 flex items-center gap-2 max-w-lg mx-auto w-full"
      >
        <input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder="Написать сообщение соседям..."
          className="flex-1 px-4 py-2.5 bg-gray-100 rounded-2xl text-xs focus:outline-none focus:ring-2 focus:ring-green-500 focus:bg-white transition"
        />
        <button
          type="submit"
          disabled={!inputText.trim()}
          className="w-10 h-10 bg-green-600 text-white rounded-2xl flex items-center justify-center disabled:opacity-40 hover:bg-green-700 shadow-md shadow-green-600/20 active:scale-95 transition shrink-0"
        >
          <Send className="w-4 h-4 ml-0.5" />
        </button>
      </form>
    </div>
  );
}
