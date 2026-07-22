import { Page, Locator } from '@playwright/test'

export class LoginPage {
  readonly page: Page
  readonly emailInput: Locator
  readonly passwordInput: Locator
  readonly submitButton: Locator
  readonly errorMessage: Locator
  readonly dashboardLink: Locator

  constructor(page: Page) {
    this.page = page
    this.emailInput = page.locator('input[name="email"], input[type="email"], [data-testid="email-input"]')
    this.passwordInput = page.locator('input[name="password"], input[type="password"], [data-testid="password-input"]')
    this.submitButton = page.locator('button[type="submit"], [data-testid="login-submit"]')
    this.errorMessage = page.locator('[data-testid="login-error"], .auth-error')
    this.dashboardLink = page.locator('[data-testid="dashboard-link"], a[href="/dashboard"]')
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

  async isLoggedIn(): Promise<boolean> {
    return this.dashboardLink.isVisible().catch(() => false)
  }

  async getErrorMessage(): Promise<string | null> {
    if (await this.errorMessage.isVisible().catch(() => false)) {
      return this.errorMessage.textContent()
    }
    return null
  }
}
