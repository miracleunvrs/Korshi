import type { UserRole, PostWithAuthor } from "@/types";
export interface UserAccount {
  id: string;
  fullName: string;
  phone: string;
  email?: string;
  role: UserRole;
  membershipRole?: string;
  roleLabel: string;
  buildingNumber: string;
  complexId?: string;
  complexName?: string;
  complexAddress?: string;
  buildingId?: string;
  entranceId?: string;
  entranceNumber: number;
  apartmentNumber: string;
  verified: boolean;
  avatarUrl: string;
  bio?: string;
}

export interface MessageItem {
  id: string;
  chatId: string;
  senderId: string;
  senderName: string;
  senderAvatar?: string;
  isOfficial?: boolean;
  isMe: boolean;
  text: string;
  time: string;
}

export interface ChatItem {
  id: string;
  name: string;
  type: "complex" | "building" | "entrance" | "thematic" | "direct";
  lastMessage: string;
  lastMessageTime: string;
  unreadCount: number;
  avatarColor: string;
  icon: string;
  isOfficial?: boolean;
}

export interface VerificationRequest {
  id: string;
  userId: string;
  fullName: string;
  phone: string;
  buildingNumber: string;
  entranceNumber: number;
  apartmentNumber: string;
  documentType: string;
  documentUrl: string;
  status: "pending" | "approved" | "rejected";
  submittedAt: string;
}

export interface AppNotification {
  id: string;
  type: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
  isRead: boolean;
  createdAt: string;
}

export interface ClassifiedItem {
  id: string;
  title: string;
  category: "Объявления" | "Услуги" | "Подработки" | "Помощь";
  price: string;
  location: string;
  image: string;
  description: string;
  authorId: string;
  authorName: string;
  authorPhone: string;
  createdAt: string;
}

export type ServiceRequestStatus = "submitted" | "in_progress" | "resolved" | "closed";

export type ServiceRequestPriority = "normal" | "important" | "emergency";

export type ServiceRequestCategory = "utilities" | "cleaning" | "repair" | "safety" | "territory" | "other";

export interface ServiceRequestItem {
  id: string;
  userId: string;
  complexId: string;
  category: ServiceRequestCategory;
  title: string;
  description: string;
  location: string;
  status: ServiceRequestStatus;
  priority: ServiceRequestPriority;
  publicForComplex: boolean;
  assigneeName?: string;
  slaDueAt?: string;
  resolutionNote?: string;
  rating?: number;
  attachments: ServiceRequestAttachment[];
  events: ServiceRequestEvent[];
  createdAt: string;
  updatedAt: string;
}

export interface ServiceRequestAttachment {
  id: string;
  url: string;
  name: string;
  mimeType: string;
  sizeBytes: number;
  kind: "evidence" | "resolution";
}

export interface ServiceRequestEvent {
  id: string;
  kind: "created" | "comment" | "assigned" | "status_changed" | "resolution" | "rated" | "reopened";
  actorName: string;
  actorRole?: UserRole;
  message?: string;
  createdAt: string;
}

export type HouseDocumentCategory = "finance" | "protocol" | "rules" | "contract" | "notice" | "report" | "other";

export interface HouseDocument {
  id: string;
  complexId: string;
  title: string;
  description: string;
  category: HouseDocumentCategory;
  version: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  url?: string;
  isImportant: boolean;
  requiresAcknowledgement: boolean;
  acknowledged: boolean;
  status: "active" | "archived";
  publishedBy: string;
  publishedAt: string;
  searchableText?: string;
  scopeLabel?: string;
}

export type OfficialVoteChoice = "yes" | "no" | "abstain";

export interface OfficialVoteItem {
  id: string;
  complexId: string;
  title: string;
  description: string;
  basis: "owner" | "area";
  quorumPercent: number;
  participationPercent: number;
  eligibleUnits: number;
  eligibleWeight: number;
  status: "draft" | "active" | "completed" | "cancelled";
  startsAt: string;
  endsAt: string;
  results: Record<OfficialVoteChoice, number>;
  userChoice?: OfficialVoteChoice;
  protocolUrl?: string;
}

export interface FinanceTransaction {
  id: string;
  direction: "income" | "expense";
  category: string;
  title: string;
  amount: number;
  occurredOn: string;
  documentId?: string;
}

export interface FinanceBudgetItem {
  id: string;
  category: string;
  planned: number;
  actual: number;
}

export interface FinanceOverview {
  balance: number;
  income: number;
  expense: number;
  currency: "KZT";
  transactions: FinanceTransaction[];
  budget: FinanceBudgetItem[];
}

export interface HomeScheduleItem {
  id: string;
  kind: "cleaning" | "maintenance" | "outage" | "event";
  title: string;
  description: string;
  location: string;
  startsAt: string;
  endsAt?: string;
  status: "planned" | "in_progress" | "completed" | "cancelled";
}

export interface AmenityResource {
  id: string;
  name: string;
  description: string;
  location: string;
  capacity?: number;
  price: number;
  kind?: "room" | "sport" | "bbq" | "freight_lift" | "parking";
  rules?: string;
  requiresApproval?: boolean;
}

export interface AmenityBooking {
  id: string;
  resourceId: string;
  startsAt: string;
  endsAt: string;
  status: "confirmed" | "cancelled" | "completed";
  approvalStatus?: "pending" | "approved" | "rejected";
  paymentStatus?: "not_required" | "pending" | "paid";
}

export interface VisitorPass {
  id: string;
  guestName: string;
  kind: "guest" | "courier" | "vehicle";
  vehiclePlate?: string;
  accessCode: string;
  validFrom: string;
  validUntil: string;
  status: "active" | "used" | "revoked" | "expired";
}

