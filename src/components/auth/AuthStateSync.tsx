"use client";

import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { useAppStore } from "@/stores/appStore";
import { takePendingAvatar, uploadAvatar } from "@/lib/avatar";

export default function AuthStateSync() {
  const syncAuthState = useAppStore((state) => state.syncAuthState);
  const hydrateDomainData = useAppStore((state) => state.hydrateDomainData);
  const userId = useAppStore((state) => state.supabaseUserId);

  // Аватар, выбранный при регистрации, загружается при первом входе.
  useEffect(() => {
    if (!userId) return;
    void takePendingAvatar().then(async (avatar) => {
      if (!avatar) return;
      const avatarUrl = await uploadAvatar(userId, avatar);
      useAppStore.setState((state) => ({ currentUser: { ...state.currentUser, avatarUrl } }));
    }).catch((error) => useAppStore.setState({ backendError: error instanceof Error ? `Аватар не загружен: ${error.message}` : "Аватар не загружен" }));
  }, [userId]);

  useEffect(() => {
    if (!isSupabaseConfigured()) return;

    let refreshTimer: number | undefined;
    let chatTimer: number | undefined;
    let notificationTimer: number | undefined;
    let authChangeTimer: number | undefined;
    const pendingChats = new Set<string>();
    const refresh = () => {
      window.clearTimeout(refreshTimer);
      refreshTimer = window.setTimeout(() => {
        void hydrateDomainData().catch(() => undefined);
      }, 150);
    };
    // Сообщения и уведомления приходят чаще всего: обновляем только их.
    const refreshChat = (payload: { new?: Record<string, unknown>; old?: Record<string, unknown> }) => {
      const chatId = (payload.new?.chat_id || payload.old?.chat_id) as string | undefined;
      if (chatId) pendingChats.add(chatId);
      window.clearTimeout(chatTimer);
      chatTimer = window.setTimeout(() => {
        const chats = [...pendingChats];
        pendingChats.clear();
        const { refreshChats } = useAppStore.getState();
        if (chats.length === 0) void refreshChats().catch(() => undefined);
        for (const id of chats) void refreshChats(id).catch(() => undefined);
      }, 150);
    };
    const refreshNotificationList = () => {
      window.clearTimeout(notificationTimer);
      notificationTimer = window.setTimeout(() => {
        void useAppStore.getState().refreshNotifications().catch(() => undefined);
      }, 150);
    };

    void syncAuthState().then(() => {
      if (useAppStore.getState().isLoggedIn) return hydrateDomainData();
    }).catch(() => {
      // Middleware и экран входа обработают отсутствие/ошибку сессии.
    });

    const supabase = createClient();
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === "INITIAL_SESSION") return;
      // Выносим запрос профиля из callback Supabase, чтобы не блокировать auth-lock.
      authChangeTimer = window.setTimeout(() => {
        void syncAuthState().then(() => {
          if (useAppStore.getState().isLoggedIn) return hydrateDomainData();
        }).catch(() => undefined);
      }, 0);
    });

    const realtime = supabase
      .channel("housesm-domain-sync")
      .on("postgres_changes", { event: "*", schema: "public", table: "posts" }, refresh)
      .on("postgres_changes", { event: "*", schema: "public", table: "poll_votes" }, refresh)
      .on("postgres_changes", { event: "*", schema: "public", table: "comments" }, refresh)
      .on("postgres_changes", { event: "*", schema: "public", table: "reactions" }, refresh)
      .on("postgres_changes", { event: "*", schema: "public", table: "chats" }, refreshChat)
      .on("postgres_changes", { event: "*", schema: "public", table: "messages" }, refreshChat)
      .on("postgres_changes", { event: "*", schema: "public", table: "classifieds" }, refresh)
      .on("postgres_changes", { event: "*", schema: "public", table: "notifications" }, refreshNotificationList)
      .on("postgres_changes", { event: "*", schema: "public", table: "service_requests" }, refresh)
      .on("postgres_changes", { event: "*", schema: "public", table: "service_request_events" }, refresh)
      .on("postgres_changes", { event: "*", schema: "public", table: "house_documents" }, refresh)
      .on("postgres_changes", { event: "*", schema: "public", table: "house_document_acknowledgements" }, refresh)
      .on("postgres_changes", { event: "*", schema: "public", table: "official_votes" }, refresh)
      .on("postgres_changes", { event: "*", schema: "public", table: "official_vote_ballots" }, refresh)
      .on("postgres_changes", { event: "*", schema: "public", table: "finance_transactions" }, refresh)
      .on("postgres_changes", { event: "*", schema: "public", table: "emergency_alerts" }, refresh)
      .on("postgres_changes", { event: "*", schema: "public", table: "home_schedule_items" }, refresh)
      .on("postgres_changes", { event: "*", schema: "public", table: "amenity_bookings" }, refresh)
      .on("postgres_changes", { event: "*", schema: "public", table: "access_passes" }, refresh)
      .subscribe();

    return () => {
      window.clearTimeout(refreshTimer);
      window.clearTimeout(chatTimer);
      window.clearTimeout(notificationTimer);
      window.clearTimeout(authChangeTimer);
      subscription.unsubscribe();
      void supabase.removeChannel(realtime);
    };
  }, [hydrateDomainData, syncAuthState]);

  return null;
}
