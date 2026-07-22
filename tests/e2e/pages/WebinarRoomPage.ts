import { Page, Locator } from '@playwright/test'

export class WebinarRoomPage {
  readonly page: Page
  readonly videoPlayer: Locator
  readonly audienceCounter: Locator
  readonly chatContainer: Locator
  readonly chatMessages: Locator
  readonly ctaBanner: Locator
  readonly ctaBuyButton: Locator
  readonly originalPrice: Locator
  readonly salePrice: Locator

  constructor(page: Page) {
    this.page = page
    this.videoPlayer = page.locator('[data-testid="video-player"], .video-container, iframe')
    this.audienceCounter = page.locator('[data-testid="audience-counter"], .audience-count')
    this.chatContainer = page.locator('[data-testid="chat-container"], .chat-panel')
    this.chatMessages = page.locator('[data-testid="chat-message"], .chat-message-item')
    this.ctaBanner = page.locator('[data-testid="cta-banner"], .cta-overlay, .cta-banner')
    this.ctaBuyButton = page.locator('[data-testid="cta-buy-button"], .cta-buy-btn')
    this.originalPrice = page.locator('[data-testid="original-price"], .original-price')
    this.salePrice = page.locator('[data-testid="sale-price"], .sale-price')
  }

  async goto(slug: string) {
    await this.page.goto(`/room/${slug}`)
    await this.page.waitForLoadState('networkidle')
  }

  async waitForPlayer() {
    await this.videoPlayer.waitFor({ state: 'visible', timeout: 15000 }).catch(() => {})
  }

  async getAudienceCount(): Promise<string | null> {
    if (await this.audienceCounter.isVisible().catch(() => false)) {
      return this.audienceCounter.textContent()
    }
    return null
  }

  async getChatMessageCount(): Promise<number> {
    return this.chatMessages.count()
  }

  async isChatVisible(): Promise<boolean> {
    return this.chatContainer.isVisible().catch(() => false)
  }

  async isCtaVisible(): Promise<boolean> {
    return this.ctaBanner.isVisible().catch(() => false)
  }

  async clickCta() {
    await this.ctaBuyButton.click()
  }
}
