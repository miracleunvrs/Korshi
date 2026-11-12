-- Чаты: непрочитанное вместо потока уведомлений.
-- Каждое сообщение создавало уведомление каждому участнику чата. В общем чате
-- ЖК это сотни записей на сообщение, и они вытесняли из ленты уведомлений
-- статусы заявок и аварии. Счётчики непрочитанного при этом всегда были 0.
-- Теперь уведомление получают только участники личного чата, а для групповых
-- чатов клиент показывает непрочитанное по `chat_members.last_read_at`.

CREATE OR REPLACE FUNCTION notify_chat_members_on_message()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  sender_name TEXT;
  chat_row chats;
BEGIN
  SELECT * INTO chat_row FROM chats WHERE id = NEW.chat_id;
  IF chat_row.type IS DISTINCT FROM 'direct' THEN
    RETURN NEW;
  END IF;
  SELECT full_name INTO sender_name FROM profiles WHERE id = NEW.sender_id;

  INSERT INTO notifications (user_id, type, title, body, data)
  SELECT cm.user_id,
         'message',
         'Новое сообщение',
         COALESCE(sender_name, 'Житель ЖК') || ' написал вам',
         jsonb_build_object('chat_id', NEW.chat_id, 'message_id', NEW.id)
  FROM chat_members cm
  WHERE cm.chat_id = NEW.chat_id AND cm.user_id <> NEW.sender_id;
  RETURN NEW;
END;
$$;

CREATE INDEX IF NOT EXISTS idx_messages_chat_created ON messages(chat_id, created_at DESC);

-- Сводка по чатам текущего пользователя: последнее сообщение и непрочитанное.
-- SECURITY INVOKER: строки по-прежнему фильтрует RLS сообщений и участников.
CREATE OR REPLACE FUNCTION chat_summaries()
RETURNS TABLE (
  chat_id UUID,
  last_message TEXT,
  last_message_type message_type,
  last_message_at TIMESTAMPTZ,
  last_sender_id UUID,
  last_sender_name TEXT,
  unread_count BIGINT
)
LANGUAGE SQL
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT member.chat_id,
         CASE WHEN latest.is_deleted THEN 'Сообщение удалено' ELSE latest.content END,
         latest.type,
         latest.created_at,
         latest.sender_id,
         latest.sender_name,
         (SELECT COUNT(*) FROM messages unread
           WHERE unread.chat_id = member.chat_id
             AND unread.sender_id <> auth.uid()
             AND NOT unread.is_deleted
             AND unread.created_at > COALESCE(member.last_read_at, member.joined_at))
  FROM chat_members member
  LEFT JOIN LATERAL (
    SELECT message.content, message.type, message.created_at, message.sender_id, message.is_deleted, sender.full_name AS sender_name
    FROM messages message
    LEFT JOIN profiles sender ON sender.id = message.sender_id
    WHERE message.chat_id = member.chat_id
    ORDER BY message.created_at DESC
    LIMIT 1
  ) latest ON TRUE
  WHERE member.user_id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION mark_chat_read(p_chat_id UUID)
RETURNS VOID
LANGUAGE SQL
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE chat_members SET last_read_at = NOW()
  WHERE chat_id = p_chat_id AND user_id = auth.uid() AND is_chat_member(p_chat_id);
$$;

REVOKE ALL ON FUNCTION chat_summaries(), mark_chat_read(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION chat_summaries(), mark_chat_read(UUID) TO authenticated;
