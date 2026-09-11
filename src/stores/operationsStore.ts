import { operationsFixturesInitial } from "@/demo/initialState";
import { isDemoMode } from "@/lib/supabase/config";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import { loadPlatformSnapshot, syncPlatformMutation } from "@/lib/supabase/platformRepository";

export type MembershipRole = "owner" | "tenant" | "family" | "chair" | "admin" | "dispatcher" | "executor" | "guard" | "concierge";
export type RsvpChoice = "going" | "maybe" | "not_going";

export interface PropertyMembership {
  id: string;
  complexName: string;
  address: string;
  building: string;
  entrance: string;
  apartment: string;
  role: MembershipRole;
  isActive: boolean;
}

export interface AccessPass {
  id: string;
  guestName: string;
  kind: "single" | "permanent" | "courier" | "vehicle";
  code: string;
  vehiclePlate?: string;
  validUntil: string;
  status: "active" | "used" | "revoked" | "expired";
  arrivals: number;
}

export interface AccessEvent {
  id: string;
  subject: string;
  direction: "entry" | "exit";
  checkpoint: string;
  occurredAt: string;
  result: "allowed" | "denied";
}

export interface ParkingSpot {
  id: string;
  label: string;
  zone: string;
  kind: "resident" | "guest" | "accessible";
  status: "free" | "occupied" | "reserved";
}

export interface ParkingBooking {
  id: string;
  spotId: string;
  vehiclePlate: string;
  startsAt: string;
  endsAt: string;
  status: "confirmed" | "cancelled" | "completed" | "no_show";
}

export interface HouseWork {
  id: string;
  title: string;
  kind: "cleaning" | "repair" | "outage" | "lift" | "pest_control";
  location: string;
  employee: string;
  startsAt: string;
  status: "planned" | "in_progress" | "completed" | "missed";
  checklist: Array<{ id: string; label: string; done: boolean }>;
  photoUrl?: string;
  geo?: string;
  rating?: number;
}

export interface CommunityEvent {
  id: string;
  title: string;
  description: string;
  startsAt: string;
  location: string;
  capacity: number;
  going: number;
  userRsvp?: RsvpChoice;
  albumCount: number;
}

export interface CommunityClub {
  id: string;
  name: string;
  description: string;
  members: number;
  joined: boolean;
}

export interface CommunityNotice {
  id: string;
  kind: "help" | "lost" | "pet" | "group_buy";
  title: string;
  description: string;
  status: "active" | "resolved" | "cancelled";
}

export interface MarketplaceMeta {
  favoriteIds: string[];
  archivedIds: string[];
  reports: Array<{ id: string; listingId: string; reason: string; status: "new" | "reviewed" }>;
  reviews: Array<{ id: string; listingId: string; rating: number; text: string; author: string }>;
}

export interface NotificationChannels {
  push: boolean;
  emailCritical: boolean;
  smsCritical: boolean;
  voting: boolean;
  payments: boolean;
}

export interface ComplexSettings {
  name: string;
  logoUrl: string;
  primaryColor: string;
  managementPhone: string;
  managementEmail: string;
  domain: string;
  languages: Array<"ru" | "kk" | "en">;
  requestCategories: string[];
  customRoles: string[];
  houseRules: string;
  whiteLabel: boolean;
}

