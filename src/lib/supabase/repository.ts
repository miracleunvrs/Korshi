import { createClient } from "@/lib/supabase/client";
import { requireBackend } from "@/lib/supabase/config";
import { uploadWithRetry } from "@/lib/supabase/uploadWithRetry";
import type { PostWithAuthor } from "@/types";
import type {
  AppNotification,
  ChatItem,
  HouseDocument,
  FinanceOverview,
  FinanceTransaction,
  EmergencyAlert,
  AmenityBooking,
  AmenityResource,
  HomeScheduleItem,
  MessageItem,
  OfficialVoteChoice,
  OfficialVoteItem,
  ServiceRequestItem,
  VisitorPass,
  ResidentVehicle,
  UserAccount,
  VerificationRequest,
} from "@/stores/appStore";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const configured = requireBackend;
const isUuid = (value: string | null | undefined) => Boolean(value && UUID_RE.test(value));

async function currentUserId() {
  const { data, error } = await (createClient() as any).auth.getUser();
  if (error) throw error;
  if (!data.user) throw new Error("Требуется авторизация");
  return data.user.id as string;
}

async function profileContext() {
  const supabase = createClient() as any;
  const userId = await currentUserId();
  const { data, error } = await supabase
    .from("profiles")
    .select("id, complex_id, apartment_id, verified")
    .eq("id", userId)
    .single();
  if (error) throw error;
  return { supabase, userId, profile: data as any };
}

export async function persistPost(post: PostWithAuthor) {
  if (!configured()) return post.id;
  const { supabase, userId, profile } = await profileContext();
  if (!profile.complex_id) throw new Error("Профиль ещё не привязан к ЖК");
  if (!profile.verified) {
    throw new Error("Публикации доступны только подтверждённым жителям. Сначала подтвердите статус жителя.");
  }

  let buildingId = isUuid(post.building_id) ? post.building_id : null;
  let entranceId = isUuid(post.entrance_id) ? post.entrance_id : null;

  if (!buildingId && profile.apartment_id) {
    const { data: apartment } = await supabase
      .from("apartments")
      .select("entrance_id")
      .eq("id", profile.apartment_id)
      .maybeSingle();
    entranceId = entranceId || apartment?.entrance_id || null;
    if (entranceId) {
      const { data: entrance } = await supabase
        .from("entrances")
        .select("building_id")
        .eq("id", entranceId)
        .maybeSingle();
      buildingId = entrance?.building_id || null;
    }
  }

  const postId = isUuid(post.id) ? post.id : crypto.randomUUID();
  const { error } = await supabase.from("posts").insert({
    id: postId,
    author_id: userId,
    complex_id: profile.complex_id,
    building_id: buildingId,
    entrance_id: entranceId,
    type: post.type,
    title: post.title,
    content: post.content,
    status: post.status,
    is_official: post.is_official,
    territory: post.territory,
    price: post.price,
    currency: post.currency || "KZT",
  });
  if (error) throw error;

  if (post.attachments?.length) {
    const attachments = post.attachments
      .filter((attachment) => attachment.url)
      .map((attachment) => ({
        post_id: postId,
        url: attachment.url,
        type: attachment.type,
        name: attachment.name,
        size: attachment.size,
      }));
    if (attachments.length) {
      const result = await supabase.from("post_attachments").insert(attachments);
      if (result.error) throw result.error;
    }
  }

  if (post.poll) {
    const { data: poll, error: pollError } = await supabase
      .from("polls")
      .insert({
        post_id: postId,
        is_multiple: post.poll.is_multiple,
        ends_at: post.poll.ends_at,
      })
      .select("id")
      .single();
    if (pollError) throw pollError;
    const options = post.poll.options.map((option, position) => ({
      poll_id: poll.id,
      text: option.text,
      position,
    }));
    if (options.length) {
      const result = await supabase.from("poll_options").insert(options);
      if (result.error) throw result.error;
    }
  }

  if (post.initiative) {
    const result = await supabase.from("initiatives").insert({
      post_id: postId,
      stage: post.initiative.stage,
      goal: post.initiative.goal,
    });
    if (result.error) throw result.error;
  }

  return postId;
}

export async function deletePost(postId: string) {
  if (!configured() || !isUuid(postId)) return;
  const { error } = await (createClient() as any).from("posts").delete().eq("id", postId);
  if (error) throw error;
}

export async function persistFundraiser(post: PostWithAuthor, fundraiser: NonNullable<PostWithAuthor["fundraiser"]>) {
  const postId = await persistPost(post);
  if (!configured()) return postId;
  const { error } = await (createClient() as any).from("fundraisers").insert({
    id: isUuid(fundraiser.id) ? fundraiser.id : crypto.randomUUID(),
    post_id: postId,
    initiative_id: isUuid(fundraiser.initiative_id) ? fundraiser.initiative_id : null,
    target_amount: fundraiser.target_amount,
    currency: fundraiser.currency === "₸" ? "KZT" : fundraiser.currency,
    payment_url: fundraiser.payment_url,
    qr_url: fundraiser.qr_url,
    ends_at: fundraiser.ends_at,
    status: fundraiser.status,
  });
  if (error) throw error;
  return postId;
}

