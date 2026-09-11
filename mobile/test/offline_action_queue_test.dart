import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';

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

    await queue.flush((_) async => throw Exception('offline'));

    final pending = await queue.read();
    expect(pending, hasLength(1));
    expect(pending.single.attempts, 1);
  });
  test('retains exhausted actions for inspection instead of deleting them', () async {
    final queue = OfflineActionQueue();
    await queue.add('message', {'content': 'Не терять'});
    var attempts = 0;
    for (var i = 0; i < 12; i++) {
      await queue.flush((_) async { attempts++; throw Exception('offline'); });
    }
    expect(attempts, 10);
    expect((await queue.read()).single.attempts, 10);
  });

  test('can enqueue after emptying the queue', () async {
    final queue = OfflineActionQueue();
    await queue.add('message', {'content': 'Первое'});
    await queue.flush((_) async {});
    await queue.add('message', {'content': 'Второе'});
    expect((await queue.read()).single.payload['content'], 'Второе');
  });

}
