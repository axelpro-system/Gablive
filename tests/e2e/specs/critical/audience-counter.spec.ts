import { test, expect } from '@playwright/test'
import { WebinarRoomPage } from '../../pages/WebinarRoomPage'
import { createWebinar, createAudienceConfig } from '../../fixtures/webinar'
import { mockWebinarRoomPage } from '../../fixtures/supabase'

test.describe('Audience Counter', () => {
  test('should display dynamic audience count', async ({ page }) => {
    const webinar = createWebinar({
      audience_configs: createAudienceConfig({ mode: 'dynamic', current_count: 42 }),
    })
    await mockWebinarRoomPage(page, webinar)

    const roomPage = new WebinarRoomPage(page)
    await roomPage.goto('test-webinar')

    const count = await roomPage.getAudienceCount()
    expect(count).not.toBeNull()
    expect(count).toContain('42')
  })

  test('should display fixed audience count', async ({ page }) => {
    const webinar = createWebinar({
      audience_configs: createAudienceConfig({ mode: 'fixed', current_count: 15 }),
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
      audience_configs: createAudienceConfig({ mode: 'none', current_count: 0 }),
    })
    await mockWebinarRoomPage(page, webinar)

    const roomPage = new WebinarRoomPage(page)
    await roomPage.goto('test-webinar')

    const count = await roomPage.getAudienceCount()
    expect(count).toBeNull()
  })
})