export async function persistComment(postId: string, content: string) {
  if (!configured() || !isUuid(postId)) return;
  const { supabase, userId } = await profileContext();
  const { error } = await supabase.from("comments").insert({
    post_id: postId,
    author_id: userId,
    content,
  });
  if (error) throw error;
}

export async function deleteComment(commentId: string) {
  if (!configured() || !isUuid(commentId)) return;
  const { error } = await (createClient() as any).from("comments").delete().eq("id", commentId);
  if (error) throw error;
}

export async function persistReaction(postId: string, type: "like" | "support" | "thanks" = "like") {
  if (!configured() || !isUuid(postId)) return;
  const { supabase, userId } = await profileContext();
  const { error } = await supabase
    .from("reactions")
    .upsert({ post_id: postId, user_id: userId, type }, { onConflict: "post_id,user_id" });
  if (error) throw error;
}

export async function removeReaction(postId: string) {
  if (!configured() || !isUuid(postId)) return;
  const { supabase, userId } = await profileContext();
  const { error } = await supabase.from("reactions").delete().eq("post_id", postId).eq("user_id", userId);
  if (error) throw error;
}

export async function persistPollVote(postId: string, optionId: string) {
  if (!configured() || !isUuid(postId) || !isUuid(optionId)) return;
  const { supabase, userId } = await profileContext();
  const { data: poll, error: pollError } = await supabase.from("polls").select("id").eq("post_id", postId).single();
  if (pollError) throw pollError;
  const { error } = await supabase.from("poll_votes").insert({
    poll_id: poll.id,
    option_id: optionId,
    user_id: userId,
  });
  if (error) throw error;
}

export async function persistInitiativeSupport(initiativeId: string) {
  if (!configured() || !isUuid(initiativeId)) return;
  const { supabase, userId } = await profileContext();
  const { error } = await supabase.from("initiative_supports").insert({
    initiative_id: initiativeId,
    user_id: userId,
  });
  if (error && error.code !== "23505") throw error;
}

export async function persistMessage(chatId: string, content: string) {
  if (!configured()) return;
  if (!isUuid(chatId)) {
    throw new Error("Этот чат ещё не подключён к серверу. Обновите список чатов после применения миграций.");
  }
  const { supabase, userId } = await profileContext();
  const { error } = await supabase.from("messages").insert({
    chat_id: chatId,
    sender_id: userId,
    content,
    type: "text",
  });
  if (error) throw error;
}

export async function createDirectChat(targetUserId: string) {
  if (!configured() || !isUuid(targetUserId)) {
    throw new Error("Этот пользователь ещё не подключён к серверу");
  }
  const { data, error } = await (createClient() as any).rpc("create_direct_chat", {
    p_target_user: targetUserId,
  });
  if (error) throw error;
  return data as string;
}

export async function deleteMessage(messageId: string) {
  if (!configured() || !isUuid(messageId)) return;
  const { error } = await (createClient() as any).from("messages").update({ is_deleted: true }).eq("id", messageId);
  if (error) throw error;
}

export async function persistProfileUpdate(data: Partial<UserAccount>) {
  if (!configured()) return;
  const { supabase, userId } = await profileContext();
  const update: Record<string, unknown> = {};
  if (data.fullName !== undefined) update.full_name = data.fullName;
  if (data.phone !== undefined) update.phone = data.phone;
  if (data.avatarUrl !== undefined) update.avatar_url = data.avatarUrl;
  if (data.bio !== undefined) update.bio = data.bio;
  if (Object.keys(update).length === 0) return;
  const { error } = await supabase.from("profiles").update(update).eq("id", userId);
  if (error) throw error;
}

export async function submitVerificationRequest(data: {
  fullName: string;
  phone: string;
  buildingNumber: string;
  entranceNumber: number;
  apartmentNumber: string;
  documentType: string;
  documentPath: string;
}) {
  if (!configured()) return;
  const { supabase, userId } = await profileContext();
  const { error } = await supabase.from("verification_requests").insert({
    user_id: userId,
    full_name: data.fullName,
    phone: data.phone || null,
    building_number: data.buildingNumber,
    entrance_number: data.entranceNumber,
    apartment_number: data.apartmentNumber,
    document_type: data.documentType,
    document_path: data.documentPath,
  });
  if (error) throw error;
}

export async function persistClassified(data: {
  title: string;
  category: string;
  price?: number | null;
  currency?: string;
  location?: string;
  imagePath?: string;
  description: string;
}) {
  if (!configured()) return;
  const { supabase, userId, profile } = await profileContext();
  if (!profile.complex_id) throw new Error("Профиль ещё не привязан к ЖК");
  const { error } = await supabase.from("classifieds").insert({
    author_id: userId,
    complex_id: profile.complex_id,
    title: data.title,
    category: data.category,
    price: data.price ?? null,
    currency: data.currency || "KZT",
    location: data.location || null,
    image_path: data.imagePath || null,
    description: data.description,
  });
  if (error) throw error;
}

export async function deleteClassified(id: string) {
  if (!configured() || !isUuid(id)) return;
  const { error } = await (createClient() as any).from("classifieds").delete().eq("id", id);
  if (error) throw error;
}

