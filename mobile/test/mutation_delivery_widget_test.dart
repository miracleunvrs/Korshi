import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:housesm_mobile/core/data/house_repository.dart';
import 'package:housesm_mobile/core/data/offline_action_queue.dart';
import 'package:housesm_mobile/features/chats/presentation/chat_room_screen.dart';
import 'package:housesm_mobile/features/classifieds/presentation/classifieds_screen.dart';
import 'package:housesm_mobile/features/profile/presentation/profile_screen.dart';

class _MessageRepository extends HouseRepository {
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
  testWidgets('payment history does not invent a paid contribution', (tester) async {
    await tester.pumpWidget(const MaterialApp(home: ProfileScreen()));
    await tester.ensureVisible(find.text('История платежей и сборов'));
    await tester.pumpAndSettle();
    await tester.tap(find.text('История платежей и сборов'));
    await tester.pumpAndSettle();
    expect(find.textContaining('История личных взносов пока не подключена'), findsOneWidget);
    expect(find.text('+ 5 000 ₸'), findsNothing);
    expect(tester.takeException(), isNull);
  });

  testWidgets('rejecting a message removes its bubble and preserves the draft',
      (tester) async {
    final repository = _MessageRepository();
    await tester.pumpWidget(MaterialApp(
      home: ChatRoomScreen(chatId: 'test', repository: repository),
    ));
    await tester.enterText(find.byType(TextField), 'Неотправленное сообщение');
    await tester.pump();
    await tester.tap(find.byIcon(Icons.send));
    await tester.pump();

    expect(find.byIcon(Icons.hourglass_top), findsOneWidget);
    expect(find.byIcon(Icons.done_all), findsNothing);
    await tester.testTextInput.receiveAction(TextInputAction.done);
    expect(repository.sendCount, 1);

    repository.response.completeError(Exception('Нет доступа к чату'));
    await tester.pumpAndSettle();

    expect(find.text('Не удалось сохранить сообщение'), findsOneWidget);
    expect(find.byIcon(Icons.hourglass_top), findsNothing);
    expect(find.byIcon(Icons.done_all), findsNothing);
    expect(find.text('Неотправленное сообщение'), findsOneWidget);
    expect(tester.widget<TextField>(find.byType(TextField)).controller!.text,
        'Неотправленное сообщение');
  });

  testWidgets('queued messages are not marked as delivered', (tester) async {
    final repository = _MessageRepository();
    await tester.pumpWidget(MaterialApp(
      home: ChatRoomScreen(chatId: 'test', repository: repository),
    ));
    await tester.enterText(find.byType(TextField), 'Сообщение без сети');
    await tester.pump();
    await tester.tap(find.byIcon(Icons.send));
    repository.response.complete(OfflineMutationDelivery.queued);
    await tester.pumpAndSettle();

    expect(find.text('Сообщение без сети'), findsOneWidget);
    expect(find.byIcon(Icons.schedule), findsOneWidget);
    expect(find.byIcon(Icons.done_all), findsNothing);
    expect(
        tester.widget<TextField>(find.byType(TextField)).controller!.text, '');
  });

  testWidgets('a successful send does not erase a newer draft', (tester) async {
    final repository = _MessageRepository();
    await tester.pumpWidget(MaterialApp(
      home: ChatRoomScreen(chatId: 'test', repository: repository),
    ));
    await tester.enterText(find.byType(TextField), 'Первое сообщение');
    await tester.pump();
    await tester.tap(find.byIcon(Icons.send));
    await tester.enterText(find.byType(TextField), 'Следующий черновик');
    repository.response.complete(OfflineMutationDelivery.sent);
    await tester.pumpAndSettle();

    expect(find.byIcon(Icons.done_all), findsOneWidget);
    expect(tester.widget<TextField>(find.byType(TextField)).controller!.text,
        'Следующий черновик');
  });

  testWidgets('cancelling a classified closes the form without a type error',
      (tester) async {
    await tester.pumpWidget(const MaterialApp(home: ClassifiedsScreen()));
    await tester.tap(find.text('Подать'));
    await tester.pump(const Duration(milliseconds: 300));
    await tester.enterText(find.byType(TextField).at(1), 'Черновик');
    await tester.tap(find.text('Отмена'));
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 300));

    expect(find.text('Новое объявление'), findsNothing);
    expect(tester.takeException(), isNull);
  });
}
