import { Page, Locator } from '@playwright/test'

export class WaitRoomPage {
  readonly page: Page
  readonly countdownTimer: Locator
  readonly pageTitle: Locator
  readonly hintMessage: Locator

  constructor(page: Page) {
    this.page = page
    this.countdownTimer = page.locator('.wait-countdown')
    this.pageTitle = page.locator('.wait-room-card h1')
    this.hintMessage = page.locator('.wait-room-hint')
  }

  async goto(slug: string) {
    await this.page.goto(`/wait/${slug}`)
    await this.page.waitForSelector('.wait-loading', { state: 'hidden', timeout: 15000 }).catch(() => {})
    await this.page.waitForSelector('.wait-room-page', { timeout: 15000 }).catch(() => {})
  }

  async isCountdownVisible(): Promise<boolean> {
    return this.countdownTimer.isVisible().catch(() => false)
  }

  async getCountdownText(): Promise<string | null> {
    if (await this.isCountdownVisible()) {
      return this.countdownTimer.textContent()
    }
    return null
  }
}
