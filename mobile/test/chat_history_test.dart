import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:housesm_mobile/core/data/house_repository.dart';
import 'package:housesm_mobile/features/chats/presentation/chat_room_screen.dart';

class _HistoryRepository extends HouseRepository {
  bool failOlder = true;
  final cursors = <String?>[];
  @override
  bool get isConfigured => true;
  @override
  RealtimeChannel? watchMessages(String chatId, void Function() onChange) => null;
  @override
  Future<User?> currentUser() async => null;
  @override
  Future<List<Map<String, dynamic>>> loadMessages(String chatId, {String? beforeCreatedAt, String? beforeId}) async {
    cursors.add(beforeId);
    if (beforeId != null && failOlder) { failOlder = false; throw Exception('Offline'); }
    final end = beforeId == null ? 120 : int.parse(beforeId);
    final start = end > 50 ? end - 50 : 0;
    return List.generate(end - start, (i) => {
      'id': '${start + i}'.padLeft(4, '0'), 'created_at': '2026-01-01T00:00:00Z',
      'content': 'History ${start + i}', 'sender_id': 'neighbor',
    });
  }
}

void main() {
  testWidgets('screen retains loaded messages after a failed page and retries same cursor', (tester) async {
    final repository = _HistoryRepository();
    await tester.pumpWidget(MaterialApp(home: ChatRoomScreen(chatId: 'room', repository: repository)));
    await tester.pumpAndSettle();
    expect(find.text('History 119'), findsOneWidget);
    await tester.tap(find.text('Более ранние сообщения'));
    await tester.pumpAndSettle();
    expect(find.textContaining('Не удалось загрузить историю'), findsOneWidget);
    expect(find.text('History 119'), findsOneWidget);
    await tester.tap(find.text('Более ранние сообщения'));
    await tester.pumpAndSettle();
    expect(find.textContaining('Не удалось загрузить историю'), findsNothing);
    expect(repository.cursors, [null, '0070', '0070']);
    await tester.tap(find.text('Более ранние сообщения'));
    await tester.pumpAndSettle();
    expect(repository.cursors.last, '0020');
    expect(find.text('Более ранние сообщения'), findsNothing);
    expect(tester.takeException(), isNull);
  });
  test('long chat opens its newest messages, scoped to one chat', () async {
    final client = SupabaseClient('https://local.test', 'synthetic',
        httpClient: MockClient((request) async {
      expect(request.url.queryParameters['chat_id'], 'eq.chat');
      final descending =
          request.url.queryParameters['order']!.startsWith('created_at.desc');
      final rows = List.generate(1350,
          (index) => {'id': '$index', 'created_at': '2026-01-01T00:00:00Z'});
      final selected = (descending ? rows.reversed : rows)
          .take(int.parse(request.url.queryParameters['limit']!))
          .toList();
      return http.Response(jsonEncode(selected), 200,
          request: request, headers: {'content-type': 'application/json'});
    }));
    addTearDown(client.dispose);
    final messages = await HouseRepository(client: client).loadMessages('chat');
    expect(messages.last['id'], '1349');
  });
  test('older cursor traverses over 1000 equal timestamps without gaps',
      () async {
    final client = SupabaseClient('https://local.test', 'synthetic',
        httpClient: MockClient((request) async {
      final params = request.url.queryParameters;
      expect(params['order'], 'created_at.desc.nullslast,id.desc.nullslast');
      final cursor = params['or'];
      final beforeId = cursor == null
          ? 1350
          : int.parse(RegExp(r'id.lt.([0-9]+)').firstMatch(cursor)!.group(1)!);
      final rows = List.generate(beforeId,
              (i) => {'id': '$i', 'created_at': '2026-01-01T00:00:00.123456Z'})
          .reversed
          .take(50)
          .toList();
      return http.Response(jsonEncode(rows), 200,
          request: request, headers: {'content-type': 'application/json'});
    }));
    addTearDown(client.dispose);
    final repository = HouseRepository(client: client);
    var page = await repository.loadMessages('chat');
    final ids = <String>[];
    while (page.isNotEmpty) {
      ids.addAll(page.map((m) => m['id'] as String));
      page = await repository.loadMessages('chat',
          beforeCreatedAt: page.first['created_at'] as String,
          beforeId: page.first['id'] as String);
    }
    expect(ids.length, 1350);
    expect(ids.toSet().length, 1350);
  });
}
