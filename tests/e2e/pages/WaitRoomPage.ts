import { Page, Locator } from '@playwright/test'

export class WaitRoomPage {
  readonly page: Page
  readonly countdownTimer: Locator
  readonly audienceCounter: Locator
  readonly enterRoomButton: Locator
  readonly waitingMessage: Locator

  constructor(page: Page) {
    this.page = page
    this.countdownTimer = page.locator('[data-testid="countdown"], .countdown-timer')
    this.audienceCounter = page.locator('[data-testid="audience-counter"], .audience-count')
    this.enterRoomButton = page.locator('[data-testid="enter-room"], .enter-room-btn')
    this.waitingMessage = page.locator('[data-testid="waiting-message"], .waiting-text')
  }

  async goto(slug: string) {
    await this.page.goto(`/wait/${slug}`)
    await this.page.waitForLoadState('networkidle')
  }

  async getAudienceCount(): Promise<string | null> {
    if (await this.audienceCounter.isVisible().catch(() => false)) {
      return this.audienceCounter.textContent()
    }
    return null
  }

  async isCountdownVisible(): Promise<boolean> {
    return this.countdownTimer.isVisible().catch(() => false)
  }

  async clickEnterRoom() {
    await this.enterRoomButton.click()
    await this.page.waitForLoadState('networkidle')
  }
}
