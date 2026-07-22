import { Page } from '@playwright/test'
import { WebinarData } from './webinar'

/**
 * Mock all Supabase PostgREST calls for a webinar room page.
 *
 * Relationship rules:
 * - audience_configs: OBJECT (UNIQUE on webinar_id → 1:1)
 * - login_customizations: OBJECT (UNIQUE on webinar_id → 1:1)
 * - cta_configs: ARRAY (1:N)
 * - registration_pages: ARRAY (1:N)
 * - simulated_messages: ARRAY (1:N)
 * - polls: ARRAY (1:N)
 * - sales_notifications: ARRAY (1:N)
 *
 * These were the root cause of a production bug. Do NOT guess — check the schema.
 */
export async function mockWebinarRoomPage(page: Page, webinar: WebinarData) {
  // Mock webinar query with all relations
  // NOTE: When the client uses .single(), postgrest-js v2.110+ sets
  // Accept: application/vnd.pgrst.object+json and expects PostgREST to return
  // a single object instead of an array. We must honor that header.
  await page.route(`**/rest/v1/webinars**`, async (route) => {
    const acceptHeader = route.request().headers()['accept'] || ''
    const isSingleRequest = acceptHeader.includes('application/vnd.pgrst.object+json')
    const body = JSON.stringify(isSingleRequest ? {
      ...webinar,
      audience_configs: webinar.audience_configs,           // OBJECT
      login_customizations: webinar.login_customizations,   // OBJECT
      cta_configs: webinar.cta_configs,                     // ARRAY
      registration_pages: webinar.registration_pages,       // ARRAY
      chat_messages: webinar.chat_messages,                 // ARRAY
      simulated_messages: webinar.simulated_messages || [], // ARRAY
      sales_notifications: webinar.sales_notifications || [],// ARRAY
      polls: webinar.polls || [],                           // ARRAY
    } : [{
      ...webinar,
      audience_configs: webinar.audience_configs,           // OBJECT
      login_customizations: webinar.login_customizations,   // OBJECT
      cta_configs: webinar.cta_configs,                     // ARRAY
      registration_pages: webinar.registration_pages,       // ARRAY
      chat_messages: webinar.chat_messages,                 // ARRAY
      simulated_messages: webinar.simulated_messages || [], // ARRAY
      sales_notifications: webinar.sales_notifications || [],// ARRAY
      polls: webinar.polls || [],                           // ARRAY
    }])
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body,
    })
  })

  // Mock individual table queries
  await page.route(`**/rest/v1/audience_configs**`, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(webinar.audience_configs),  // OBJECT
    })
  })

  await page.route(`**/rest/v1/registration_pages**`, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(webinar.registration_pages),
    })
  })

  await page.route(`**/rest/v1/chat_messages**`, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(webinar.chat_messages),
    })
  })

  await page.route(`**/rest/v1/cta_configs**`, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(webinar.cta_configs),  // ARRAY
    })
  })

  await page.route(`**/rest/v1/registrations**`, async (route) => {
    const acceptHeader = route.request().headers()['accept'] || ''
    const isSingleRequest = acceptHeader.includes('application/vnd.pgrst.object+json')
    // Default: no existing registration
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(isSingleRequest ? null : []),
    })
  })

  await page.route(`**/rest/v1/login_customizations**`, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(webinar.login_customizations),  // OBJECT
    })
  })

  // Block external embeds (YouTube, Vimeo)
  await page.route(/youtube\.com|vimeo\.com/, async (route) => {
    await route.fulfill({ status: 204 })
  })

  // Mock locale translations
  await page.route(`**/locales/*.json`, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        common: { loading: 'Carregando...', name: 'Nome', email: 'Email', phone: 'Telefone', optional: 'opcional' },
        room: { title: 'Sala', watching: '{count} assistindo', waitingToStart: 'Aguardando início', liveNow: 'Ao vivo' },
        chat: { title: 'Chat', placeholder: 'Digite sua mensagem' },
        registration: { title: 'Inscreva-se', submitButton: 'Confirmar', alreadyRegistered: 'Você já está registrado' },
        auth: { loginTitle: 'Entrar', namePlaceholder: 'Seu nome', emailPlaceholder: 'seu@email.com', login: 'Entrar', loginError: 'Erro ao entrar' },
      }),
    })
  })
}

/**
 * Mock registration page data.
 * Same relationship rules apply.
 */
export async function mockRegistrationPage(page: Page, webinar: WebinarData) {
  // Mock the main webinar query used by RegistrationPage
  await page.route(`**/rest/v1/webinars**`, async (route) => {
    const acceptHeader = route.request().headers()['accept'] || ''
    const isSingleRequest = acceptHeader.includes('application/vnd.pgrst.object+json')
    const body = JSON.stringify(isSingleRequest ? {
      ...webinar,
      audience_configs: webinar.audience_configs,
      login_customizations: webinar.login_customizations,   // OBJECT
      registration_pages: webinar.registration_pages,
      cta_configs: webinar.cta_configs,                     // ARRAY
    } : [{
      ...webinar,
      audience_configs: webinar.audience_configs,
      login_customizations: webinar.login_customizations,   // OBJECT
      registration_pages: webinar.registration_pages,
      cta_configs: webinar.cta_configs,                     // ARRAY
    }])
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body,
    })
  })

  // Mock registrations check (SELECT for duplicate email)
  await page.route(`**/rest/v1/registrations**`, async (route) => {
    const method = route.request().method()
    if (method === 'POST') {
      // INSERT — return success (with .single(), object is correct)
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 'new-reg-id',
          webinar_id: webinar.id,
          name: 'João Silva',
          email: 'joao@example.com',
        }),
      })
    } else {
      // SELECT — no existing registration
      const acceptHeader = route.request().headers()['accept'] || ''
      const isSingleRequest = acceptHeader.includes('application/vnd.pgrst.object+json')
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(isSingleRequest ? null : []),
      })
    }
  })

  // Block external embeds + locales (same as above)
  await page.route(/youtube\.com|vimeo\.com/, async (route) => {
    await route.fulfill({ status: 204 })
  })
  await page.route(`**/locales/*.json`, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        common: { loading: 'Carregando...', name: 'Nome', email: 'Email', phone: 'Telefone', optional: 'opcional' },
        registration: {
          title: 'Inscreva-se',
          startsIn: 'Começa em',
          days: 'dias',
          hours: 'horas',
          minutes: 'min',
          seconds: 'seg',
          successTitle: 'Inscrição Confirmada!',
          successMessage: 'Você receberá um e-mail com os detalhes.',
          registerButton: 'Garantir minha vaga',
          alreadyRegistered: 'Você já está registrado',
        },
        room: { title: 'Sala' },
        auth: { namePlaceholder: 'Seu nome', emailPlaceholder: 'seu@email.com' },
        common: { name: 'Nome', email: 'Email', phone: 'Telefone', optional: 'opcional' },
      }),
    })
  })
}
