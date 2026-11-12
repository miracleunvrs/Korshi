import 'dart:convert';

import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:housesm_mobile/core/data/house_repository.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

void main() {
  const building = '22222222-2222-2222-2222-222222222221';
  const entrance = '33333333-3333-3333-3333-333333333331';
  late SupabaseClient client;
  late HouseRepository repository;
  late Map<String, dynamic> profile;
  late List<Map<String, dynamic>> bundles;
  String? profileSelection;

  setUp(() async {
    profile = {
      'id': 'resident',
      'verified': true,
      'complex_id': 'complex',
      'apartment': {
        'number': '1',
        'entrance': {
          'id': entrance,
          'number': 1,
          'building': {'id': building, 'number': '1'},
        },
      },
    };
    bundles = [];
    profileSelection = null;
    client = SupabaseClient(
      'https://local.test',
      'synthetic-test-key',
      authOptions: const AuthClientOptions(autoRefreshToken: false),
      httpClient: MockClient((request) async {
        Object response;
        if (request.url.path.endsWith('/token')) {
          response = {
            'access_token': 'synthetic-test-token',
            'refresh_token': 'synthetic',
            'token_type': 'bearer',
            'expires_in': 3600,
            'user': {
              'id': 'resident',
              'aud': 'authenticated',
              'created_at': '2026-01-01T00:00:00Z',
              'app_metadata': {},
              'user_metadata': {}
            },
          };
        } else if (request.url.path.endsWith('/profiles')) {
          profileSelection = request.url.queryParameters['select'];
          response = profile;
        } else if (request.url.path.endsWith('/rpc/create_post_bundle')) {
          bundles.add(jsonDecode(request.body) as Map<String, dynamic>);
          response = 'saved-post';
        } else {
          throw StateError('Unexpected request: ${request.url.path}');
        }
        return http.Response(jsonEncode(response), 200,
            request: request, headers: {'content-type': 'application/json'});
      }),
    );
    await client.auth.signInWithPassword(
        email: 'resident@local.test', password: 'synthetic');
    repository = HouseRepository(client: client);
  });
  tearDown(() async => client.dispose());

  Future<void> publish(String territory) => repository.createPost(
        type: 'post',
        title: 'Соседям',
        content: 'Проверка аудитории',
        territory: territory,
      );

  test('profile fetch includes actual building and entrance IDs', () async {
    await repository.loadProfile();
    expect(profileSelection, contains('entrances(id,'));
    expect(profileSelection, contains('buildings(id,'));
  });
  for (final territory in ['complex', 'building', 'entrance']) {
    test('$territory audience is included in the actual bundle request',
        () async {
      await publish(territory);
      final post = bundles.single['p_post'] as Map<String, dynamic>;
      expect(post['territory'], territory);
      expect(post['building_id'], territory == 'complex' ? null : building);
      expect(post['entrance_id'], territory == 'entrance' ? entrance : null);
    });
  }
  for (final territory in ['building', 'entrance']) {
    test('$territory post is not silently sent without an apartment', () async {
      profile['apartment'] = null;
      await expectLater(publish(territory), throwsException);
      expect(bundles, isEmpty);
    });
  }
  test('unknown audience is rejected before sending', () async {
    await expectLater(publish('everyone'), throwsException);
    expect(bundles, isEmpty);
  });
  test('entrance ID is required even when the building is known', () async {
    profile['apartment']['entrance'].remove('id');
    await expectLater(publish('entrance'), throwsException);
    expect(bundles, isEmpty);
  });
  test('building ID is required even when an entrance number exists', () async {
    profile['apartment']['entrance']['building'].remove('id');
    await expectLater(publish('building'), throwsException);
    expect(bundles, isEmpty);
  });
  test('complex-wide post does not require an apartment', () async {
    profile['apartment'] = null;
    await publish('complex');
    final post = bundles.single['p_post'] as Map<String, dynamic>;
    expect(post['building_id'], isNull);
    expect(post['entrance_id'], isNull);
  });
}
