import 'dart:async';
import 'dart:convert';
import 'dart:io';

import 'package:shared_preferences/shared_preferences.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:synchronized/synchronized.dart';

enum OfflineFailureKind { transient, permanent }

enum OfflineActionStatus { pending, blocked }

enum OfflineMutationDelivery { sent, queued }

OfflineFailureKind classifyOfflineFailure(Object error) {
  if (error is TimeoutException ||
      error is SocketException ||
      error is AuthRetryableFetchException) {
    return OfflineFailureKind.transient;
  }
  if (error is PostgrestException) {
    final code = error.code ?? '';
    final httpStatus = int.tryParse(code);
    if (code.startsWith('08') ||
        code == 'PGRST000' ||
        code == 'PGRST001' ||
        code == 'PGRST002' ||
        (code.length == 3 && httpStatus != null && httpStatus >= 500)) {
      return OfflineFailureKind.transient;
    }
    return OfflineFailureKind.permanent;
  }
  if (error is AuthException) return OfflineFailureKind.permanent;
  if (RegExp(r'network|timeout|timed out|socket|connection|offline',
          caseSensitive: false)
      .hasMatch('$error')) {
    return OfflineFailureKind.transient;
  }
  return OfflineFailureKind.permanent;
}

class OfflineAction {
  static const _transientError =
      'Нет соединения с сервером. Повторим отправку позже.';
  final String id;
  final String type;
  final Map<String, dynamic> payload;
  final String userId;
  final String complexId;
  final int attempts;
  final OfflineActionStatus status;
  final String? error;
  final String createdAt;
  final DateTime? nextAttemptAt;

  const OfflineAction({
    required this.id,
    required this.type,
    required this.payload,
    this.userId = '',
    this.complexId = '',
    required this.attempts,
    this.status = OfflineActionStatus.pending,
    this.error,
    required this.createdAt,
    this.nextAttemptAt,
  });

  factory OfflineAction.fromJson(Map<String, dynamic> json) => OfflineAction(
        id: '${json['id']}',
        type: '${json['type']}',
        payload: Map<String, dynamic>.from(json['payload'] as Map? ?? const {}),
        userId: '${json['userId'] ?? ''}',
        complexId: '${json['complexId'] ?? ''}',
        attempts: (json['attempts'] as num?)?.toInt() ?? 0,
        // Earlier versions blocked transient failures after ten attempts.
        status: json['status'] == OfflineActionStatus.blocked.name &&
                json['error'] != _transientError
            ? OfflineActionStatus.blocked
            : OfflineActionStatus.pending,
        error: json['error'] as String?,
        createdAt: '${json['createdAt']}',
        nextAttemptAt: DateTime.tryParse('${json['nextAttemptAt'] ?? ''}'),
      );

  Map<String, dynamic> toJson() => {
        'id': id,
        'type': type,
        'payload': payload,
        'userId': userId,
        'complexId': complexId,
        'attempts': attempts,
        'status': status.name,
        'error': error,
        'createdAt': createdAt,
        'nextAttemptAt': nextAttemptAt?.toUtc().toIso8601String(),
      };

  bool belongsTo({String? userId, String? complexId}) {
    if (userId == null) return true;
    // Legacy entries have no metadata, but their immutable row payload still
    // identifies the owner. Never assign an ownerless action to whoever logs in.
    final ownerField = switch (type) {
      'message' => 'sender_id',
      'service_request' => 'created_by',
      'classified' => 'author_id',
      _ => '',
    };
    final owner =
        this.userId.isNotEmpty ? this.userId : '${payload[ownerField] ?? ''}';
    if (owner.isEmpty || owner != userId) return false;
    final scope = this.complexId.isNotEmpty
        ? this.complexId
        : '${payload['complex_id'] ?? ''}';
    return complexId == null ||
        (scope.isEmpty && type == 'message') ||
        scope == complexId;
  }

  OfflineAction afterFailure(Object cause, DateTime now) {
    final nextAttempts = attempts + 1;
    final permanent =
        classifyOfflineFailure(cause) == OfflineFailureKind.permanent;
    return OfflineAction(
      id: id,
      type: type,
      payload: payload,
      userId: userId,
      complexId: complexId,
      attempts: nextAttempts,
      status:
          permanent ? OfflineActionStatus.blocked : OfflineActionStatus.pending,
      error: permanent
          ? 'Сервер отклонил действие. Проверьте данные или права доступа.'
          : _transientError,
      createdAt: createdAt,
      nextAttemptAt: permanent
          ? null
          : now.add(
              Duration(seconds: 15 * (1 << (nextAttempts - 1).clamp(0, 5)))),
    );
  }
}

