import 'dart:async';
import 'dart:convert';
import 'dart:io';

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:housesm_mobile/core/data/house_repository.dart';
import 'package:housesm_mobile/core/data/offline_action_queue.dart';
import 'package:housesm_mobile/features/chats/presentation/chat_room_screen.dart';

/// Minimal PostgREST fake for the messages table. Stores rows by
/// `client_msg_id` and honours `on_conflict` + `resolution=ignore-duplicates`,
/// i.e. a replayed payload is absorbed instead of creating a second row.
class _IdempotentMessageServer {
  final stored = <String, Map<String, dynamic>>{};
  final requests = <http.Request>[];
  bool dropNextResponse = false;

  Future<http.Response> handle(http.Request request) async {
    if (request.method != 'POST' ||
        !request.url.path.endsWith('/rest/v1/messages')) {
      return http.Response('[]', 200,
          request: request, headers: {'content-type': 'application/json'});
    }
    requests.add(request);
    final params = request.url.queryParameters;
    final prefer =
        request.headers['Prefer'] ?? request.headers['prefer'] ?? '';
    final body = jsonDecode(request.body);
    final items = [
      for (final item in (body is List ? body : [body]))
        Map<String, dynamic>.from(item as Map)
    ];
    if (dropNextResponse) {
      // The row is committed, but the response never reaches the client.
      for (final row in items) {
        final key = row['client_msg_id']?.toString();
        if (key != null) stored[key] = row;
      }
      dropNextResponse = false;
      throw const SocketException('Соединение потеряно после сохранения');
    }
    final inserted = <Map<String, dynamic>>[];
    for (final row in items) {
      final key = row['client_msg_id']?.toString();
      if (params['on_conflict'] == 'client_msg_id' &&
          key != null &&
          stored.containsKey(key)) {
        if (prefer.contains('ignore-duplicates')) continue;
        return http.Response(
            jsonEncode({'code': '23505', 'message': 'duplicate key'}), 409,
            request: request,
            headers: {'content-type': 'application/json'});
      }
      if (key != null) stored[key] = row;
      inserted.add({'id': 'row-${stored.length}', ...row});
    }
    return http.Response(jsonEncode(inserted), 201,
        request: request, headers: {'content-type': 'application/json'});
  }
}

HouseRepository _repository(_IdempotentMessageServer server) {
  final client = SupabaseClient('https://local.test', 'synthetic',
      httpClient: MockClient(server.handle));
  addTearDown(client.dispose);
  return HouseRepository(client: client);
}

class _CountingRepository extends HouseRepository {
  final response = Completer<OfflineMutationDelivery>();
  int sendCount = 0;

  @override
  bool get isConfigured => false;

  @override
  Future<OfflineMutationDelivery> sendMessage(String chatId, String content) {
    sendCount++;
    return response.future;
  }
}

void main() {
  test('retry after a lost response reuses the key and creates one row',
      () async {
    final server = _IdempotentMessageServer();
    final repository = _repository(server);
    final payload = repository.buildMessagePayload(
        chatId: 'chat', senderId: 'user', content: 'Привет');

    server.dropNextResponse = true;
    await expectLater(repository.deliverMessage(payload), throwsA(anything));

    await repository.deliverMessage(payload);
    expect(server.stored.length, 1);
    expect(server.requests.length, 2);
    final keys = [
      for (final request in server.requests)
        (jsonDecode(request.body) as Map)['client_msg_id']
    ];
    expect(keys[0], isNotNull);
    expect(keys[0], keys[1]);
    expect(server.requests[1].url.queryParameters['on_conflict'],
        'client_msg_id');
    final prefer = server.requests[1].headers['Prefer'] ?? '';
    expect(prefer, contains('ignore-duplicates'));
  });

  test('payload without a key falls back to a plain insert', () async {
    final server = _IdempotentMessageServer();
    final repository = _repository(server);
    await repository.deliverMessage(
        {'chat_id': 'chat', 'sender_id': 'user', 'content': 'Старое'});
    expect(server.requests.single.url.queryParameters.containsKey('on_conflict'),
        isFalse);
    expect(server.stored, isEmpty);
  });

  test('every composed message gets a unique v4 key', () {
    final server = _IdempotentMessageServer();
    final repository = _repository(server);
    final format = RegExp(
        r'^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$');
    final first = repository.buildMessagePayload(
        chatId: 'chat', senderId: 'user', content: 'Раз');
    final second = repository.buildMessagePayload(
        chatId: 'chat', senderId: 'user', content: 'Два');
    expect(format.hasMatch(first['client_msg_id'] as String), isTrue);
    expect(first['client_msg_id'], isNot(second['client_msg_id']));
    final retry = repository.buildMessagePayload(
        chatId: 'chat',
        senderId: 'user',
        content: 'Раз',
        clientMsgId: first['client_msg_id'] as String);
    expect(retry['client_msg_id'], first['client_msg_id']);
  });

  testWidgets('double tap sends once', (tester) async {
    final repository = _CountingRepository();
    await tester.pumpWidget(MaterialApp(
      home: ChatRoomScreen(chatId: 'room', repository: repository),
    ));
    await tester.enterText(find.byType(TextField), 'Не дублируй');
    await tester.pump();
    await tester.tap(find.byIcon(Icons.send));
    await tester.pump();
    await tester.tap(find.byIcon(Icons.send));
    await tester.pump();
    expect(repository.sendCount, 1);
    repository.response.complete(OfflineMutationDelivery.sent);
    await tester.pumpAndSettle();
    expect(tester.takeException(), isNull);
  });
}
