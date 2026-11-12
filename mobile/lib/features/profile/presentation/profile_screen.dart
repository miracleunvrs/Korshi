import 'package:cached_network_image/cached_network_image.dart';
import 'package:file_picker/file_picker.dart';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../../core/data/house_repository.dart';
import '../../../core/data/media_limits.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_radius.dart';
import '../../../core/widgets/empty_state.dart';

class ProfileScreen extends StatefulWidget {
  const ProfileScreen({super.key});
  @override
  State<ProfileScreen> createState() => _ProfileScreenState();
}

class _ProfileScreenState extends State<ProfileScreen> {
  final _repository = HouseRepository();
  String fullName = '';
  String phone = '';
  String building = '—';
  String apartment = '—';
  bool verified = false;
  String avatarUrl = '';
  String? activeModal;
  bool hasError = false;
  // Последняя заявка на подтверждение документами: pending / rejected / approved.
  String? requestStatus;
  String? requestReason;

  @override
  void initState() {
    super.initState();
    _loadRemoteProfile();
  }

  Future<void> _loadRemoteProfile() async {
    if (!_repository.isConfigured) return;
    try {
      final profile = await _repository.loadProfile();
      if (!mounted || profile == null) return;
      Map<String, dynamic>? asMap(dynamic value) =>
          value is Map ? Map<String, dynamic>.from(value) : null;
      final apartmentData = asMap(profile['apartment']);
      final entrance = asMap(apartmentData?['entrance']);
      final buildingData = asMap(entrance?['building']);
      setState(() {
        hasError = false;
        fullName = profile['full_name'] ?? fullName;
        phone = profile['phone'] ?? phone;
        avatarUrl = profile['avatar_url'] ?? avatarUrl;
        verified = profile['verified'] == true;
        apartment = apartmentData?['number']?.toString() ?? apartment;
        building = buildingData?['number']?.toString() ?? building;
      });
    } catch (_) {
      if (mounted) setState(() => hasError = true);
    }
    if (verified) return;
    try {
      final request = await _repository.loadLatestVerificationRequest();
      if (!mounted) return;
      setState(() {
        requestStatus = request?['status']?.toString();
        requestReason = request?['review_reason']?.toString();
      });
    } catch (_) {
      // Статус заявки необязателен для экрана профиля.
    }
  }

  String get _unverifiedHint {
    if (requestStatus == 'pending') {
      return 'Документы на проверке у управления ЖК';
    }
    if (requestStatus == 'rejected') {
      final reason = requestReason?.trim() ?? '';
      return reason.isEmpty
          ? 'Заявка отклонена. Отправьте документы повторно'
          : 'Заявка отклонена: $reason';
    }
    return 'Введите код от ОСИ или отправьте документы';
  }

