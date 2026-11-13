import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../features/feed/presentation/feed_screen.dart';
import '../features/chats/presentation/chats_list_screen.dart';
import '../features/chats/presentation/chat_room_screen.dart';
import '../features/hoa/presentation/hoa_screen.dart';
import '../features/classifieds/presentation/classifieds_screen.dart';
import '../features/profile/presentation/profile_screen.dart';
import '../features/auth/presentation/login_screen.dart';
import '../features/create/presentation/create_post_screen.dart';
import '../features/requests/presentation/service_requests_screen.dart';
import '../core/supabase/supabase_config.dart';
import '../features/chats/presentation/new_chat_screen.dart';
import '../features/settings/presentation/settings_screen.dart';

class _AuthRefreshNotifier extends ChangeNotifier {
  late final StreamSubscription<AuthState> _subscription;

  _AuthRefreshNotifier() {
    if (!SupabaseConfig.isPlaceholder) {
      _subscription = SupabaseConfig.client.auth.onAuthStateChange
          .listen((_) => notifyListeners());
    }
  }

  @override
  void dispose() {
    if (!SupabaseConfig.isPlaceholder) _subscription.cancel();
    super.dispose();
  }
}

final appRouterProvider = Provider<GoRouter>((ref) {
  final authRefresh = _AuthRefreshNotifier();
  ref.onDispose(authRefresh.dispose);
  return GoRouter(
    refreshListenable: authRefresh,
    initialLocation: SupabaseConfig.isPlaceholder ||
            SupabaseConfig.client.auth.currentSession != null
        ? '/feed'
        : '/login',
    redirect: (context, state) {
      if (SupabaseConfig.isPlaceholder) return null;
      final loggedIn = SupabaseConfig.client.auth.currentSession != null;
      final onLogin = state.matchedLocation == '/login';
      if (!loggedIn && !onLogin) return '/login';
      if (loggedIn && onLogin) return '/feed';
      return null;
    },
    routes: [
      GoRoute(path: '/login', builder: (context, state) => const LoginScreen()),
      GoRoute(
        path: '/create',
        builder: (context, state) => CreatePostScreen(
          initialType: state.uri.queryParameters['type'] ?? 'post',
        ),
      ),
      GoRoute(
        path: '/settings',
        builder: (context, state) => const SettingsScreen(),
      ),
      GoRoute(
        path: '/requests',
        builder: (context, state) => const ServiceRequestsScreen(),
      ),
      StatefulShellRoute.indexedStack(
        builder: (context, state, navigationShell) {
          return ScaffoldWithBottomNav(navigationShell: navigationShell);
        },
        branches: [
          StatefulShellBranch(
            routes: [
              GoRoute(
                  path: '/feed',
                  builder: (context, state) => const FeedScreen())
            ],
          ),
          StatefulShellBranch(
            routes: [
              GoRoute(
                path: '/chats',
                builder: (context, state) => const ChatsListScreen(),
                routes: [
                  GoRoute(
                    path: 'new',
                    builder: (context, state) => const NewChatScreen(),
                  ),
                  GoRoute(
                    path: ':chatId',
                    builder: (context, state) {
                      final chatId = state.pathParameters['chatId']!;
                      return ChatRoomScreen(chatId: chatId);
                    },
                  ),
                ],
              ),
            ],
          ),
          StatefulShellBranch(
            routes: [
              GoRoute(
                  path: '/classifieds',
                  builder: (context, state) => const ClassifiedsScreen()),
            ],
          ),
          StatefulShellBranch(
            routes: [
              GoRoute(
                  path: '/hoa', builder: (context, state) => const HoaScreen())
            ],
          ),
          StatefulShellBranch(
            routes: [
              GoRoute(
                  path: '/profile',
                  builder: (context, state) => const ProfileScreen())
            ],
          ),
        ],
      ),
    ],
  );
});

class ScaffoldWithBottomNav extends StatelessWidget {
  final StatefulNavigationShell navigationShell;

  const ScaffoldWithBottomNav({super.key, required this.navigationShell});

  void _openCreate(
      BuildContext context, BuildContext sheetContext, String type) {
    Navigator.pop(sheetContext);
    Future<void>.delayed(Duration.zero, () {
      if (context.mounted) context.push('/create?type=$type');
    });
  }