export interface OperationsState {
  memberships: PropertyMembership[];
  passes: AccessPass[];
  accessEvents: AccessEvent[];
  parkingSpots: ParkingSpot[];
  parkingBookings: ParkingBooking[];
  works: HouseWork[];
  events: CommunityEvent[];
  clubs: CommunityClub[];
  notices: CommunityNotice[];
  marketplace: MarketplaceMeta;
  notificationChannels: NotificationChannels;
  complexSettings: ComplexSettings;
  securityLists: { allow: string[]; deny: string[] };
  syncMessage: string;
  hydrateFromBackend: () => Promise<void>;
  switchMembership: (id: string) => Promise<void>;
  inviteFamily: (phone: string) => Promise<void>;
  createPass: (data: Pick<AccessPass, "guestName" | "kind" | "vehiclePlate" | "validUntil">) => Promise<void>;
  revokePass: (id: string) => Promise<void>;
  bookParking: (spotId: string, vehiclePlate: string, startsAt: string, endsAt: string) => Promise<void>;
  cancelParking: (id: string) => Promise<void>;
  reportParking: (spotId: string, reason: string) => Promise<void>;
  toggleWorkCheck: (workId: string, itemId: string) => void;
  rateWork: (workId: string, rating: number) => Promise<void>;
  rsvp: (eventId: string, choice: RsvpChoice) => Promise<void>;
  toggleClub: (clubId: string) => Promise<void>;
  resolveNotice: (noticeId: string) => Promise<void>;
  toggleFavorite: (listingId: string) => Promise<void>;
  archiveListing: (listingId: string) => Promise<void>;
  reportListing: (listingId: string, reason: string) => Promise<void>;
  reviewListing: (listingId: string, rating: number, text: string) => Promise<void>;
  setNotificationChannel: (key: keyof NotificationChannels, value: boolean) => Promise<void>;
  updateComplexSettings: (settings: ComplexSettings) => Promise<void>;
  triggerSos: (location: string) => Promise<void>;
}

const nowLabel = () => new Date().toLocaleString("ru-RU", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
const randomCode = () => String(Math.floor(100000 + Math.random() * 900000));
const dateLabel = (value: unknown) => value ? new Date(String(value)).toLocaleString("ru-RU", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }) : "";
const related = <T,>(value: T | T[] | null | undefined) => Array.isArray(value) ? value[0] : value;

