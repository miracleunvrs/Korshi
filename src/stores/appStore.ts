import { emptyAppState } from "@/stores/initialState";
import type { UserAccount, MessageItem, ChatItem, VerificationRequest, AppNotification, ClassifiedItem, ServiceRequestStatus, ServiceRequestPriority, ServiceRequestCategory, ServiceRequestItem, ServiceRequestAttachment, ServiceRequestEvent, HouseDocumentCategory, HouseDocument, OfficialVoteChoice, OfficialVoteItem, FinanceTransaction, FinanceBudgetItem, FinanceOverview, HomeScheduleItem, AmenityResource, AmenityBooking, ResidentVehicle, EmergencyAlert, RegistrationResult, AppState } from "@/types/app";
export type { UserAccount, MessageItem, ChatItem, VerificationRequest, AppNotification, ClassifiedItem, ServiceRequestStatus, ServiceRequestPriority, ServiceRequestCategory, ServiceRequestItem, ServiceRequestAttachment, ServiceRequestEvent, HouseDocumentCategory, HouseDocument, OfficialVoteChoice, OfficialVoteItem, FinanceTransaction, FinanceBudgetItem, FinanceOverview, HomeScheduleItem, AmenityResource, AmenityBooking, ResidentVehicle, EmergencyAlert, RegistrationResult, AppState } from "@/types/app";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { PostWithAuthor, UserRole } from "@/types";
import type { Database } from "@/types/database.types";
import { createClient } from "@/lib/supabase/client";
import { getAuthCallbackUrl, isSupabaseConfigured } from "@/lib/supabase/config";
import { complexName } from "@/lib/appConfig";
import { mergeChatMessages } from "@/features/chats/history";
import type { User } from "@supabase/supabase-js";
import {
  deleteClassified as deleteClassifiedRemote,
  deleteComment as deleteCommentRemote,
  deleteMessage as deleteMessageRemote,
  deletePost as deletePostRemote,
  createDirectChat as createDirectChatRemote,
  markChatRead as markChatReadRemote,
  hydrateDomainData,
  loadOlderPosts,
  loadChatUpdate,
  loadNotificationList,
  POSTS_PAGE,
  persistClassified,
  persistComment,
  persistFundraiser,
  persistHouseDocument,
  persistInitiativeSupport,
  persistMessage,
  persistPollVote,
  persistPost,
  persistProfileUpdate,
  persistReaction,
  persistServiceRequest,
  persistServiceRequestComment,
  persistServiceRequestRating,
  persistServiceRequestReopen,
  persistServiceRequestStatus,
  persistDocumentAcknowledgement,
  persistDocumentArchive,
  persistOfficialVoteChoice,
  persistEmergencyAlert,
  persistEmergencyAcknowledgement,
  removeReaction,
  recordFundraiserPayment,
  recordFinanceTransaction,
  persistAmenityBooking,
  persistResidentVehicle,
  reviewVerificationRequest,
  submitVerificationRequest as submitVerificationRequestRemote,
} from "@/lib/supabase/repository";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const isUuid = (value: string | null | undefined) => Boolean(value && UUID_RE.test(value));

function roleLabel(role: UserRole, buildingNumber: string) {
  if (role === "service_provider") return "Мастер услуг ЖК";
  if (role === "hoa_official") return "Представитель ОСИ";
  if (role === "admin") return "Администратор ЖК";
  return buildingNumber ? `Житель (Дом ${buildingNumber})` : "Житель";
}

function accountFromAuthMetadata(user: User): UserAccount {
  const metadata = user.user_metadata || {};
  const role: UserRole = metadata.role === "service_provider" ? "service_provider" : "resident";
  const buildingNumber = String(metadata.building_number || "");

  return {
    id: user.id,
    fullName: String(metadata.full_name || user.email || user.phone || "Пользователь"),
    phone: user.phone || String(metadata.phone || ""),
    email: user.email,
    role,
    roleLabel: roleLabel(role, buildingNumber),
    buildingNumber,
    complexId: String(metadata.complex_id || "") || undefined,
    complexName: String(metadata.complex_name || "") || undefined,
    complexAddress: String(metadata.complex_address || "") || undefined,
    entranceNumber: Number(metadata.entrance_number) || 0,
    apartmentNumber: String(metadata.apartment_number || ""),
    verified: false,
    avatarUrl: String(metadata.avatar_url || ""),
  };
}