export async function reviewVerificationRequest(requestId: string, approved: boolean, reason?: string) {
  if (!configured() || !isUuid(requestId)) return;
  const { error } = await (createClient() as any).rpc("review_verification_request", {
    p_request_id: requestId,
    p_approved: approved,
    p_reason: reason || null,
  });
  if (error) throw error;
}

export async function recordFundraiserPayment(
  fundraiserId: string,
  amount: number,
  comment?: string,
  anonymous = false
) {
  if (!configured() || !isUuid(fundraiserId)) return;
  const { error } = await (createClient() as any).rpc("record_fundraiser_payment", {
    p_fundraiser_id: fundraiserId,
    p_amount: amount,
    p_comment: comment || null,
    p_is_anonymous: anonymous,
  });
  if (error) throw error;
}

export async function persistServiceRequest(
  data: Pick<ServiceRequestItem, "category" | "title" | "description" | "location" | "priority" | "publicForComplex">,
  files: File[] = [],
): Promise<ServiceRequestItem | null> {
  if (!configured()) return null;
  const { supabase, userId, profile } = await profileContext();
  if (!profile.complex_id) throw new Error("Профиль ещё не привязан к ЖК");
  if (!profile.verified) throw new Error("Заявки доступны только подтверждённым жителям");

  const requestId = crypto.randomUUID();
  const uploaded: Array<{ path: string; file: File }> = [];
  for (const file of files) {
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "-");
    const path = `${userId}/requests/${requestId}/${crypto.randomUUID()}-${safeName}`;
    try {
      await uploadWithRetry(() => supabase.storage.from("house-media").upload(path, file, {
      cacheControl: "3600",
      upsert: false,
      contentType: file.type,
      }));
    } catch (uploadError) {
      if (uploaded.length) await supabase.storage.from("house-media").remove(uploaded.map((item) => item.path));
      throw uploadError;
    }
    uploaded.push({ path, file });
  }

  const { error } = await supabase
    .from("service_requests")
    .insert({
      id: requestId,
      created_by: userId,
      complex_id: profile.complex_id,
      category: data.category,
      title: data.title,
      description: data.description,
      location: data.location,
      priority: data.priority,
      public_for_complex: data.publicForComplex,
    });
  if (error) {
    if (uploaded.length) await supabase.storage.from("house-media").remove(uploaded.map((item) => item.path));
    throw new Error(error.message);
  }

  // PostgREST applies the SELECT policy to `insert(...).select()` before the
  // STABLE visibility helper can observe the new row. Read it in a separate
  // statement so the author can receive the persisted representation.
  const { data: row, error: readError } = await supabase
    .from("service_requests")
    .select("*")
    .eq("id", requestId)
    .single();
  if (readError) throw new Error(readError.message);

  if (uploaded.length) {
    const attachmentResult = await supabase.from("service_request_attachments").insert(uploaded.map(({ path, file }) => ({
      request_id: requestId,
      uploader_id: userId,
      path,
      file_name: file.name,
      mime_type: file.type,
      size_bytes: file.size,
      kind: "evidence",
    })));
    if (attachmentResult.error) throw attachmentResult.error;
  }

  const attachments = await Promise.all(uploaded.map(async ({ path, file }) => ({
    id: path,
    url: await signedMediaUrl(supabase, path),
    name: file.name,
    mimeType: file.type,
    sizeBytes: file.size,
    kind: "evidence" as const,
  })));

  return {
    id: row.id,
    userId: row.created_by,
    complexId: row.complex_id,
    category: row.category,
    title: row.title,
    description: row.description,
    location: row.location,
    status: row.status,
    priority: row.priority,
    publicForComplex: Boolean(row.public_for_complex),
    assigneeName: row.assignee_name || undefined,
    slaDueAt: row.sla_due_at ? new Date(row.sla_due_at).toLocaleString("ru-RU") : undefined,
    resolutionNote: row.resolution_note || undefined,
    rating: row.rating || undefined,
    attachments,
    events: [{
      id: `created-${row.id}`,
      kind: "created",
      actorName: "Вы",
      message: row.description,
      createdAt: new Date(row.created_at).toLocaleString("ru-RU"),
    }],
    createdAt: new Date(row.created_at).toLocaleString("ru-RU"),
    updatedAt: new Date(row.updated_at).toLocaleString("ru-RU"),
  };
}

export async function persistServiceRequestComment(requestId: string, message: string) {
  if (!configured() || !isUuid(requestId)) return;
  const { error } = await (createClient() as any).rpc("add_service_request_comment", {
    p_request_id: requestId,
    p_message: message,
  });
  if (error) throw error;
}

export async function persistServiceRequestStatus(
  requestId: string,
  status: ServiceRequestItem["status"],
  note?: string,
  assigneeName?: string,
  slaDueAt?: string,
) {
  if (!configured() || !isUuid(requestId)) return;
  const { error } = await (createClient() as any).rpc("update_service_request_status", {
    p_request_id: requestId,
    p_status: status,
    p_note: note || null,
    p_assignee_id: null,
    p_assignee_name: assigneeName || null,
    p_sla_due_at: slaDueAt || null,
  });
  if (error) throw error;
}

