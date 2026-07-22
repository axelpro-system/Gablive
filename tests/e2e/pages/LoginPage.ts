import { Page, Locator } from '@playwright/test'

export class LoginPage {
  readonly page: Page
  readonly emailInput: Locator
  readonly passwordInput: Locator
  readonly submitButton: Locator
  readonly errorMessage: Locator

  constructor(page: Page) {
    this.page = page
    this.emailInput = page.locator('#login-email')
    this.passwordInput = page.locator('#login-password')
    this.submitButton = page.locator('button.auth-submit')
    this.errorMessage = page.locator('.auth-error')
  }

  async goto() {
    await this.page.goto('/auth/login')
    await this.page.waitForLoadState('networkidle')
  }

  async login(email: string, password: string) {
    await this.emailInput.fill(email)
    await this.passwordInput.fill(password)
    await this.submitButton.click()
    await this.page.waitForLoadState('networkidle')
  }

  async getErrorMessage(): Promise<string | null> {
    if (await this.errorMessage.isVisible().catch(() => false)) {
      return this.errorMessage.textContent()
    }
    return null
  }
}