  void _openDocumentSheet() {
    final buildingCtrl =
        TextEditingController(text: building == '—' ? '' : building);
    final entranceCtrl = TextEditingController();
    final apartmentCtrl =
        TextEditingController(text: apartment == '—' ? '' : apartment);
    PlatformFile? document;
    String? error;
    var busy = false;
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) => StatefulBuilder(builder: (ctx, setSheetState) {
        final isDark = Theme.of(ctx).brightness == Brightness.dark;
        Future<void> pick() async {
          final result = await FilePicker.platform.pickFiles(
            withData: true,
            type: FileType.custom,
            allowedExtensions: allowedUploadExtensions.toList(),
          );
          final file = result?.files.single;
          if (file == null || file.bytes == null) return;
          final extension = file.extension?.toLowerCase() ?? '';
          setSheetState(() {
            if (file.size > maxUploadBytes ||
                !allowedUploadExtensions.contains(extension)) {
              error = 'Поддерживаются файлы JPG, PNG, WEBP и PDF до 10 МБ';
              document = null;
            } else {
              error = null;
              document = file;
            }
          });
        }

        Future<void> submit() async {
          final entrance = int.tryParse(entranceCtrl.text.trim()) ?? 0;
          if (buildingCtrl.text.trim().isEmpty ||
              apartmentCtrl.text.trim().isEmpty ||
              entrance <= 0) {
            setSheetState(() => error = 'Укажите дом, подъезд и квартиру');
            return;
          }
          final file = document;
          if (file == null) {
            setSheetState(() => error = 'Выберите документ');
            return;
          }
          setSheetState(() {
            busy = true;
            error = null;
          });
          try {
            await _repository.submitVerificationDocument(
              fullName: fullName,
              phone: phone,
              buildingNumber: buildingCtrl.text.trim(),
              entranceNumber: entrance,
              apartmentNumber: apartmentCtrl.text.trim(),
              fileName: file.name,
              bytes: file.bytes!,
            );
            if (ctx.mounted) Navigator.pop(ctx);
            if (mounted) {
              setState(() {
                requestStatus = 'pending';
                requestReason = null;
              });
              ScaffoldMessenger.of(context).showSnackBar(const SnackBar(
                  content: Text('Документы отправлены управлению ЖК')));
            }
          } catch (cause) {
            final message = '$cause';
            setSheetState(() => error = message.contains('уже есть заявка')
                ? 'У вас уже есть заявка на проверке. Дождитесь решения управления.'
                : 'Не удалось отправить документы. Попробуйте ещё раз.');
          } finally {
            if (ctx.mounted) setSheetState(() => busy = false);
          }
        }

        InputDecoration field(String label) => InputDecoration(
              labelText: label,
              border:
                  OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
            );

        return Container(
          padding:
              EdgeInsets.only(bottom: MediaQuery.of(ctx).viewInsets.bottom),
          decoration: BoxDecoration(
            color: isDark ? const Color(0xFF1C1C1E) : Colors.white,
            borderRadius: const BorderRadius.vertical(top: Radius.circular(24)),
          ),
          child: SafeArea(
            child: SingleChildScrollView(
              padding: const EdgeInsets.all(20),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text('Документы на проверку',
                      style:
                          TextStyle(fontSize: 14, fontWeight: FontWeight.w700)),
                  const SizedBox(height: 6),
                  const Text(
                      'Договор аренды или справка о правах на недвижимость (eGov). Документ увидит только управление вашего ЖК.',
                      style: TextStyle(fontSize: 12, color: Color(0xFF64748B))),
                  const SizedBox(height: 12),
                  TextField(controller: buildingCtrl, decoration: field('Дом')),
                  const SizedBox(height: 10),
                  Row(children: [
                    Expanded(
                        child: TextField(
                            controller: entranceCtrl,
                            keyboardType: TextInputType.number,
                            decoration: field('Подъезд'))),
                    const SizedBox(width: 10),
                    Expanded(
                        child: TextField(
                            controller: apartmentCtrl,
                            decoration: field('Квартира'))),
                  ]),
                  const SizedBox(height: 10),
                  OutlinedButton.icon(
                    onPressed: busy ? null : pick,
                    icon: const Icon(Icons.attach_file, size: 18),
                    label: Text(document?.name ?? 'Выбрать документ',
                        overflow: TextOverflow.ellipsis),
                  ),
                  if (error != null) ...[
                    const SizedBox(height: 8),
                    Text(error!,
                        style: const TextStyle(
                            fontSize: 12, color: Color(0xFFB91C1C))),
                  ],
                  const SizedBox(height: 12),
                  SizedBox(
                    width: double.infinity,
                    child: FilledButton(
                      onPressed: busy ? null : submit,
                      style: FilledButton.styleFrom(
                          backgroundColor: AppColors.primary,
                          padding: const EdgeInsets.symmetric(vertical: 14)),
                      child: Text(busy ? 'Отправляем…' : 'Отправить'),
                    ),
                  ),
                ],
              ),
            ),
          ),
        );
      }),
    );
  }

  static const _inviteErrors = {
    'invalid': 'Код не найден. Проверьте, что он введён без ошибок.',
    'used': 'Этот код уже использован. Попросите в ОСИ новый.',
    'expired': 'Срок действия кода истёк. Попросите в ОСИ новый.',
    'rate_limited': 'Слишком много попыток. Попробуйте через час.',
    'unauthorized': 'Войдите в аккаунт и повторите попытку.',
  };

  void _openInviteSheet() {
    final codeCtrl = TextEditingController();
    String? error;
    var busy = false;
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) => StatefulBuilder(builder: (ctx, setSheetState) {
        final isDark = Theme.of(ctx).brightness == Brightness.dark;
        Future<void> redeem() async {
          if (codeCtrl.text.trim().isEmpty) return;
          setSheetState(() {
            busy = true;
            error = null;
          });
          try {
            final status =
                await _repository.redeemApartmentInvite(codeCtrl.text.trim());
            if (status == 'ok') {
              if (ctx.mounted) Navigator.pop(ctx);
              await _loadRemoteProfile();
              if (mounted) {
                ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(content: Text('Проживание подтверждено')));
              }
              return;
            }
            setSheetState(() =>
                error = _inviteErrors[status] ?? 'Не удалось проверить код');
          } catch (_) {
            setSheetState(() => error = 'Не удалось проверить код');
          } finally {
            if (ctx.mounted) setSheetState(() => busy = false);
          }
        }

        return Container(
          padding:
              EdgeInsets.only(bottom: MediaQuery.of(ctx).viewInsets.bottom),
          decoration: BoxDecoration(
            color: isDark ? const Color(0xFF1C1C1E) : Colors.white,
            borderRadius: const BorderRadius.vertical(top: Radius.circular(24)),
          ),
          child: SafeArea(
            child: Padding(
              padding: const EdgeInsets.all(20),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text('Код от ОСИ',
                      style:
                          TextStyle(fontSize: 14, fontWeight: FontWeight.w700)),
                  const SizedBox(height: 6),
                  const Text(
                      'Введите код из записки или письма управления — доступ к дому откроется сразу. Без кода отправьте документы на проверку из меню профиля.',
                      style: TextStyle(fontSize: 12, color: Color(0xFF64748B))),
                  const SizedBox(height: 12),
                  TextField(
                    controller: codeCtrl,
                    textCapitalization: TextCapitalization.characters,
                    decoration: InputDecoration(
                      hintText: 'Например, K7M2Q9XWPA',
                      errorText: error,
                      border: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(12)),
                    ),
                    onSubmitted: (_) => redeem(),
                  ),
                  const SizedBox(height: 12),
                  SizedBox(
                    width: double.infinity,
                    child: FilledButton(
                      onPressed: busy ? null : redeem,
                      style: FilledButton.styleFrom(
                          backgroundColor: AppColors.primary,
                          padding: const EdgeInsets.symmetric(vertical: 14)),
                      child: Text(busy ? 'Проверяем…' : 'Подтвердить'),
                    ),
                  ),
                ],
              ),
            ),
          ),
        );
      }),
    );
  }

  Future<void> _signOut() async {
    await _repository.signOut();
    if (mounted) context.go('/login');
  }

  void _openEdit() {
    final nameCtrl = TextEditingController(text: fullName);
    final phoneCtrl = TextEditingController(text: phone);
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) {
        final isDark = Theme.of(ctx).brightness == Brightness.dark;
        return Container(
          decoration: BoxDecoration(
            color: isDark ? const Color(0xFF1C1C1E) : Colors.white,
            borderRadius: const BorderRadius.vertical(top: Radius.circular(24)),
          ),
          padding:
              EdgeInsets.only(bottom: MediaQuery.of(ctx).viewInsets.bottom),
          child: SafeArea(
            child: Padding(
              padding: const EdgeInsets.all(20),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Text('Редактирование профиля',
                          style: TextStyle(
                              fontSize: 14, fontWeight: FontWeight.w700)),
                      IconButton(
                          icon: const Icon(Icons.close, size: 20),
                          onPressed: () => Navigator.pop(ctx)),
                    ],
                  ),
                  const Divider(height: 20),
                  _Field(label: 'Имя и Фамилия', controller: nameCtrl),
                  const SizedBox(height: 12),
                  _Field(
                      label: 'Телефон',
                      controller: phoneCtrl,
                      keyboardType: TextInputType.phone),
                  const SizedBox(height: 12),
                  const Text(
                      'Адрес меняется через подтверждение проживания: управление ЖК проверит новый адрес.',
                      style: TextStyle(fontSize: 11, color: Color(0xFF64748B))),
                  const SizedBox(height: 20),
                  SizedBox(
                    width: double.infinity,
                    child: FilledButton(
                      onPressed: () async {
                        setState(() {
                          fullName = nameCtrl.text;
                          phone = phoneCtrl.text;
                        });
                        try {
                          await _repository.updateProfile(
                              fullName: fullName, phone: phone);
                        } catch (_) {
                          if (mounted) {
                            ScaffoldMessenger.of(context).showSnackBar(
                              const SnackBar(
                                  content:
                                      Text('Не удалось сохранить профиль')),
                            );
                          }
                        }
                        if (ctx.mounted) Navigator.pop(ctx);
                      },
                      style: FilledButton.styleFrom(
                        backgroundColor: AppColors.primary,
                        padding: const EdgeInsets.symmetric(vertical: 14),
                        shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(12)),
                      ),
                      child: const Text('Сохранить изменения',
                          style: TextStyle(
                              color: Colors.white,
                              fontWeight: FontWeight.w700)),
                    ),
                  ),
                ],
              ),
            ),
          ),
        );
      },
    );
  }

  void _openModal(String id) {
    setState(() => activeModal = id);
    showModalBottomSheet(
      context: context,
      backgroundColor: Colors.transparent,
      builder: (ctx) {
        final isDark = Theme.of(ctx).brightness == Brightness.dark;
        return Container(
          decoration: BoxDecoration(
            color: isDark ? const Color(0xFF1C1C1E) : Colors.white,
            borderRadius: const BorderRadius.vertical(top: Radius.circular(24)),
          ),
          child: SafeArea(
            child: Padding(
              padding: const EdgeInsets.all(20),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(_modalTitle(id),
                          style: const TextStyle(
                              fontSize: 14, fontWeight: FontWeight.w700)),
                      IconButton(
                          icon: const Icon(Icons.close, size: 20),
                          onPressed: () => Navigator.pop(ctx)),
                    ],
                  ),
                  const Divider(height: 20),
                  _ModalBody(id: id),
                  const SizedBox(height: 16),
                  SizedBox(
                      width: double.infinity,
                      child: FilledButton.tonal(
                          onPressed: () => Navigator.pop(ctx),
                          child: const Text('Закрыть'))),
                ],
              ),
            ),
          ),
        );
      },
    ).whenComplete(() => setState(() => activeModal = null));
  }

  String _modalTitle(String id) {
    switch (id) {
      case 'payments':
        return 'История взносов';
      case 'notifications':
        return 'Уведомления';
      default:
        return id;
    }
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    return Scaffold(
      backgroundColor: isDark ? AppColors.bgDark : const Color(0xFFF8FAFC),
      body: SafeArea(
        bottom: false,
        child: CustomScrollView(
          slivers: [
            SliverAppBar(
              pinned: true,
              backgroundColor: isDark ? AppColors.backgroundDark : Colors.white,
              surfaceTintColor: Colors.transparent,
              elevation: 0,
              title: Text('Профиль',
                  style: TextStyle(
                      fontSize: 16,
                      fontWeight: FontWeight.w700,
                      color: isDark ? Colors.white : const Color(0xFF0F172A))),
              actions: [
                Padding(
                  padding: const EdgeInsets.only(right: 12),
                  child: TextButton.icon(
                    onPressed: _openEdit,
                    icon: const Icon(Icons.edit_outlined,
                        size: 14, color: AppColors.primary),
                    label: const Text('Редактировать',
                        style: TextStyle(
                            color: AppColors.primary,
                            fontSize: 12,
                            fontWeight: FontWeight.w600)),
                    style: TextButton.styleFrom(
                        backgroundColor: const Color(0xFFEFF6FF),
                        shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(999)),
                        padding: const EdgeInsets.symmetric(
                            horizontal: 12, vertical: 6)),
                  ),
                ),
              ],
              bottom: PreferredSize(
                  preferredSize: const Size.fromHeight(1),
                  child: Container(
                      height: 1,
                      color: isDark
                          ? AppColors.borderDark
                          : const Color(0xFFF1F5F9))),
            ),
            SliverToBoxAdapter(
              child: hasError
                  ? ErrorView(
                      message: 'Не удалось загрузить профиль',
                      onRetry: _loadRemoteProfile)
                  : const SizedBox.shrink(),
            ),
            SliverToBoxAdapter(
              child: Column(
                children: [
                  Container(
                    width: double.infinity,
                    color: isDark ? AppColors.bgCardDark : Colors.white,
                    padding: const EdgeInsets.fromLTRB(24, 24, 24, 24),
                    child: Column(
                      children: [
                        Stack(
                          children: [
                            Container(
                              width: 80,
                              height: 80,
                              decoration: BoxDecoration(
                                  borderRadius: BorderRadius.circular(24),
                                  border: Border.all(
                                      color: const Color(0xFFDCFCE7), width: 3),
                                  boxShadow: const [
                                    BoxShadow(
                                        color: Color(0x14000000),
                                        blurRadius: 12,
                                        offset: Offset(0, 4))
                                  ]),
                              child: ClipRRect(
                                borderRadius: BorderRadius.circular(21),
                                child: CachedNetworkImage(
                                    imageUrl: avatarUrl,
                                    fit: BoxFit.cover,
                                    placeholder: (_, __) => Container(
                                        color: const Color(0xFFDCFCE7)),
                                    errorWidget: (_, __, ___) => Container(
                                        color: const Color(0xFFDCFCE7),
                                        child: const Icon(Icons.person))),
                              ),
                            ),
                            if (verified)
                              Positioned(
                                  right: 0,
                                  bottom: 0,
                                  child: Container(
                                      width: 24,
                                      height: 24,
                                      decoration: BoxDecoration(
                                          color: AppColors.primary,
                                          shape: BoxShape.circle,
                                          border: Border.all(
                                              color: Colors.white, width: 2)),
                                      child: const Icon(Icons.verified,
                                          size: 14, color: Colors.white))),
                          ],
                        ),
                        const SizedBox(height: 14),
                        Text(fullName,
                            style: TextStyle(
                                fontSize: 18,
                                fontWeight: FontWeight.w800,
                                color: isDark
                                    ? Colors.white
                                    : const Color(0xFF0F172A))),
                        const SizedBox(height: 4),
                        Text(phone,
                            style: const TextStyle(
                                fontSize: 12, color: Color(0xFF94A3B8))),
                        const SizedBox(height: 12),
                        Wrap(
                          alignment: WrapAlignment.center,
                          spacing: 8,
                          children: [
                            Container(
                              padding: const EdgeInsets.symmetric(
                                  horizontal: 12, vertical: 6),
                              decoration: BoxDecoration(
                                  color: const Color(0xFFF1F5F9),
                                  borderRadius: BorderRadius.circular(999)),
                              child: Row(
                                  mainAxisSize: MainAxisSize.min,
                                  children: [
                                    const Icon(Icons.place_outlined,
                                        size: 12, color: AppColors.primary),
                                    const SizedBox(width: 4),
                                    Text('Дом $building, кв. $apartment',
                                        style: const TextStyle(
                                            fontSize: 11,
                                            fontWeight: FontWeight.w600,
                                            color: Color(0xFF475569)))
                                  ]),
                            ),
                            Container(
                              padding: const EdgeInsets.symmetric(
                                  horizontal: 10, vertical: 6),
                              decoration: BoxDecoration(
                                  color: verified
                                      ? const Color(0xFFDCFCE7)
                                      : const Color(0xFFFEF3C7),
                                  borderRadius: BorderRadius.circular(999)),
                              child: Text(
                                  verified ? '✓ Подтверждён' : 'Ожидает',
                                  style: TextStyle(
                                      fontSize: 11,
                                      fontWeight: FontWeight.w600,
                                      color: verified
                                          ? const Color(0xFF166534)
                                          : const Color(0xFF92400E))),
                            ),
                          ],
                        ),
                      ],
                    ),
                  ),
                  if (!verified)
                    Container(
                      margin: const EdgeInsets.all(16),
                      padding: const EdgeInsets.all(14),
                      decoration: BoxDecoration(
                          color: const Color(0xFFFFFBEB),
                          borderRadius: AppRadius.card,
                          border: Border.all(color: const Color(0xFFFDE68A))),
                      child: Row(
                        children: [
                          Expanded(
                              child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                const Text('Статус жителя не подтверждён',
                                    style: TextStyle(
                                        fontSize: 12,
                                        fontWeight: FontWeight.w700,
                                        color: Color(0xFF92400E))),
                                Text(_unverifiedHint,
                                    style: const TextStyle(
                                        fontSize: 11, color: Color(0xFFB45309)))
                              ])),
                          FilledButton(
                              onPressed: _openInviteSheet,
                              style: FilledButton.styleFrom(
                                  backgroundColor: AppColors.primary,
                                  shape: RoundedRectangleBorder(
                                      borderRadius: BorderRadius.circular(10)),
                                  padding: const EdgeInsets.symmetric(
                                      horizontal: 14, vertical: 8)),
                              child: const Text('Подтвердить',
                                  style: TextStyle(
                                      fontSize: 11,
                                      color: Colors.white,
                                      fontWeight: FontWeight.w700))),
                        ],
                      ),
                    ),
                  const SizedBox(height: 12),
                  Container(
                    decoration: BoxDecoration(
                        color: isDark ? AppColors.bgCardDark : Colors.white,
                        border: Border.symmetric(
                            horizontal: BorderSide(
                                color: isDark
                                    ? AppColors.borderDark
                                    : const Color(0xFFF1F5F9)))),
                    child: Column(
                      children: [
                        if (!verified)
                          _MenuRow(
                              icon: Icons.verified_user_outlined,
                              label: 'Ввести код от ОСИ',
                              onTap: _openInviteSheet),
                        if (!verified && requestStatus != 'pending')
                          _MenuRow(
                              icon: Icons.upload_file_outlined,
                              label: 'Отправить документы',
                              onTap: _openDocumentSheet),
                        _MenuRow(
                            icon: Icons.sell_outlined,
                            label: 'Объявления и услуги',
                            onTap: () => context.go('/classifieds')),
                        _MenuRow(
                            icon: Icons.credit_card_outlined,
                            label: 'История платежей и сборов',
                            onTap: () => _openModal('payments')),
                        _MenuRow(
                            icon: Icons.notifications_outlined,
                            label: 'Какие уведомления приходят',
                            onTap: () => _openModal('notifications'),
                            showDivider: false),
                      ],
                    ),
                  ),
                  const SizedBox(height: 24),
                  if (_repository.isConfigured)
                    TextButton.icon(
                      onPressed: _signOut,
                      icon: const Icon(Icons.logout, color: Colors.redAccent),
                      label: const Text('Выйти из аккаунта',
                          style: TextStyle(color: Colors.redAccent)),
                    ),
                  Padding(
                      padding: EdgeInsets.only(
                          bottom: MediaQuery.of(context).padding.bottom + 80),
                      child: Text('Korshi • версия 1.0.0',
                          style: TextStyle(
                              fontSize: 11,
                              color: isDark
                                  ? const Color(0xFF475569)
                                  : const Color(0xFF94A3B8)))),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _ModalBody extends StatelessWidget {
  final String id;
  const _ModalBody({required this.id});
  @override
  Widget build(BuildContext context) {
    if (id == 'payments') {
      return const Padding(
        padding: EdgeInsets.symmetric(vertical: 12),
        child: Text(
          'История личных взносов пока не подключена. Для уточнения оплаты обратитесь в управление ЖК.',
          textAlign: TextAlign.center,
        ),
      );
    }
    return const Padding(
      padding: EdgeInsets.symmetric(vertical: 12),
      child: Text(
        'В приложение приходят: статусы ваших заявок, аварийные сообщения, документы и рассылки ОСИ, подтверждение взносов и личные сообщения. В общих чатах показывается счётчик непрочитанного. Push-уведомления пока не подключены.',
        style: TextStyle(fontSize: 12, color: Color(0xFF64748B)),
      ),
    );
  }
}

class _MenuRow extends StatelessWidget {
  final IconData icon;
  final String label;
  final VoidCallback onTap;
  final bool showDivider;
  const _MenuRow(
      {required this.icon,
      required this.label,
      required this.onTap,
      this.showDivider = true});
  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    return InkWell(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
        decoration: BoxDecoration(
            border: showDivider
                ? Border(
                    bottom: BorderSide(
                        color: isDark
                            ? AppColors.borderDark
                            : const Color(0xFFF1F5F9)))
                : null),
        child: Row(
          children: [
            Container(
                width: 32,
                height: 32,
                decoration: BoxDecoration(
                    color: isDark
                        ? AppColors.secondaryDark
                        : const Color(0xFFF1F5F9),
                    borderRadius: BorderRadius.circular(10)),
                child: Icon(icon, size: 16, color: const Color(0xFF64748B))),
            const SizedBox(width: 12),
            Expanded(
                child: Text(label,
                    style: TextStyle(
                        fontSize: 13,
                        fontWeight: FontWeight.w600,
                        color:
                            isDark ? Colors.white : const Color(0xFF0F172A)))),
            const Icon(Icons.chevron_right, size: 18, color: Color(0xFF94A3B8)),
          ],
        ),
      ),
    );
  }
}

class _Field extends StatelessWidget {
  final String label;
  final TextEditingController controller;
  final TextInputType? keyboardType;
  const _Field(
      {required this.label, required this.controller, this.keyboardType});
  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(label,
            style: const TextStyle(
                fontSize: 11,
                fontWeight: FontWeight.w700,
                color: Color(0xFF64748B))),
        const SizedBox(height: 6),
        TextField(
          controller: controller,
          keyboardType: keyboardType,
          decoration: InputDecoration(
            filled: true,
            fillColor:
                isDark ? const Color(0xFF27272A) : const Color(0xFFF8FAFC),
            border: OutlineInputBorder(
                borderRadius: BorderRadius.circular(12),
                borderSide: BorderSide(
                    color: isDark
                        ? const Color(0xFF3F3F46)
                        : const Color(0xFFE2E8F0))),
            enabledBorder: OutlineInputBorder(
                borderRadius: BorderRadius.circular(12),
                borderSide: BorderSide(
                    color: isDark
                        ? const Color(0xFF3F3F46)
                        : const Color(0xFFE2E8F0))),
            contentPadding:
                const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
            isDense: true,
          ),
          style: const TextStyle(fontSize: 13),
        ),
      ],
    );
  }
}
