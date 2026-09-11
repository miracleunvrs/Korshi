import type { AppState } from "@/types/app";
import type { OperationsState } from "@/stores/operationsStore";
import { isDemoMode } from "@/lib/supabase/config";
import { appFixtures } from "./appFixtures";
import { operationsFixtures } from "./operationsFixtures";
export function appFixturesInitial(): Pick<AppState, "currentUser" | "registeredUsers" | "notifications" | "serviceRequests" | "documents" | "officialVotes" | "finance" | "scheduleItems" | "amenityResources" | "amenityBookings" | "visitorPasses" | "residentVehicles" | "verificationRequests" | "posts" | "postComments" | "chats" | "messages" | "classifieds" | "urgentAlert"> {
 if (isDemoMode()) return appFixtures();
 return { currentUser: { id: "", fullName: "Житель", phone: "", role: "resident", roleLabel: "", buildingNumber: "", entranceNumber: 0, apartmentNumber: "", verified: false, avatarUrl: "" }, registeredUsers: [], notifications: [], serviceRequests: [], documents: [], officialVotes: [], finance: { balance: 0, income: 0, expense: 0, currency: "KZT", budget: [], transactions: [] }, scheduleItems: [], amenityResources: [], amenityBookings: [], visitorPasses: [], residentVehicles: [], verificationRequests: [], posts: [], postComments: {}, chats: [], messages: {}, classifieds: [], urgentAlert: null };
}
export function operationsFixturesInitial(): Pick<OperationsState, "memberships" | "passes" | "accessEvents" | "parkingSpots" | "parkingBookings" | "works" | "events" | "clubs" | "notices" | "marketplace" | "notificationChannels" | "complexSettings" | "securityLists"> {
 if (isDemoMode()) return operationsFixtures();
 return { memberships: [], passes: [], accessEvents: [], parkingSpots: [], parkingBookings: [], works: [], events: [], clubs: [], notices: [], marketplace: { favoriteIds: [], archivedIds: [], reports: [], reviews: [] }, notificationChannels: { push: false, emailCritical: false, smsCritical: false, voting: true, payments: false }, complexSettings: { name: "", logoUrl: "", primaryColor: "#166534", managementPhone: "", managementEmail: "", domain: "", languages: ["ru"], requestCategories: [], customRoles: [], houseRules: "", whiteLabel: false }, securityLists: { allow: [], deny: [] } };
}