class OfflineActionQueue {
  static const _storageKey = 'korshi_offline_actions_v1';
  static final Lock _storageLock = Lock();
  static Future<int>? _flushInFlight;
  final DateTime Function() _now;

  OfflineActionQueue({DateTime Function()? now}) : _now = now ?? DateTime.now;

  Future<List<OfflineAction>> read() =>
      _storageLock.synchronized(_readUnlocked);

  Future<List<OfflineAction>> _readUnlocked() async {
    final preferences = await SharedPreferences.getInstance();
    final raw = preferences.getString(_storageKey);
    if (raw == null || raw.isEmpty) return <OfflineAction>[];
    try {
      final decoded = jsonDecode(raw) as List<dynamic>;
      return decoded
          .map((item) =>
              OfflineAction.fromJson(Map<String, dynamic>.from(item as Map)))
          .toList();
    } catch (_) {
      // Preserve the original bytes for recovery; an empty queue would let the
      // next write silently overwrite every unsent action.
      throw const FormatException('Не удалось прочитать сохранённые действия.');
    }
  }

  Future<void> add(
    String type,
    Map<String, dynamic> payload, {
    String userId = '',
    String complexId = '',
  }) =>
      _storageLock.synchronized(() async {
        final pending = List<OfflineAction>.of(await _readUnlocked());
        if (pending.length >= 100) {
          throw StateError(
              'Очередь заполнена. Сначала отправьте сохранённые действия.');
        }
        pending.add(OfflineAction(
            id: '${DateTime.now().microsecondsSinceEpoch}',
            type: type,
            payload: payload,
            userId: userId,
            complexId: complexId,
            attempts: 0,
            status: OfflineActionStatus.pending,
            createdAt: DateTime.now().toUtc().toIso8601String()));
        await _writeUnlocked(pending);
      });

  Future<int> flush(
    Future<void> Function(OfflineAction action) sender, {
    String? userId,
    String? complexId,
    bool Function()? canContinue,
  }) async {
    final inFlight = _flushInFlight;
    if (inFlight != null) return inFlight;
    final future = _flush(sender,
        userId: userId, complexId: complexId, canContinue: canContinue);
    _flushInFlight = future;
    try {
      return await future;
    } finally {
      if (identical(_flushInFlight, future)) _flushInFlight = null;
    }
  }

  Future<int> _flush(
    Future<void> Function(OfflineAction action) sender, {
    String? userId,
    String? complexId,
    bool Function()? canContinue,
  }) async {
    final pending = await read();
    var synced = 0;
    for (final action in pending) {
      if (canContinue != null && !canContinue()) break;
      if (!action.belongsTo(userId: userId, complexId: complexId)) continue;
      if (action.status == OfflineActionStatus.blocked ||
          (action.nextAttemptAt?.isAfter(_now()) ?? false)) {
        continue;
      }
      try {
        await sender(action);
        synced++;
        await _updateAction(action.id, (_) => null);
      } catch (error) {
        // An account switch can reject an in-flight request. Leave it pending
        // for its owner instead of permanently blocking it under the new login.
        if (canContinue != null && !canContinue()) break;
        await _updateAction(
            action.id, (current) => current.afterFailure(error, _now()));
      }
    }
    return synced;
  }

  Future<void> _updateAction(
      String id, OfflineAction? Function(OfflineAction action) update) {
    return _storageLock.synchronized(() async {
      final current = await _readUnlocked();
      final next = <OfflineAction>[];
      for (final action in current) {
        if (action.id != id) {
          next.add(action);
          continue;
        }
        final changed = update(action);
        if (changed != null) next.add(changed);
      }
      await _writeUnlocked(next);
    });
  }

  Future<void> _writeUnlocked(List<OfflineAction> actions) async {
    final preferences = await SharedPreferences.getInstance();
    final saved = await preferences.setString(
        _storageKey, jsonEncode(actions.map((item) => item.toJson()).toList()));
    if (!saved) {
      throw StateError('Не удалось сохранить действие на устройстве.');
    }
  }
}