export const useOperationsStore = create<OperationsState>()(persist((set, get) => ({
      ...operationsFixturesInitial(),

  syncMessage: "",

  hydrateFromBackend: async () => {
    let snapshot;
    try { snapshot = await loadPlatformSnapshot(); } catch (error) {
      set({ ...operationsFixturesInitial(), syncMessage: error instanceof Error ? error.message : "Не удалось загрузить данные" });
      return;
    }
    if (!snapshot) return;
    const next: Partial<OperationsState> = { ...operationsFixturesInitial(), syncMessage: "" };

    if (snapshot.memberships) next.memberships = snapshot.memberships.map((row: any) => {
      const complex = related(row.complex) as any;
      const apartment = related(row.apartment) as any;
      const entrance = related(apartment?.entrance) as any;
      const building = related(entrance?.building) as any;
      return { id: row.id, complexName: complex?.name || "Жилой комплекс", address: complex?.address || "", building: String(building?.number || "—"), entrance: String(entrance?.number || "—"), apartment: String(apartment?.number || "—"), role: row.role as MembershipRole, isActive: Boolean(row.is_active) };
    });
    if (snapshot.passes) next.passes = snapshot.passes.map((row: any) => ({ id: row.id, guestName: row.guest_name, kind: row.kind, code: row.access_code, vehiclePlate: row.vehicle_plate || undefined, validUntil: dateLabel(row.valid_until), status: row.status, arrivals: Number(row.used_count || 0) }));
    if (snapshot.accessEvents) next.accessEvents = snapshot.accessEvents.map((row: any) => ({ id: row.id, subject: row.subject, direction: row.direction, checkpoint: row.checkpoint, occurredAt: dateLabel(row.occurred_at), result: row.result }));
    if (snapshot.parkingSpots) next.parkingSpots = snapshot.parkingSpots.map((row: any) => ({ id: row.id, label: row.label, zone: row.zone, kind: row.kind, status: ["free", "occupied", "reserved"].includes(row.status) ? row.status : "occupied" }));
    if (snapshot.parkingBookings) next.parkingBookings = snapshot.parkingBookings.map((row: any) => ({ id: row.id, spotId: row.parking_spot_id, vehiclePlate: row.vehicle_plate, startsAt: dateLabel(row.starts_at), endsAt: dateLabel(row.ends_at), status: row.status }));
    if (snapshot.works) next.works = snapshot.works.map((row: any) => ({ id: row.id, title: row.title, kind: row.kind, location: row.location, employee: row.assigned_to ? "Назначеный исполнитель" : "Не назначен", startsAt: dateLabel(row.starts_at), status: row.status, geo: row.performer_geo || undefined, photoUrl: row.attachments?.find((item: any) => item.kind === "after")?.url, checklist: (row.checklist || []).sort((a: any, b: any) => a.position - b.position).map((item: any) => ({ id: item.id, label: item.label, done: Boolean(item.completed_at) })) }));
    if (snapshot.events) next.events = snapshot.events.map((row: any) => ({ id: row.id, title: row.title, description: row.description || "", startsAt: dateLabel(row.starts_at), location: row.location, capacity: Number(row.capacity || Math.max(20, (row.rsvps || []).length + 10)), going: (row.rsvps || []).filter((item: any) => item.choice === "going").length, userRsvp: row.rsvps?.find((item: any) => item.user_id === snapshot.userId)?.choice, albumCount: (row.albums || []).length }));
    if (snapshot.clubs) next.clubs = snapshot.clubs.map((row: any) => ({ id: row.id, name: row.name, description: row.description || "", members: (row.members || []).length, joined: Boolean(row.members?.some((item: any) => item.user_id === snapshot.userId)) }));
    if (snapshot.notices) next.notices = snapshot.notices.map((row: any) => ({ id: row.id, kind: row.kind, title: row.title, description: row.description, status: row.status }));
    if (snapshot.favorites) next.marketplace = { ...get().marketplace, favoriteIds: snapshot.favorites.map((row: any) => row.classified_id), reviews: snapshot.reviews ? snapshot.reviews.map((row: any) => ({ id: row.id, listingId: row.classified_id, rating: Number(row.rating), text: row.text || "", author: related(row.author)?.full_name || "Житель ЖК" })) : get().marketplace.reviews };
    if (snapshot.complexSettings) { const row: any = snapshot.complexSettings; next.complexSettings = { name: row.name, logoUrl: row.logo_url || "", primaryColor: row.primary_color, managementPhone: row.management_phone || "", managementEmail: row.management_email || "", domain: row.custom_domain || "", languages: row.languages || ["ru"], requestCategories: row.request_categories || [], customRoles: row.custom_roles || [], houseRules: row.house_rules || "", whiteLabel: Boolean(row.white_label) }; }
    if (snapshot.notificationPreferences) { const row: any = snapshot.notificationPreferences; next.notificationChannels = { push: Boolean(row.push), emailCritical: Boolean(row.email_critical), smsCritical: Boolean(row.sms_critical), voting: Boolean(row.voting), payments: Boolean(row.payments) }; }
    set(next);
  },
  switchMembership: async (id) => {
const result = await confirmedMutation({ operation: "rpc", table: "switch_active_membership", payload: { p_membership_id: id } });
set((state) => ({ memberships: state.memberships.map((item) => ({ ...item, isActive: item.id === id })) }));
set({ syncMessage: result.queued ? "Переключение будет завершено после синхронизации" : "Активный объект изменён" });
},
  inviteFamily: async (phone) => {
const result = await confirmedMutation({ operation: "insert", table: "family_invitations", payload: { phone, role: "family" } });
set({ syncMessage: result.queued ? "Приглашение сохранено и будет отправлено после синхронизации" : "Приглашение создано" });
},
  createPass: async (data) => {
const item: AccessPass = { ...data, id: crypto.randomUUID(), code: randomCode(), status: "active", arrivals: 0 };
const result = await confirmedMutation({ operation: "insert", table: "access_passes", payload: { id: item.id, guest_name: item.guestName, kind: item.kind, access_code: item.code, vehicle_plate: item.vehiclePlate || null, valid_until: item.validUntil, max_uses: item.kind === "single" || item.kind === "courier" ? 1 : null } });
set((state) => ({ passes: [item, ...state.passes] }));
set({ syncMessage: result.queued ? "Пропуск работает локально и ожидает синхронизации" : "Пропуск создан" });
},
  revokePass: async (id) => {
await confirmedMutation({ operation: "update", table: "access_passes", recordId: id, payload: { status: "revoked" } });
set((state) => ({ passes: state.passes.map((item) => item.id === id ? { ...item, status: "revoked" } : item) }));
},
  bookParking: async (spotId, vehiclePlate, startsAt, endsAt) => {
const item: ParkingBooking = { id: crypto.randomUUID(), spotId, vehiclePlate, startsAt, endsAt, status: "confirmed" };
const result = await confirmedMutation({ operation: "rpc", table: "book_guest_parking", payload: { p_spot_id: spotId, p_vehicle_plate: vehiclePlate, p_starts_at: startsAt, p_ends_at: endsAt } });
if (result.data && typeof result.data === "object" && !Array.isArray(result.data) && typeof result.data.id === "string") item.id = result.data.id;
set((state) => ({ parkingBookings: [item, ...state.parkingBookings], parkingSpots: state.parkingSpots.map((spot) => spot.id === spotId ? { ...spot, status: "reserved" } : spot) }));
},
  cancelParking: async (id) => {
const booking = get().parkingBookings.find((item) => item.id === id);
await confirmedMutation({ operation: "update", table: "parking_bookings", recordId: id, payload: { status: "cancelled" } });
set((state) => ({ parkingBookings: state.parkingBookings.map((item) => item.id === id ? { ...item, status: "cancelled" } : item), parkingSpots: state.parkingSpots.map((spot) => spot.id === booking?.spotId ? { ...spot, status: "free" } : spot) }));
},
  reportParking: async (spotId, reason) => {
await confirmedMutation({ operation: "insert", table: "parking_reports", payload: { parking_spot_id: spotId, reason } });
set({ syncMessage: `Жалоба зарегистрирована · ${nowLabel()}` });
},
  toggleWorkCheck: async (workId, itemId) => {
const current = get().works.find((work) => work.id === workId)?.checklist.find((item) => item.id === itemId);
await confirmedMutation({ operation: "update", table: "work_order_checklist_items", recordId: itemId, payload: { completed_at: current?.done ? null : new Date().toISOString() } });
set((state) => ({ works: state.works.map((work) => work.id === workId ? { ...work, checklist: work.checklist.map((item) => item.id === itemId ? { ...item, done: !item.done } : item) } : work) }));
},
  rateWork: async (workId, rating) => {
await confirmedMutation({ operation: "upsert", table: "work_ratings", payload: { work_order_id: workId, rating } });
set((state) => ({ works: state.works.map((work) => work.id === workId ? { ...work, rating } : work) }));
},
  rsvp: async (eventId, choice) => {
await confirmedMutation({ operation: "rpc", table: "rsvp_community_event", payload: { p_event_id: eventId, p_choice: choice } });
set((state) => ({ events: state.events.map((item) => item.id === eventId ? { ...item, going: item.going + (choice === "going" && item.userRsvp !== "going" ? 1 : item.userRsvp === "going" && choice !== "going" ? -1 : 0), userRsvp: choice } : item) }));
},
  toggleClub: async (clubId) => {
const club = get().clubs.find((item) => item.id === clubId);
await confirmedMutation({ operation: club?.joined ? "delete" : "insert", table: "community_club_members", match: club?.joined ? { club_id: clubId } : undefined, payload: { club_id: clubId } });
set((state) => ({ clubs: state.clubs.map((item) => item.id === clubId ? { ...item, joined: !item.joined, members: Math.max(0, item.members + (item.joined ? -1 : 1)) } : item) }));
},
  resolveNotice: async (noticeId) => {
await confirmedMutation({ operation: "update", table: "community_notices", recordId: noticeId, payload: { status: "resolved" } });
set((state) => ({ notices: state.notices.map((item) => item.id === noticeId ? { ...item, status: "resolved" } : item) }));
},
  toggleFavorite: async (listingId) => {
const removing = get().marketplace.favoriteIds.includes(listingId);
await confirmedMutation({ operation: removing ? "delete" : "insert", table: "marketplace_favorites", match: removing ? { classified_id: listingId } : undefined, payload: { classified_id: listingId } });
set((state) => ({ marketplace: { ...state.marketplace, favoriteIds: removing ? state.marketplace.favoriteIds.filter((id) => id !== listingId) : [...state.marketplace.favoriteIds, listingId] } }));
},
  archiveListing: async (listingId) => {
await confirmedMutation({ operation: "update", table: "classifieds", recordId: listingId, payload: { status: "archived" } });
set((state) => ({ marketplace: { ...state.marketplace, archivedIds: [...new Set([...state.marketplace.archivedIds, listingId])] } }));
},
  reportListing: async (listingId, reason) => {
const report = { id: crypto.randomUUID(), listingId, reason, status: "new" as const };
await confirmedMutation({ operation: "insert", table: "marketplace_reports", payload: { classified_id: listingId, reason } });
set((state) => ({ marketplace: { ...state.marketplace, reports: [report, ...state.marketplace.reports] } }));
},
  reviewListing: async (listingId, rating, text) => {
const review = { id: crypto.randomUUID(), listingId, rating, text, author: "Житель ЖК" };
await confirmedMutation({ operation: "insert", table: "marketplace_reviews", payload: { classified_id: listingId, rating, text } });
set((state) => ({ marketplace: { ...state.marketplace, reviews: [review, ...state.marketplace.reviews] } }));
},
  setNotificationChannel: async (key, value) => {
const column = { push: "push", emailCritical: "email_critical", smsCritical: "sms_critical", voting: "voting", payments: "payments" }[key];
await confirmedMutation({ operation: "upsert", table: "notification_preferences", payload: { [column]: value } });
await confirmedMutation({ operation: "insert", table: "notification_preference_events", payload: { changes: { [key]: value } } });
set((state) => ({ notificationChannels: { ...state.notificationChannels, [key]: value } }));
},
  updateComplexSettings: async (settings) => {
await confirmedMutation({ operation: "upsert", table: "complex_settings", payload: { name: settings.name, logo_url: settings.logoUrl || null, primary_color: settings.primaryColor, management_phone: settings.managementPhone, management_email: settings.managementEmail, custom_domain: settings.domain, languages: settings.languages, request_categories: settings.requestCategories, custom_roles: settings.customRoles, house_rules: settings.houseRules, white_label: settings.whiteLabel } });
set({ complexSettings: settings });
},
  triggerSos: async (location) => {
await confirmedMutation({ operation: "insert", table: "sos_incidents", payload: { location, status: "active" } });
set({ syncMessage: "SOS отправлен охране и диспетчеру" });
},
}), { name: isDemoMode() ? "korshi-demo-operations-v1" : "korshi-operations-v2", partialize: (state) => isDemoMode() ? state : {}, merge: (persisted, current) => isDemoMode() ? { ...current, ...(persisted as Partial<OperationsState>) } : current }));

async function confirmedMutation(mutation: Parameters<typeof syncPlatformMutation>[0]) {
  try {
    const result = await syncPlatformMutation(mutation);
    if (result.queued) {
      useOperationsStore.setState({ syncMessage: "Действие сохранено в очереди. Оно начнёт действовать после подтверждения сервера." });
    }
    return result;
  } catch (error) {
    useOperationsStore.setState({ syncMessage: error instanceof Error ? error.message : "Не удалось сохранить действие" });
    throw error;
  }
}
