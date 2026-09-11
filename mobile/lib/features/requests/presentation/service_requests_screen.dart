import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:flutter/services.dart';

import '../../../core/data/house_repository.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/widgets/empty_state.dart';

class ServiceRequestsScreen extends StatefulWidget {
  const ServiceRequestsScreen({super.key});

  @override
  State<ServiceRequestsScreen> createState() => _ServiceRequestsScreenState();
}

class _ServiceRequestsScreenState extends State<ServiceRequestsScreen> {
  final repository = HouseRepository();
  List<Map<String, dynamic>> requests = const [];
  bool loading = true;
  String? error;

  @override
  void initState() {
    super.initState();
    load();
  }

  Future<void> load() async {
    await HapticFeedback.selectionClick();
    if (!mounted) return;
    setState(() {
      loading = true;
      error = null;
    });
    try {
      await repository.flushOfflineActions();
      final data = await repository.loadServiceRequests();
      if (mounted) setState(() => requests = data);
    } catch (cause) {
      if (mounted) setState(() => error = cause.toString().replaceFirst('Exception: ', ''));
    } finally {
      if (mounted) setState(() => loading = false);
    }
  }

  Future<void> create() async {
    await HapticFeedback.lightImpact();
    if (!mounted) return;
    final created = await showModalBottomSheet<bool>(
      context: context,
      isScrollControlled: true,
      useSafeArea: true,
      builder: (_) => _RequestForm(repository: repository),
    );
    if (created == true && mounted) await load();
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    return Scaffold(
      backgroundColor: isDark ? AppColors.bgDark : const Color(0xFFF8F7F2),
      appBar: AppBar(
        leading: IconButton(onPressed: () => context.pop(), icon: const Icon(Icons.arrow_back)),
        title: const Text('Заявки'),
        actions: [IconButton(onPressed: create, tooltip: 'Новая заявка', icon: const Icon(Icons.add))],
      ),
      body: RefreshIndicator(
        onRefresh: load,
        child: loading
            ? const Center(child: CircularProgressIndicator())
            : error != null
                ? ListView(children: [SizedBox(height: 520, child: ErrorView(message: error!, onRetry: load))])
                : requests.isEmpty
                    ? ListView(children: [
                        const SizedBox(height: 90),
                        const EmptyState(
                          icon: Icons.task_alt,
                          title: 'Здесь всё спокойно',
                          subtitle: 'Создайте заявку, если в доме что-то требует внимания.',
                        ),
                        Padding(
                          padding: const EdgeInsets.all(24),
                          child: FilledButton.icon(
                            onPressed: create,
                            icon: const Icon(Icons.add),
                            label: const Text('Создать заявку'),
                          ),
                        ),
                      ])
                    : ListView.separated(
                        padding: const EdgeInsets.fromLTRB(16, 12, 16, 32),
                        itemCount: requests.length,
                        separatorBuilder: (_, __) => const SizedBox(height: 10),
                        itemBuilder: (_, index) => _RequestCard(request: requests[index]),
                      ),
      ),
    );
  }
}

class _RequestCard extends StatelessWidget {
  final Map<String, dynamic> request;
  const _RequestCard({required this.request});

  @override
  Widget build(BuildContext context) {
    final status = '${request['status'] ?? 'submitted'}';
    final label = switch (status) {
      'in_progress' => 'В работе',
      'resolved' => 'Выполнена',
      'closed' => 'Закрыта',
      _ => 'Принята',
    };
    final complete = status == 'resolved' || status == 'closed';
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Theme.of(context).cardColor,
        borderRadius: BorderRadius.circular(22),
        border: Border.all(color: Theme.of(context).dividerColor),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(children: [
            Container(
              width: 42,
              height: 42,
              decoration: BoxDecoration(color: const Color(0xFFEFFAF2), borderRadius: BorderRadius.circular(14)),
              child: const Icon(Icons.handyman_outlined, color: Color(0xFF166534), size: 20),
            ),
            const SizedBox(width: 12),
            Expanded(child: Text('${request['title']}', style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w800))),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 5),
              decoration: BoxDecoration(color: complete ? const Color(0xFFDCFCE7) : const Color(0xFFFEF3C7), borderRadius: BorderRadius.circular(99)),
              child: Text(label, style: TextStyle(fontSize: 10, fontWeight: FontWeight.w800, color: complete ? const Color(0xFF166534) : const Color(0xFF92400E))),
            ),
          ]),
          const SizedBox(height: 12),
          Text('${request['description']}', style: const TextStyle(fontSize: 13, height: 1.45)),
          const SizedBox(height: 10),
          Row(children: [const Icon(Icons.location_on_outlined, size: 15, color: Color(0xFF64748B)), const SizedBox(width: 4), Expanded(child: Text('${request['location']}', style: const TextStyle(fontSize: 11, color: Color(0xFF64748B))))]),
          if (request['assignee_name'] != null) ...[
            const SizedBox(height: 10),
            Text('Ответственный: ${request['assignee_name']}', style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: Color(0xFF166534))),
          ],
        ],
      ),
    );
  }
}

