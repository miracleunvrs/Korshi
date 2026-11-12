import type { AppState } from "@/types/app";
import type { OperationsState } from "@/stores/operationsStore";

/** Пустое состояние до входа и после выхода: данные приходят только из базы. */
export function emptyAppState(): Pick<AppState, "currentUser" | "registeredUsers" | "notifications" | "serviceRequests" | "documents" | "officialVotes" | "finance" | "scheduleItems" | "amenityResources" | "amenityBookings" | "residentVehicles" | "verificationRequests" | "posts" | "postComments" | "chats" | "messages" | "classifieds" | "urgentAlert"> {
  return { currentUser: { id: "", fullName: "Житель", phone: "", role: "resident", roleLabel: "", buildingNumber: "", entranceNumber: 0, apartmentNumber: "", verified: false, avatarUrl: "" }, registeredUsers: [], notifications: [], serviceRequests: [], documents: [], officialVotes: [], finance: { balance: 0, income: 0, expense: 0, currency: "KZT", budget: [], transactions: [] }, scheduleItems: [], amenityResources: [], amenityBookings: [], residentVehicles: [], verificationRequests: [], posts: [], postComments: {}, chats: [], messages: {}, classifieds: [], urgentAlert: null };
}

export function emptyOperationsState(): Pick<OperationsState, "memberships" | "passes" | "accessEvents" | "parkingSpots" | "parkingBookings" | "works" | "marketplace" | "notificationChannels" | "complexSettings" | "securityLists"> {
  return { memberships: [], passes: [], accessEvents: [], parkingSpots: [], parkingBookings: [], works: [], marketplace: { favoriteIds: [], archivedIds: [], reports: [], reviews: [] }, notificationChannels: { push: false, emailCritical: false, smsCritical: false, voting: true, payments: false }, complexSettings: { name: "", logoUrl: "", primaryColor: "#166534", managementPhone: "", managementEmail: "", domain: "", languages: ["ru"], requestCategories: [], customRoles: [], houseRules: "", whiteLabel: false }, securityLists: { allow: [], deny: [] } };
}
