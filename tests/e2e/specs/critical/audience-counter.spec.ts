import { test, expect } from '@playwright/test'
import { WebinarRoomPage } from '../../pages/WebinarRoomPage'
import { createWebinar, createAudienceConfig, createEmptyAudienceConfig } from '../../fixtures/webinar'
import { mockWebinarRoomPage } from '../../fixtures/supabase'

test.describe('Audience Counter', () => {
  test('should display dynamic audience count', async ({ page }) => {
    const webinar = createWebinar({
      audience_configs: createAudienceConfig({ mode: 'dynamic' }),
    })
    await mockWebinarRoomPage(page, webinar)

    const roomPage = new WebinarRoomPage(page)
    await roomPage.goto('test-webinar')

    // Dynamic mode generates a number between dynamic_min and dynamic_max
    // We can't assert exact value, just that something is shown
    const count = await roomPage.getAudienceCount()
    expect(count).not.toBeNull()
  })

  test('should display fixed audience count', async ({ page }) => {
    const webinar = createWebinar({
      audience_configs: createAudienceConfig({ mode: 'fixed', fixed_count: 15 }),
    })
    await mockWebinarRoomPage(page, webinar)

    const roomPage = new WebinarRoomPage(page)
    await roomPage.goto('test-webinar')

    const count = await roomPage.getAudienceCount()
    expect(count).not.toBeNull()
    expect(count).toContain('15')
  })

  test('should hide counter when mode is none', async ({ page }) => {
    const webinar = createWebinar({
      audience_configs: createEmptyAudienceConfig(),
    })
    await mockWebinarRoomPage(page, webinar)

    const roomPage = new WebinarRoomPage(page)
    await roomPage.goto('test-webinar')

    const count = await roomPage.getAudienceCount()
    expect(count).toBeNull()
  })
})
