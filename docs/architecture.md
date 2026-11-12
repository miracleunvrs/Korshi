# Korshi — Архитектура проекта

## Стек

| Уровень | Технология |
|---|---|
| Frontend | Next.js 16 (App Router) + TypeScript |
| Styling | Tailwind CSS + shadcn/ui |
| Backend | Supabase (PostgreSQL, Auth, Realtime, Storage, Edge Functions) |

## Структура репозитория

```
housesm/
├── docs/
├── public/
│   ├── manifest.json
│   └── icons/
├── src/
│   ├── app/
│   │   ├── (auth)/login/
│   │   ├── (auth)/verify/
│   │   ├── (main)/feed/
│   │   ├── (main)/chats/[chatId]/
│   │   ├── (main)/classifieds/
│   │   ├── (main)/documents/
│   │   ├── (main)/emergency/
│   │   ├── (main)/finance/
│   │   ├── (main)/hoa/
│   │   ├── (main)/notifications/
│   │   ├── (main)/requests/
│   │   ├── (main)/services/
│   │   ├── (main)/votes/
│   │   └── (main)/profile/
│   ├── components/
│   │   ├── layout/        # BottomNav, Header
│   │   ├── feed/          # PostCard, FeedFilter
│   │   └── ui/            # shadcn/ui
│   ├── lib/
│   │   └── supabase/      # client.ts, server.ts, middleware.ts
│   ├── types/             # database.types.ts, index.ts
│   ├── hooks/
│   └── stores/            # Zustand
├── supabase/
│   ├── migrations/
│   │   ├── 001_initial_schema.sql
│   │   └── 002_rls_policies.sql
│   └── seed.sql
├── middleware.ts
├── .env.example
├── next.config.ts
├── tailwind.config.ts
└── tsconfig.json
```

## Схема базы данных

### Иерархия
```
complexes → buildings → entrances → apartments → profiles
```

### Таблицы

#### complexes
- id, name, address, city, created_at

#### buildings
- id, complex_id, number, created_at

#### entrances
- id, building_id, number, created_at

#### apartments
- id, entrance_id, number, floor, created_at

#### profiles (расширение auth.users)
- id (FK auth.users), phone, full_name, avatar_url
- role: resident | hoa_official | service_provider | admin
- apartment_id, complex_id, verified, verified_at, verified_by
- bio, created_at, updated_at

#### posts (polymorphic — все типы публикаций)
- id, author_id, complex_id, building_id?, entrance_id?
- type: post | announcement | service | help_request | poll | initiative | event | official_news | official_poll | fundraiser
- title?, content, status: active | closed | archived | under_review
- is_official, price?, currency?, territory: entrance | building | complex
- views_count, created_at, updated_at

#### post_attachments
- id, post_id, url, type: image | document | video, size

#### comments
- id, post_id, author_id, parent_id?, content, created_at, updated_at

#### reactions
- id, post_id, user_id, type: like | support | thanks
- UNIQUE(post_id, user_id)

#### polls
- id, post_id (UNIQUE), is_multiple, ends_at, total_votes

#### poll_options
- id, poll_id, text, votes_count, position

#### poll_votes
- id, poll_id, option_id, user_id, created_at
- UNIQUE(poll_id, user_id) для single-choice

#### initiatives
- id, post_id (UNIQUE), stage: proposal | discussion | voting | hoa_review | approved | fundraising | implementation | completed | rejected
- goal, supporters

#### initiative_supports
- id, initiative_id, user_id, UNIQUE(initiative_id, user_id)

#### fundraisers
- id, post_id (UNIQUE), initiative_id?, target_amount, current_amount, currency
- payment_url, qr_url, ends_at, status: active | completed | cancelled

#### fundraiser_payments
- id, fundraiser_id, user_id, amount, comment, is_anonymous, confirmed_at

#### chats
- id, complex_id, building_id?, entrance_id?
- type: complex | building | entrance | thematic | direct
- name, description, avatar_url, is_official, created_by

#### chat_members
- id, chat_id, user_id, role: member | admin
- joined_at, last_read_at, UNIQUE(chat_id, user_id)

#### messages
- id, chat_id, sender_id, reply_to_id?, content
- type: text | image | document | system
- is_deleted, created_at, updated_at

#### notifications
- id, user_id, type, title, body, data jsonb, is_read

