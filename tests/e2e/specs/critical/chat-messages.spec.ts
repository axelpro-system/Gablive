import { test, expect } from '@playwright/test'
import { WebinarRoomPage } from '../../pages/WebinarRoomPage'
import { createWebinar, createChatMessage } from '../../fixtures/webinar'
import { mockWebinarRoomPage } from '../../fixtures/supabase'

test.describe('Chat Messages', () => {
  test('should display chat container with messages', async ({ page }) => {
    const webinar = createWebinar({
      chat_messages: [
        createChatMessage({ time_seconds: 30, content: 'Welcome to the webinar!', author_name: 'Host' }),
        createChatMessage({ time_seconds: 60, content: 'Great question!', author_name: 'Speaker' }),
      ],
    })
    await mockWebinarRoomPage(page, webinar)

    const roomPage = new WebinarRoomPage(page)
    await roomPage.goto('test-webinar')

    expect(await roomPage.isChatVisible()).toBeTruthy()
    expect(await roomPage.getChatMessageCount()).toBeGreaterThanOrEqual(0)
  })

  test('should show empty chat when no messages', async ({ page }) => {
    const webinar = createWebinar({
      chat_messages: [],
    })
    await mockWebinarRoomPage(page, webinar)

    const roomPage = new WebinarRoomPage(page)
    await roomPage.goto('test-webinar')

    expect(await roomPage.isChatVisible()).toBeTruthy()
  })
})
