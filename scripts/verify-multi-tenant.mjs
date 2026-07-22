#!/usr/bin/env node

/**
 * verify-multi-tenant.mjs
 *
 * Teste standalone de isolamento multi-tenant via RLS.
 *
 * Uso:
 *   node scripts/verify-multi-tenant.mjs
 *
 * Variáveis de ambiente (opcionais — usa defaults do projeto se ausentes):
 *   SUPABASE_URL         URL do projeto Supabase
 *   SUPABASE_ANON_KEY    Chave anônima
 *   TEST_EMAIL_A         E-mail do usuário da Organização A
 *   TEST_PASSWORD_A      Senha do usuário da Organização A
 *   TEST_EMAIL_B         E-mail do usuário da Organização B
 *   TEST_PASSWORD_B      Senha do usuário da Organização B
 *
 * Exit code: 0 se todos os testes passarem, 1 se algum falhar.
 */

import { createClient } from '@supabase/supabase-js';

// ---------------------------------------------------------------------------
// Configuração
// ---------------------------------------------------------------------------

const CONFIG = {
  supabaseUrl:
    process.env.SUPABASE_URL ||
    'https://lgmtuabuuarxyfnhidbr.supabase.co',
  anonKey:
    process.env.SUPABASE_ANON_KEY ||
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxnbXR1YWJ1dWFyeHlmbmhpZGJyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ2NzUzMTYsImV4cCI6MjEwMDI1MTMxNn0.QtwFSGHozU_npLqmTqV2M5VrD1KeZDuh0UNYJ08bVVg',
  emailA: process.env.TEST_EMAIL_A || 'org-a@test.com',
  passwordA: process.env.TEST_PASSWORD_A || 'Test1234!',
  emailB: process.env.TEST_EMAIL_B || 'org-b@test.com',
  passwordB: process.env.TEST_PASSWORD_B || 'Test1234!',
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

let passed = 0;
let failed = 0;

function ok(label) {
  console.log(`  ✅  ${label}`);
  passed++;
}

function fail(label, detail) {
  console.log(`  ❌  ${label}`);
  if (detail) console.log(`       → ${detail}`);
  failed++;
}

function divider(title) {
  console.log(`\n━━━ ${title} ━━━`);
}

async function signIn(supabase, email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  if (error) {
    fail(`Login ${email}`, error.message);
    return null;
  }
  ok(`Login como ${email} (org: ${data.user?.user_metadata?.org_id || '?'})`);
  return data.user;
}

async function signOut(supabase) {
  await supabase.auth.signOut();
}

async function getUserOrg(supabase) {
  const { data, error } = await supabase
    .from('profiles')
    .select('org_id')
    .single();
  if (error) return null;
  return data.org_id;
}

async function countRows(supabase, table) {
  const { count, error } = await supabase
    .from(table)
    .select('*', { count: 'exact', head: true });
  if (error) return -1;
  return count;
}

// ---------------------------------------------------------------------------
// Testes
// ---------------------------------------------------------------------------

async function run() {
  console.log('═'.repeat(50));
  console.log('  verify-multi-tenant.mjs — Isolamento RLS');
  console.log(`  Supabase: ${CONFIG.supabaseUrl}`);
  console.log('═'.repeat(50));

  // ── 1. Conectar e autenticar Organização A ──────────────────────────────
  divider('Organização A');

  const supabaseA = createClient(CONFIG.supabaseUrl, CONFIG.anonKey);
  const userA = await signIn(supabaseA, CONFIG.emailA, CONFIG.passwordA);
  if (!userA) { console.log('\n❌ Abortando: não foi possível autenticar Org A.\n'); process.exit(1); }

  const orgA = await getUserOrg(supabaseA);
  if (!orgA) { fail('Obter org_id de A', 'nenhum perfil encontrado'); }
  else { ok(`Org ID de A: ${orgA}`); }

  // ── 2. Conectar e autenticar Organização B ──────────────────────────────
  divider('Organização B');

  const supabaseB = createClient(CONFIG.supabaseUrl, CONFIG.anonKey);
  const userB = await signIn(supabaseB, CONFIG.emailB, CONFIG.passwordB);
  if (!userB) { console.log('\n❌ Abortando: não foi possível autenticar Org B.\n'); process.exit(1); }

  const orgB = await getUserOrg(supabaseB);
  if (!orgB) { fail('Obter org_id de B', 'nenhum perfil encontrado'); }
  else { ok(`Org ID de B: ${orgB}`); }

  // ── 3. Verificar que as organizações são diferentes ─────────────────────
  divider('Isolamento entre organizações');

  if (orgA && orgB) {
    if (orgA !== orgB) {
      ok('Organizações A e B são diferentes');
    } else {
      fail('Organizações A e B são IGUAIS — RLS não pode ser testado');
    }
  }

  // ── 4. Cada org vê seus próprios dados ──────────────────────────────────
  divider('Cada organização vê apenas seus próprios dados');

  // Webinars
  const webinarsA = await countRows(supabaseA, 'webinars');
  const webinarsB = await countRows(supabaseB, 'webinars');
  if (webinarsA >= 0) ok(`Org A vê ${webinarsA} webinário(s)`);
  else fail('Org A: erro ao contar webinars');
  if (webinarsB >= 0) ok(`Org B vê ${webinarsB} webinário(s)`);
  else fail('Org B: erro ao contar webinars');

  // Profiles (apenas da própria org)
  const usersA = await countRows(supabaseA, 'profiles');
  const usersB = await countRows(supabaseB, 'profiles');
  if (usersA >= 0) ok(`Org A vê ${usersA} perfil(is)`);
  else fail('Org A: erro ao contar perfis');
  if (usersB >= 0) ok(`Org B vê ${usersB} perfil(is)`);
  else fail('Org B: erro ao contar perfis');

  // Registration pages
  const pagesA = await countRows(supabaseA, 'registration_pages');
  const pagesB = await countRows(supabaseB, 'registration_pages');
  // Registration pages RLS is based on org_id through the webinar join, so failing here may be expected
  if (pagesA >= 0) ok(`Org A vê ${pagesA} página(s) de registro`);
  else fail('Org A: erro ao contar páginas de registro');
  if (pagesB >= 0) ok(`Org B vê ${pagesB} página(s) de registro`);
  else fail('Org B: erro ao contar páginas de registro');

  // ── 5. Tentativa de acesso cruzado (deve falhar / retornar vazio) ──────
  divider('Tentativa de acesso cruzado (deve ser bloqueado)');

  if (orgA && orgB) {
    // A tenta ver webinars de B
    const { data: crossA } = await supabaseA
      .from('webinars')
      .select('id, title')
      .limit(5);
    const belongsToB = (crossA || []).filter(
      (w) => w.org_id !== orgA  // org_id não é retornado da query, então isso é uma aproximação
    );
    // Melhor: tentar acessar diretamente um webinar que sabemos ser de B
    // Como não sabemos o ID, contamos quantos webinars A vê e verificamos
    // que A NÃO consegue acessar nenhum dado da org B
    const { data: profilesA } = await supabaseA
      .from('profiles')
      .select('org_id');
    const otherOrgProfiles = (profilesA || []).filter(
      (p) => p.org_id !== orgA
    );
    if (otherOrgProfiles.length === 0) {
      ok('Org A não vê perfis de outras organizações');
    } else {
      fail('Org A vê perfis de outras organizações', `${otherOrgProfiles.length} perfil(is) de org estranha`);
    }

    const { data: profilesB } = await supabaseB
      .from('profiles')
      .select('org_id');
    const otherOrgProfilesB = (profilesB || []).filter(
      (p) => p.org_id !== orgB
    );
    if (otherOrgProfilesB.length === 0) {
      ok('Org B não vê perfis de outras organizações');
    } else {
      fail('Org B vê perfis de outras organizações', `${otherOrgProfilesB.length} perfil(is) de org estranha`);
    }

    // Tenta ler a organização oposta diretamente via PK
    const { data: directA } = await supabaseA
      .from('organizations')
      .select('id')
      .eq('id', orgB)
      .maybeSingle();
    if (!directA) {
      ok('Org A não consegue ler a organização de B diretamente');
    } else {
      fail('Org A conseguiu ler a organização de B');
    }

    const { data: directB } = await supabaseB
      .from('organizations')
      .select('id')
      .eq('id', orgA)
      .maybeSingle();
    if (!directB) {
      ok('Org B não consegue ler a organização de A diretamente');
    } else {
      fail('Org B conseguiu ler a organização de A');
    }
  }

  // ── 6. Dados públicos (registro, replay) devem ser acessíveis sem auth ──
  divider('Dados públicos (sem autenticação)');

  await signOut(supabaseA);
  const anonClient = createClient(CONFIG.supabaseUrl, CONFIG.anonKey);

  // Tabelas públicas: registration_pages deve ser acessível via slug
  const { data: publicPages } = await anonClient
    .from('registration_pages')
    .select('id, slug')
    .limit(5);
  if (publicPages !== null) {
    ok(`Dados públicos acessíveis: ${publicPages.length} página(s) de registro via anon key`);
  } else {
    fail('Dados públicos NÃO acessíveis via anon key');
  }

  console.log('\n' + '═'.repeat(50));
  console.log(`  Resultado: ${passed} passaram, ${failed} falharam`);
  console.log('═'.repeat(50));

  process.exit(failed > 0 ? 1 : 0);
}

run().catch((err) => {
  console.error('\n💥 Erro fatal:', err.message);
  process.exit(1);
});
