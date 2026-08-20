import { Page, Locator } from '@playwright/test'

export class RegistrationPage {
  readonly page: Page
  readonly nameInput: Locator
  readonly emailInput: Locator
  readonly phoneInput: Locator
  readonly submitButton: Locator
  readonly successMessage: Locator
  readonly errorMessage: Locator
  readonly countdown: Locator
  readonly formSection: Locator
  readonly loadingSpinner: Locator

  constructor(page: Page) {
    this.page = page
    this.nameInput = page.locator('#reg-name')
    this.emailInput = page.locator('#reg-email')
    this.phoneInput = page.locator('#reg-phone')
    this.submitButton = page.locator('button.reg-submit')
    this.successMessage = page.locator('.reg-success-page, h1:has-text("Registro confirmado"), h1:has-text("Inscrição Confirmada")')
    this.errorMessage = page.locator('.auth-error')
    this.countdown = page.locator('.reg-countdown')
    this.formSection = page.locator('#reg-form')
    this.loadingSpinner = page.locator('.reg-loading')
  }

  async goto(slug: string) {
    await this.page.goto(`/register/${slug}`)
    // Wait for form to be ready (loading finishes)
    await this.page.waitForSelector('.reg-loading', { state: 'hidden', timeout: 15000 }).catch(() => {})
    await this.page.waitForSelector('#reg-form', { timeout: 15000 }).catch(() => {})
  }

  async fillForm(data: { name: string; email: string; phone?: string }) {
    await this.nameInput.fill(data.name)
    await this.emailInput.fill(data.email)
    if (data.phone && (await this.phoneInput.isVisible().catch(() => false))) {
      await this.phoneInput.fill(data.phone)
    }
    const consent = this.page.locator('.reg-consent-checkbox input[type="checkbox"]')
    if (await consent.isVisible().catch(() => false)) {
      await consent.check()
    }
  }

  async submit() {
    await this.submitButton.click()
    await this.page.waitForLoadState('networkidle')
  }

  async isSuccessVisible(timeout = 3000) {
    const successHeading = this.page.getByRole('heading', { name: /registro confirmado|inscri/i })
    try {
      await successHeading.waitFor({ state: 'visible', timeout })
      return true
    } catch {
      try {
        await this.successMessage.waitFor({ state: 'visible', timeout })
        return true
      } catch {
        return false
      }
    }
  }

  async getErrorMessage() {
    if (await this.errorMessage.isVisible().catch(() => false)) {
      return this.errorMessage.textContent()
    }
    return null
  }
}
