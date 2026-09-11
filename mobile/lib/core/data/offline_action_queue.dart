import 'dart:convert';

import 'package:shared_preferences/shared_preferences.dart';

class OfflineAction {
  final String id;
  final String type;
  final Map<String, dynamic> payload;
  final int attempts;
  final String createdAt;

  const OfflineAction({required this.id, required this.type, required this.payload, required this.attempts, required this.createdAt});

  factory OfflineAction.fromJson(Map<String, dynamic> json) => OfflineAction(
        id: '${json['id']}',
        type: '${json['type']}',
        payload: Map<String, dynamic>.from(json['payload'] as Map? ?? const {}),
        attempts: (json['attempts'] as num?)?.toInt() ?? 0,
        createdAt: '${json['createdAt']}',
      );

  Map<String, dynamic> toJson() => {'id': id, 'type': type, 'payload': payload, 'attempts': attempts, 'createdAt': createdAt};
  OfflineAction retried() => OfflineAction(id: id, type: type, payload: payload, attempts: attempts + 1, createdAt: createdAt);
}

class OfflineActionQueue {
  static const _storageKey = 'korshi_offline_actions_v1';

  Future<List<OfflineAction>> read() async {
    final preferences = await SharedPreferences.getInstance();
    final raw = preferences.getString(_storageKey);
    if (raw == null || raw.isEmpty) return <OfflineAction>[];
    try {
      final decoded = jsonDecode(raw) as List<dynamic>;
      return decoded.map((item) => OfflineAction.fromJson(Map<String, dynamic>.from(item as Map))).toList();
    } catch (_) {
      await preferences.remove(_storageKey);
      return <OfflineAction>[];
    }
  }

  Future<void> add(String type, Map<String, dynamic> payload) async {
    final pending = List<OfflineAction>.of(await read());
    if (pending.length >= 100) throw StateError('Очередь заполнена. Сначала отправьте сохранённые действия.');
    pending.add(OfflineAction(id: '${DateTime.now().microsecondsSinceEpoch}', type: type, payload: payload, attempts: 0, createdAt: DateTime.now().toUtc().toIso8601String()));
    await _write(pending);
  }

  Future<int> flush(Future<void> Function(OfflineAction action) sender) async {
    final pending = await read();
    final failed = <OfflineAction>[];
    var synced = 0;
    for (final action in pending) {
      if (action.attempts >= 10) {
        failed.add(action);
        continue;
      }
      try {
        await sender(action);
        synced++;
      } catch (_) {
        failed.add(action.retried());
      }
    }
    await _write(failed);
    return synced;
  }

  Future<void> _write(List<OfflineAction> actions) async {
    final preferences = await SharedPreferences.getInstance();
    await preferences.setString(_storageKey, jsonEncode(actions.map((item) => item.toJson()).toList()));
  }
}
