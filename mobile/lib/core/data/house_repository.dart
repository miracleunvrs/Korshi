import 'dart:math';
import 'dart:typed_data';

import 'package:supabase_flutter/supabase_flutter.dart';

import '../supabase/supabase_config.dart';
import '../../features/feed/models/post.dart';
import 'media_limits.dart';
import 'offline_action_queue.dart';

class HouseRepository {
  HouseRepository({SupabaseClient? client}) : _providedClient = client;

  final SupabaseClient? _providedClient;
  SupabaseClient get _client => _providedClient ?? SupabaseConfig.client;
  final OfflineActionQueue _offlineQueue = OfflineActionQueue();

  bool get isConfigured =>
      _providedClient != null || !SupabaseConfig.isPlaceholder;

  Future<User?> currentUser() async {
    if (!isConfigured) return null;
    return _client.auth.currentUser;
  }

  Future<AuthResponse> signIn(String email, String password) {
    return _client.auth.signInWithPassword(
        email: email.trim().toLowerCase(), password: password);
  }

  Future<AuthResponse> signUp({
    required String email,
    required String password,
    required String fullName,
    required String phone,
    required String buildingNumber,
    required int entranceNumber,
    required String apartmentNumber,
  }) {
    return _client.auth.signUp(
      email: email.trim().toLowerCase(),
      password: password,
      data: {
        'full_name': fullName,
        'phone': phone,
        'building_number': buildingNumber,
        'entrance_number': entranceNumber,
        'apartment_number': apartmentNumber,
        'role': 'resident',
      },
    );
  }

  Future<void> signOut() async {
    if (isConfigured) await _client.auth.signOut();
  }

  Future<Map<String, dynamic>?> loadProfile() async {
    if (!isConfigured) return null;
    final user = _client.auth.currentUser;
    if (user == null) return null;
    final row = await _client
        .from('profiles')
        .select(
            'id, complex_id, full_name, phone, avatar_url, verified, bio, apartment:apartments(number, entrance:entrances(id, number, building:buildings(id, number)))')
        .eq('id', user.id)
        .maybeSingle();
    return row == null ? null : Map<String, dynamic>.from(row);
  }

  Future<void> updateProfile(
      {required String fullName, required String phone, String? bio}) async {
    if (!isConfigured) return;
    final user = _client.auth.currentUser;
    if (user == null) throw Exception('Требуется авторизация');
    await _client.from('profiles').update({
      'full_name': fullName.trim(),
      'phone': phone.trim().isEmpty ? null : phone.trim(),
      if (bio != null) 'bio': bio.trim().isEmpty ? null : bio.trim(),
    }).eq('id', user.id);
  }

  /// Redeems a one-time apartment code issued by the HOA. Returns a status
  /// (`ok`, `invalid`, `used`, `expired`, `rate_limited`) instead of throwing,
  /// so wrong guesses still count towards the server-side attempt limit.
  Future<String> redeemApartmentInvite(String code) async {
    if (!isConfigured) return 'invalid';
    final result =
        await _client.rpc('redeem_apartment_invite', params: {'p_code': code});
    return '$result';
  }

  /// Последняя заявка на подтверждение: status, review_reason и адрес.
  Future<Map<String, dynamic>?> loadLatestVerificationRequest() async {
    if (!isConfigured) return null;
    final user = _client.auth.currentUser;
    if (user == null) return null;
    final row = await _client
        .from('verification_requests')
        .select(
            'status, review_reason, building_number, entrance_number, apartment_number, created_at')
        .eq('user_id', user.id)
        .order('created_at', ascending: false)
        .limit(1)
        .maybeSingle();
    return row == null ? null : Map<String, dynamic>.from(row);
  }