async function loadAccount(user: User): Promise<UserAccount> {
  const supabase = createClient();
  const fallback = accountFromAuthMetadata(user);
  const membershipResult = await supabase.from("complex_memberships").select("role").eq("user_id", user.id).eq("is_active", true).maybeSingle();
  const profileResult = await supabase
    .from("profiles")
    .select("id, phone, full_name, avatar_url, role, apartment_id, complex_id, verified, bio")
    .eq("id", user.id)
    .maybeSingle();
  const profile = profileResult.data as Pick<
    Database["public"]["Tables"]["profiles"]["Row"],
    "id" | "phone" | "full_name" | "avatar_url" | "role" | "apartment_id" | "complex_id" | "verified" | "bio"
  > | null;

  if (profileResult.error) throw profileResult.error;
  if (!profile) return fallback;

  let buildingNumber = fallback.buildingNumber;
  let entranceNumber = fallback.entranceNumber;
  let apartmentNumber = fallback.apartmentNumber;
  let currentComplexName = fallback.complexName;
  let currentComplexAddress = fallback.complexAddress;
  let complexLocation: UserAccount["complexLocation"];

  if (profile.complex_id) {
    const complexResult = await supabase
      .from("complexes")
      .select("name, address, city, latitude, longitude")
      .eq("id", profile.complex_id)
      .maybeSingle();
    const complexData = complexResult.data as { name: string; address: string; city: string; latitude: number | null; longitude: number | null } | null;
    if (complexData) {
      currentComplexName = complexName(complexData.name);
      currentComplexAddress = [complexData.city, complexData.address].filter(Boolean).join(", ");
      if (complexData.latitude != null && complexData.longitude != null) complexLocation = { latitude: complexData.latitude, longitude: complexData.longitude };
    }
  }

  if (profile.apartment_id) {
    const apartmentResult = await supabase
      .from("apartments")
      .select("number, entrance_id")
      .eq("id", profile.apartment_id)
      .maybeSingle();
    const apartment = apartmentResult.data as Pick<
      Database["public"]["Tables"]["apartments"]["Row"],
      "number" | "entrance_id"
    > | null;

    if (apartment) {
      apartmentNumber = apartment.number;
      const entranceResult = await supabase
        .from("entrances")
        .select("number, building_id")
        .eq("id", apartment.entrance_id)
        .maybeSingle();
      const entrance = entranceResult.data as Pick<
        Database["public"]["Tables"]["entrances"]["Row"],
        "number" | "building_id"
      > | null;

      if (entrance) {
        entranceNumber = entrance.number;
        const buildingResult = await supabase
          .from("buildings")
          .select("number")
          .eq("id", entrance.building_id)
          .maybeSingle();
        const building = buildingResult.data as Pick<
          Database["public"]["Tables"]["buildings"]["Row"],
          "number"
        > | null;
        if (building) buildingNumber = building.number;
      }
    }
  }

  return {
    id: user.id,
    fullName: profile.full_name || fallback.fullName,
    phone: profile.phone || fallback.phone,
    email: user.email,
    role: profile.role,
    membershipRole: membershipResult.data?.role,
    roleLabel: roleLabel(profile.role, buildingNumber),
    buildingNumber,
    complexId: profile.complex_id || undefined,
    complexName: currentComplexName,
    complexAddress: currentComplexAddress,
    complexLocation,
    entranceNumber,
    apartmentNumber,
    verified: profile.verified,
    avatarUrl: profile.avatar_url || fallback.avatarUrl,
    bio: profile.bio || undefined,
  };
}

let hydrateRequest = 0;

const withLike = (postId: string, liked: boolean) => (posts: PostWithAuthor[]) => posts.map((p) =>
  p.id === postId && Boolean(p.liked_by_me) !== liked
    ? { ...p, liked_by_me: liked, reactions_count: Math.max(0, (p.reactions_count || 0) + (liked ? 1 : -1)) }
    : p
);