export async function persistServiceRequestRating(requestId: string, rating: number) {
  if (!configured() || !isUuid(requestId)) return;
  const { error } = await (createClient() as any).rpc("rate_service_request", {
    p_request_id: requestId,
    p_rating: rating,
  });
  if (error) throw error;
}

export async function persistServiceRequestReopen(requestId: string, message: string) {
  if (!configured() || !isUuid(requestId)) return;
  const { error } = await (createClient() as any).rpc("reopen_service_request", {
    p_request_id: requestId,
    p_message: message,
  });
  if (error) throw error;
}

export async function persistHouseDocument(
  data: Pick<HouseDocument, "title" | "description" | "category" | "version" | "isImportant" | "requiresAcknowledgement">,
  file: File,
): Promise<HouseDocument | null> {
  if (!configured()) return null;
  const { supabase, userId, profile } = await profileContext();
  if (!profile.complex_id) throw new Error("Профиль ещё не привязан к ЖК");
  const documentId = crypto.randomUUID();
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "-");
  const path = `${userId}/documents/${documentId}/${crypto.randomUUID()}-${safeName}`;
  await uploadWithRetry(() => supabase.storage.from("house-media").upload(path, file, {
    cacheControl: "3600",
    upsert: false,
    contentType: file.type,
  }));

  const { data: row, error } = await supabase.from("house_documents").insert({
    id: documentId,
    complex_id: profile.complex_id,
    published_by: userId,
    title: data.title,
    description: data.description || null,
    category: data.category,
    version: data.version,
    file_path: path,
    file_name: file.name,
    mime_type: file.type,
    size_bytes: file.size,
    is_important: data.isImportant,
    requires_acknowledgement: data.requiresAcknowledgement,
  }).select("*").single();
  if (error) {
    await supabase.storage.from("house-media").remove([path]);
    throw error;
  }

  return {
    id: row.id,
    complexId: row.complex_id,
    title: row.title,
    description: row.description || "",
    category: row.category,
    version: row.version,
    fileName: row.file_name,
    mimeType: row.mime_type,
    sizeBytes: Number(row.size_bytes),
    url: await signedMediaUrl(supabase, row.file_path),
    isImportant: Boolean(row.is_important),
    requiresAcknowledgement: Boolean(row.requires_acknowledgement),
    acknowledged: false,
    status: row.status,
    publishedBy: "Вы",
    publishedAt: new Date(row.published_at).toLocaleString("ru-RU"),
    searchableText: row.searchable_text || undefined,
    scopeLabel: row.entrance_id ? "Подъезд" : row.building_id ? "Дом" : "Весь ЖК",
  };
}

export async function persistDocumentAcknowledgement(documentId: string) {
  if (!configured() || !isUuid(documentId)) return;
  const { supabase, userId } = await profileContext();
  const { error } = await supabase.from("house_document_acknowledgements").upsert({
    document_id: documentId,
    user_id: userId,
  }, { onConflict: "document_id,user_id" });
  if (error) throw error;
}

export async function persistDocumentArchive(documentId: string) {
  if (!configured() || !isUuid(documentId)) return;
  const { error } = await (createClient() as any).from("house_documents").update({ status: "archived" }).eq("id", documentId);
  if (error) throw error;
}

export async function persistOfficialVoteChoice(voteId: string, choice: OfficialVoteChoice) {
  if (!configured() || !isUuid(voteId)) return null;
  const { data, error } = await (createClient() as any).rpc("cast_official_vote", {
    p_vote_id: voteId,
    p_choice: choice,
  });
  if (error) throw error;
  return relation<any>(data);
}

export async function recordFinanceTransaction(data: Omit<FinanceTransaction, "id">): Promise<FinanceTransaction | null> {
  if (!configured()) return null;
  const { data: row, error } = await (createClient() as any).rpc("record_finance_transaction", {
    p_direction: data.direction,
    p_category: data.category,
    p_title: data.title,
    p_amount: data.amount,
    p_occurred_on: data.occurredOn,
    p_document_id: data.documentId && isUuid(data.documentId) ? data.documentId : null,
  });
  if (error) throw error;
  const item = relation<any>(row);
  if (!item) return null;
  return {
    id: item.id,
    direction: item.direction,
    category: item.category,
    title: item.title,
    amount: Number(item.amount),
    occurredOn: new Date(`${item.occurred_on}T00:00:00`).toLocaleDateString("ru-RU"),
    documentId: item.document_id || undefined,
  };
}

export async function persistEmergencyAlert(alert: EmergencyAlert | null, existingId?: string): Promise<EmergencyAlert | null> {
  if (!configured()) return null;
  const supabase = createClient() as any;
  if (!alert) {
    if (isUuid(existingId)) {
      const { error } = await supabase.rpc("resolve_emergency_alert", { p_alert_id: existingId });
      if (error) throw error;
    }
    return null;
  }
  const { data: row, error } = await supabase.rpc("publish_emergency_alert", {
    p_title: alert.title,
    p_message: alert.message,
    p_affected_areas: alert.affectedAreas,
    p_expected_resolution: alert.expectedResolution || null,
    p_contact_phone: alert.contactPhone || null,
  });
  if (error) throw error;
  const item = relation<any>(row);
  if (!item) return null;
  return {
    id: item.id,
    title: item.title,
    message: item.message,
    affectedAreas: item.affected_areas || [],
    expectedResolution: item.expected_resolution || undefined,
    contactPhone: item.contact_phone || undefined,
    active: Boolean(item.active),
    acknowledged: false,
    createdAt: new Date(item.created_at).toLocaleString("ru-RU"),
  };
}