  Future<void> submitVerificationDocument({
    required String fullName,
    required String phone,
    required String buildingNumber,
    required int entranceNumber,
    required String apartmentNumber,
    required String fileName,
    required List<int> bytes,
  }) async {
    final user = _client.auth.currentUser;
    if (user == null) throw Exception('Требуется авторизация');
    if (bytes.length > maxUploadBytes) {
      throw Exception('Размер файла не должен превышать 10 МБ');
    }
    final extension = fileName.split('.').last.toLowerCase();
    if (!allowedUploadExtensions.contains(extension)) {
      throw Exception('Поддерживаются только JPG, PNG, WEBP и PDF');
    }
    final mimeType = mimeTypeForExtension(extension);
    final safeName = fileName.replaceAll(RegExp(r'[^a-zA-Z0-9._-]'), '_');
    final path =
        '${user.id}/verification/${DateTime.now().millisecondsSinceEpoch}_$safeName';
    await _client.storage.from('house-media').uploadBinary(
          path,
          Uint8List.fromList(bytes),
          fileOptions: FileOptions(contentType: mimeType, upsert: false),
        );
    try {
      await _client.from('verification_requests').insert({
        'user_id': user.id,
        'full_name': fullName,
        'phone': phone.isEmpty ? null : phone,
        'building_number': buildingNumber,
        'entrance_number': entranceNumber,
        'apartment_number': apartmentNumber,
        'document_type': mimeType,
        'document_path': path,
      });
    } catch (_) {
      // Заявка не создана — документ без заявки никому не нужен.
      await _client.storage
          .from('house-media')
          .remove([path]).catchError((_) => <FileObject>[]);
      rethrow;
    }
  }

  Future<String> _signedMediaUrl(String? path) async {
    if (path == null || path.isEmpty || path.startsWith('http')) {
      return path ?? '';
    }
    final result =
        await _client.storage.from('house-media').createSignedUrl(path, 3600);
    return result;
  }

  Future<List<Post>> loadPosts() async {
    final rows = await _client
        .from('posts')
        .select(
            '*, author:profiles(id, full_name, avatar_url, role, verified), attachments:post_attachments(*), poll:polls(*, options:poll_options(*)), initiative:initiatives(*), fundraiser:fundraisers(*)')
        .order('created_at', ascending: false)
        .limit(50);
    final posts = <Post>[];
    for (final row in rows) {
      final data = Map<String, dynamic>.from(row);
      final attachments = (data['attachments'] as List<dynamic>? ?? const [])
          .map((attachment) => Map<String, dynamic>.from(attachment as Map))
          .toList();
      for (final attachment in attachments) {
        attachment['url'] = await _signedMediaUrl(attachment['url'] as String?);
      }
      data['attachments'] = attachments;
      posts.add(Post.fromMap(data));
    }
    return posts;
  }

  Future<void> createPost({
    required String type,
    required String title,
    required String content,
    required String territory,
    List<String> pollOptions = const [],
    String? initiativeGoal,
  }) async {
    final user = _client.auth.currentUser;
    if (user == null) throw Exception('Требуется авторизация');
    final profile = await loadProfile();
    final complexId = profile?['complex_id'];
    if (complexId == null) throw Exception('Профиль ещё не привязан к ЖК');
    if (profile?['verified'] != true) {
      throw Exception('Публикации доступны только подтверждённым жителям');
    }
    if (!const ['complex', 'building', 'entrance'].contains(territory)) {
      throw Exception('Выберите аудиторию публикации');
    }
    final apartment = profile?['apartment'] as Map<String, dynamic>?;
    final entrance = apartment?['entrance'] as Map<String, dynamic>?;
    final building = entrance?['building'] as Map<String, dynamic>?;
    final buildingId =
        territory == 'complex' ? null : building?['id'] as String?;
    final entranceId =
        territory == 'entrance' ? (entrance?['id'] as String?) : null;
    if (territory != 'complex' && (buildingId == null || buildingId.isEmpty)) {
      throw Exception(
          'Дом не указан в профиле. Уточните адрес перед публикацией');
    }
    if (territory == 'entrance' && (entranceId == null || entranceId.isEmpty)) {
      throw Exception(
          'Подъезд не указан в профиле. Уточните адрес перед публикацией');
    }
    List<String> validOptions = const [];
    if (type == 'poll') {
      validOptions = pollOptions
          .map((item) => item.trim())
          .where((item) => item.isNotEmpty)
          .toList();
      if (validOptions.length < 2) {
        throw Exception('Добавьте минимум два варианта ответа');
      }
    }
    await _client.rpc('create_post_bundle', params: {
      'p_post': {
        'type': type,
        'title': title.trim().isEmpty ? null : title.trim(),
        'content': content.trim(),
        'territory': territory,
        'building_id': buildingId,
        'entrance_id': entranceId,
        'is_official': false,
      },
      'p_attachments': <Map<String, dynamic>>[],
      'p_poll': type == 'poll'
          ? {
              'is_multiple': false,
              'options': [
                for (var index = 0; index < validOptions.length; index++)
                  {'text': validOptions[index], 'position': index},
              ],
            }
          : null,
      'p_initiative': type == 'initiative'
          ? {
              'stage': 'proposal',
              'goal': initiativeGoal?.trim().isNotEmpty == true
                  ? initiativeGoal!.trim()
                  : content.trim(),
            }
          : null,
      'p_fundraiser': null,
    });
  }

