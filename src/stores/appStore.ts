import { appFixturesInitial } from "@/demo/initialState";
import { DEFAULT_ACCOUNTS } from "@/demo/accounts";
import type { UserAccount, MessageItem, ChatItem, VerificationRequest, AppNotification, ClassifiedItem, ServiceRequestStatus, ServiceRequestPriority, ServiceRequestCategory, ServiceRequestItem, ServiceRequestAttachment, ServiceRequestEvent, HouseDocumentCategory, HouseDocument, OfficialVoteChoice, OfficialVoteItem, FinanceTransaction, FinanceBudgetItem, FinanceOverview, HomeScheduleItem, AmenityResource, AmenityBooking, VisitorPass, ResidentVehicle, NotificationPreferenceKey, EmergencyAlert, RegistrationResult, AppState } from "@/types/app";
export type { UserAccount, MessageItem, ChatItem, VerificationRequest, AppNotification, ClassifiedItem, ServiceRequestStatus, ServiceRequestPriority, ServiceRequestCategory, ServiceRequestItem, ServiceRequestAttachment, ServiceRequestEvent, HouseDocumentCategory, HouseDocument, OfficialVoteChoice, OfficialVoteItem, FinanceTransaction, FinanceBudgetItem, FinanceOverview, HomeScheduleItem, AmenityResource, AmenityBooking, VisitorPass, ResidentVehicle, NotificationPreferenceKey, EmergencyAlert, RegistrationResult, AppState } from "@/types/app";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { PostWithAuthor, UserRole } from "@/types";
import type { Database } from "@/types/database.types";
import { createClient } from "@/lib/supabase/client";
import { getAuthCallbackUrl, isSupabaseConfigured, isDemoMode } from "@/lib/supabase/config";
import type { User } from "@supabase/supabase-js";
import {
  deleteClassified as deleteClassifiedRemote,
  deleteComment as deleteCommentRemote,
  deleteMessage as deleteMessageRemote,
  deletePost as deletePostRemote,
  createDirectChat as createDirectChatRemote,
  hydrateDomainData,
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
  persistVisitorPass,
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
    entranceNumber: Number(metadata.entrance_number) || 1,
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

  if (profile.complex_id) {
    const complexResult = await supabase
      .from("complexes")
      .select("name, address, city")
      .eq("id", profile.complex_id)
      .maybeSingle();
    const complexData = complexResult.data as { name: string; address: string; city: string } | null;
    if (complexData) {
      currentComplexName = complexData.name;
      currentComplexAddress = [complexData.city, complexData.address].filter(Boolean).join(", ");
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
    entranceNumber,
    apartmentNumber,
    verified: profile.verified,
    avatarUrl: profile.avatar_url || fallback.avatarUrl,
    bio: profile.bio || undefined,
  };
}

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
      ...appFixturesInitial(),

      isLoggedIn: isDemoMode(),
      isAuthLoading: isSupabaseConfigured(),
      supabaseUserId: null,
      backendError: null,

      notificationPreferences: {
        requests: true,
        community: true,
        finance: true,
        emergency: true,
      },
      setNotificationPreference: (key, enabled) => set((state) => ({
        notificationPreferences: { ...state.notificationPreferences, [key]: enabled },
      })),

      markNotificationRead: async (notificationId) => {
        if (isSupabaseConfigured()) {
          const { error } = await (createClient() as any).from("notifications").update({ is_read: true }).eq("id", notificationId);
          if (error) throw error;
        }
        set((state) => ({
          notifications: state.notifications.map((notification) =>
            notification.id === notificationId ? { ...notification, isRead: true } : notification
          ),
        }));
      },

      clearBackendError: () => set({ backendError: null }),

      hydrateDomainData: async () => {
        if (!isSupabaseConfigured()) return;
        try {
          const data = await hydrateDomainData();
          if (!data) return;
          set({
            posts: data.posts,
            chats: data.chats,
            messages: data.messages,
            classifieds: data.classifieds,
            verificationRequests: data.verificationRequests,
            postComments: data.postComments,
            notifications: data.notifications,
            serviceRequests: data.serviceRequests,
            documents: data.documents,
            officialVotes: data.officialVotes,
            finance: data.finance,
            urgentAlert: data.urgentAlert,
            scheduleItems: data.scheduleItems,
            amenityResources: data.amenityResources,
            amenityBookings: data.amenityBookings,
            visitorPasses: data.visitorPasses,
            residentVehicles: data.residentVehicles,
            backendError: null,
          });
        } catch (error) {
          const message = error instanceof Error ? error.message : "Не удалось загрузить данные";
          set({ backendError: message });
          throw error;
        }
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
            set({ ...appFixturesInitial(), isLoggedIn: false, supabaseUserId: null, isAuthLoading: false });
            return;
          }

          if (!data.user.email_confirmed_at) {
            await supabase.auth.signOut();
            set({ ...appFixturesInitial(), isLoggedIn: false, supabaseUserId: null, isAuthLoading: false });
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
          set({ ...appFixturesInitial(), isLoggedIn: false, supabaseUserId: null, isAuthLoading: false });
          throw error;
        }
      },

      registerUser: async (data) => {
        if (isSupabaseConfigured()) {
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
        }

        throw new Error("Supabase не настроен. Укажите переменные окружения для реальной регистрации.");
      },

      loginUser: async (email, password) => {
        if (isSupabaseConfigured()) {
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
        }

        throw new Error("Supabase не настроен. Укажите переменные окружения для реального входа.");
      },

      resetPassword: async (email) => {
        if (!isSupabaseConfigured()) throw new Error("Восстановление доступно только для реального аккаунта");
        const { error } = await createClient().auth.resetPasswordForEmail(email.trim().toLowerCase(), {
          redirectTo: `${getAuthCallbackUrl()}?next=/reset-password`,
        });
        if (error) throw error;
      },

      logoutUser: async () => {
        if (isSupabaseConfigured()) {
          const { error } = await createClient().auth.signOut();
          if (error) throw error;
        }

        set({
          currentUser: DEFAULT_ACCOUNTS[0],
          isLoggedIn: false,
          supabaseUserId: null,
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
        const state = get();
        const request = await persistServiceRequest(data, files);
        const now = new Date();
        const localRequest: ServiceRequestItem = request || {
          id: `service-request-${Date.now()}`,
          userId: state.currentUser.id,
          complexId: state.currentUser.complexId || "complex-1",
          ...data,
          status: "submitted",
          attachments: files.map((file, index) => ({
            id: `local-attachment-${Date.now()}-${index}`,
            url: URL.createObjectURL(file),
            name: file.name,
            mimeType: file.type,
            sizeBytes: file.size,
            kind: "evidence",
          })),
          events: [{
            id: `local-event-${Date.now()}`,
            kind: "created",
            actorName: state.currentUser.fullName,
            actorRole: state.currentUser.role,
            message: data.description,
            createdAt: now.toLocaleString("ru-RU"),
          }],
          createdAt: now.toLocaleString("ru-RU"),
          updatedAt: now.toLocaleString("ru-RU"),
        };
        set((current) => ({
          serviceRequests: [localRequest, ...current.serviceRequests],
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
              message: message.trim() || "Требуется дополнительная работа",
              createdAt: now,
            }],
          } : request),
        }));
      },

      updateServiceRequestStatus: async (requestId, status, options = {}) => {
        await persistServiceRequestStatus(requestId, status, options.note, options.assigneeName, options.slaDueAt);
        const state = get();
        const now = new Date().toLocaleString("ru-RU");
        set((current) => ({
          serviceRequests: current.serviceRequests.map((request) => request.id === requestId ? {
            ...request,
            status,
            assigneeName: options.assigneeName || request.assigneeName,
            slaDueAt: options.slaDueAt || request.slaDueAt,
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
        const state = get();
        const remote = await persistHouseDocument(data, file);
        const document: HouseDocument = remote || {
          id: `document-${Date.now()}`,
          complexId: state.currentUser.complexId || "complex-1",
          ...data,
          fileName: file.name,
          mimeType: file.type,
          sizeBytes: file.size,
          url: URL.createObjectURL(file),
          acknowledged: false,
          status: "active",
          publishedBy: state.currentUser.fullName,
          publishedAt: new Date().toLocaleString("ru-RU"),
        };
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
        const remote = await recordFinanceTransaction(data);
        const transaction: FinanceTransaction = remote || { ...data, id: `finance-${Date.now()}` };
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
        const remote = await persistAmenityBooking(resourceId, startsAt, endsAt);
        const booking: AmenityBooking = remote || { id: `booking-${Date.now()}`, resourceId, startsAt, endsAt, status: "confirmed" };
        set((state) => ({ amenityBookings: [booking, ...state.amenityBookings] }));
      },

      createVisitorPass: async (data) => {
        const remote = await persistVisitorPass(data);
        const now = new Date().toLocaleString("ru-RU");
        const pass: VisitorPass = remote || {
          id: `pass-${Date.now()}`,
          ...data,
          accessCode: crypto.randomUUID().slice(0, 8).toUpperCase(),
          validFrom: now,
          status: "active",
        };
        set((state) => ({ visitorPasses: [pass, ...state.visitorPasses] }));
      },

      addResidentVehicle: async (plate, label) => {
        const remote = await persistResidentVehicle(plate, label);
        const vehicle: ResidentVehicle = remote || { id: `vehicle-${Date.now()}`, plate, label };
        set((state) => ({ residentVehicles: [vehicle, ...state.residentVehicles] }));
      },

      markAllNotificationsRead: async () => {
        if (isSupabaseConfigured()) {
          const { error } = await (createClient() as any)
            .from("notifications")
            .update({ is_read: true })
            .eq("is_read", false);
          if (error) throw error;
        }
        set((state) => ({
          notifications: state.notifications.map((notification) => ({ ...notification, isRead: true })),
        }));
      },

      approveVerification: (requestId) =>
        set((state) => {
          const previousRequests = state.verificationRequests;
          const previousUsers = state.registeredUsers;
          const previousCurrentUser = state.currentUser;
          void reviewVerificationRequest(requestId, true).catch((error) => {
            set({
              verificationRequests: previousRequests,
              registeredUsers: previousUsers,
              currentUser: previousCurrentUser,
              backendError: error instanceof Error ? error.message : "Не удалось подтвердить жителя",
            });
          });
          const req = state.verificationRequests.find((r) => r.id === requestId);
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

      rejectVerification: (requestId) =>
        set((state) => {
          const previousRequests = state.verificationRequests;
          void reviewVerificationRequest(requestId, false).catch((error) => {
            set({
              verificationRequests: previousRequests,
              backendError: error instanceof Error ? error.message : "Не удалось отклонить заявку",
            });
          });
          return {
            verificationRequests: state.verificationRequests.map((r) =>
              r.id === requestId ? { ...r, status: "rejected" as const } : r
            ),
          };
        }),

      addPost: (post) =>
        set((state) => {
          const savedPost = isSupabaseConfigured() && !isUuid(post.id)
            ? { ...post, id: crypto.randomUUID() }
            : post;
          const previousPosts = state.posts;
          void persistPost(savedPost).catch((error) => {
            set({
              posts: previousPosts,
              backendError: error instanceof Error ? error.message : "Не удалось сохранить публикацию",
            });
          });
          return { posts: [savedPost, ...state.posts], backendError: null };
        }),

      deletePost: (postId) =>
        set((state) => {
          void deletePostRemote(postId).catch((error) => {
            set({ backendError: error instanceof Error ? error.message : "Не удалось удалить публикацию" });
          });
          return { posts: state.posts.filter((post) => post.id !== postId) };
        }),

      likePost: (postId) =>
        set((state) => {
          const previousPosts = state.posts;
          void persistReaction(postId).catch((error) => {
            set({
              posts: previousPosts,
              backendError: error instanceof Error ? error.message : "Не удалось сохранить реакцию",
            });
          });
          return {
            posts: state.posts.map((p) =>
              p.id === postId
                ? { ...p, reactions_count: (p.reactions_count || 0) + 1 }
                : p
            ),
          };
        }),

      unlikePost: (postId) =>
        set((state) => {
          const previousPosts = state.posts;
          void removeReaction(postId).catch((error) => {
            set({
              posts: previousPosts,
              backendError: error instanceof Error ? error.message : "Не удалось убрать реакцию",
            });
          });
          return {
            posts: state.posts.map((p) =>
              p.id === postId
                ? { ...p, reactions_count: Math.max(0, (p.reactions_count || 0) - 1) }
                : p
            ),
          };
        }),

      votePoll: (postId, optionId) =>
        set((state) => {
          const previousPosts = state.posts;
          void persistPollVote(postId, optionId).catch((error) => {
            set({
              posts: previousPosts,
              backendError: error instanceof Error ? error.message : "Не удалось сохранить голос",
            });
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
          const commentId = isSupabaseConfigured() ? crypto.randomUUID() : `c-${Date.now()}`;
          void persistComment(postId, commentText).catch((error) => {
            set({ backendError: error instanceof Error ? error.message : "Не удалось сохранить комментарий" });
          });
          const newComment = {
            id: commentId,
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
          void deleteCommentRemote(commentId).catch((error) => {
            set({ backendError: error instanceof Error ? error.message : "Не удалось удалить комментарий" });
          });
          return {
            postComments: {
              ...state.postComments,
              [postId]: (state.postComments[postId] || []).filter((comment) => comment.id !== commentId),
            },
          };
        }),

      sendMessage: (chatId, text) =>
        set((state) => {
          const previousMessages = state.messages;
          const previousChats = state.chats;
          const currentMsgs = state.messages[chatId] || [];
          const now = new Date();
          const timeStr = now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
          const newMsg: MessageItem = {
            id: isSupabaseConfigured() ? crypto.randomUUID() : `msg-${Date.now()}`,
            chatId,
            senderId: state.currentUser.id,
            senderName: state.currentUser.fullName,
            isMe: true,
            text,
            time: timeStr,
          };

          void persistMessage(chatId, text).catch((error) => {
            set({
              messages: previousMessages,
              chats: previousChats,
              backendError: error instanceof Error ? error.message : "Не удалось отправить сообщение",
            });
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

      deleteMessage: (chatId, messageId) =>
        set((state) => {
          void deleteMessageRemote(messageId).catch((error) => {
            set({ backendError: error instanceof Error ? error.message : "Не удалось удалить сообщение" });
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
        if (isSupabaseConfigured()) {
          const chatId = await createDirectChatRemote(authorId);
          await get().hydrateDomainData();
          return chatId;
        }

        const existingChat = state.chats.find((c) => c.name.includes(authorName));
        if (existingChat) return existingChat.id;

        const newChatId = `chat-${Date.now()}`;
        const newChat: ChatItem = {
          id: newChatId,
          name: `Личные: ${authorName}`,
          type: "direct",
          lastMessage: "Чат начат",
          lastMessageTime: "Только что",
          unreadCount: 0,
          avatarColor: "bg-green-600",
          icon: "💬",
        };

        set({
          chats: [newChat, ...state.chats],
          messages: {
            ...state.messages,
            [newChatId]: [
              {
                id: `msg-welcome-${Date.now()}`,
                chatId: newChatId,
                senderId: state.currentUser.id,
                senderName: state.currentUser.fullName,
                isMe: true,
                text: `Здравствуйте, ${authorName}! Пишу по вашему объявлению.`,
                time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
              },
            ],
          },
        });

        return newChatId;
      },

      addClassified: (item) =>
        set((state) => {
          void persistClassified({
            title: item.title,
            category: item.category,
            description: item.description,
            location: item.location,
            imagePath: item.image,
          }).catch((error) => {
            set({ backendError: error instanceof Error ? error.message : "Не удалось сохранить объявление" });
          });
          return { classifieds: [item, ...state.classifieds] };
        }),

      deleteClassified: (itemId) =>
        set((state) => {
          void deleteClassifiedRemote(itemId).catch((error) => {
            set({ backendError: error instanceof Error ? error.message : "Не удалось удалить объявление" });
          });
          return { classifieds: state.classifieds.filter((item) => item.id !== itemId) };
        }),

      donateToFundraiser: async (fundraiserId, amount) => {
        await recordFundraiserPayment(fundraiserId, amount);
        set((state) => ({
          posts: state.posts.map((p) => {
            if (p.fundraiser?.id !== fundraiserId) return p;
            return {
              ...p,
              fundraiser: {
                ...p.fundraiser,
                current_amount: p.fundraiser.current_amount + amount,
              },
            };
          }),
        }));
      },

      createFundraiser: (data) =>
        set((state) => {
          if (isSupabaseConfigured() && !["hoa_official", "admin"].includes(state.currentUser.role)) {
            return { backendError: "Только представитель ОСИ может запускать сборы" };
          }
          const newPostId = isSupabaseConfigured() ? crypto.randomUUID() : `post-fund-${Date.now()}`;
          const newPost: PostWithAuthor = {
            id: newPostId,
            author_id: state.currentUser.id,
            complex_id: "complex-1",
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
              full_name: "ОСИ «Солнечный»",
              avatar_url: null,
              role: "hoa_official",
              verified: true,
            },
            fundraiser: {
              id: isSupabaseConfigured() ? crypto.randomUUID() : `fund-${Date.now()}`,
              post_id: newPostId,
              initiative_id: null,
              target_amount: data.targetAmount,
              current_amount: 0,
              currency: data.currency || "₸",
              payment_url: "https://pay.kaspi.kz",
              qr_url: null,
              ends_at: data.endsAt || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
              status: "active",
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            },
            reactions_count: 0,
            comments_count: 0,
          };

          void persistFundraiser(newPost, newPost.fundraiser!).catch((error) => {
            set({ backendError: error instanceof Error ? error.message : "Не удалось сохранить сбор" });
          });

          return {
            posts: [newPost, ...state.posts],
          };
        }),

      submitVerificationRequest: async (data) => {
        await submitVerificationRequestRemote(data);
      },
    }),
    {
      name: isDemoMode() ? "korshi-demo-app-v1" : "korshi-app-v5",
      partialize: (state) => isDemoMode() ? Object.fromEntries(Object.keys(appFixturesInitial()).map((key) => [key, state[key as keyof AppState]])) : {},
      merge: (persistedState, currentState) => ({
        ...currentState,
        ...(isDemoMode() ? persistedState as Partial<AppState> : {}),
        isLoggedIn: isDemoMode(),
        isAuthLoading: isSupabaseConfigured(),
        supabaseUserId: null,
      }),
    }
  )
);