export async function persistEmergencyAcknowledgement(alertId: string) {
  if (!configured() || !isUuid(alertId)) return;
  const { supabase, userId } = await profileContext();
  const { error } = await supabase.from("emergency_alert_acknowledgements").upsert({ alert_id: alertId, user_id: userId }, { onConflict: "alert_id,user_id" });
  if (error) throw error;
}

export async function persistAmenityBooking(resourceId: string, startsAt: string, endsAt: string): Promise<AmenityBooking | null> {
  if (!configured() || !isUuid(resourceId)) return null;
  const { data: row, error } = await (createClient() as any).rpc("create_amenity_booking", {
    p_resource_id: resourceId,
    p_starts_at: startsAt,
    p_ends_at: endsAt,
  });
  if (error) throw error;
  const item = relation<any>(row);
  if (!item) return null;
  return { id: item.id, resourceId: item.resource_id, startsAt: new Date(item.starts_at).toLocaleString("ru-RU"), endsAt: new Date(item.ends_at).toLocaleString("ru-RU"), status: item.status };
}

export async function persistVisitorPass(data: Pick<VisitorPass, "guestName" | "kind" | "vehiclePlate" | "validUntil">): Promise<VisitorPass | null> {
  if (!configured()) return null;
  const { supabase, userId, profile } = await profileContext();
  if (!profile.complex_id) throw new Error("Профиль ещё не привязан к ЖК");
  const { data: row, error } = await supabase.from("visitor_passes").insert({
    complex_id: profile.complex_id,
    resident_id: userId,
    guest_name: data.guestName,
    kind: data.kind,
    vehicle_plate: data.vehiclePlate || null,
    valid_until: data.validUntil,
  }).select("*").single();
  if (error) throw error;
  return { id: row.id, guestName: row.guest_name, kind: row.kind, vehiclePlate: row.vehicle_plate || undefined, accessCode: row.access_code, validFrom: new Date(row.valid_from).toLocaleString("ru-RU"), validUntil: new Date(row.valid_until).toLocaleString("ru-RU"), status: row.status };
}

export async function persistResidentVehicle(plate: string, label: string): Promise<ResidentVehicle | null> {
  if (!configured()) return null;
  const { supabase, userId, profile } = await profileContext();
  if (!profile.complex_id) throw new Error("Профиль ещё не привязан к ЖК");
  const normalizedPlate = plate.trim().toUpperCase();
  const { data: row, error } = await supabase.from("resident_vehicles").insert({ complex_id: profile.complex_id, resident_id: userId, plate: normalizedPlate, label: label.trim() || null }).select("*").single();
  if (error) throw error;
  return { id: row.id, plate: row.plate, label: row.label || "Автомобиль" };
}

function relation<T>(value: T | T[] | null | undefined): T | null {
  return Array.isArray(value) ? value[0] || null : value || null;
}