  Future<List<Map<String, dynamic>>> loadChats() async {
    final rows = await _client
        .from('chats')
        .select('*')
        .order('last_message_at', ascending: false, nullsFirst: false)
        .limit(100);
    final chats = rows.map((row) => Map<String, dynamic>.from(row)).toList();
    // Личный чат называется именем собеседника, как в мессенджерах.
    final directIds = [
      for (final chat in chats)
        if (chat['type'] == 'direct') chat['id'] as String
    ];
    if (directIds.isNotEmpty) {
      final members = await _client
          .from('chat_members')
          .select('chat_id, user:profiles(full_name, avatar_url)')
          .inFilter('chat_id', directIds)
          .neq('user_id', _client.auth.currentUser!.id);
      final partners = {
        for (final row in members) row['chat_id'] as String: row['user'] as Map?
      };
      for (final chat in chats) {
        final partner = partners[chat['id']];
        if (partner == null) continue;
        chat['name'] = partner['full_name'] ?? 'Сосед';
        chat['avatar_url'] = partner['avatar_url'];
      }
    }
    return chats;
  }

  /// Название и тип одного чата; личный чат называется именем собеседника.
  Future<Map<String, dynamic>?> loadChatInfo(String chatId) async {
    final row = await _client
        .from('chats')
        .select('id, name, type')
        .eq('id', chatId)
        .maybeSingle();
    if (row == null) return null;
    final chat = Map<String, dynamic>.from(row);
    if (chat['type'] == 'direct') {
      final partner = await _client
          .from('chat_members')
          .select('user:profiles(full_name)')
          .eq('chat_id', chatId)
          .neq('user_id', _client.auth.currentUser!.id)
          .maybeSingle();
      final name = (partner?['user'] as Map?)?['full_name'];
      if (name != null) chat['name'] = name;
    }
    return chat;
  }

  /// Подтверждённые соседи по ЖК — кому можно написать.
  Future<List<Map<String, dynamic>>> loadNeighbours() async {
    final profile = await loadProfile();
    final complexId = profile?['complex_id'];
    if (complexId == null) return [];
    final rows = await _client
        .from('profiles')
        .select('id, full_name, avatar_url')
        .eq('complex_id', complexId)
        .eq('verified', true)
        .neq('id', _client.auth.currentUser!.id)
        .order('full_name')
        .limit(500);
    return rows.map((row) => Map<String, dynamic>.from(row)).toList();
  }

  Future<String> createDirectChat(String userId) async {
    final id = await _client
        .rpc('create_direct_chat', params: {'p_target_user': userId});
    return id as String;
  }

  Future<String> createGroupChat(String name, List<String> memberIds) async {
    final id = await _client.rpc('create_group_chat',
        params: {'p_name': name, 'p_member_ids': memberIds});
    return id as String;
  }

  /// Участники беседы; `isAdmin` — может ли текущий пользователь ею управлять.
  Future<({List<Map<String, dynamic>> members, bool isAdmin})> loadGroupMembers(
      String chatId) async {
    final rows = await _client
        .from('chat_members')
        .select('user_id, role, user:profiles(full_name)')
        .eq('chat_id', chatId)
        .order('joined_at');
    final members = rows.map((row) => Map<String, dynamic>.from(row)).toList();
    final me = _client.auth.currentUser!.id;
    return (
      members: members,
      isAdmin: members.any(
          (member) => member['user_id'] == me && member['role'] == 'admin'),
    );
  }

