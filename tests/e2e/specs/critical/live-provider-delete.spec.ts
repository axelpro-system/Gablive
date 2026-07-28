import { test, expect, Page } from '@playwright/test'
import { createWebinar } from '../../fixtures/webinar'
import { WebinarRoomPage } from '../../pages/WebinarRoomPage'

async function mockPublicRoomRpc(page: Page, webinar: ReturnType<typeof createWebinar>) {
  const webinarRecord = webinar as ReturnType<typeof createWebinar> & { type?: string }
  await page.route('**/rest/v1/rpc/get_public_webinar_by_slug', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        ...webinarRecord,
        type: webinarRecord.type || webinarRecord.webinar_type,
        audience_configs: webinarRecord.audience_configs,
        login_customizations: webinarRecord.login_customizations,
        registration_pages: webinarRecord.registration_pages,
        cta_configs: webinarRecord.cta_configs,
        simulated_messages: webinarRecord.simulated_messages || [],
        sales_notifications: webinarRecord.sales_notifications || [],
        polls: webinarRecord.polls || [],
      }),
    })
  })

  await page.route('**/rest/v1/rpc/get_registration_by_id', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(null),
    })
  })

  await page.route('**/rest/v1/rpc/mark_registration_attended', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(null),
    })
  })

  await page.route('**/rest/v1/rpc/get_public_simulated_messages', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([]),
    })
  })

  await page.route('**/rest/v1/chat_messages**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([]),
    })
  })

  await page.route('**/rest/v1/analytics_events**', async (route) => {
    await route.fulfill({
      status: 201,
      contentType: 'application/json',
      body: JSON.stringify([]),
    })
  })

  await page.route(/youtube\.com|vimeo\.com/, async (route) => {
    await route.fulfill({ status: 204 })
  })
}

test.describe('critical sales provider, live, and delete flows', () => {
  test('scheduled live webinar opens the player when scheduled_at has passed', async ({ page }) => {
    const webinar = createWebinar({
      slug: 'live-now',
      webinar_type: 'live',
      status: 'scheduled',
      scheduled_at: new Date(Date.now() - 60_000).toISOString(),
      video_url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    }) as ReturnType<typeof createWebinar> & { type: string }
    webinar.type = 'live'

    await mockPublicRoomRpc(page, webinar)

    const room = new WebinarRoomPage(page)
    await room.goto('live-now')

    await expect(room.videoPlayer).toBeVisible()
    await expect(page.locator('.room-waiting')).toHaveCount(0)
  })

  test.skip('configures Hotmart/Selflux provider mock in dashboard', async () => {
    // Requires tasks 1-6: provider schema, Edge Functions, and dashboard integration UI.
  })

  test.skip('starts and ends a live webinar from the editor', async () => {
    // Requires task 8: manual start/end controls in the authenticated webinar editor.
  })

  test.skip('deletes a webinar through title confirmation', async () => {
    // Requires tasks 9-10: centralized delete action wired to list and edit pages.
  })
})
