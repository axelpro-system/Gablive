import { test, expect } from '@playwright/test'
import { createWebinar, createAudienceConfig } from '../../fixtures/webinar'
import { mockWebinarRoomPage } from '../../fixtures/supabase'

test('debug: log all requests and test audience counter', async ({ page }) => {
  // Capture browser console logs
  const consoleLogs: string[] = []
  page.on('console', msg => {
    const text = msg.text()
    consoleLogs.push(text)
    if (text.startsWith('[DEBUG]')) {
      console.log(`[BROWSER] ${text}`)
    }
  })

  // Intercept the Supabase response to see what's returned
  page.on('response', async resp => {
    const url = resp.url()
    if (url.includes('rest/v1/webinars')) {
      const body = await resp.text()
      console.log(`[SUPABASE RESPONSE ${resp.status()}] ${url}`)
      console.log(`  Body: ${body.substring(0, 1000)}`)
    }
    if (resp.status() >= 400) {
      console.log(`[ERROR ${resp.status()}] ${url}`)
    }
  })

  // Log ALL requests the page makes
  const requests: string[] = []
  page.on('request', req => {
    requests.push(`[${req.method()}] ${req.url()}`)
    console.log(`[REQUEST] ${req.method()} ${req.url()}`)
  })
  page.on('requestfailed', req => {
    console.log(`[FAILED] ${req.method()} ${req.url()} - ${req.failure()?.errorText}`)
  })

  const webinar = createWebinar({
    video_url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    audience_configs: createAudienceConfig({ mode: 'fixed', fixed_count: 15 }),
  })
  console.log('Webinar audience_configs:', JSON.stringify(webinar.audience_configs))
  
  await mockWebinarRoomPage(page, webinar)
  
  // Navigate
  await page.goto('/room/test-webinar')
  
  // Wait for page to stabilize
  await page.waitForTimeout(5000)
  
  // Log what the page looks like
  console.log('Page URL:', page.url())
  console.log('Page title:', await page.title())
  
  // Check for key elements
  const bodyText = await page.locator('body').textContent()
  console.log('Body text (first 500 chars):', bodyText?.substring(0, 500))
  
  // Check audience counter
  const counter = page.locator('.room-viewers')
  const counterVisible = await counter.isVisible()
  console.log('Counter visible:', counterVisible)
  if (counterVisible) {
    console.log('Counter text:', await counter.textContent())
  }
  
  // Check room-page vs room-error
  const roomPage = page.locator('.room-page')
  const roomError = page.locator('.room-error')
  console.log('.room-page exists:', await roomPage.isVisible().catch(() => false))
  console.log('.room-error exists:', await roomError.isVisible().catch(() => false))
  
  // Log all requests for debugging
  console.log('\n=== ALL REQUESTS ===')
  requests.forEach(r => console.log(r))
  
  // The actual assertion
  const count = await (counterVisible ? counter.textContent() : Promise.resolve(null))
  console.log('Final audience count:', count)
  expect(count).not.toBeNull()
  expect(count).toContain('15')
})
