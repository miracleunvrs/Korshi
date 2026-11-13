import 'package:flutter/material.dart';
import 'package:file_picker/file_picker.dart';
import 'package:go_router/go_router.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../../../core/data/house_repository.dart';
import '../../../core/data/offline_action_queue.dart';
import '../../../core/data/media_limits.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/widgets/empty_state.dart';
import 'group_settings_sheet.dart';

class ChatRoomScreen extends StatefulWidget {
  final String chatId;
  final HouseRepository? repository;
  const ChatRoomScreen({super.key, required this.chatId, this.repository});
  @override
  State<ChatRoomScreen> createState() => _ChatRoomScreenState();
}

class _ChatRoomScreenState extends State<ChatRoomScreen> {
  late final repository = widget.repository ?? HouseRepository();
  final _controller = TextEditingController();
  final _scrollController = ScrollController();
  final List<Map<String, dynamic>> messages = [];
  RealtimeChannel? _syncChannel;
  bool hasError = false;
  bool _sending = false;
  bool _loadingHistory = false;
  bool _hasEarlier = false;
  String? _beforeCreatedAt;
  String? _beforeId;
  String? _historyError;
  Map<String, dynamic>? _chat;

  @override
  void initState() {
    super.initState();
    _loadMessages();
    _loadChatInfo();
    _syncChannel =
        repository.watchMessages(widget.chatId, () => _loadMessages());
  }

  Future<void> _loadChatInfo() async {
    if (!repository.isConfigured) return;
    try {
      final chat = await repository.loadChatInfo(widget.chatId);
      if (mounted) setState(() => _chat = chat);
    } catch (_) {
      // Название не критично: переписка уже загружается своим запросом.
    }
  }

