import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../../core/data/house_repository.dart';

/// Настройки беседы: участники, название, выход и удаление.
Future<void> showGroupSettings(BuildContext context, HouseRepository repository,
    String chatId, String name) {
  return showModalBottomSheet<void>(
    context: context,
    isScrollControlled: true,
    builder: (_) => _GroupSettings(
        repository: repository,
        chatId: chatId,
        name: name,
        routeContext: context),
  );
}

class _GroupSettings extends StatefulWidget {
  const _GroupSettings(
      {required this.repository,
      required this.chatId,
      required this.name,
      required this.routeContext});
  final HouseRepository repository;
  final String chatId;
  final String name;
  final BuildContext routeContext;

  @override
  State<_GroupSettings> createState() => _GroupSettingsState();
}

class _GroupSettingsState extends State<_GroupSettings> {
  late final _title = TextEditingController(text: widget.name);
  List<Map<String, dynamic>> members = [];
  List<Map<String, dynamic>> neighbours = [];
  bool isAdmin = false;
  bool busy = false;
  String? error;

  @override
  void initState() {
    super.initState();
    _load();
  }

  @override
  void dispose() {
    _title.dispose();
    super.dispose();
  }

  Future<void> _load() async {
    try {
      final group = await widget.repository.loadGroupMembers(widget.chatId);
      final people = await widget.repository.loadNeighbours();
      if (!mounted) return;
      setState(() {
        members = group.members;
        isAdmin = group.isAdmin;
        neighbours = people;
      });
    } catch (cause) {
      if (mounted) {
        setState(() => error = 'Не удалось загрузить участников: $cause');
      }
    }
  }

  Future<void> _run(String action,
      {String? name, List<String> memberIds = const []}) async {
    final router = GoRouter.of(widget.routeContext);
    setState(() {
      busy = true;
      error = null;
    });
    try {
      await widget.repository.manageGroupChat(widget.chatId, action,
          name: name, memberIds: memberIds);
      if (!mounted) return;
      if (action == 'leave' || action == 'delete') {
        Navigator.of(context).pop();
        router.go('/chats');
        return;
      }
      await _load();
    } catch (cause) {
      if (mounted) setState(() => error = '$cause');
    } finally {
      if (mounted) setState(() => busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final memberIds = members.map((m) => m['user_id']).toSet();
    final candidates =
        neighbours.where((n) => !memberIds.contains(n['id'])).toList();
    return SafeArea(
      child: Padding(
        padding: EdgeInsets.fromLTRB(
            16, 16, 16, 16 + MediaQuery.of(context).viewInsets.bottom),
        child: ListView(
          shrinkWrap: true,
          children: [
            const Text('Беседа',
                style: TextStyle(fontSize: 18, fontWeight: FontWeight.w800)),
            if (error != null)
              Text(error!, style: const TextStyle(color: Colors.red)),
            if (isAdmin)
              Row(children: [
                Expanded(
                  child: TextField(
                      controller: _title,
                      maxLength: 80,
                      decoration: const InputDecoration(labelText: 'Название')),
                ),
                TextButton(
                  onPressed: busy
                      ? null
                      : () => _run('rename', name: _title.text.trim()),
                  child: const Text('Сохранить'),
                ),
              ]),
            const SizedBox(height: 8),
            Text('Участники · ${members.length}',
                style: const TextStyle(fontWeight: FontWeight.w700)),
            for (final member in members)
              ListTile(
                dense: true,
                contentPadding: EdgeInsets.zero,
                title: Text(
                    '${(member['user'] as Map?)?['full_name'] ?? 'Без имени'}'
                    '${member['role'] == 'admin' ? ' · админ' : ''}'),
                trailing: isAdmin && member['role'] != 'admin'
                    ? TextButton(
                        onPressed: busy
                            ? null
                            : () => _run('remove',
                                memberIds: [member['user_id'] as String]),
                        child: const Text('Убрать'))
                    : null,
              ),
            if (isAdmin && candidates.isNotEmpty) ...[
              const SizedBox(height: 8),
              const Text('Добавить соседей',
                  style: TextStyle(fontWeight: FontWeight.w700)),
              for (final n in candidates)
                ListTile(
                  dense: true,
                  contentPadding: EdgeInsets.zero,
                  title: Text('${n['full_name'] ?? 'Без имени'}'),
                  trailing: TextButton(
                      onPressed: busy
                          ? null
                          : () => _run('add', memberIds: [n['id'] as String]),
                      child: const Text('Добавить')),
                ),
            ],
            const SizedBox(height: 12),
            OutlinedButton(
                onPressed: busy ? null : () => _run('leave'),
                child: const Text('Выйти из беседы')),
            if (isAdmin)
              TextButton(
                onPressed: busy
                    ? null
                    : () async {
                        final ok = await showDialog<bool>(
                          context: context,
                          builder: (dialog) => AlertDialog(
                            title: const Text('Удалить беседу для всех?'),
                            actions: [
                              TextButton(
                                  onPressed: () => Navigator.pop(dialog, false),
                                  child: const Text('Отмена')),
                              TextButton(
                                  onPressed: () => Navigator.pop(dialog, true),
                                  child: const Text('Удалить')),
                            ],
                          ),
                        );
                        if (ok == true) await _run('delete');
                      },
                child: const Text('Удалить беседу',
                    style: TextStyle(color: Colors.red)),
              ),
          ],
        ),
      ),
    );
  }
}