export interface ResidentVehicle {
  id: string;
  plate: string;
  label: string;
}

export type NotificationPreferenceKey = "requests" | "community" | "finance" | "emergency";

export interface EmergencyAlert {
  id: string;
  title: string;
  message: string;
  affectedAreas: string[];
  expectedResolution?: string;
  contactPhone?: string;
  active: boolean;
  acknowledged: boolean;
  createdAt: string;
}

export interface RegistrationResult {
  account: UserAccount;
  requiresEmailConfirmation: boolean;
}

export interface AppState {
  // Аутентификация
  currentUser: UserAccount;
  registeredUsers: UserAccount[];
  isLoggedIn: boolean;
  isAuthLoading: boolean;
  supabaseUserId: string | null;

  registerUser: (data: {
    fullName: string;
    phone: string;
    email: string;
    password: string;
    buildingNumber: string;
    entranceNumber: number;
    apartmentNumber: string;
    role?: UserRole;
  }) => Promise<RegistrationResult>;

  loginUser: (email: string, password: string) => Promise<UserAccount>;
  resetPassword: (email: string) => Promise<void>;
  logoutUser: () => Promise<void>;
  syncAuthState: () => Promise<void>;
  setVerified: (verified: boolean) => void;
  updateUser: (data: Partial<UserAccount>) => void;
  backendError: string | null;
  clearBackendError: () => void;
  hydrateDomainData: () => Promise<void>;
  notifications: AppNotification[];
  markNotificationRead: (notificationId: string) => Promise<void>;
  markAllNotificationsRead: () => Promise<void>;
  notificationPreferences: Record<NotificationPreferenceKey, boolean>;
  setNotificationPreference: (key: NotificationPreferenceKey, enabled: boolean) => void;

  // Заявки в управляющую организацию
  serviceRequests: ServiceRequestItem[];
  createServiceRequest: (
    data: Pick<ServiceRequestItem, "category" | "title" | "description" | "location" | "priority" | "publicForComplex">,
    files?: File[],
  ) => Promise<void>;
  addServiceRequestComment: (requestId: string, message: string) => Promise<void>;
  rateServiceRequest: (requestId: string, rating: number) => Promise<void>;
  reopenServiceRequest: (requestId: string, message: string) => Promise<void>;
  updateServiceRequestStatus: (
    requestId: string,
    status: ServiceRequestStatus,
    options?: { note?: string; assigneeName?: string; slaDueAt?: string },
  ) => Promise<void>;

  // Документы дома
  documents: HouseDocument[];
  addHouseDocument: (
    data: Pick<HouseDocument, "title" | "description" | "category" | "version" | "isImportant" | "requiresAcknowledgement">,
    file: File,
  ) => Promise<void>;
  acknowledgeDocument: (documentId: string) => Promise<void>;
  archiveDocument: (documentId: string) => Promise<void>;

  // Управление домом и прозрачные финансы
  officialVotes: OfficialVoteItem[];
  castOfficialVote: (voteId: string, choice: OfficialVoteChoice) => Promise<void>;
  finance: FinanceOverview;
  addFinanceTransaction: (data: Omit<FinanceTransaction, "id">) => Promise<void>;
  scheduleItems: HomeScheduleItem[];
  amenityResources: AmenityResource[];
  amenityBookings: AmenityBooking[];
  visitorPasses: VisitorPass[];
  residentVehicles: ResidentVehicle[];
  createAmenityBooking: (resourceId: string, startsAt: string, endsAt: string) => Promise<void>;
  createVisitorPass: (data: Pick<VisitorPass, "guestName" | "kind" | "vehiclePlate" | "validUntil">) => Promise<void>;
  addResidentVehicle: (plate: string, label: string) => Promise<void>;

  // Экстренные оповещения ОСИ
  urgentAlert: EmergencyAlert | null;
  setUrgentAlert: (alert: EmergencyAlert | null) => Promise<void>;
  acknowledgeUrgentAlert: () => Promise<void>;

  // Заявки на верификацию
  verificationRequests: VerificationRequest[];
  approveVerification: (requestId: string) => void;
  rejectVerification: (requestId: string) => void;

  // Посты и лента
  posts: PostWithAuthor[];
  addPost: (post: PostWithAuthor) => void;
  deletePost: (postId: string) => void;
  likePost: (postId: string) => void;
  unlikePost: (postId: string) => void;
  votePoll: (postId: string, optionId: string) => void;
  supportInitiative: (initiativeId: string) => void;
  addComment: (postId: string, commentText: string) => void;
  deleteComment: (postId: string, commentId: string) => void;

  // Комментарии
  postComments: Record<string, Array<{ id: string; authorName: string; isOfficial: boolean; text: string; time: string }>>;

  // Чаты
  chats: ChatItem[];
  messages: Record<string, MessageItem[]>;
  sendMessage: (chatId: string, text: string) => void;
  deleteMessage: (chatId: string, messageId: string) => void;
  createDirectChatWith: (authorId: string, authorName: string) => Promise<string>;

  // Объявления
  classifieds: ClassifiedItem[];
  addClassified: (item: ClassifiedItem) => void;
  deleteClassified: (itemId: string) => void;

  // Сборы
  donateToFundraiser: (fundraiserId: string, amount: number) => Promise<void>;
  createFundraiser: (data: {
    title: string;
    content: string;
    targetAmount: number;
    currency?: string;
    endsAt?: string;
  }) => void;
  submitVerificationRequest: (data: Omit<VerificationRequest, "id" | "userId" | "status" | "submittedAt" | "documentUrl"> & { documentPath: string }) => Promise<void>;
}