  Future<void> manageGroupChat(String chatId, String action,
      {String? name, List<String> memberIds = const []}) {
    return _client.rpc('manage_group_chat', params: {
      'p_chat_id': chatId,
      'p_action': action,
      'p_name': name,
      'p_member_ids': memberIds,
    });
  }

  /// Аватар лежит в публичном хранилище: его видят соседи.
  Future<String> uploadAvatar(Uint8List png) async {
    final userId = _client.auth.currentUser!.id;
    final path = '$userId/${DateTime.now().millisecondsSinceEpoch}.png';
    await _client.storage.from('avatars').uploadBinary(path, png,
        fileOptions: const FileOptions(contentType: 'image/png'));
    final url = _client.storage.from('avatars').getPublicUrl(path);
    try {
      await _client
          .from('profiles')
          .update({'avatar_url': url}).eq('id', userId);
    } catch (_) {
      await _client.storage.from('avatars').remove([path]);
      rethrow;
    }
    return url;
  }

  Future<Map<String, dynamic>?> loadNotificationPreferences() async {
    final row = await _client
        .from('notification_preferences')
        .select('push, voting, payments, email_critical, sms_critical')
        .eq('user_id', _client.auth.currentUser!.id)
        .maybeSingle();
    return row;
  }

  Future<void> saveNotificationPreference(String key, bool value) async {
    final profile = await loadProfile();
    await _client.from('notification_preferences').upsert({
      'user_id': _client.auth.currentUser!.id,
      'complex_id': profile?['complex_id'],
      key: value,
    }, onConflict: 'user_id,complex_id');
  }

  Future<void> changePassword(String password) =>
      _client.auth.updateUser(UserAttributes(password: password));

  static const messagePageSize = 50;

  RealtimeChannel? watchMessages(String chatId, void Function() onChange) {
    if (!isConfigured) return null;
    return _client
        .channel('housesm-mobile-chat-$chatId')
        .onPostgresChanges(
            event: PostgresChangeEvent.all,
            schema: 'public',
            table: 'messages',
            filter: PostgresChangeFilter(
                type: PostgresChangeFilterType.eq,
                column: 'chat_id',
                value: chatId),
            callback: (_) => onChange())
        .subscribe();
  }

  Future<List<Map<String, dynamic>>> loadMessages(String chatId,
      {String? beforeCreatedAt, String? beforeId}) async {
    var query = _client
        .from('messages')
        .select('*, sender:profiles(full_name, avatar_url, role)')
        .eq('chat_id', chatId);
    if (beforeCreatedAt != null && beforeId != null) {
      query = query.or(
          'created_at.lt.$beforeCreatedAt,and(created_at.eq.$beforeCreatedAt,id.lt.$beforeId)');
    }
    final rows = await query
        .order('created_at', ascending: false)
        .order('id', ascending: false)
        .limit(messagePageSize);
    return rows.reversed.map((row) => Map<String, dynamic>.from(row)).toList();
  }

  Future<List<Map<String, dynamic>>> loadClassifieds() async {
    final rows = await _client
        .from('classifieds')
        .select('*, author:profiles(full_name, phone)')
        .order('created_at', ascending: false)
        .limit(50);
    return Future.wait(rows.map((row) async {
      final item = Map<String, dynamic>.from(row);
      final author = item['author'] is Map
          ? Map<String, dynamic>.from(item['author'])
          : <String, dynamic>{};
      final price = item['price'];
      item['price_label'] = price == null
          ? 'Договорная'
          : '${(price as num).toStringAsFixed(0)} ${item['currency'] == 'KZT' ? '₸' : item['currency']}';
      item['author_name'] = author['full_name'] ?? 'Житель ЖК';
      item['author_phone'] = author['phone'] ?? '';
      item['image_path'] = await _signedMediaUrl(item['image_path'] as String?);
      return item;
    }));
  }