  Future<void> _loadMessages({bool older = false}) async {
    if (!repository.isConfigured) return;
    if (_loadingHistory) return;
    setState(() {
      _loadingHistory = true;
      _historyError = null;
    });
    final wasEmpty = messages.isEmpty;
    final previousHeight = _scrollController.hasClients
        ? _scrollController.position.maxScrollExtent
        : 0.0;
    final previousOffset =
        _scrollController.hasClients ? _scrollController.offset : 0.0;
    try {
      final rows = await repository.loadMessages(widget.chatId,
          beforeCreatedAt: older ? _beforeCreatedAt : null,
          beforeId: older ? _beforeId : null);
      final userId = (await repository.currentUser())?.id;
      if (!mounted) return;
      setState(() {
        hasError = false;
        final mapped = rows.map((row) {
          final sender = row['sender'] is List
              ? ((row['sender'] as List).isEmpty
                  ? null
                  : (row['sender'] as List).first)
              : row['sender'];
          return <String, dynamic>{
            'id': row['id'],
            'created_at': row['created_at'],
            'text': row['is_deleted'] == true
                ? 'Сообщение удалено'
                : row['type'] == 'image'
                    ? '🖼️ Изображение'
                    : row['type'] == 'document'
                        ? '📎 Документ'
                        : row['content'] ?? '',
            'isMe': row['sender_id'] == userId,
            'time': '${row['created_at']}'.substring(11, 16),
            'sender': sender is Map ? sender['full_name'] ?? 'Сосед' : 'Сосед',
            'isOfficial': sender is Map && sender['role'] == 'hoa_official',
          };
        }).toList();
        final byId = {
          for (final message in messages.where((m) => m['id'] != null))
            message['id']: message
        };
        for (final message in mapped) {
          byId[message['id']] = message;
        }
        final persisted = byId.values.toList()
          ..sort((a, b) {
            final time = (a['created_at'] as String)
                .compareTo(b['created_at'] as String);
            return time != 0
                ? time
                : (a['id'] as String).compareTo(b['id'] as String);
          });
        final local = messages
            .where((m) =>
                m['id'] == null &&
                (m['pending'] == true ||
                    m['delivery'] == OfflineMutationDelivery.queued))
            .toList();
        messages
          ..clear()
          ..addAll(persisted)
          ..addAll(local);
        if (older || wasEmpty) {
          _hasEarlier = rows.length == HouseRepository.messagePageSize;
          if (rows.isNotEmpty) {
            _beforeCreatedAt = rows.first['created_at'] as String;
            _beforeId = rows.first['id'] as String;
          }
        }
      });
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (!mounted || !_scrollController.hasClients) return;
        if (older) {
          _scrollController.jumpTo((previousOffset +
                  _scrollController.position.maxScrollExtent -
                  previousHeight)
              .clamp(0.0, _scrollController.position.maxScrollExtent));
        } else if (wasEmpty) {
          _scrollController.jumpTo(_scrollController.position.maxScrollExtent);
        }
      });
    } catch (_) {
      if (mounted) {
        setState(() {
          hasError = messages.isEmpty;
          _historyError = 'Не удалось загрузить историю. Попробуйте ещё раз.';
        });
      }
    } finally {
      if (mounted) setState(() => _loadingHistory = false);
    }
  }

  Future<void> _send() async {
    if (_sending || _controller.text.trim().isEmpty) return;
    final draft = _controller.text;
    final text = draft.trim();
    final now = TimeOfDay.now();
    final time =
        '${now.hour.toString().padLeft(2, '0')}:${now.minute.toString().padLeft(2, '0')}';
    final message = <String, dynamic>{
      'text': text,
      'isMe': true,
      'time': time,
      'sender': 'Вы',
      'isOfficial': false,
      'pending': true,
    };
    setState(() {
      _sending = true;
      messages.add(message);
    });
    try {
      final delivery = await repository.sendMessage(widget.chatId, text);
      if (!mounted) return;
      setState(() {
        message['pending'] = false;
        message['delivery'] = delivery;
        if (_controller.text == draft) _controller.clear();
      });
      if (delivery == OfflineMutationDelivery.queued) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
              content: Text('Нет сети — сообщение сохранено для отправки')),
        );
      }
    } catch (_) {
      if (!mounted) return;
      setState(() => messages.remove(message));
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Не удалось сохранить сообщение')),
      );
    } finally {
      if (mounted) setState(() => _sending = false);
    }
    Future.delayed(const Duration(milliseconds: 100), () {
      if (mounted && _scrollController.hasClients) {
        _scrollController.animateTo(
          _scrollController.position.maxScrollExtent + 80,
          duration: const Duration(milliseconds: 250),
          curve: Curves.easeOut,
        );
      }
    });
  }

  Future<void> _pickAttachment() async {
    final result = await FilePicker.platform.pickFiles(
      withData: true,
      type: FileType.custom,
      allowedExtensions: allowedUploadExtensions.toList(),
    );
    final file = result?.files.single;
    if (file == null || file.bytes == null || !mounted) {
      return;
    }
    final extension = file.extension?.toLowerCase() ?? '';
    if (file.size > maxUploadBytes ||
        !allowedUploadExtensions.contains(extension)) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
            content:
                Text('Поддерживаются файлы JPG, PNG, WEBP и PDF до 10 МБ')),
      );
      return;
    }
    ScaffoldMessenger.of(context)
        .showSnackBar(const SnackBar(content: Text('Загружаем файл…')));
    try {
      await repository.sendAttachment(
        chatId: widget.chatId,
        fileName: file.name,
        bytes: file.bytes!,
        mimeType: mimeTypeForExtension(extension),
      );
      await _loadMessages();
    } catch (_) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Не удалось загрузить вложение')),
        );
      }
    }
  }

  @override
  void dispose() {
    if (_syncChannel != null) {
      _syncChannel!.unsubscribe();
    }
    _controller.dispose();
    _scrollController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final viewInsets = MediaQuery.of(context).viewInsets.bottom;

    return Scaffold(
      backgroundColor: isDark ? AppColors.bgDark : const Color(0xFFF8FAFC),
      resizeToAvoidBottomInset: true,
      appBar: AppBar(
        backgroundColor: isDark ? AppColors.backgroundDark : Colors.white,
        surfaceTintColor: Colors.transparent,
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back, size: 22),
          onPressed: () {
            if (context.canPop()) {
              context.pop();
            } else {
              context.go('/chats');
            }
          },
        ),
        titleSpacing: 0,
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              '${_chat?['name'] ?? ''}',
              style: TextStyle(
                fontSize: 15,
                fontWeight: FontWeight.w700,
                color: isDark ? Colors.white : const Color(0xFF0F172A),
              ),
            ),
            Text(
              _chat?['type'] == 'direct' ? 'Личный чат' : 'Чат соседей',
              style: TextStyle(
                  fontSize: 11,
                  color: AppColors.primary,
                  fontWeight: FontWeight.w500),
            ),
          ],
        ),
        actions: [
          if (_chat?['type'] == 'thematic')
            IconButton(
              tooltip: 'Настройки беседы',
              icon: const Icon(Icons.tune, size: 20, color: Color(0xFF94A3B8)),
              onPressed: () async {
                await showGroupSettings(context, repository, widget.chatId,
                    '${_chat?['name'] ?? ''}');
                _loadChatInfo();
              },
            ),
        ],
        bottom: PreferredSize(
          preferredSize: const Size.fromHeight(1),
          child: Container(
            height: 1,
            color: isDark ? AppColors.borderDark : const Color(0xFFF1F5F9),
          ),
        ),
      ),
      body: Column(
        children: [
          if (_hasEarlier)
            TextButton(
              onPressed:
                  _loadingHistory ? null : () => _loadMessages(older: true),
              child: Text(
                  _loadingHistory ? 'Загрузка…' : 'Более ранние сообщения'),
            ),
          if (_historyError != null && messages.isNotEmpty)
            Text(_historyError!, style: const TextStyle(color: Colors.red)),
          Expanded(
            child: hasError
                ? ErrorView(
                    message: 'Не удалось загрузить сообщения',
                    onRetry: _loadMessages)
                : ListView.builder(
                    controller: _scrollController,
                    padding: const EdgeInsets.fromLTRB(16, 16, 16, 16),
                    itemCount: messages.length,
                    itemBuilder: (context, index) {
                      final m = messages[index];
                      final isMe = m['isMe'] as bool;
                      final isOfficial = m['isOfficial'] as bool;
                      return Align(
                        alignment:
                            isMe ? Alignment.centerRight : Alignment.centerLeft,
                        child: Container(
                          constraints: BoxConstraints(
                              maxWidth:
                                  MediaQuery.of(context).size.width * 0.72),
                          margin: const EdgeInsets.only(bottom: 10),
                          padding: const EdgeInsets.symmetric(
                              horizontal: 14, vertical: 10),
                          decoration: BoxDecoration(
                            color: isMe
                                ? AppColors.primary
                                : (isDark
                                    ? const Color(0xFF1E293B)
                                    : Colors.white),
                            borderRadius: BorderRadius.only(
                              topLeft: const Radius.circular(18),
                              topRight: const Radius.circular(18),
                              bottomLeft: Radius.circular(isMe ? 18 : 4),
                              bottomRight: Radius.circular(isMe ? 4 : 18),
                            ),
                            boxShadow: [
                              BoxShadow(
                                color: Colors.black
                                    .withOpacity(isDark ? 0.2 : 0.04),
                                blurRadius: 8,
                                offset: const Offset(0, 2),
                              ),
                            ],
                            border: isMe
                                ? null
                                : Border.all(
                                    color: isDark
                                        ? const Color(0xFF334155)
                                        : const Color(0xFFF1F5F9),
                                  ),
                          ),
                          child: Column(
                            crossAxisAlignment: isMe
                                ? CrossAxisAlignment.end
                                : CrossAxisAlignment.start,
                            children: [
                              if (!isMe)
                                Padding(
                                  padding: const EdgeInsets.only(bottom: 4),
                                  child: Row(
                                    mainAxisSize: MainAxisSize.min,
                                    children: [
                                      Text(
                                        m['sender'] as String,
                                        style: TextStyle(
                                          fontSize: 11,
                                          fontWeight: FontWeight.w700,
                                          color: isOfficial
                                              ? AppColors.primary
                                              : const Color(0xFF64748B),
                                        ),
                                      ),
                                      if (isOfficial) ...[
                                        const SizedBox(width: 4),
                                        const Icon(Icons.verified,
                                            size: 10, color: AppColors.primary),
                                      ],
                                    ],
                                  ),
                                ),
                              Text(
                                m['text'] as String,
                                style: TextStyle(
                                  color: isMe
                                      ? Colors.white
                                      : (isDark
                                          ? const Color(0xFFE2E8F0)
                                          : const Color(0xFF0F172A)),
                                  fontSize: 14,
                                  height: 1.4,
                                ),
                              ),
                              const SizedBox(height: 4),
                              Row(
                                mainAxisSize: MainAxisSize.min,
                                children: [
                                  Text(
                                    m['time'] as String,
                                    style: TextStyle(
                                      fontSize: 10,
                                      color: isMe
                                          ? Colors.white70
                                          : const Color(0xFF94A3B8),
                                    ),
                                  ),
                                  if (isMe) ...[
                                    const SizedBox(width: 4),
                                    Icon(
                                      m['pending'] == true
                                          ? Icons.hourglass_top
                                          : m['delivery'] ==
                                                  OfflineMutationDelivery.queued
                                              ? Icons.schedule
                                              : Icons.done_all,
                                      size: 12,
                                      color: Colors.white70,
                                    ),
                                  ],
                                ],
                              ),
                            ],
                          ),
                        ),
                      );
                    },
                  ),
          ),
          // Input — с учётом клавиатуры и SafeArea
          Container(
            decoration: BoxDecoration(
              color: isDark ? AppColors.backgroundDark : Colors.white,
              border: Border(
                top: BorderSide(
                    color: isDark
                        ? AppColors.borderDark
                        : const Color(0xFFF1F5F9)),
              ),
              boxShadow: const [
                BoxShadow(
                    color: Color(0x08000000),
                    blurRadius: 12,
                    offset: Offset(0, -2)),
              ],
            ),
            padding: EdgeInsets.fromLTRB(
              12,
              10,
              12,
              10 + (viewInsets > 0 ? 0 : MediaQuery.of(context).padding.bottom),
            ),
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.end,
              children: [
                IconButton(
                  icon: const Icon(Icons.add_circle_outline,
                      size: 22, color: Color(0xFF94A3B8)),
                  onPressed: _pickAttachment,
                  visualDensity: VisualDensity.compact,
                ),
                Expanded(
                  child: TextField(
                    controller: _controller,
                    minLines: 1,
                    maxLines: 4,
                    textCapitalization: TextCapitalization.sentences,
                    decoration: InputDecoration(
                      hintText: 'Написать сообщение...',
                      hintStyle: const TextStyle(
                          color: Color(0xFF94A3B8), fontSize: 14),
                      filled: true,
                      fillColor: isDark
                          ? AppColors.secondaryDark
                          : const Color(0xFFF1F5F9),
                      border: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(24),
                        borderSide: BorderSide.none,
                      ),
                      contentPadding: const EdgeInsets.symmetric(
                          horizontal: 16, vertical: 10),
                      isDense: true,
                    ),
                    style: TextStyle(
                      fontSize: 14,
                      color: isDark ? Colors.white : const Color(0xFF0F172A),
                    ),
                    onSubmitted: (_) => _send(),
                  ),
                ),
                const SizedBox(width: 8),
                ValueListenableBuilder<TextEditingValue>(
                  valueListenable: _controller,
                  builder: (_, val, __) {
                    final hasText = val.text.trim().isNotEmpty;
                    return Container(
                      width: 44,
                      height: 44,
                      decoration: BoxDecoration(
                        color: hasText
                            ? AppColors.primary
                            : const Color(0xFFE2E8F0),
                        shape: BoxShape.circle,
                      ),
                      child: IconButton(
                        icon: Icon(
                          Icons.send,
                          size: 18,
                          color:
                              hasText ? Colors.white : const Color(0xFF94A3B8),
                        ),
                        onPressed: hasText && !_sending ? _send : null,
                      ),
                    );
                  },
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
