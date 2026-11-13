import 'package:file_picker/file_picker.dart';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../../core/data/avatar_image.dart';
import '../../../core/data/house_repository.dart';
import '../../../core/widgets/app_avatar.dart';

const _channels = [
  ('push', 'Push-уведомления', 'Сообщения, заявки и ответы ОСИ'),
  ('voting', 'Голосования', 'Новые голосования и итоги'),
  ('payments', 'Сборы и платежи', 'Новые сборы и подтверждения оплат'),
  ('email_critical', 'Важное на email', 'Аварии и отключения'),
  ('sms_critical', 'Важное по SMS', 'Аварии и отключения'),
];

/// Настройки: профиль и аватар, уведомления, пароль, выход.
class SettingsScreen extends StatefulWidget {
  const SettingsScreen({super.key});

  @override
  State<SettingsScreen> createState() => _SettingsScreenState();
}

class _SettingsScreenState extends State<SettingsScreen> {
  final repository = HouseRepository();
  final _name = TextEditingController();
  final _phone = TextEditingController();
  final _bio = TextEditingController();
  final _password = TextEditingController();
  String avatarUrl = '';
  String email = '';
  Map<String, bool> channels = {};
  bool loading = true;
  bool busy = false;

  @override
  void initState() {
    super.initState();
    _load();
  }

  @override
  void dispose() {
    for (final controller in [_name, _phone, _bio, _password]) {
      controller.dispose();
    }
    super.dispose();
  }

  void _say(String text) =>
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(text)));

  Future<void> _load() async {
    try {
      final profile = await repository.loadProfile();
      final prefs = await repository.loadNotificationPreferences();
      final user = await repository.currentUser();
      if (!mounted) return;
      setState(() {
        _name.text = '${profile?['full_name'] ?? ''}';
        _phone.text = '${profile?['phone'] ?? ''}';
        _bio.text = '${profile?['bio'] ?? ''}';
        avatarUrl = '${profile?['avatar_url'] ?? ''}';
        email = user?.email ?? '';
        channels = {for (final c in _channels) c.$1: prefs?[c.$1] == true};
        loading = false;
      });
    } catch (cause) {
      if (!mounted) return;
      setState(() => loading = false);
      _say('Не удалось загрузить настройки: $cause');
    }
  }

  Future<void> _guard(Future<void> Function() action, String done) async {
    setState(() => busy = true);
    try {
      await action();
      if (mounted) _say(done);
    } catch (cause) {
      if (mounted) _say('$cause');
    } finally {
      if (mounted) setState(() => busy = false);
    }
  }

  Future<void> _changeAvatar() async {
    final picked = await FilePicker.platform
        .pickFiles(type: FileType.image, withData: true);
    final bytes = picked?.files.single.bytes;
    if (bytes == null) return;
    await _guard(() async {
      final url = await repository.uploadAvatar(await squareAvatarPng(bytes));
      if (mounted) setState(() => avatarUrl = url);
    }, 'Аватар обновлён');
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Настройки')),
      body: loading
          ? const Center(child: CircularProgressIndicator())
          : ListView(
              padding: const EdgeInsets.all(16),
              children: [
                const _Header('Профиль'),
                ListTile(
                  contentPadding: EdgeInsets.zero,
                  leading: AppAvatar(
                    imageUrl: avatarUrl,
                    fallback:
                        _name.text.isEmpty ? '?' : _name.text.characters.first,
                    size: 56,
                  ),
                  title: Text(busy ? 'Загрузка…' : 'Сменить аватар'),
                  onTap: busy ? null : _changeAvatar,
                ),
                TextField(
                    controller: _name,
                    decoration: const InputDecoration(labelText: 'Имя')),
                TextField(
                    controller: _phone,
                    keyboardType: TextInputType.phone,
                    decoration: const InputDecoration(labelText: 'Телефон')),
                TextField(
                    controller: _bio,
                    maxLength: 300,
                    decoration: const InputDecoration(labelText: 'О себе')),
                Align(
                  alignment: Alignment.centerLeft,
                  child: FilledButton(
                    onPressed: busy
                        ? null
                        : () {
                            if (_name.text.trim().length < 2) {
                              _say('Укажите имя');
                              return;
                            }
                            _guard(
                                () => repository.updateProfile(
                                    fullName: _name.text,
                                    phone: _phone.text,
                                    bio: _bio.text),
                                'Профиль сохранён');
                          },
                    child: const Text('Сохранить'),
                  ),
                ),
                const _Header('Уведомления'),
                for (final c in _channels)
                  SwitchListTile(
                    contentPadding: EdgeInsets.zero,
                    title: Text(c.$2),
                    subtitle: Text(c.$3),
                    value: channels[c.$1] ?? false,
                    onChanged: busy
                        ? null
                        : (value) => _guard(() async {
                              await repository.saveNotificationPreference(
                                  c.$1, value);
                              if (mounted) {
                                setState(() => channels[c.$1] = value);
                              }
                            }, 'Сохранено'),
                  ),
                const _Header('Безопасность'),
                Text('Вход: $email'),
                Row(children: [
                  Expanded(
                    child: TextField(
                      controller: _password,
                      obscureText: true,
                      autofillHints: const [AutofillHints.newPassword],
                      decoration:
                          const InputDecoration(labelText: 'Новый пароль'),
                    ),
                  ),
                  TextButton(
                    onPressed: busy
                        ? null
                        : () {
                            if (_password.text.length < 8) {
                              _say('Пароль — минимум 8 символов');
                              return;
                            }
                            final password = _password.text;
                            _password.clear();
                            _guard(() => repository.changePassword(password),
                                'Пароль изменён');
                          },
                    child: const Text('Сменить'),
                  ),
                ]),
                const SizedBox(height: 24),
                TextButton.icon(
                  onPressed: () async {
                    await repository.signOut();
                    if (context.mounted) context.go('/login');
                  },
                  icon: const Icon(Icons.logout, color: Colors.redAccent),
                  label: const Text('Выйти из аккаунта',
                      style: TextStyle(color: Colors.redAccent)),
                ),
              ],
            ),
    );
  }
}

class _Header extends StatelessWidget {
  const _Header(this.text);
  final String text;

  @override
  Widget build(BuildContext context) => Padding(
        padding: const EdgeInsets.only(top: 20, bottom: 4),
        child: Text(text,
            style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w800)),
      );
}