  Future<void> vote(String pollId, String optionId) async {
    final user = _client.auth.currentUser;
    if (user == null) throw Exception('Требуется авторизация');
    await _client.from('poll_votes').insert({
      'poll_id': pollId,
      'option_id': optionId,
      'user_id': user.id,
    });
  }

  /// Stable idempotency key for one composed message. Generated once per
  /// draft and reused on every retry, so a lost response after a committed
  /// insert can never produce a second row.
  static String newClientMessageId() {
    final random = Random.secure();
    final bytes = List<int>.generate(16, (_) => random.nextInt(256));
    bytes[6] = (bytes[6] & 0x0f) | 0x40;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;
    final hex =
        bytes.map((byte) => byte.toRadixString(16).padLeft(2, '0')).join();
    return '${hex.substring(0, 8)}-${hex.substring(8, 12)}-${hex.substring(12, 16)}-${hex.substring(16, 20)}-${hex.substring(20)}';
  }

  Map<String, dynamic> buildMessagePayload({
    required String chatId,
    required String senderId,
    required String content,
    String? clientMsgId,
  }) =>
      {
        'chat_id': chatId,
        'sender_id': senderId,
        'content': content,
        'type': 'text',
        'client_msg_id': clientMsgId ?? newClientMessageId(),
      };

  /// Sends one message payload. Replays with the same `client_msg_id` are
  /// absorbed by the server instead of creating duplicates. Payloads without
  /// a key (queued by older app versions) fall back to a plain insert.
  Future<void> deliverMessage(Map<String, dynamic> payload) async {
    if (payload['client_msg_id'] == null) {
      await _client.from('messages').insert(payload);
      return;
    }
    await _client
        .from('messages')
        .upsert(payload, onConflict: 'client_msg_id', ignoreDuplicates: true);
  }

  Future<OfflineMutationDelivery> sendMessage(
      String chatId, String content) async {
    final user = _client.auth.currentUser;
    if (user == null) throw Exception('Требуется авторизация');
    final payload = buildMessagePayload(
        chatId: chatId, senderId: user.id, content: content);
    try {
      await deliverMessage(payload);
      return OfflineMutationDelivery.sent;
    } catch (error) {
      if (classifyOfflineFailure(error) != OfflineFailureKind.transient) {
        rethrow;
      }
      await _offlineQueue.add('message', payload, userId: user.id);
      return OfflineMutationDelivery.queued;
    }
  }

  Future<void> sendAttachment({
    required String chatId,
    required String fileName,
    required List<int> bytes,
    required String mimeType,
  }) async {
    final user = _client.auth.currentUser;
    if (user == null) throw Exception('Требуется авторизация');
    if (bytes.length > maxUploadBytes) {
      throw Exception('Размер файла не должен превышать 10 МБ');
    }
    if (!allowedUploadExtensions
        .contains(fileName.split('.').last.toLowerCase())) {
      throw Exception('Поддерживаются только JPG, PNG, WEBP и PDF');
    }
    final normalizedMimeType = mimeType.toLowerCase();
    if (!const {'image/jpeg', 'image/png', 'image/webp', 'application/pdf'}
        .contains(normalizedMimeType)) {
      throw Exception('Неподдерживаемый тип файла');
    }
    final safeName = fileName.replaceAll(RegExp(r'[^a-zA-Z0-9._-]'), '_');
    final path =
        '${user.id}/chats/$chatId/${DateTime.now().millisecondsSinceEpoch}_$safeName';
    for (var attempt = 0; attempt < 3; attempt += 1) {
      try {
        await _client.storage.from('house-media').uploadBinary(
              path,
              Uint8List.fromList(bytes),
              fileOptions: FileOptions(
                contentType: normalizedMimeType,
                upsert: false,
              ),
            );
        break;
      } catch (_) {
        if (attempt == 2) rethrow;
        await Future<void>.delayed(
            Duration(milliseconds: 300 * (1 << attempt)));
      }
    }
    await _client.from('messages').insert({
      'chat_id': chatId,
      'sender_id': user.id,
      'content': path,
      'type': normalizedMimeType.startsWith('image/') ? 'image' : 'document',
    });
  }