class _RequestForm extends StatefulWidget {
  final HouseRepository repository;
  const _RequestForm({required this.repository});

  @override
  State<_RequestForm> createState() => _RequestFormState();
}

class _RequestFormState extends State<_RequestForm> {
  final title = TextEditingController();
  final description = TextEditingController();
  final location = TextEditingController();
  String category = 'repair';
  String priority = 'normal';
  bool loading = false;
  String? error;

  @override
  void dispose() {
    title.dispose();
    description.dispose();
    location.dispose();
    super.dispose();
  }

  Future<void> submit() async {
    if (title.text.trim().length < 4 || description.text.trim().length < 8 || location.text.trim().length < 2) {
      setState(() => error = 'Заполните название, описание и место проблемы.');
      return;
    }
    setState(() {
      loading = true;
      error = null;
    });
    try {
      await HapticFeedback.mediumImpact();
      await widget.repository.createServiceRequest(
        category: category,
        title: title.text,
        description: description.text,
        location: location.text,
        priority: priority,
      );
      if (mounted) {
        await HapticFeedback.heavyImpact();
        if (!mounted) return;
        Navigator.pop(context, true);
      }
    } catch (cause) {
      if (mounted) setState(() => error = cause.toString().replaceFirst('Exception: ', ''));
    } finally {
      if (mounted) setState(() => loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: EdgeInsets.fromLTRB(20, 8, 20, MediaQuery.viewInsetsOf(context).bottom + 24),
      child: SingleChildScrollView(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text('Новая заявка', style: TextStyle(fontSize: 20, fontWeight: FontWeight.w900)),
            const SizedBox(height: 18),
            DropdownButtonFormField<String>(
              value: category,
              decoration: const InputDecoration(labelText: 'Категория'),
              items: const [
                DropdownMenuItem(value: 'utilities', child: Text('Вода и электричество')),
                DropdownMenuItem(value: 'repair', child: Text('Ремонт')),
                DropdownMenuItem(value: 'cleaning', child: Text('Уборка')),
                DropdownMenuItem(value: 'safety', child: Text('Безопасность')),
                DropdownMenuItem(value: 'territory', child: Text('Двор и территория')),
                DropdownMenuItem(value: 'other', child: Text('Другое')),
              ],
              onChanged: (value) => setState(() => category = value ?? 'other'),
            ),
            const SizedBox(height: 12),
            TextField(controller: title, maxLength: 120, decoration: const InputDecoration(labelText: 'Название')),
            const SizedBox(height: 12),
            TextField(controller: description, maxLength: 2000, minLines: 3, maxLines: 6, decoration: const InputDecoration(labelText: 'Описание', alignLabelWithHint: true)),
            const SizedBox(height: 12),
            TextField(controller: location, maxLength: 160, decoration: const InputDecoration(labelText: 'Где это?', prefixIcon: Icon(Icons.location_on_outlined))),
            DropdownButtonFormField<String>(
              value: priority,
              decoration: const InputDecoration(labelText: 'Приоритет'),
              items: const [
                DropdownMenuItem(value: 'normal', child: Text('Обычный')),
                DropdownMenuItem(value: 'important', child: Text('Важный')),
                DropdownMenuItem(value: 'emergency', child: Text('Аварийный')),
              ],
              onChanged: (value) => setState(() => priority = value ?? 'normal'),
            ),
            if (error != null) Padding(padding: const EdgeInsets.only(bottom: 12), child: Text(error!, style: const TextStyle(color: Color(0xFFB91C1C), fontWeight: FontWeight.w700))),
            SizedBox(width: double.infinity, child: FilledButton(onPressed: loading ? null : submit, child: Text(loading ? 'Отправляем…' : 'Отправить заявку'))),
          ],
        ),
      ),
    );
  }
}