async function signedMediaUrl(supabase: any, path: string | null | undefined) {
  if (!path || /^https?:\/\//i.test(path)) return path || "";
  const { data, error } = await supabase.storage.from("house-media").createSignedUrl(path, 60 * 60);
  return error ? path : data?.signedUrl || path;
}

function mapPost(row: any): PostWithAuthor {
  const poll = relation(row.poll);
  const initiative = relation(row.initiative);
  const fundraiser = relation(row.fundraiser);
  return {
    ...row,
    author: relation(row.author) || {
      id: row.author_id,
      full_name: "Сосед",
      avatar_url: null,
      role: "resident",
      verified: false,
    },
    attachments: row.attachments || [],
    poll: poll ? { ...poll, options: poll.options || [] } : undefined,
    initiative: initiative || undefined,
    fundraiser: fundraiser || undefined,
  } as PostWithAuthor;
}

export async function hydrateDomainData() {
  if (!configured()) return null;
  const supabase = createClient() as any;
  const userId = await currentUserId();
  const [
    postsResult,
    chatsResult,
    classifiedsResult,
    notificationsResult,
    serviceRequestsResult,
    documentsResult,
    acknowledgementsResult,
    officialVotesResult,
    officialVoteBallotsResult,
    financeAccountsResult,
    financeTransactionsResult,
    financeBudgetResult,
    emergencyAlertsResult,
    emergencyAcknowledgementsResult,
    scheduleResult,
    resourcesResult,
    bookingsResult,
    visitorPassesResult,
    residentVehiclesResult,
  ] = await Promise.all([
    supabase.from("posts").select("*, author:profiles(id, full_name, avatar_url, role, verified), attachments:post_attachments(*), poll:polls(*, options:poll_options(*)), initiative:initiatives(*), fundraiser:fundraisers(*)").order("created_at", { ascending: false }).limit(50),
    supabase.from("chats").select("*").order("last_message_at", { ascending: false, nullsFirst: false }).limit(100),
    supabase.from("classifieds").select("*, author:profiles!classifieds_author_id_fkey(id, full_name, phone)").order("created_at", { ascending: false }).limit(50),
    supabase.from("notifications").select("id, type, title, body, data, is_read, created_at").order("created_at", { ascending: false }).limit(100),
    supabase.from("service_requests").select("*, events:service_request_events(*, actor:profiles(full_name, role)), attachments:service_request_attachments(*)").order("created_at", { ascending: false }).limit(100),
    supabase.from("house_documents").select("*, publisher:profiles!house_documents_published_by_fkey(full_name)").order("published_at", { ascending: false }).limit(200),
    supabase.from("house_document_acknowledgements").select("document_id").eq("user_id", userId),
    supabase.from("official_votes").select("*").order("ends_at", { ascending: false }).limit(100),
    supabase.from("official_vote_ballots").select("vote_id, choice").eq("voter_id", userId),
    supabase.from("finance_accounts").select("*").limit(1),
    supabase.from("finance_transactions").select("*").order("occurred_on", { ascending: false }).limit(200),
    supabase.from("finance_budget_items").select("*").order("category", { ascending: true }).limit(100),
    supabase.from("emergency_alerts").select("*").eq("active", true).order("created_at", { ascending: false }).limit(1),
    supabase.from("emergency_alert_acknowledgements").select("alert_id").eq("user_id", userId),
    supabase.from("home_schedule_items").select("*").order("starts_at", { ascending: true }).limit(100),
    supabase.from("amenity_resources").select("*").eq("is_active", true).order("name", { ascending: true }).limit(100),
    supabase.from("amenity_bookings").select("*").eq("user_id", userId).order("starts_at", { ascending: false }).limit(100),
    supabase.from("visitor_passes").select("*").eq("resident_id", userId).order("valid_until", { ascending: false }).limit(100),
    supabase.from("resident_vehicles").select("*").eq("resident_id", userId).order("created_at", { ascending: false }).limit(20),
  ]);
  if (postsResult.error) throw postsResult.error;
  if (chatsResult.error) throw chatsResult.error;
  if (classifiedsResult.error) throw classifiedsResult.error;
  if (notificationsResult.error) throw notificationsResult.error;
  if (serviceRequestsResult.error) throw serviceRequestsResult.error;
  if (documentsResult.error) throw documentsResult.error;
  if (acknowledgementsResult.error) throw acknowledgementsResult.error;
  if (officialVotesResult.error) throw officialVotesResult.error;
  if (officialVoteBallotsResult.error) throw officialVoteBallotsResult.error;
  if (financeAccountsResult.error) throw financeAccountsResult.error;
  if (financeTransactionsResult.error) throw financeTransactionsResult.error;
  if (financeBudgetResult.error) throw financeBudgetResult.error;
  if (emergencyAlertsResult.error) throw emergencyAlertsResult.error;
  if (emergencyAcknowledgementsResult.error) throw emergencyAcknowledgementsResult.error;
  if (scheduleResult.error) throw scheduleResult.error;
  if (resourcesResult.error) throw resourcesResult.error;
  if (bookingsResult.error) throw bookingsResult.error;
  if (visitorPassesResult.error) throw visitorPassesResult.error;
  if (residentVehiclesResult.error) throw residentVehiclesResult.error;

  const chats: ChatItem[] = (chatsResult.data || []).map((chat: any) => ({
    id: chat.id,
    name: chat.name || "Чат сообщества",
    type: chat.type,
    lastMessage: "",
    lastMessageTime: chat.last_message_at ? new Date(chat.last_message_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "",
    unreadCount: 0,
    avatarColor: "bg-green-600",
    icon: chat.type === "building" ? "🏢" : chat.type === "entrance" ? "🚪" : "💬",
    isOfficial: chat.is_official,
  }));

  const messageResult = chats.length === 0
    ? { data: [], error: null }
    : await supabase.from("messages").select("*, sender:profiles(full_name, avatar_url, role)").in("chat_id", chats.map((chat) => chat.id)).order("created_at", { ascending: true }).limit(1000);
  if (messageResult.error) throw messageResult.error;
  const messagesByChat: Record<string, MessageItem[]> = {};
  for (const message of messageResult.data || []) {
    (messagesByChat[message.chat_id] ||= []).push({
      id: message.id,
      chatId: message.chat_id,
      senderId: message.sender_id,
      senderName: message.sender?.full_name || "Сосед",
      senderAvatar: message.sender?.avatar_url || undefined,
      isOfficial: message.sender?.role === "hoa_official",
      isMe: message.sender_id === userId,
      text: message.is_deleted ? "Сообщение удалено" : message.content || "",
      time: new Date(message.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    });
  }

  const verificationResult = await supabase
    .from("verification_requests")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(100);
  if (verificationResult.error) throw verificationResult.error;
  const verificationRequests: VerificationRequest[] = (verificationResult.data || []).map((item: any) => ({
    id: item.id,
    userId: item.user_id,
    fullName: item.full_name,
    phone: item.phone || "",
    buildingNumber: item.building_number,
    entranceNumber: item.entrance_number,
    apartmentNumber: item.apartment_number,
    documentType: item.document_type,
    documentUrl: item.document_path,
    status: item.status,
    submittedAt: new Date(item.created_at).toLocaleString("ru-RU"),
  }));

  const commentsResult = await supabase
    .from("comments")
    .select("id, post_id, content, created_at, author:profiles(full_name, role)")
    .order("created_at", { ascending: true })
    .limit(500);
  if (commentsResult.error) throw commentsResult.error;
  const postComments: Record<string, Array<{ id: string; authorName: string; isOfficial: boolean; text: string; time: string }>> = {};
  for (const comment of commentsResult.data || []) {
    const author = relation(comment.author);
    (postComments[comment.post_id] ||= []).push({
      id: comment.id,
      authorName: author?.full_name || "Сосед",
      isOfficial: author?.role === "hoa_official",
      text: comment.content,
      time: new Date(comment.created_at).toLocaleString("ru-RU"),
    });
  }

  const posts = await Promise.all((postsResult.data || []).map(async (row: any) => {
    const post = mapPost(row);
    if (post.attachments?.length) {
      post.attachments = await Promise.all(post.attachments.map(async (attachment) => ({
        ...attachment,
        url: await signedMediaUrl(supabase, attachment.url),
      })));
    }
    return post;
  }));
  const classifieds = await Promise.all((classifiedsResult.data || []).map(async (item: any) => ({
    id: item.id,
    title: item.title,
    category: item.category,
    price: item.price == null ? "Договорная" : `${Number(item.price).toLocaleString("ru-RU")} ${item.currency === "KZT" ? "₸" : item.currency}`,
    location: item.location || "Мой ЖК",
    image: await signedMediaUrl(supabase, item.image_path),
    description: item.description,
    authorId: item.author_id,
    authorName: relation(item.author)?.full_name || "Житель ЖК",
    authorPhone: relation(item.author)?.phone || "",
    createdAt: new Date(item.created_at).toLocaleDateString("ru-RU"),
  })));
  const notifications: AppNotification[] = (notificationsResult.data || []).map((item: any) => ({
    id: item.id,
    type: item.type || "system",
    title: item.title || "Новое уведомление",
    body: item.body || "",
    data: item.data || {},
    isRead: Boolean(item.is_read),
    createdAt: new Date(item.created_at).toLocaleString("ru-RU"),
  }));
  const serviceRequests: ServiceRequestItem[] = await Promise.all((serviceRequestsResult.data || []).map(async (item: any) => ({
    id: item.id,
    userId: item.created_by,
    complexId: item.complex_id,
    category: item.category,
    title: item.title,
    description: item.description,
    location: item.location,
    status: item.status,
    priority: item.priority,
    publicForComplex: Boolean(item.public_for_complex),
    assigneeName: item.assignee_name || undefined,
    slaDueAt: item.sla_due_at ? new Date(item.sla_due_at).toLocaleString("ru-RU") : undefined,
    resolutionNote: item.resolution_note || undefined,
    rating: item.rating || undefined,
    attachments: await Promise.all((item.attachments || []).map(async (attachment: any) => ({
      id: attachment.id,
      url: await signedMediaUrl(supabase, attachment.path),
      name: attachment.file_name,
      mimeType: attachment.mime_type,
      sizeBytes: Number(attachment.size_bytes),
      kind: attachment.kind,
    }))),
    events: (item.events || []).map((event: any) => ({
      id: event.id,
      kind: event.kind,
      actorName: relation(event.actor)?.full_name || "Система Korshi",
      actorRole: relation(event.actor)?.role || undefined,
      message: event.message || undefined,
      createdAt: new Date(event.created_at).toLocaleString("ru-RU"),
    })),
    createdAt: new Date(item.created_at).toLocaleString("ru-RU"),
    updatedAt: new Date(item.updated_at).toLocaleString("ru-RU"),
  })));
  const acknowledgedDocumentIds = new Set((acknowledgementsResult.data || []).map((item: any) => item.document_id));
  const documents: HouseDocument[] = await Promise.all((documentsResult.data || []).map(async (item: any) => ({
    id: item.id,
    complexId: item.complex_id,
    title: item.title,
    description: item.description || "",
    category: item.category,
    version: item.version,
    fileName: item.file_name,
    mimeType: item.mime_type,
    sizeBytes: Number(item.size_bytes),
    url: await signedMediaUrl(supabase, item.file_path),
    isImportant: Boolean(item.is_important),
    requiresAcknowledgement: Boolean(item.requires_acknowledgement),
    acknowledged: acknowledgedDocumentIds.has(item.id),
    status: item.status,
    publishedBy: relation(item.publisher)?.full_name || "ОСИ",
    publishedAt: new Date(item.published_at).toLocaleString("ru-RU"),
    searchableText: item.searchable_text || undefined,
    scopeLabel: item.entrance_id ? "Подъезд" : item.building_id ? "Дом" : "Весь ЖК",
  })));
  const ownBallots = new Map((officialVoteBallotsResult.data || []).map((item: any) => [item.vote_id, item.choice as OfficialVoteChoice]));
  const officialVotes: OfficialVoteItem[] = await Promise.all((officialVotesResult.data || []).map(async (item: any) => {
    const result = await supabase.rpc("get_official_vote_results", { p_vote_id: item.id });
    if (result.error) throw result.error;
    const results: Record<OfficialVoteChoice, number> = { yes: 0, no: 0, abstain: 0 };
    let castWeight = 0;
    for (const row of result.data || []) {
      results[row.choice as OfficialVoteChoice] = item.basis === "area"
        ? Number(row.total_weight || 0)
        : Number(row.ballot_count || 0);
      castWeight += item.basis === "area" ? Number(row.total_weight || 0) : Number(row.ballot_count || 0);
    }
    const eligible = item.basis === "area" ? Number(item.eligible_weight) : Number(item.eligible_units);
    return {
      id: item.id,
      complexId: item.complex_id,
      title: item.title,
      description: item.description,
      basis: item.basis,
      quorumPercent: Number(item.quorum_percent),
      participationPercent: Math.min(100, Math.round((castWeight / Math.max(1, eligible)) * 100)),
      eligibleUnits: Number(item.eligible_units),
      eligibleWeight: Number(item.eligible_weight),
      status: item.status,
      startsAt: new Date(item.starts_at).toLocaleString("ru-RU"),
      endsAt: new Date(item.ends_at).toLocaleString("ru-RU"),
      results,
      userChoice: ownBallots.get(item.id),
      protocolUrl: item.protocol_path ? await signedMediaUrl(supabase, item.protocol_path) : undefined,
    };
  }));
  const financeTransactions = (financeTransactionsResult.data || []).map((item: any) => ({
    id: item.id,
    direction: item.direction as "income" | "expense",
    category: item.category,
    title: item.title,
    amount: Number(item.amount),
    occurredOn: new Date(`${item.occurred_on}T00:00:00`).toLocaleDateString("ru-RU"),
    documentId: item.document_id || undefined,
  }));
  const financeIncome = financeTransactions.filter((item: any) => item.direction === "income").reduce((sum: number, item: any) => sum + item.amount, 0);
  const financeExpense = financeTransactions.filter((item: any) => item.direction === "expense").reduce((sum: number, item: any) => sum + item.amount, 0);
  const finance: FinanceOverview = {
    balance: Number(financeAccountsResult.data?.[0]?.balance ?? financeIncome - financeExpense),
    income: financeIncome,
    expense: financeExpense,
    currency: "KZT",
    transactions: financeTransactions,
    budget: (financeBudgetResult.data || []).map((item: any) => ({
      id: item.id,
      category: item.category,
      planned: Number(item.planned),
      actual: Number(item.actual),
    })),
  };
  const emergencyRow = emergencyAlertsResult.data?.[0];
  const acknowledgedAlerts = new Set((emergencyAcknowledgementsResult.data || []).map((item: any) => item.alert_id));
  const urgentAlert: EmergencyAlert | null = emergencyRow ? {
    id: emergencyRow.id,
    title: emergencyRow.title,
    message: emergencyRow.message,
    affectedAreas: emergencyRow.affected_areas || [],
    expectedResolution: emergencyRow.expected_resolution || undefined,
    contactPhone: emergencyRow.contact_phone || undefined,
    active: Boolean(emergencyRow.active),
    acknowledged: acknowledgedAlerts.has(emergencyRow.id),
    createdAt: new Date(emergencyRow.created_at).toLocaleString("ru-RU"),
  } : null;
  const scheduleItems: HomeScheduleItem[] = (scheduleResult.data || []).map((item: any) => ({ id: item.id, kind: item.kind, title: item.title, description: item.description || "", location: item.location, startsAt: new Date(item.starts_at).toLocaleString("ru-RU"), endsAt: item.ends_at ? new Date(item.ends_at).toLocaleString("ru-RU") : undefined, status: item.status }));
  const amenityResources: AmenityResource[] = (resourcesResult.data || []).map((item: any) => ({ id: item.id, name: item.name, description: item.description || "", location: item.location, capacity: item.capacity || undefined, price: Number(item.price) }));
  const amenityBookings: AmenityBooking[] = (bookingsResult.data || []).map((item: any) => ({ id: item.id, resourceId: item.resource_id, startsAt: new Date(item.starts_at).toLocaleString("ru-RU"), endsAt: new Date(item.ends_at).toLocaleString("ru-RU"), status: item.status }));
  const visitorPasses: VisitorPass[] = (visitorPassesResult.data || []).map((item: any) => ({ id: item.id, guestName: item.guest_name, kind: item.kind, vehiclePlate: item.vehicle_plate || undefined, accessCode: item.access_code, validFrom: new Date(item.valid_from).toLocaleString("ru-RU"), validUntil: new Date(item.valid_until).toLocaleString("ru-RU"), status: item.status }));
  const residentVehicles: ResidentVehicle[] = (residentVehiclesResult.data || []).map((item: any) => ({ id: item.id, plate: item.plate, label: item.label || "Автомобиль" }));

  return {
    posts,
    chats,
    messages: messagesByChat,
    classifieds,
    verificationRequests,
    postComments,
    notifications,
    serviceRequests,
    documents,
    officialVotes,
    finance,
    urgentAlert,
    scheduleItems,
    amenityResources,
    amenityBookings,
    visitorPasses,
    residentVehicles,
  };
}
