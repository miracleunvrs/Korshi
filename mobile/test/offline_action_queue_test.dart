import 'dart:async';
import 'dart:convert';

import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import 'package:housesm_mobile/core/data/offline_action_queue.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  setUp(() {
    SharedPreferences.setMockInitialValues(<String, Object>{});
  });

  test('persists and flushes queued actions', () async {
    final queue = OfflineActionQueue();
    await queue.add('create_request', <String, dynamic>{'title': 'Лифт'});

    expect(await queue.read(), hasLength(1));

    final synced = await queue.flush((action) async {
      expect(action.type, 'create_request');
      expect(action.payload['title'], 'Лифт');
    });

    expect(synced, 1);
    expect(await queue.read(), isEmpty);
  });

  test('keeps a failed action and increments attempts', () async {
    final queue = OfflineActionQueue();
    await queue.add('send_message', <String, dynamic>{'text': 'Проверка'});

    await queue.flush((_) async => throw TimeoutException('offline'));

    final pending = await queue.read();
    expect(pending, hasLength(1));
    expect(pending.single.attempts, 1);
  });
  test('eventually sends after more than ten transient failures', () async {
    var now = DateTime.utc(2026, 9, 25);
    final queue = OfflineActionQueue(now: () => now);
    await queue.add('message', {'content': 'Не терять'});
    var attempts = 0;
    for (var i = 0; i < 12; i++) {
      await queue.flush((_) async {
        attempts++;
        throw TimeoutException('offline');
      });
      now = now.add(const Duration(minutes: 10));
    }
    expect(attempts, 12);
    expect((await queue.read()).single.status, OfflineActionStatus.pending);
    expect(await queue.flush((_) async {}), 1);
    expect(await queue.read(), isEmpty);
  });

  test('backs off transient retries without blocking delivery', () async {
    var now = DateTime.utc(2026, 9, 25);
    final queue = OfflineActionQueue(now: () => now);
    await queue.add('message', {'content': 'Повторить позже'});
    await queue.flush((_) async => throw TimeoutException('offline'));
    expect(await queue.flush((_) async {}), 0);
    now = now.add(const Duration(seconds: 15));
    expect(await queue.flush((_) async {}), 1);
  });

  test('stops a flush when its account changes without blocking actions',
      () async {
    final queue = OfflineActionQueue();
    await queue.add('message', {'content': 'Первое'}, userId: 'resident-a');
    await queue.add('message', {'content': 'Второе'}, userId: 'resident-a');
    var activeUser = 'resident-a';
    var sends = 0;
    await queue.flush((_) async {
      sends++;
      activeUser = 'resident-b';
      throw const PostgrestException(
          message: 'permission denied', code: '42501');
    }, userId: 'resident-a', canContinue: () => activeUser == 'resident-a');
    expect(sends, 1);
    expect(
        (await queue.read()).every((action) =>
            action.attempts == 0 &&
            action.status == OfflineActionStatus.pending),
        isTrue);
  });

  test('can enqueue after emptying the queue', () async {
    final queue = OfflineActionQueue();
    await queue.add('message', {'content': 'Первое'});
    await queue.flush((_) async {});
    await queue.add('message', {'content': 'Второе'});
    expect((await queue.read()).single.payload['content'], 'Второе');
  });

  test('does not lose an action added while another action is flushing',
      () async {
    final queue = OfflineActionQueue();
    await queue.add('message', {'content': 'Первое'});
    final sendingStarted = Completer<void>();
    final finishSending = Completer<void>();

    final flushing = queue.flush((_) async {
      sendingStarted.complete();
      await finishSending.future;
    });
    await sendingStarted.future;
    await queue.add('message', {'content': 'Второе'});
    finishSending.complete();
    await flushing;

    final pending = await queue.read();
    expect(pending, hasLength(1));
    expect(pending.single.payload['content'], 'Второе');
  });

  test('flushes actions only for the active account and complex', () async {
    final queue = OfflineActionQueue();
    await queue.add(
      'message',
      {'content': 'Чужая очередь'},
      userId: 'resident-a',
      complexId: 'complex-a',
    );
    var sent = false;

    await queue.flush(
      (_) async => sent = true,
      userId: 'resident-b',
      complexId: 'complex-b',
    );

    expect(sent, isFalse);
    expect(await queue.read(), hasLength(1));
  });

  test('legacy actions keep the owner and complex from their payload',
      () async {
    final preferences = await SharedPreferences.getInstance();
    await preferences.setString(
        'korshi_offline_actions_v1',
        jsonEncode([
          {
            'id': 'legacy-request',
            'type': 'service_request',
            'payload': {'created_by': 'resident-a', 'complex_id': 'complex-a'},
            'attempts': 0,
            'createdAt': '2026-09-01T00:00:00Z',
          },
        ]));
    final queue = OfflineActionQueue();
    var sent = 0;
    await queue.flush((_) async => sent++,
        userId: 'resident-b', complexId: 'complex-b');
    await queue.flush((_) async => sent++,
        userId: 'resident-a', complexId: 'complex-b');
    expect(sent, 0);
    expect(await queue.read(), hasLength(1));
    expect(
        await queue.flush((_) async => sent++,
            userId: 'resident-a', complexId: 'complex-a'),
        1);
  });

  test('does not send ownerless legacy data under the current account',
      () async {
    final queue = OfflineActionQueue();
    await queue.add('message', {'content': 'Unknown owner'});
    expect(await queue.flush((_) async {}, userId: 'resident-b'), 0);
    expect(await queue.read(), hasLength(1));
  });

  test('preserves malformed storage instead of deleting unsent actions',
      () async {
    final preferences = await SharedPreferences.getInstance();
    const broken = '[{"id":"unsent"';
    await preferences.setString('korshi_offline_actions_v1', broken);
    await expectLater(OfflineActionQueue().read(), throwsFormatException);
    expect(preferences.getString('korshi_offline_actions_v1'), broken);
  });

  test('blocks permanent server failures instead of retrying them as offline',
      () async {
    final queue = OfflineActionQueue();
    await queue.add(
      'message',
      {'content': 'Запрещено'},
      userId: 'resident-a',
      complexId: 'complex-a',
    );

    await queue.flush(
      (_) async => throw const PostgrestException(
        message: 'row-level security policy violation',
        code: '42501',
      ),
      userId: 'resident-a',
      complexId: 'complex-a',
    );

    final blocked = (await queue.read()).single;
    expect(blocked.status, OfflineActionStatus.blocked);
    expect(blocked.attempts, 1);
    var retried = false;
    await queue.flush(
      (_) async => retried = true,
      userId: 'resident-a',
      complexId: 'complex-a',
    );
    expect(retried, isFalse);
  });

  test('recognizes timeouts as transient and RLS failures as permanent', () {
    expect(classifyOfflineFailure(TimeoutException('offline')),
        OfflineFailureKind.transient);
    expect(
      classifyOfflineFailure(const PostgrestException(
        message: 'permission denied',
        code: '42501',
      )),
      OfflineFailureKind.permanent,
    );
  });
}