  Future<List<Map<String, dynamic>>> loadNotifications() async {
    final user = _client.auth.currentUser;
    if (user == null) throw Exception('Требуется авторизация');
    final rows = await _client
        .from('notifications')
        .select('id, type, title, body, is_read, created_at')
        .eq('user_id', user.id)
        .order('created_at', ascending: false)
        .limit(50);
    return rows.map((row) => Map<String, dynamic>.from(row)).toList();
  }

  Future<List<Map<String, dynamic>>> loadServiceRequests() async {
    if (!isConfigured) return const [];
    final rows = await _client
        .from('service_requests')
        .select('*')
        .order('created_at', ascending: false)
        .limit(100);
    return rows.map((row) => Map<String, dynamic>.from(row)).toList();
  }

  Future<OfflineMutationDelivery> createServiceRequest({
    required String category,
    required String title,
    required String description,
    required String location,
    required String priority,
  }) async {
    final user = _client.auth.currentUser;
    if (user == null) throw Exception('Требуется авторизация');
    final profile = await loadProfile();
    final complexId = profile?['complex_id'];
    if (complexId == null) throw Exception('Профиль ещё не привязан к ЖК');
    if (profile?['verified'] != true) {
      throw Exception('Заявки доступны только подтверждённым жителям');
    }
    final payload = {
      'created_by': user.id,
      'complex_id': complexId,
      'category': category,
      'title': title.trim(),
      'description': description.trim(),
      'location': location.trim(),
      'priority': priority,
    };
    try {
      await _client.from('service_requests').insert(payload);
      return OfflineMutationDelivery.sent;
    } catch (error) {
      if (classifyOfflineFailure(error) != OfflineFailureKind.transient) {
        rethrow;
      }
      await _offlineQueue.add(
        'service_request',
        payload,
        userId: user.id,
        complexId: '$complexId',
      );
      return OfflineMutationDelivery.queued;
    }
  }

  Future<void> markNotificationRead(String notificationId) async {
    await _client
        .from('notifications')
        .update({'is_read': true}).eq('id', notificationId);
  }

  Future<OfflineMutationDelivery> createClassified({
    required String title,
    required String category,
    required String description,
    String? price,
  }) async {
    final user = _client.auth.currentUser;
    if (user == null) throw Exception('Требуется авторизация');
    final profile = await loadProfile();
    final complexId = profile?['complex_id'];
    if (complexId == null) throw Exception('Профиль ещё не привязан к ЖК');
    final payload = {
      'author_id': user.id,
      'complex_id': complexId,
      'title': title.trim(),
      'category': category,
      'description': description.trim(),
      'price': price == null || price.trim().isEmpty
          ? null
          : num.tryParse(price.trim()),
      'currency': 'KZT',
    };
    try {
      await _client.from('classifieds').insert(payload);
      return OfflineMutationDelivery.sent;
    } catch (error) {
      if (classifyOfflineFailure(error) != OfflineFailureKind.transient) {
        rethrow;
      }
      await _offlineQueue.add(
        'classified',
        payload,
        userId: user.id,
        complexId: '$complexId',
      );
      return OfflineMutationDelivery.queued;
    }
  }

  Future<int> flushOfflineActions() async {
    final user = _client.auth.currentUser;
    if (user == null) return 0;
    String complexId;
    try {
      final value = await _client.rpc('auth_user_complex_id');
      complexId = '$value';
    } catch (error) {
      if (classifyOfflineFailure(error) == OfflineFailureKind.transient) {
        return 0;
      }
      rethrow;
    }
    return _offlineQueue.flush(
      (action) async {
        if (action.type == 'message') {
          await deliverMessage(action.payload);
          return;
        }
        final table = switch (action.type) {
          'service_request' => 'service_requests',
          'classified' => 'classifieds',
          _ => throw Exception('Неизвестное offline-действие'),
        };
        await _client.from(table).insert(action.payload);
      },
      userId: user.id,
      complexId: complexId,
      canContinue: () => _client.auth.currentUser?.id == user.id,
    );
  }
}