  void _onCreate(BuildContext context) {
    showModalBottomSheet<void>(
      context: context,
      backgroundColor: Colors.transparent,
      isScrollControlled: true,
      builder: (ctx) => Container(
        decoration: BoxDecoration(
          color: Theme.of(ctx).brightness == Brightness.dark
              ? const Color(0xFF1C1C1E)
              : Colors.white,
          borderRadius: const BorderRadius.vertical(top: Radius.circular(24)),
        ),
        padding: EdgeInsets.only(bottom: MediaQuery.of(ctx).viewInsets.bottom),
        child: SafeArea(
          child: Padding(
            padding: const EdgeInsets.fromLTRB(20, 16, 20, 24),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Center(
                  child: Container(
                    width: 36,
                    height: 4,
                    decoration: BoxDecoration(
                      color: const Color(0xFFE2E8F0),
                      borderRadius: BorderRadius.circular(999),
                    ),
                  ),
                ),
                const SizedBox(height: 16),
                const Text(
                  'Создать',
                  style: TextStyle(fontSize: 16, fontWeight: FontWeight.w700),
                ),
                const SizedBox(height: 16),
                _CreateOption(
                  icon: Icons.build_circle_outlined,
                  label: 'Заявка в ОСИ',
                  subtitle: 'Сообщить о проблеме в доме',
                  onTap: () {
                    Navigator.pop(ctx);
                    Future<void>.delayed(Duration.zero, () {
                      if (context.mounted) context.push('/requests');
                    });
                  },
                ),
                _CreateOption(
                  icon: Icons.article_outlined,
                  label: 'Публикация',
                  subtitle: 'Поделитесь новостью с соседями',
                  onTap: () => _openCreate(context, ctx, 'post'),
                ),
                _CreateOption(
                  icon: Icons.campaign_outlined,
                  label: 'Объявление',
                  subtitle: 'Продажа, аренда, услуги',
                  onTap: () => _openCreate(context, ctx, 'announcement'),
                ),
                _CreateOption(
                  icon: Icons.poll_outlined,
                  label: 'Опрос',
                  subtitle: 'Спросите мнение жителей',
                  onTap: () => _openCreate(context, ctx, 'poll'),
                ),
                _CreateOption(
                  icon: Icons.lightbulb_outline,
                  label: 'Инициатива',
                  subtitle: 'Предложите улучшение',
                  onTap: () => _openCreate(context, ctx, 'initiative'),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    return Scaffold(
      extendBody: true,
      body: Center(
        child: ConstrainedBox(
          constraints: const BoxConstraints(maxWidth: 600),
          child: Container(
            clipBehavior: Clip.antiAlias,
            decoration: BoxDecoration(
              color: Theme.of(context).scaffoldBackgroundColor,
              boxShadow: MediaQuery.of(context).size.width > 600
                  ? const [
                      BoxShadow(
                          color: Color(0x1A000000),
                          blurRadius: 24,
                          offset: Offset(0, 8))
                    ]
                  : null,
            ),
            child: navigationShell,
          ),
        ),
      ),
      floatingActionButton: Container(
        width: 56,
        height: 56,
        decoration: const BoxDecoration(
          color: Color(0xFF16A34A),
          shape: BoxShape.circle,
          boxShadow: [
            BoxShadow(
                color: Color(0x4D16A34A), blurRadius: 12, offset: Offset(0, 4))
          ],
        ),
        child: Material(
          color: Colors.transparent,
          shape: const CircleBorder(),
          child: InkWell(
            customBorder: const CircleBorder(),
            onTap: () => _onCreate(context),
            child: const Icon(Icons.add, color: Colors.white, size: 28),
          ),
        ),
      ),
      floatingActionButtonLocation: FloatingActionButtonLocation.centerDocked,
      bottomNavigationBar: Container(
        decoration: BoxDecoration(
          color: isDark ? const Color(0xFF121214) : Colors.white,
          border: Border(
            top: BorderSide(
                color:
                    isDark ? const Color(0xFF27272A) : const Color(0xFFF1F5F9)),
          ),
          boxShadow: const [
            BoxShadow(
                color: Color(0x0A000000),
                blurRadius: 12,
                offset: Offset(0, -2)),
          ],
        ),
        child: SafeArea(
          child: NavigationBar(
            selectedIndex: navigationShell.currentIndex,
            onDestinationSelected: (index) {
              navigationShell.goBranch(
                index,
                initialLocation: index == navigationShell.currentIndex,
              );
            },
            backgroundColor: Colors.transparent,
            surfaceTintColor: Colors.transparent,
            elevation: 0,
            height: 64,
            labelBehavior: NavigationDestinationLabelBehavior.alwaysShow,
            destinations: const [
              NavigationDestination(
                icon: Icon(Icons.home_outlined),
                selectedIcon: Icon(Icons.home),
                label: 'Главная',
              ),
              NavigationDestination(
                icon: Icon(Icons.chat_bubble_outline),
                selectedIcon: Icon(Icons.chat_bubble),
                label: 'Чаты',
              ),
              NavigationDestination(
                icon: Icon(Icons.storefront_outlined),
                selectedIcon: Icon(Icons.storefront),
                label: 'Услуги',
              ),
              NavigationDestination(
                icon: Icon(Icons.apartment_outlined),
                selectedIcon: Icon(Icons.apartment),
                label: 'Мой ЖК',
              ),
              NavigationDestination(
                icon: Icon(Icons.person_outline),
                selectedIcon: Icon(Icons.person),
                label: 'Профиль',
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _CreateOption extends StatelessWidget {
  final IconData icon;
  final String label;
  final String subtitle;
  final VoidCallback onTap;
  const _CreateOption({
    required this.icon,
    required this.label,
    required this.subtitle,
    required this.onTap,
  });
  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(16),
      child: Padding(
        padding: const EdgeInsets.symmetric(vertical: 10),
        child: Row(
          children: [
            Container(
              width: 44,
              height: 44,
              decoration: BoxDecoration(
                color: const Color(0xFFF0FDF4),
                borderRadius: BorderRadius.circular(12),
              ),
              child: Icon(icon, color: const Color(0xFF16A34A), size: 20),
            ),
            const SizedBox(width: 14),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(label,
                      style: const TextStyle(
                          fontSize: 14, fontWeight: FontWeight.w600)),
                  Text(subtitle,
                      style: const TextStyle(
                          fontSize: 11, color: Color(0xFF64748B))),
                ],
              ),
            ),
            const Icon(Icons.chevron_right, size: 18, color: Color(0xFF94A3B8)),
          ],
        ),
      ),
    );
  }
}
