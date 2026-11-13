import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../../core/data/house_repository.dart';
import '../../../core/theme/app_colors.dart';

class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});
  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen>
    with SingleTickerProviderStateMixin {
  late TabController _tab;
  final _loginEmail = TextEditingController();
  final _loginPassword = TextEditingController();
  final _regName = TextEditingController();
  final _regPhone = TextEditingController(text: '+7 (777) ');
  final _regEmail = TextEditingController();
  final _regPassword = TextEditingController();
  final _regApartment = TextEditingController();
  final _repository = HouseRepository();
  String _regBuilding = '';
  Map<String, Map<String, int>> _buildings = {};
  String _regRole = 'resident';

  @override
  void initState() {
    super.initState();
    _tab = TabController(length: 2, vsync: this, initialIndex: 0);
    _regApartment.addListener(() => setState(() {}));
    if (_repository.isConfigured) {
      _repository.loadSignupBuildings().then((buildings) {
        if (!mounted) return;
        setState(() {
          _buildings = buildings;
          if (buildings.isNotEmpty) _regBuilding = buildings.keys.first;
        });
      }).catchError((Object error) {
        if (mounted) _say('Не удалось загрузить список домов: $error');
      });
    }
  }

  void _say(String text) =>
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(text)));

  int? get _regEntrance => _buildings[_regBuilding]?[_regApartment.text.trim()];

  @override
  void dispose() {
    _tab.dispose();
    _loginEmail.dispose();
    _loginPassword.dispose();
    _regName.dispose();
    _regPhone.dispose();
    _regEmail.dispose();
    _regPassword.dispose();
    _regApartment.dispose();
    super.dispose();
  }

  Future<void> _login() async {
    if (!_repository.isConfigured) {
      _say('Сервер не настроен: укажите адрес Supabase при сборке');
      return;
    }
    try {
      await _repository.signIn(_loginEmail.text, _loginPassword.text);
      if (mounted) context.go('/feed');
    } catch (error) {
      if (mounted) {
        ScaffoldMessenger.of(context)
            .showSnackBar(SnackBar(content: Text('Не удалось войти: $error')));
      }
    }
  }

  Future<void> _register() async {
    if (!_repository.isConfigured) {
      _say('Сервер не настроен: укажите адрес Supabase при сборке');
      return;
    }
    final entrance = _regEntrance;
    if (entrance == null) {
      _say('В доме $_regBuilding нет квартиры ${_regApartment.text.trim()}');
      return;
    }
    try {
      final response = await _repository.signUp(
        email: _regEmail.text,
        password: _regPassword.text,
        fullName: _regName.text,
        phone: _regPhone.text,
        buildingNumber: _regBuilding,
        entranceNumber: entrance,
        apartmentNumber: _regApartment.text,
      );
      if (!mounted) return;
      if (response.session == null) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
              content: Text('Проверьте email и подтвердите регистрацию')),
        );
      } else {
        context.go('/feed');
      }
    } catch (error) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Не удалось зарегистрироваться: $error')),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFF09090B),
      body: SafeArea(
        child: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.all(16),
            child: Container(
              constraints: const BoxConstraints(maxWidth: 440),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(36),
                boxShadow: const [
                  BoxShadow(
                      color: Color(0x33000000),
                      blurRadius: 24,
                      offset: Offset(0, 8)),
                ],
              ),
              padding: const EdgeInsets.fromLTRB(24, 28, 24, 24),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  // Logo
                  Column(
                    children: [
                      Container(
                        width: 56,
                        height: 56,
                        decoration: BoxDecoration(
                          gradient: const LinearGradient(
                            colors: [Color(0xFF16A34A), Color(0xFF10B981)],
                            begin: Alignment.topLeft,
                            end: Alignment.bottomRight,
                          ),
                          borderRadius: BorderRadius.circular(18),
                          boxShadow: const [
                            BoxShadow(
                              color: Color(0x4D16A34A),
                              blurRadius: 12,
                              offset: Offset(0, 4),
                            ),
                          ],
                        ),
                        child: const Center(
                          child: Text(
                            'ЖК',
                            style: TextStyle(
                              color: Colors.white,
                              fontSize: 20,
                              fontWeight: FontWeight.w900,
                            ),
                          ),
                        ),
                      ),
                      const SizedBox(height: 12),
                      Row(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: const [
                          Text(
                            'ЖК «Солнечный»',
                            style: TextStyle(
                              fontSize: 22,
                              fontWeight: FontWeight.w900,
                              letterSpacing: -0.5,
                            ),
                          ),
                          SizedBox(width: 6),
                          Icon(Icons.verified,
                              size: 20, color: AppColors.primary),
                        ],
                      ),
                      const SizedBox(height: 4),
                      const Text(
                        'Закрытая цифровая среда для жителей дома',
                        style: TextStyle(
                          fontSize: 11,
                          color: Color(0xFF64748B),
                          fontWeight: FontWeight.w500,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 20),
                  // Tabs
                  Container(
                    decoration: BoxDecoration(
                      color: const Color(0xFFF1F5F9),
                      borderRadius: BorderRadius.circular(16),
                    ),
                    padding: const EdgeInsets.all(4),
                    child: TabBar(
                      controller: _tab,
                      indicator: BoxDecoration(
                        color: Colors.white,
                        borderRadius: BorderRadius.circular(12),
                        boxShadow: const [
                          BoxShadow(
                              color: Color(0x0A000000),
                              blurRadius: 6,
                              offset: Offset(0, 2)),
                        ],
                      ),
                      labelColor: const Color(0xFF0F172A),
                      unselectedLabelColor: const Color(0xFF64748B),
                      labelStyle: const TextStyle(
                          fontSize: 11, fontWeight: FontWeight.w700),
                      unselectedLabelStyle: const TextStyle(
                        fontSize: 11,
                        fontWeight: FontWeight.w600,
                      ),
                      indicatorSize: TabBarIndicatorSize.tab,
                      dividerColor: Colors.transparent,
                      tabs: const [
                        Tab(text: 'Регистрация'),
                        Tab(text: 'Вход'),
                      ],
                    ),
                  ),
                  const SizedBox(height: 20),
                  SizedBox(
                    height: 420,
                    child: TabBarView(
                      controller: _tab,
                      children: [
                        _RegisterTab(
                          nameCtrl: _regName,
                          phoneCtrl: _regPhone,
                          emailCtrl: _regEmail,
                          passwordCtrl: _regPassword,
                          apartmentCtrl: _regApartment,
                          building: _regBuilding,
                          buildings: _buildings.keys.toList(),
                          entrance: _regEntrance,
                          role: _regRole,
                          onBuildingChanged: (v) =>
                              setState(() => _regBuilding = v),
                          onRoleChanged: (v) => setState(() => _regRole = v),
                          onSubmit: _register,
                        ),
                        _LoginTab(
                            emailCtrl: _loginEmail,
                            passwordCtrl: _loginPassword,
                            onSubmit: _login),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}

class _RegisterTab extends StatelessWidget {
  final TextEditingController nameCtrl,
      phoneCtrl,
      emailCtrl,
      passwordCtrl,
      apartmentCtrl;
  final String building;
  final List<String> buildings;
  final int? entrance;
  final String role;
  final ValueChanged<String> onBuildingChanged;
  final ValueChanged<String> onRoleChanged;
  final Future<void> Function() onSubmit;
  const _RegisterTab({
    required this.nameCtrl,
    required this.phoneCtrl,
    required this.emailCtrl,
    required this.passwordCtrl,
    required this.apartmentCtrl,
    required this.building,
    required this.buildings,
    required this.entrance,
    required this.role,
    required this.onBuildingChanged,
    required this.onRoleChanged,
    required this.onSubmit,
  });
  @override
  Widget build(BuildContext context) {
    return SingleChildScrollView(
      child: Column(
        children: [
          _Field(
              label: 'ФИО (как в удостоверении)',
              hint: 'Иван Иванов',
              controller: nameCtrl),
          const SizedBox(height: 12),
          _Field(
            label: 'Номер мобильного телефона',
            hint: '+7 (777) 123-45-67',
            controller: phoneCtrl,
            keyboardType: TextInputType.phone,
          ),
          const SizedBox(height: 12),
          _Field(
            label: 'Email',
            hint: 'you@example.com',
            controller: emailCtrl,
            keyboardType: TextInputType.emailAddress,
          ),
          const SizedBox(height: 12),
          _Field(
            label: 'Пароль',
            hint: 'Минимум 6 символов',
            controller: passwordCtrl,
            obscureText: true,
          ),
          const SizedBox(height: 12),
          Row(
            children: [
              Expanded(
                child: _Dropdown(
                  label: 'Дом №',
                  value: building,
                  items: buildings,
                  onChanged: onBuildingChanged,
                ),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: _ReadOnlyField(
                  label: 'Подъезд',
                  value: entrance == null ? '—' : '$entrance',
                ),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: _Field(
                    label: 'Кв. №', hint: '45', controller: apartmentCtrl),
              ),
            ],
          ),
          const SizedBox(height: 12),
          Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text(
                'Роль в ЖК',
                style: TextStyle(
                  fontSize: 11,
                  fontWeight: FontWeight.w700,
                  color: Color(0xFF475569),
                ),
              ),
              const SizedBox(height: 6),
              Row(
                children: [
                  Expanded(
                    child: GestureDetector(
                      onTap: () => onRoleChanged('resident'),
                      child: Container(
                        padding: const EdgeInsets.symmetric(vertical: 10),
                        decoration: BoxDecoration(
                          color: role == 'resident'
                              ? const Color(0xFFEFF6FF)
                              : const Color(0xFFF1F5F9),
                          borderRadius: BorderRadius.circular(12),
                          border: Border.all(
                            color: role == 'resident'
                                ? AppColors.primary
                                : const Color(0xFFE2E8F0),
                          ),
                        ),
                        child: const Text(
                          'Житель / Собственник',
                          textAlign: TextAlign.center,
                          style: TextStyle(
                              fontSize: 11, fontWeight: FontWeight.w700),
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: GestureDetector(
                      onTap: () => onRoleChanged('service_provider'),
                      child: Container(
                        padding: const EdgeInsets.symmetric(vertical: 10),
                        decoration: BoxDecoration(
                          color: role == 'service_provider'
                              ? const Color(0xFFEFF6FF)
                              : const Color(0xFFF1F5F9),
                          borderRadius: BorderRadius.circular(12),
                          border: Border.all(
                            color: role == 'service_provider'
                                ? AppColors.primary
                                : const Color(0xFFE2E8F0),
                          ),
                        ),
                        child: const Text(
                          'Мастер услуг ЖК',
                          textAlign: TextAlign.center,
                          style: TextStyle(
                              fontSize: 11, fontWeight: FontWeight.w700),
                        ),
                      ),
                    ),
                  ),
                ],
              ),
            ],
          ),
          const SizedBox(height: 16),
          SizedBox(
            width: double.infinity,
            child: FilledButton(
              onPressed: onSubmit,
              style: FilledButton.styleFrom(
                backgroundColor: AppColors.primary,
                padding: const EdgeInsets.symmetric(vertical: 14),
                shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(12)),
              ),
              child: const Text(
                'Зарегистрироваться и войти в ЖК',
                style: TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.w700,
                    color: Colors.white),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _LoginTab extends StatelessWidget {
  final TextEditingController emailCtrl, passwordCtrl;
  final Future<void> Function() onSubmit;
  const _LoginTab(
      {required this.emailCtrl,
      required this.passwordCtrl,
      required this.onSubmit});
  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        _Field(
          label: 'Email',
          hint: 'you@example.com',
          controller: emailCtrl,
          keyboardType: TextInputType.emailAddress,
        ),
        const SizedBox(height: 6),
        const Text(
          'Введите email и пароль зарегистрированного жителя.',
          style: TextStyle(fontSize: 11, color: Color(0xFF94A3B8)),
        ),
        const SizedBox(height: 12),
        _Field(
          label: 'Пароль',
          hint: 'Ваш пароль',
          controller: passwordCtrl,
          obscureText: true,
        ),
        const Spacer(),
        SizedBox(
          width: double.infinity,
          child: FilledButton.icon(
            onPressed: onSubmit,
            style: FilledButton.styleFrom(
              backgroundColor: AppColors.primary,
              padding: const EdgeInsets.symmetric(vertical: 14),
              shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(12)),
            ),
            icon:
                const Icon(Icons.arrow_forward, size: 16, color: Colors.white),
            label: const Text(
              'Войти в систему',
              style: TextStyle(
                  fontSize: 12,
                  fontWeight: FontWeight.w700,
                  color: Colors.white),
            ),
          ),
        ),
        const SizedBox(height: 12),
      ],
    );
  }
}

class _Field extends StatelessWidget {
  final String label, hint;
  final TextEditingController controller;
  final TextInputType? keyboardType;
  final bool obscureText;
  const _Field({
    required this.label,
    required this.hint,
    required this.controller,
    this.keyboardType,
    this.obscureText = false,
  });
  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          label,
          style: const TextStyle(
            fontSize: 11,
            fontWeight: FontWeight.w700,
            color: Color(0xFF475569),
          ),
        ),
        const SizedBox(height: 6),
        TextField(
          controller: controller,
          keyboardType: keyboardType,
          obscureText: obscureText,
          decoration: InputDecoration(
            hintText: hint,
            filled: true,
            fillColor: const Color(0xFFF1F5F9),
            border: OutlineInputBorder(
              borderRadius: BorderRadius.circular(12),
              borderSide: BorderSide.none,
            ),
            contentPadding:
                const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
            isDense: true,
            hintStyle: const TextStyle(fontSize: 12, color: Color(0xFF94A3B8)),
          ),
          style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600),
        ),
      ],
    );
  }
}

class _Dropdown extends StatelessWidget {
  final String label, value;
  final List<String> items;
  final ValueChanged<String> onChanged;
  const _Dropdown({
    required this.label,
    required this.value,
    required this.items,
    required this.onChanged,
  });
  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          label,
          style: const TextStyle(
            fontSize: 11,
            fontWeight: FontWeight.w700,
            color: Color(0xFF475569),
          ),
        ),
        const SizedBox(height: 6),
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 12),
          decoration: BoxDecoration(
            color: const Color(0xFFF1F5F9),
            borderRadius: BorderRadius.circular(12),
          ),
          child: DropdownButtonHideUnderline(
            child: DropdownButton<String>(
              value: items.contains(value) ? value : null,
              hint: const Text('Загрузка…'),
              isExpanded: true,
              style: const TextStyle(
                fontSize: 12,
                fontWeight: FontWeight.w600,
                color: Color(0xFF0F172A),
              ),
              items: items
                  .map((e) => DropdownMenuItem(value: e, child: Text('Дом $e')))
                  .toList(),
              onChanged: (v) => onChanged(v!),
            ),
          ),
        ),
      ],
    );
  }
}

class _ReadOnlyField extends StatelessWidget {
  final String label, value;
  const _ReadOnlyField({required this.label, required this.value});
  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          label,
          style: const TextStyle(
            fontSize: 11,
            fontWeight: FontWeight.w700,
            color: Color(0xFF475569),
          ),
        ),
        const SizedBox(height: 6),
        Container(
          width: double.infinity,
          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 14),
          decoration: BoxDecoration(
            color: const Color(0xFFE2E8F0),
            borderRadius: BorderRadius.circular(12),
          ),
          child: Text(value, style: const TextStyle(fontSize: 14)),
        ),
      ],
    );
  }
}
