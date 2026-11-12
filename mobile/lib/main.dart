import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import 'core/supabase/supabase_config.dart';
import 'core/data/house_repository.dart';
import 'core/theme/app_theme.dart';
import 'navigation/app_router.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  if (SupabaseConfig.isPlaceholder) {
    runApp(const _ConfigurationRequiredApp());
    return;
  }
  // Системные оверлеи — как в вебе themeColor #16a34a
  SystemChrome.setSystemUIOverlayStyle(
    const SystemUiOverlayStyle(
      statusBarColor: Colors.transparent,
      statusBarIconBrightness: Brightness.dark,
      statusBarBrightness: Brightness.light,
      systemNavigationBarColor: Colors.white,
      systemNavigationBarIconBrightness: Brightness.dark,
    ),
  );
  try {
    await SupabaseConfig.initialize();
  } catch (e) {
    runApp(_ConfigurationRequiredApp(error: e.toString()));
    return;
  }
  runApp(const ProviderScope(child: HouseSMApp()));
}

class _ConfigurationRequiredApp extends StatelessWidget {
  final String? error;
  const _ConfigurationRequiredApp({this.error});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Korshi',
      home: Scaffold(
        body: Center(
          child: Padding(
            padding: const EdgeInsets.all(24),
            child: Text(
              error ??
                  'Укажите SUPABASE_URL и SUPABASE_ANON_KEY при запуске Flutter.',
              textAlign: TextAlign.center,
            ),
          ),
        ),
      ),
    );
  }
}

class HouseSMApp extends ConsumerStatefulWidget {
  const HouseSMApp({super.key});

  @override
  ConsumerState<HouseSMApp> createState() => _HouseSMAppState();
}

class _HouseSMAppState extends ConsumerState<HouseSMApp>
    with WidgetsBindingObserver {
  final HouseRepository _repository = HouseRepository();
  Timer? _syncTimer;
  StreamSubscription<AuthState>? _authSubscription;

  @override
  void initState() {
    super.initState();
    if (SupabaseConfig.isPlaceholder) return;
    WidgetsBinding.instance.addObserver(this);
    _syncTimer = Timer.periodic(
      const Duration(seconds: 15),
      (_) => _syncOfflineActions(),
    );
    _authSubscription = SupabaseConfig.client.auth.onAuthStateChange.listen(
      (_) => _syncOfflineActions(),
    );
    unawaited(_syncOfflineActions());
  }

  Future<void> _syncOfflineActions() async {
    try {
      await _repository.flushOfflineActions();
    } catch (_) {
      // A blocked action stays in the queue; foreground screens surface errors.
    }
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.resumed) unawaited(_syncOfflineActions());
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    _syncTimer?.cancel();
    _authSubscription?.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final router = ref.watch(appRouterProvider);

    return MaterialApp.router(
      title: 'Korshi',
      debugShowCheckedModeBanner: false,
      theme: AppTheme.lightTheme,
      darkTheme: AppTheme.darkTheme,
      themeMode: ThemeMode.system,
      routerConfig: router,
    );
  }
}