#### service_requests
- id, created_by, complex_id, building_id?, entrance_id?
- category, title, description, location
- status: submitted | in_progress | resolved | closed
- priority: normal | important | emergency, assignee_name?, sla_due_at?, resolution_note?, rating?

#### service_request_events / service_request_attachments
- журнал комментариев и смен статуса, автор события, метаданные
- защищённые фото и документы, связанные с заявкой

#### house_documents / house_document_acknowledgements
- версия документа, категория, файл, важность, дата публикации и архивный статус
- подтверждение ознакомления конкретным жителем

#### official_votes / official_vote_ballots
- вопрос, варианты ответа, период, правило веса owner | area, кворум
- один неизменяемый бюллетень от квартиры; агрегаты выдаются через RPC

#### finance_accounts / finance_transactions / finance_budget_items
- счёт дома и текущий баланс
- журнал поступлений и расходов с документальным основанием
- план и факт бюджета по категориям

#### emergency_alerts / emergency_alert_acknowledgements
- активный инцидент, затронутые зоны, прогноз восстановления и контакты
- подтверждение получения оповещения жителем

#### home_schedule_items / amenity_resources / amenity_bookings
- события и работы по дому
- общие помещения и бронирования без пересечения интервалов

#### access_passes / resident_vehicles
- ограниченные по времени коды доступа для гостей, курьеров и автомобилей
- автомобили жителей для интеграции со СКУД

## RLS-стратегия

| Таблица | Read | Write |
|---|---|---|
| complexes | все | admin |
| profiles | члены того же ЖК | сам пользователь |
| posts (обычные) | по territory | verified residents |
| posts (official) | все члены ЖК | hoa_official |
| chats/messages | члены чата | члены чата |
| fundraisers | все члены ЖК | hoa_official |
| poll_votes | — (агрегат) | сам пользователь |
| service_requests | автор, опубликованные для ЖК, управление | автор / назначенный исполнитель / управление |
| house_documents | жители того же ЖК | hoa_official / admin |
| official_votes | жители того же ЖК | hoa_official / admin; голос через RPC |
| finance_* | жители того же ЖК | hoa_official / admin через RPC |
| emergency_alerts | жители того же ЖК | hoa_official / admin через RPC |
| amenity_bookings / access_passes / resident_vehicles | владелец и управление | владелец через проверяемые RPC/RLS |

## Маршруты

```
/                     → /feed или /auth/login
/(auth)/login         → вход по номеру телефона
/(auth)/verify        → подтверждение OTP
/(main)/feed          → социальная лента
/(main)/chats         → список чатов
/(main)/chats/[id]    → чат
/(main)/classifieds   → объявления и услуги
/(main)/documents     → документы ОСИ
/(main)/votes         → официальные голосования
/(main)/finance       → финансы дома
/(main)/emergency     → аварийный центр
/(main)/services      → календарь, бронирования, пропуска и автомобили
/(main)/notifications → центр уведомлений
/(main)/hoa           → Мой ЖК (ОСИ)
/(main)/profile       → профиль
/(main)/requests      → заявки в управляющую организацию
/admin                → панель администратора
```

## Поток авторизации

```
1. Номер телефона → OTP (Supabase Auth + SMS)
2. OTP верификация → сессия
3. Есть profile? → Нет: Onboarding (ЖК + квартира)
4. verified? → Нет: экран ожидания | Да: /feed
```

## Realtime-подписки

| Канал | Таблица | Событие |
|---|---|---|
| chat:{chatId} | messages | новое сообщение |
| feed:{complexId} | posts | новая публикация |
| notifications:{userId} | notifications | уведомление |
| initiative:{id} | initiatives | смена статуса |
| fundraiser:{id} | fundraisers | обновление прогресса |
| complex:{id}:service_requests | service_requests / events | заявка или комментарий |
| complex:{id}:documents | house_documents / acknowledgements | документ или ознакомление |
| complex:{id}:governance | official_votes / ballots | голосование |
| complex:{id}:finance | finance_transactions | финансовая операция |
| complex:{id}:emergency | emergency_alerts / acknowledgements | аварийное оповещение |
| complex:{id}:services | schedule / bookings / passes / vehicles | сервисы дома |

## Переменные окружения

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
NEXT_PUBLIC_APP_URL=
```
