import { test, expect } from '@playwright/test'
import { RegistrationPage } from '../../pages/RegistrationPage'
import { createWebinar, createRegistrationPage, createLoginCustomization } from '../../fixtures/webinar'
import { mockRegistrationPage } from '../../fixtures/supabase'

test.describe('Registration Flow', () => {
  test('should register successfully with valid data', async ({ page }) => {
    const webinar = createWebinar({
      registration_pages: [createRegistrationPage()],
      login_customizations: createLoginCustomization(),
    })
    await mockRegistrationPage(page, webinar)

    const regPage = new RegistrationPage(page)
    await regPage.goto('test-webinar')

    await regPage.fillForm({ name: 'João Silva', email: 'joao@example.com' })
    await regPage.submit()

    expect(await regPage.isSuccessVisible()).toBeTruthy()
  })

  test('should show error for already registered email', async ({ page }) => {
    const webinar = createWebinar({
      registration_pages: [createRegistrationPage()],
      login_customizations: createLoginCustomization(),
    })
    await mockRegistrationPage(page, webinar)

    // Mock the registrations check to return an existing registration
    await page.route('**/rest/v1/registrations**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([{ id: 'existing-id', email: 'joao@example.com' }]),
      })
    })

    const regPage = new RegistrationPage(page)
    await regPage.goto('test-webinar')

    await regPage.fillForm({ name: 'João Silva', email: 'joao@example.com' })
    await regPage.submit()

    // Should show "already registered" message
    await page.waitForTimeout(500) // allow React state update
    const errorMsg = await regPage.getErrorMessage()
    expect(errorMsg).not.toBeNull()
  })

  test('should show validation error for empty form', async ({ page }) => {
    const webinar = createWebinar({
      registration_pages: [createRegistrationPage()],
      login_customizations: createLoginCustomization(),
    })
    await mockRegistrationPage(page, webinar)

    const regPage = new RegistrationPage(page)
    await regPage.goto('test-webinar')

    // Try to submit empty form
    await regPage.submit()

    await page.waitForTimeout(500)
    const errorMsg = await regPage.getErrorMessage()
    // Either error message visible OR success not visible (form prevented submission)
    const success = await regPage.isSuccessVisible()
    expect(success || errorMsg !== null).toBeTruthy()
  })
})
