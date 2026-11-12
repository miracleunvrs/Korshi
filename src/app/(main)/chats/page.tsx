"use client";

import { useState } from "react";
import Link from "next/link";
import { Building2, DoorOpen, MessageCircle, Plus, Search, UserRound, Users } from "lucide-react";
import { useAppStore } from "@/stores/appStore";
import Avatar from "@/components/ui/Avatar";

export default function ChatsPage() {
  const [activeTab, setActiveTab] = useState<"all" | "my" | "unread">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const { chats } = useAppStore();
  const chatIcon = (type: (typeof chats)[number]["type"]) => {
    if (type === "building") return Building2;
    if (type === "entrance") return DoorOpen;
    if (type === "direct") return UserRound;
    if (type === "thematic") return Users;
    return MessageCircle;
  };

  const filteredChats = chats.filter((chat) => {
    if (activeTab === "unread" && chat.unreadCount === 0) return false;
    if (activeTab === "my" && chat.type !== "direct") return false;
    if (searchQuery && !chat.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="min-h-screen bg-[#fffefb]">
      {/* Header */}
      <div className="glass-nav sticky top-16 z-20 space-y-3 border-b border-stone-200/80 px-4 py-4 md:top-0">
        <div className="flex items-center justify-between">
          <h1 className="font-bold text-gray-900 text-lg">Чаты</h1>
          <Link
            href="/chats/new"
            className="text-xs font-semibold text-green-600 flex items-center gap-1 hover:text-green-700 bg-green-50 px-3 py-1.5 rounded-full"
          >
            <Plus className="w-4 h-4" /> Новый чат
          </Link>
        </div>

        {/* Поиск */}
        <div className="relative">
          <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-3" />
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Поиск по чатам и сообщениям"
            className="w-full pl-9 pr-4 py-2 bg-gray-100 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-green-500 focus:bg-white transition"
          />
        </div>

        {/* Вкладки */}
        <div className="flex gap-2">
          {[
            { id: "all", label: "Все" },
            { id: "my", label: "Мои чаты" },
            { id: "unread", label: "Непрочитанные" },
          ].map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`px-3.5 py-1.5 rounded-full text-xs font-medium transition ${
                  isActive
                    ? "bg-green-600 text-white shadow-sm shadow-green-600/30"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Список чатов */}
      <div className="divide-y divide-gray-100">
        {filteredChats.length === 0 ? (
          <div className="p-12 text-center text-gray-400">
            <p className="text-sm font-medium">Чатов не найдено</p>
          </div>
        ) : (
          filteredChats.map((chat) => (
            <Link
              key={chat.id}
              href={`/chats/${chat.id}`}
              className="flex min-h-[76px] items-center gap-3.5 px-4 py-3.5 transition hover:bg-stone-50 active:bg-stone-100"
            >
              {chat.type === "direct" ? <Avatar url={chat.avatarUrl} name={chat.name} size={48} className="h-12 w-12 shrink-0 rounded-2xl" /> : (() => {
                const Icon = chatIcon(chat.type);
                return (
              <div
                className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-green-50 text-green-800"
              >
                <Icon className="h-5 w-5" aria-hidden="true" />
              </div>
                );
              })()}

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-gray-900 text-sm truncate">
                    {chat.name}
                  </h3>
                  <span className="text-[11px] text-gray-400 shrink-0 ml-2">
                    {chat.lastMessageTime}
                  </span>
                </div>

                <div className="flex items-center justify-between mt-1">
                  <p className="text-xs text-gray-500 truncate pr-2">
                    {chat.lastMessage}
                  </p>
                  {chat.unreadCount > 0 && (
                    <span className="w-5 h-5 rounded-full bg-green-600 text-white text-[11px] font-bold flex items-center justify-center shrink-0">
                      {chat.unreadCount}
                    </span>
                  )}
                </div>
              </div>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}
