import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../../core/data/house_repository.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/widgets/app_avatar.dart';

/// Как в Telegram: нажать на соседа — личный чат, «Создать беседу» — группа.
class NewChatScreen extends StatefulWidget {
  const NewChatScreen({super.key, this.repository});
  final HouseRepository? repository;

  @override
  State<NewChatScreen> createState() => _NewChatScreenState();
}

class _NewChatScreenState extends State<NewChatScreen> {
  late final repository = widget.repository ?? HouseRepository();
  final _name = TextEditingController();
  List<Map<String, dynamic>>? neighbours;
  final selected = <String>{};
  String query = '';
  bool groupMode = false;
  bool busy = false;
  String? error;

  @override
  void initState() {
    super.initState();
    repository.loadNeighbours().then((rows) {
      if (mounted) setState(() => neighbours = rows);
    }).catchError((Object cause) {
      if (mounted) {
        setState(() {
          neighbours = [];
          error = 'Не удалось загрузить соседей: $cause';
        });
      }
    });
  }

  @override
  void dispose() {
    _name.dispose();
    super.dispose();
  }

  Future<void> _run(Future<String> Function() action) async {
    setState(() {
      busy = true;
      error = null;
    });
    try {
      final chatId = await action();
      if (mounted) context.pushReplacement('/chats/$chatId');
    } catch (cause) {
      if (mounted) {
        setState(() {
          busy = false;
          error = '$cause';
        });
      }
    }
  }

  void _createGroup() {
    final name = _name.text.trim();
    if (name.length < 2) {
      setState(() => error = 'Название беседы — минимум 2 символа');
      return;
    }
    _run(() => repository.createGroupChat(name, selected.toList()));
  }

  @override
  Widget build(BuildContext context) {
    final visible = (neighbours ?? [])
        .where((n) => '${n['full_name'] ?? ''}'
            .toLowerCase()
            .contains(query.trim().toLowerCase()))
        .toList();

    return Scaffold(
      appBar: AppBar(title: Text(groupMode ? 'Новая беседа' : 'Новый чат')),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          TextField(
            onChanged: (value) => setState(() => query = value),
            decoration: const InputDecoration(
              hintText: 'Поиск по соседям',
              prefixIcon: Icon(Icons.search, size: 18),
              isDense: true,
            ),
          ),
          const SizedBox(height: 12),
          if (groupMode) ...[
            TextField(
              controller: _name,
              maxLength: 80,
              decoration: const InputDecoration(labelText: 'Название беседы'),
            ),
            Row(children: [
              Expanded(
                child: FilledButton(
                  onPressed: busy ? null : _createGroup,
                  child: Text(busy
                      ? 'Создаём…'
                      : 'Создать · участников ${selected.length + 1}'),
                ),
              ),
              TextButton(
                onPressed: () => setState(() {
                  groupMode = false;
                  selected.clear();
                }),
                child: const Text('Отмена'),
              ),
            ]),
          ] else
            ListTile(
              contentPadding: EdgeInsets.zero,
              leading: const CircleAvatar(
                backgroundColor: AppColors.primaryLight,
                child: Icon(Icons.group, color: AppColors.primary),
              ),
              title: const Text('Создать беседу',
                  style: TextStyle(
                      fontWeight: FontWeight.w700, color: AppColors.primary)),
              onTap: () => setState(() => groupMode = true),
            ),
          if (error != null)
            Padding(
              padding: const EdgeInsets.only(top: 8),
              child: Text(error!, style: const TextStyle(color: Colors.red)),
            ),
          const SizedBox(height: 12),
          const Text('СОСЕДИ ПО ЖК',
              style: TextStyle(
                  fontSize: 11,
                  fontWeight: FontWeight.w700,
                  color: Color(0xFF94A3B8))),
          if (neighbours == null)
            const Padding(
              padding: EdgeInsets.all(16),
              child: Center(child: CircularProgressIndicator()),
            )
          else if (visible.isEmpty)
            Padding(
              padding: const EdgeInsets.symmetric(vertical: 12),
              child: Text(neighbours!.isEmpty
                  ? 'Пока некому написать: подтверждённых соседей ещё нет. Беседу можно создать и без участников.'
                  : 'Никого не нашли.'),
            )
          else
            for (final n in visible)
              ListTile(
                contentPadding: EdgeInsets.zero,
                enabled: !busy,
                leading: AppAvatar(
                  imageUrl: n['avatar_url'] as String?,
                  fallback: '${n['full_name'] ?? '?'}'.characters.first,
                ),
                title: Text('${n['full_name'] ?? 'Без имени'}'),
                trailing: groupMode
                    ? Checkbox(
                        value: selected.contains(n['id']),
                        onChanged: (_) =>
                            setState(() => _toggle(n['id'] as String)),
                      )
                    : null,
                onTap: () => groupMode
                    ? setState(() => _toggle(n['id'] as String))
                    : _run(
                        () => repository.createDirectChat(n['id'] as String)),
              ),
        ],
      ),
    );
  }

  void _toggle(String id) {
    if (!selected.remove(id)) selected.add(id);
  }
}