function mergeAccount(users: UserAccount[], account: UserAccount) {
  return [
    account,
    ...users.filter(
      (user) =>
        user.id !== account.id &&
        (!account.email || user.email?.toLowerCase() !== account.email.toLowerCase())
    ),
  ];
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      ...emptyAppState(),

      isLoggedIn: false,
      isAuthLoading: isSupabaseConfigured(),
      supabaseUserId: null,
      backendError: null,


      markNotificationRead: async (notificationId) => {
        const { error } = await (createClient() as any).from("notifications").update({ is_read: true }).eq("id", notificationId);
        if (error) throw error;
        set((state) => ({
          notifications: state.notifications.map((notification) =>
            notification.id === notificationId ? { ...notification, isRead: true } : notification
          ),
        }));
      },

      clearBackendError: () => set({ backendError: null }),

      hydrateDomainData: async () => {
        if (!isSupabaseConfigured()) return;
        const request = ++hydrateRequest;
        try {
          const data = await hydrateDomainData();
          // Более поздний запрос уже начат: этот ответ устарел и не должен затирать данные.
          if (!data || request !== hydrateRequest) return;
          // Свежая страница заменяет начало ленты; догруженные кнопкой «Показать ещё»
          // старые посты сохраняем, иначе каждая синхронизация сбрасывала бы их.
          const oldest = data.posts.length >= POSTS_PAGE ? data.posts.at(-1)?.created_at : undefined;
          const freshIds = new Set(data.posts.map((post) => post.id));
          const keptOlder = oldest ? get().posts.filter((post) => !freshIds.has(post.id) && post.created_at < oldest) : [];
          const keptComments = Object.fromEntries(keptOlder.map((post) => [post.id, get().postComments[post.id] || []]));
          set({
            posts: [...data.posts, ...keptOlder],
            chats: data.chats,
            messages: data.messages,
            classifieds: data.classifieds,
            verificationRequests: data.verificationRequests,
            postComments: { ...keptComments, ...data.postComments },
            notifications: data.notifications,
            serviceRequests: data.serviceRequests,
            documents: data.documents,
            officialVotes: data.officialVotes,
            finance: data.finance,
            urgentAlert: data.urgentAlert,
            scheduleItems: data.scheduleItems,
            amenityResources: data.amenityResources,
            amenityBookings: data.amenityBookings,
            residentVehicles: data.residentVehicles,
            backendError: null,
          });
        } catch (error) {
          const message = error instanceof Error ? error.message : "Не удалось загрузить данные";
          if (request === hydrateRequest) set({ backendError: message });
          throw error;
        }
      },

      // Точечные обновления для самых частых событий realtime: сообщение не
      // должно перезагружать у каждого участника все данные приложения.
      refreshChats: async (chatId) => {
        if (!isSupabaseConfigured()) return;
        const request = hydrateRequest;
        const update = await loadChatUpdate(chatId);
        if (!update || request !== hydrateRequest) return;
        set((state) => {
          if (!update.chatId || !update.messages) return { chats: update.chats };
          const page = update.messages;
          const newestServer = page.at(-1)?.createdAt || "";
          // Своё сообщение, ещё не дошедшее до сервера, не должно мигать.
          const pending = (state.messages[update.chatId] || []).filter((message) =>
            message.isMe && !page.some((item) => item.id === message.id) && (message.createdAt || "") > newestServer);
          return {
            chats: update.chats,
            messages: { ...state.messages, [update.chatId]: mergeChatMessages(page, pending) },
          };
        });
      },

      refreshNotifications: async () => {
        if (!isSupabaseConfigured()) return;
        const request = hydrateRequest;
        const notifications = await loadNotificationList();
        if (!notifications || request !== hydrateRequest) return;
        set({ notifications });
      },

      syncAuthState: async () => {
        if (!isSupabaseConfigured()) {
          set({ isAuthLoading: false });
          return;
        }

        const supabase = createClient();
        set({ isAuthLoading: true });

        try {
          const { data, error } = await supabase.auth.getUser();
          if (error) throw error;

          if (!data.user) {
            hydrateRequest += 1;
            set({ ...emptyAppState(), isLoggedIn: false, supabaseUserId: null, isAuthLoading: false });
            return;
          }

          if (!data.user.email_confirmed_at) {
            await supabase.auth.signOut();
            set({ ...emptyAppState(), isLoggedIn: false, supabaseUserId: null, isAuthLoading: false });
            return;
          }

          const account = await loadAccount(data.user);
          set((state) => ({
            registeredUsers: mergeAccount(state.registeredUsers, account),
            currentUser: account,
            isLoggedIn: true,
            supabaseUserId: data.user!.id,
            isAuthLoading: false,
          }));
        } catch (error) {
          set({ ...emptyAppState(), isLoggedIn: false, supabaseUserId: null, isAuthLoading: false });
          throw error;
        }
      },

      registerUser: async (data) => {
        const supabase = createClient();
        const { data: authData, error } = await supabase.auth.signUp({
          email: data.email.trim().toLowerCase(),
          password: data.password,
          options: {
            emailRedirectTo: getAuthCallbackUrl(),
            data: {
              full_name: data.fullName,
              phone: data.phone,
              role: data.role || "resident",
              building_number: data.buildingNumber,
              entrance_number: data.entranceNumber,
              apartment_number: data.apartmentNumber,
            },
          },
        });

        if (error) throw error;
        if (!authData.user) throw new Error("Supabase не вернул созданного пользователя");

        const account = authData.session && authData.user.email_confirmed_at
          ? await loadAccount(authData.user)
          : accountFromAuthMetadata(authData.user);
        const requiresEmailConfirmation = !authData.session || !authData.user.email_confirmed_at;
        if (requiresEmailConfirmation && authData.session) {
          await supabase.auth.signOut();
        }

        set((current) => ({
          registeredUsers: mergeAccount(current.registeredUsers, account),
          currentUser: account,
          isLoggedIn: !requiresEmailConfirmation,
          supabaseUserId: requiresEmailConfirmation ? null : authData.user!.id,
        }));

        return { account, requiresEmailConfirmation };
      },

      loginUser: async (email, password) => {
        const supabase = createClient();
        const { data, error } = await supabase.auth.signInWithPassword({
          email: email.trim().toLowerCase(),
          password,
        });
        if (error) throw error;
        if (!data.user) throw new Error("Supabase не вернул пользователя");
        if (!data.user.email_confirmed_at) {
          await supabase.auth.signOut();
          throw new Error("Подтвердите email по ссылке из письма, затем войдите снова");
        }

        const account = await loadAccount(data.user);
        set((current) => ({
          registeredUsers: mergeAccount(current.registeredUsers, account),
          currentUser: account,
          isLoggedIn: true,
          supabaseUserId: data.user!.id,
        }));
        return account;
      },

      resetPassword: async (email) => {
        if (!isSupabaseConfigured()) throw new Error("Восстановление доступно только для реального аккаунта");
        const { error } = await createClient().auth.resetPasswordForEmail(email.trim().toLowerCase(), {
          redirectTo: `${getAuthCallbackUrl()}?next=/reset-password`,
        });
        if (error) throw error;
      },

      logoutUser: async () => {
        const { error } = await createClient().auth.signOut();
        if (error) throw error;

        // С реальным бэкендом в памяти не должно остаться данных вышедшего пользователя,
        // а загрузка, начатая до выхода, не должна их вернуть.
        hydrateRequest += 1;
        set({
          ...emptyAppState(),
          isLoggedIn: false,
          supabaseUserId: null,
          backendError: null,
        });
      },

      setVerified: (verified) =>
        set((state) => ({
          currentUser: { ...state.currentUser, verified },
        })),

      updateUser: (data) =>
        set((state) => {
          void persistProfileUpdate(data).catch((error) => {
            set({ backendError: error instanceof Error ? error.message : "Не удалось сохранить профиль" });
          });
          return {
            currentUser: { ...state.currentUser, ...data },
            registeredUsers: state.registeredUsers.map((u) =>
              u.id === state.currentUser.id ? { ...u, ...data } : u
            ),
          };
        }),

      setUrgentAlert: async (alert) => {
        const remote = await persistEmergencyAlert(alert, get().urgentAlert?.id);
        set({ urgentAlert: remote || alert });
      },

      acknowledgeUrgentAlert: async () => {
        const alert = get().urgentAlert;
        if (!alert) return;
        await persistEmergencyAcknowledgement(alert.id);
        set({ urgentAlert: { ...alert, acknowledged: true } });
      },

      createServiceRequest: async (data, files = []) => {
        const request = await persistServiceRequest(data, files);
        if (!request) throw new Error("Сервер не подтвердил сохранение. Обновите страницу и попробуйте снова.");
        set((current) => ({
          serviceRequests: [request, ...current.serviceRequests],
          backendError: null,
        }));
      },

      addServiceRequestComment: async (requestId, message) => {
        const text = message.trim();
        if (!text) return;
        await persistServiceRequestComment(requestId, text);
        const state = get();
        const now = new Date().toLocaleString("ru-RU");
        set((current) => ({
          serviceRequests: current.serviceRequests.map((request) => request.id === requestId ? {
            ...request,
            updatedAt: now,
            events: [...request.events, {
              id: `local-event-${Date.now()}`,
              kind: "comment",
              actorName: state.currentUser.fullName,
              actorRole: state.currentUser.role,
              message: text,
              createdAt: now,
            }],
          } : request),
        }));
      },

      rateServiceRequest: async (requestId, rating) => {
        await persistServiceRequestRating(requestId, rating);
        const state = get();
        const now = new Date().toLocaleString("ru-RU");
        set((current) => ({
          serviceRequests: current.serviceRequests.map((request) => request.id === requestId ? {
            ...request,
            status: "closed",
            rating,
            updatedAt: now,
            events: [...request.events, {
              id: `local-event-${Date.now()}`,
              kind: "rated",
              actorName: state.currentUser.fullName,
              actorRole: state.currentUser.role,
              message: `Оценка: ${rating} из 5`,
              createdAt: now,
            }],
          } : request),
        }));
      },

      reopenServiceRequest: async (requestId, message) => {
        if (!message.trim()) throw new Error("Опишите, что осталось не сделано");
        await persistServiceRequestReopen(requestId, message);
        const state = get();
        const now = new Date().toLocaleString("ru-RU");
        set((current) => ({
          serviceRequests: current.serviceRequests.map((request) => request.id === requestId ? {
            ...request,
            status: "submitted",
            rating: undefined,
            updatedAt: now,
            events: [...request.events, {
              id: `local-event-${Date.now()}`,
              kind: "reopened",
              actorName: state.currentUser.fullName,
              actorRole: state.currentUser.role,
              message: message.trim(),
              createdAt: now,
            }],
          } : request),
        }));
      },

      updateServiceRequestStatus: async (requestId, status, options = {}) => {
        await persistServiceRequestStatus(requestId, status, options.note, options.assigneeName, options.slaDueAt, options.assigneeId);
        const state = get();
        const now = new Date().toLocaleString("ru-RU");
        set((current) => ({
          serviceRequests: current.serviceRequests.map((request) => request.id === requestId ? {
            ...request,
            status,
            assigneeName: options.assigneeName || request.assigneeName,
            assigneeId: options.assigneeId || request.assigneeId,
            slaDueAt: options.slaDueAt ? new Date(options.slaDueAt).toLocaleString("ru-RU") : request.slaDueAt,
            resolutionNote: status === "resolved" ? options.note || request.resolutionNote : request.resolutionNote,
            updatedAt: now,
            events: [...request.events, {
              id: `local-event-${Date.now()}`,
              kind: status === "resolved" ? "resolution" : "status_changed",
              actorName: state.currentUser.fullName,
              actorRole: state.currentUser.role,
              message: options.note,
              createdAt: now,
            }],
          } : request),
        }));
      },

      addHouseDocument: async (data, file) => {
        const document = await persistHouseDocument(data, file);
        if (!document) throw new Error("Сервер не подтвердил сохранение. Обновите страницу и попробуйте снова.");
        set((current) => ({ documents: [document, ...current.documents] }));
      },

      acknowledgeDocument: async (documentId) => {
        await persistDocumentAcknowledgement(documentId);
        set((state) => ({
          documents: state.documents.map((document) => document.id === documentId ? { ...document, acknowledged: true } : document),
        }));
      },

      archiveDocument: async (documentId) => {
        await persistDocumentArchive(documentId);
        set((state) => ({
          documents: state.documents.map((document) => document.id === documentId ? { ...document, status: "archived" } : document),
        }));
      },

      castOfficialVote: async (voteId, choice) => {
        const remoteBallot = await persistOfficialVoteChoice(voteId, choice);
        set((state) => ({
          officialVotes: state.officialVotes.map((vote) => {
            if (vote.id !== voteId || vote.userChoice) return vote;
            const fallbackWeight = vote.basis === "area"
              ? vote.eligibleWeight / Math.max(1, vote.eligibleUnits)
              : 1;
            const ballotWeight = Number(remoteBallot?.weight || fallbackWeight);
            const eligibleWeight = vote.basis === "area" ? vote.eligibleWeight : vote.eligibleUnits;
            return {
              ...vote,
              userChoice: choice,
              participationPercent: Math.min(100, vote.participationPercent + ((ballotWeight / Math.max(1, eligibleWeight)) * 100)),
              results: { ...vote.results, [choice]: vote.results[choice] + ballotWeight },
            };
          }),
        }));
      },

      addFinanceTransaction: async (data) => {
        const transaction = await recordFinanceTransaction(data);
        if (!transaction) throw new Error("Сервер не подтвердил сохранение. Обновите страницу и попробуйте снова.");
        set((state) => ({
          finance: {
            ...state.finance,
            balance: state.finance.balance + (transaction.direction === "income" ? transaction.amount : -transaction.amount),
            income: state.finance.income + (transaction.direction === "income" ? transaction.amount : 0),
            expense: state.finance.expense + (transaction.direction === "expense" ? transaction.amount : 0),
            transactions: [transaction, ...state.finance.transactions],
          },
        }));
      },

      createAmenityBooking: async (resourceId, startsAt, endsAt) => {
        const booking = await persistAmenityBooking(resourceId, startsAt, endsAt);
        if (!booking) throw new Error("Сервер не подтвердил сохранение. Обновите страницу и попробуйте снова.");
        set((state) => ({ amenityBookings: [booking, ...state.amenityBookings] }));
      },

      addResidentVehicle: async (plate, label, photo) => {
        const vehicle = await persistResidentVehicle(plate, label, photo);
        if (!vehicle) throw new Error("Сервер не подтвердил сохранение. Обновите страницу и попробуйте снова.");
        set((state) => ({ residentVehicles: [vehicle, ...state.residentVehicles] }));
      },

      markAllNotificationsRead: async () => {
        const { error } = await (createClient() as any)
          .from("notifications")
          .update({ is_read: true })
          .eq("is_read", false);
        if (error) throw error;
        set((state) => ({
          notifications: state.notifications.map((notification) => ({ ...notification, isRead: true })),
        }));
      },

      approveVerification: (requestId) =>
        set((state) => {
          const req = state.verificationRequests.find((r) => r.id === requestId);
          const wasVerified = state.registeredUsers.find((u) => u.id === req?.userId)?.verified ?? false;
          const currentWasVerified = state.currentUser.verified;
          void reviewVerificationRequest(requestId, true).catch((error) => {
            // Возвращаем только эту заявку и её жителя, не затирая параллельные обновления.
            set((current) => ({
              verificationRequests: current.verificationRequests.map((r) =>
                r.id === requestId && req ? { ...r, status: req.status } : r
              ),
              registeredUsers: current.registeredUsers.map((u) =>
                req && u.id === req.userId ? { ...u, verified: wasVerified } : u
              ),
              currentUser: req && current.currentUser.id === req.userId
                ? { ...current.currentUser, verified: currentWasVerified }
                : current.currentUser,
              backendError: error instanceof Error ? error.message : "Не удалось подтвердить жителя",
            }));
          });
          const updatedRequests = state.verificationRequests.map((r) =>
            r.id === requestId ? { ...r, status: "approved" as const } : r
          );
          const updatedUsers = state.registeredUsers.map((u) =>
            req && u.id === req.userId ? { ...u, verified: true } : u
          );
          const updatedCurrent =
            req && state.currentUser.id === req.userId
              ? { ...state.currentUser, verified: true }
              : state.currentUser;

          return {
            verificationRequests: updatedRequests,
            registeredUsers: updatedUsers,
            currentUser: updatedCurrent,
          };
        }),

      rejectVerification: (requestId, reason) =>
        set((state) => {
          const previousStatus = state.verificationRequests.find((r) => r.id === requestId)?.status;
          void reviewVerificationRequest(requestId, false, reason).catch((error) => {
            set((current) => ({
              verificationRequests: current.verificationRequests.map((r) =>
                r.id === requestId && previousStatus ? { ...r, status: previousStatus } : r
              ),
              backendError: error instanceof Error ? error.message : "Не удалось отклонить заявку",
            }));
          });
          return {
            verificationRequests: state.verificationRequests.map((r) =>
              r.id === requestId ? { ...r, status: "rejected" as const, reviewReason: reason || r.reviewReason } : r
            ),
          };
        }),

      addPost: (post) =>
        set((state) => {
          const savedPost = !isUuid(post.id)
            ? { ...post, id: crypto.randomUUID() }
            : post;
          void persistPost(savedPost).catch((error) => {
            set((current) => ({
              posts: current.posts.filter((item) => item.id !== savedPost.id),
              backendError: error instanceof Error ? error.message : "Не удалось сохранить публикацию",
            }));
          });
          return { posts: [savedPost, ...state.posts], backendError: null };
        }),

      loadMorePosts: async () => {
        const oldest = get().posts.at(-1)?.created_at;
        if (!isSupabaseConfigured() || !oldest) return false;
        const page = await loadOlderPosts(oldest);
        set((state) => {
          const known = new Set(state.posts.map((post) => post.id));
          return {
            posts: [...state.posts, ...page.posts.filter((post) => !known.has(post.id))],
            postComments: { ...page.comments, ...state.postComments },
          };
        });
        return page.posts.length >= POSTS_PAGE;
      },

      deletePost: (postId) =>
        set((state) => {
          const removed = state.posts.find((post) => post.id === postId);
          void deletePostRemote(postId).catch((error) => {
            set((current) => ({
              posts: removed && !current.posts.some((post) => post.id === postId) ? [removed, ...current.posts] : current.posts,
              backendError: error instanceof Error ? error.message : "Не удалось удалить публикацию",
            }));
          });
          return { posts: state.posts.filter((post) => post.id !== postId) };
        }),

      likePost: (postId) => {
        if (get().posts.find((p) => p.id === postId)?.liked_by_me) return;
        set((state) => ({ posts: withLike(postId, true)(state.posts) }));
        void persistReaction(postId).catch((error) => {
          // Откатываем только этот лайк, не затирая параллельные обновления ленты.
          set((current) => ({
            posts: withLike(postId, false)(current.posts),
            backendError: error instanceof Error ? error.message : "Не удалось сохранить реакцию",
          }));
        });
      },

      unlikePost: (postId) => {
        if (!get().posts.find((p) => p.id === postId)?.liked_by_me) return;
        set((state) => ({ posts: withLike(postId, false)(state.posts) }));
        void removeReaction(postId).catch((error) => {
          set((current) => ({
            posts: withLike(postId, true)(current.posts),
            backendError: error instanceof Error ? error.message : "Не удалось убрать реакцию",
          }));
        });
      },

      votePoll: (postId, optionId) =>
        set((state) => {
          void persistPollVote(postId, optionId).catch((error) => {
            set((current) => ({
              posts: current.posts.map((p) => p.id === postId && p.poll ? {
                ...p,
                poll: {
                  ...p.poll,
                  total_votes: Math.max(0, p.poll.total_votes - 1),
                  options: p.poll.options.map((opt) =>
                    opt.id === optionId ? { ...opt, votes_count: Math.max(0, opt.votes_count - 1) } : opt
                  ),
                },
              } : p),
              backendError: error instanceof Error ? error.message : "Не удалось сохранить голос",
            }));
          });
          return {
          posts: state.posts.map((p) => {
            if (p.id !== postId || !p.poll) return p;
            return {
              ...p,
              poll: {
                ...p.poll,
                total_votes: p.poll.total_votes + 1,
                options: p.poll.options.map((opt) =>
                  opt.id === optionId
                    ? { ...opt, votes_count: opt.votes_count + 1 }
                    : opt
                ),
              },
            };
          }),
          };
        }),

      supportInitiative: (initiativeId) =>
        set((state) => {
          void persistInitiativeSupport(initiativeId).catch((error) => {
            set({ backendError: error instanceof Error ? error.message : "Не удалось сохранить поддержку" });
          });
          return {
          posts: state.posts.map((p) => {
            if (p.initiative?.id !== initiativeId) return p;
            return {
              ...p,
              initiative: {
                ...p.initiative,
                supporters: (p.initiative.supporters || 0) + 1,
              },
            };
          }),
          };
        }),

      addComment: (postId, commentText) =>
        set((state) => {
          const currentList = state.postComments[postId] || [];
          const commentId = crypto.randomUUID();
          void persistComment(postId, commentText, commentId).catch((error) => {
            // Убираем только несохранённый комментарий, не затирая параллельные обновления.
            set((current) => ({
              postComments: {
                ...current.postComments,
                [postId]: (current.postComments[postId] || []).filter((comment) => comment.id !== commentId),
              },
              posts: current.posts.map((p) =>
                p.id === postId ? { ...p, comments_count: Math.max(0, (p.comments_count || 0) - 1) } : p
              ),
              backendError: error instanceof Error ? error.message : "Не удалось сохранить комментарий",
            }));
          });
          const newComment = {
            id: commentId,
            authorId: state.currentUser.id,
            authorName: state.currentUser.fullName,
            isOfficial: state.currentUser.role === "hoa_official",
            text: commentText,
            time: "Только что",
          };

          return {
            postComments: {
              ...state.postComments,
              [postId]: [...currentList, newComment],
            },
            posts: state.posts.map((p) =>
              p.id === postId
                ? { ...p, comments_count: (p.comments_count || 0) + 1 }
                : p
            ),
          };
        }),

      deleteComment: (postId, commentId) =>
        set((state) => {
          const removed = (state.postComments[postId] || []).find((comment) => comment.id === commentId);
          void deleteCommentRemote(commentId).catch((error) => {
            set((current) => {
              const list = current.postComments[postId] || [];
              // Если свежая загрузка уже вернула комментарий, счётчик с сервера тоже верный.
              const restore = Boolean(removed) && !list.some((comment) => comment.id === commentId);
              return {
                postComments: restore ? { ...current.postComments, [postId]: [...list, removed!] } : current.postComments,
                posts: restore ? current.posts.map((p) =>
                  p.id === postId ? { ...p, comments_count: (p.comments_count || 0) + 1 } : p
                ) : current.posts,
                backendError: error instanceof Error ? error.message : "Не удалось удалить комментарий",
              };
            });
          });
          return {
            postComments: {
              ...state.postComments,
              [postId]: (state.postComments[postId] || []).filter((comment) => comment.id !== commentId),
            },
            posts: removed ? state.posts.map((p) =>
              p.id === postId ? { ...p, comments_count: Math.max(0, (p.comments_count || 0) - 1) } : p
            ) : state.posts,
          };
        }),

      sendMessage: (chatId, text) =>
        set((state) => {
          const currentMsgs = state.messages[chatId] || [];
          const now = new Date();
          const timeStr = now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
          const newMsg: MessageItem = {
            createdAt: now.toISOString(),
            id: crypto.randomUUID(),
            chatId,
            senderId: state.currentUser.id,
            senderName: state.currentUser.fullName,
            isMe: true,
            text,
            time: timeStr,
          };

          const previousChat = state.chats.find((c) => c.id === chatId);
          void persistMessage(chatId, text, newMsg.id).catch((error) => {
            // Убираем только неотправленное сообщение, не затирая пришедшие за это время.
            set((current) => ({
              messages: {
                ...current.messages,
                [chatId]: (current.messages[chatId] || []).filter((message) => message.id !== newMsg.id),
              },
              chats: current.chats.map((c) =>
                c.id === chatId && previousChat && c.lastMessage === `Вы: ${text}` && c.lastMessageTime === timeStr
                  ? { ...c, lastMessage: previousChat.lastMessage, lastMessageTime: previousChat.lastMessageTime }
                  : c
              ),
              backendError: error instanceof Error ? error.message : "Не удалось отправить сообщение",
            }));
          });

          return {
            messages: {
              ...state.messages,
              [chatId]: [...currentMsgs, newMsg],
            },
            chats: state.chats.map((c) =>
              c.id === chatId
                ? {
                    ...c,
                    lastMessage: `Вы: ${text}`,
                    lastMessageTime: timeStr,
                  }
                : c
            ),
          };
        }),

      markChatRead: (chatId) => {
        if (!get().chats.find((chat) => chat.id === chatId)?.unreadCount) return;
        set((state) => ({ chats: state.chats.map((chat) => chat.id === chatId ? { ...chat, unreadCount: 0 } : chat) }));
        void markChatReadRemote(chatId).catch((error) => set({ backendError: error instanceof Error ? `Чат не отмечен прочитанным: ${error.message}` : "Чат не отмечен прочитанным" }));
      },

      deleteMessage: (chatId, messageId) =>
        set((state) => {
          const original = (state.messages[chatId] || []).find((message) => message.id === messageId);
          void deleteMessageRemote(messageId).catch((error) => {
            set((current) => ({
              messages: original ? {
                ...current.messages,
                [chatId]: (current.messages[chatId] || []).map((message) => message.id === messageId ? original : message),
              } : current.messages,
              backendError: error instanceof Error ? error.message : "Не удалось удалить сообщение",
            }));
          });
          return {
            messages: {
              ...state.messages,
              [chatId]: (state.messages[chatId] || []).map((message) =>
                message.id === messageId ? { ...message, text: "Сообщение удалено" } : message
              ),
            },
          };
        }),

      createDirectChatWith: async (authorId, authorName) => {
        const state = get();
        const chatId = await createDirectChatRemote(authorId);
        await get().hydrateDomainData();
        return chatId;
      },

      addClassified: (item, details = {}) =>
        set((state) => {
          const saved = !isUuid(item.id) ? { ...item, id: crypto.randomUUID() } : item;
          void persistClassified({
            id: saved.id,
            title: saved.title,
            category: saved.category,
            description: saved.description,
            location: saved.location,
            price: details.price ?? null,
            imagePath: details.imagePath,
          }).catch((error) => {
            set((current) => ({
              classifieds: current.classifieds.filter((entry) => entry.id !== saved.id),
              backendError: error instanceof Error ? error.message : "Не удалось сохранить объявление",
            }));
          });
          return { classifieds: [saved, ...state.classifieds] };
        }),

      deleteClassified: (itemId) =>
        set((state) => {
          const removed = state.classifieds.find((item) => item.id === itemId);
          void deleteClassifiedRemote(itemId).catch((error) => {
            set((current) => ({
              classifieds: removed && !current.classifieds.some((item) => item.id === itemId) ? [removed, ...current.classifieds] : current.classifieds,
              backendError: error instanceof Error ? error.message : "Не удалось удалить объявление",
            }));
          });
          return { classifieds: state.classifieds.filter((item) => item.id !== itemId) };
        }),

      donateToFundraiser: async (fundraiserId, amount, options = {}) => {
        await recordFundraiserPayment(fundraiserId, amount, options.comment, options.anonymous);
        // С бэкендом сумма попадёт в сбор только после того, как ОСИ подтвердит поступление.
      },

      createFundraiser: async (data) => {
          const state = get();
          if (!["hoa_official", "admin"].includes(state.currentUser.role)) {
            const error = new Error("Только представитель ОСИ может запускать сборы");
            set({ backendError: error.message });
            throw error;
          }
          const newPostId = crypto.randomUUID();
          const newPost: PostWithAuthor = {
            id: newPostId,
            author_id: state.currentUser.id,
            complex_id: state.currentUser.complexId ?? "",
            building_id: null,
            entrance_id: null,
            type: "fundraiser",
            title: data.title,
            content: data.content,
            status: "active",
            is_official: true,
            territory: "complex",
            price: null,
            currency: null,
            views_count: 1,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            author: {
              id: state.currentUser.id,
              full_name: `ОСИ «${complexName(state.currentUser.complexName)}»`,
              avatar_url: null,
              role: "hoa_official",
              verified: true,
            },
            fundraiser: {
              id: crypto.randomUUID(),
              post_id: newPostId,
              initiative_id: null,
              target_amount: data.targetAmount,
              current_amount: 0,
              currency: data.currency || "₸",
              payment_url: data.paymentUrl || null,
              qr_url: null,
              ends_at: data.endsAt || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
              status: "active",
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            },
            reactions_count: 0,
            comments_count: 0,
          };

          set({ backendError: null });
          try {
            await persistFundraiser(newPost, newPost.fundraiser!);
          } catch (error) {
            set({ backendError: error instanceof Error ? error.message : "Не удалось сохранить сбор" });
            throw error;
          }

          set((current) => ({
            posts: [newPost, ...current.posts.filter((post) => post.id !== newPost.id)],
          }));
        },

      submitVerificationRequest: async (data) => {
        await submitVerificationRequestRemote(data);
      },
    }),
    {
      name: "korshi-app-v5",
      partialize: () => ({}),
      merge: (_persistedState, currentState) => ({
        ...currentState,
        isLoggedIn: false,
        isAuthLoading: isSupabaseConfigured(),
        supabaseUserId: null,
      }),
    }
  )
);
