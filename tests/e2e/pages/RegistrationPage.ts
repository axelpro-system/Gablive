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

  constructor(page: Page) {
    this.page = page
    this.nameInput = page.locator('input[name="name"], input[data-testid="name-input"]')
    this.emailInput = page.locator('input[name="email"], input[data-testid="email-input"]')
    this.phoneInput = page.locator('input[name="phone"], input[data-testid="phone-input"]')
    this.submitButton = page.locator('button[type="submit"], [data-testid="register-submit"]')
    this.successMessage = page.locator('[data-testid="registration-success"], .reg-success')
    this.errorMessage = page.locator('[data-testid="registration-error"], .reg-error')
    this.countdown = page.locator('[data-testid="countdown"], .countdown')
  }

  async goto(slug: string) {
    await this.page.goto(`/register/${slug}`)
    await this.page.waitForLoadState('networkidle')
  }

  async fillForm(data: { name: string; email: string; phone?: string }) {
    await this.nameInput.fill(data.name)
    await this.emailInput.fill(data.email)
    if (data.phone && await this.phoneInput.isVisible()) {
      await this.phoneInput.fill(data.phone)
    }
  }

  async submit() {
    await this.submitButton.click()
    await this.page.waitForLoadState('networkidle')
  }

  async isSuccessVisible() {
    return this.successMessage.isVisible()
  }

  async getErrorMessage() {
    return this.errorMessage.textContent()
  }
}
