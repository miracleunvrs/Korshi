import type { Database } from "./database.types";
import type { UserRole, PostType, InitiativeStage, TerritoryType } from "./domain";

export type { UserRole, PostType, InitiativeStage, TerritoryType };
export type Profile = Database["public"]["Tables"]["profiles"]["Row"];
export type Post = Database["public"]["Tables"]["posts"]["Row"];
export type Comment = Database["public"]["Tables"]["comments"]["Row"];
export type Chat = Database["public"]["Tables"]["chats"]["Row"];
export type Message = Database["public"]["Tables"]["messages"]["Row"];
export type Notification = Database["public"]["Tables"]["notifications"]["Row"];
export type Fundraiser = Database["public"]["Tables"]["fundraisers"]["Row"];
export type Initiative = Database["public"]["Tables"]["initiatives"]["Row"];
export type Complex = Database["public"]["Tables"]["complexes"]["Row"];
export type Building = Database["public"]["Tables"]["buildings"]["Row"];
export type Entrance = Database["public"]["Tables"]["entrances"]["Row"];

// Расширенные типы с join-данными
export type PostWithAuthor = Post & {
  author: Pick<Profile, "id" | "full_name" | "avatar_url" | "role" | "verified">;
  attachments?: Database["public"]["Tables"]["post_attachments"]["Row"][];
  comments_count?: number;
  reactions_count?: number;
  liked_by_me?: boolean;
  poll?: Database["public"]["Tables"]["polls"]["Row"] & {
    options: Database["public"]["Tables"]["poll_options"]["Row"][];
  };
  initiative?: Initiative;
  fundraiser?: Fundraiser;
};

export type ChatWithLastMessage = Chat & {
  last_message?: Pick<Message, "content" | "type" | "created_at"> & {
    sender: Pick<Profile, "full_name">;
  };
  unread_count?: number;
  members_count?: number;
};

export type MessageWithSender = Message & {
  sender: Pick<Profile, "id" | "full_name" | "avatar_url">;
  reply_to?: Pick<Message, "id" | "content"> & {
    sender: Pick<Profile, "full_name">;
  };
};

// Типы форм
export type CreatePostForm = {
  type: PostType;
  title?: string;
  content: string;
  territory: "entrance" | "building" | "complex";
  building_id?: string;
  entrance_id?: string;
  price?: number;
  currency?: string;
  // Для опросов
  poll_options?: string[];
  poll_is_multiple?: boolean;
  poll_ends_at?: string;
  // Для инициатив
  initiative_goal?: string;
};

// Лейблы типов публикаций
export const POST_TYPE_LABELS: Record<PostType, string> = {
  post: "Публикация",
  announcement: "Объявление",
  service: "Услуга",
  help_request: "Просьба о помощи",
  poll: "Опрос",
  initiative: "Инициатива",
  event: "Событие",
  official_news: "Официальная новость",
  official_poll: "Официальный опрос",
  fundraiser: "Сбор",
};

// Лейблы ролей
export const ROLE_LABELS: Record<UserRole, string> = {
  resident: "Житель",
  hoa_official: "ОСИ",
  service_provider: "Исполнитель",
  admin: "Администратор",
};

// Лейблы стадий инициативы
export const INITIATIVE_STAGE_LABELS: Record<InitiativeStage, string> = {
  proposal: "Предложение",
  discussion: "Обсуждение",
  voting: "Голосование",
  hoa_review: "На рассмотрении у ОСИ",
  approved: "Одобрено",
  fundraising: "Сбор средств",
  implementation: "Реализация",
  completed: "Завершено",
  rejected: "Отклонено",
};
