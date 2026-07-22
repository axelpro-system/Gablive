import { Page } from '@playwright/test'
import { WebinarData } from './webinar'

/**
 * Mock all Supabase PostgREST calls for a webinar room page.
 * audience_configs is returned as an OBJECT (not array) because the table
 * has UNIQUE on webinar_id — PostgREST returns a single object for 1:1 relations.
 * 
 * This was the root cause of a production bug. Do NOT wrap in array.
 */
export async function mockWebinarRoomPage(page: Page, webinar: WebinarData) {
  const supabaseUrl = 'https://lgmtuabuuarxyfnhidbr.supabase.co'

  // Mock webinar query — the main fetch
  await page.route(`**/rest/v1/webinars**`, async (route) => {
    const url = route.request().url()
    if (url.includes('audience_configs') || url.includes('select=*')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([{
          ...webinar,
          audience_configs: webinar.audience_configs,  // OBJECT, properly typed
          cta_configs: webinar.cta_configs,
          registration_pages: webinar.registration_pages,
          login_customizations: webinar.login_customizations,  // OBJECT
        }]),
      })
    } else {
      await route.fulfill({ status: 200, contentType: 'application/json', body: '[]' })
    }
  })

  // Mock audience_configs query (if queried separately)
  await page.route(`**/rest/v1/audience_configs**`, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      // Return OBJECT, not array — UNIQUE constraint
      body: JSON.stringify(webinar.audience_configs),
    })
  })

  // Mock registration_pages
  await page.route(`**/rest/v1/registration_pages**`, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(webinar.registration_pages),
    })
  })

  // Mock chat_messages
  await page.route(`**/rest/v1/chat_messages**`, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(webinar.chat_messages),
    })
  })

  // Mock cta_configs
  await page.route(`**/rest/v1/cta_configs**`, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(webinar.cta_configs),
    })
  })

  // Mock registrations check
  await page.route(`**/rest/v1/registrations**`, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([]),
    })
  })

  // Mock login_customizations
  await page.route(`**/rest/v1/login_customizations**`, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(webinar.login_customizations),
    })
  })

  // Block external embeds (YouTube, Vimeo)
  await page.route(/youtube\.com|vimeo\.com/, async (route) => {
    await route.fulfill({ status: 204 })
  })

  // Mock locale files
  await page.route(`**/locales/*.json`, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        room: {
          audience: '{count} assistindo',
          chat: { title: 'Chat' },
          cta: { buy: 'Comprar Agora' },
        },
        registration: {
          title: 'Inscreva-se',
          submitButton: 'Confirmar',
          alreadyRegistered: 'Você já está registrado',
        },
      }),
    })
  })
}

/**
 * Mock registration page data.
 * Same pattern — audience_configs and login_customizations are objects, not arrays.
 */
export async function mockRegistrationPage(page: Page, webinar: WebinarData) {
  await page.route(`**/rest/v1/rpc/*`, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        ...webinar,
        audience_configs: webinar.audience_configs,
        login_customizations: webinar.login_customizations,  // OBJECT
        registration_pages: webinar.registration_pages,
      }),
    })
  })

  // Also mock direct table queries
  await page.route(`**/rest/v1/webinars**`, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([{
        ...webinar,
        audience_configs: webinar.audience_configs,
        login_customizations: webinar.login_customizations,
        registration_pages: webinar.registration_pages,
      }]),
    })
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
        registration: {
          title: 'Inscreva-se',
          submitButton: 'Confirmar',
          alreadyRegistered: 'Você já está registrado',
        },
      }),
    })
  })
}
