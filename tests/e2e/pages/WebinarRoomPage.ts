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
  readonly loadingSpinner: Locator
  readonly pageTitle: Locator

  constructor(page: Page) {
    this.page = page
    this.videoPlayer = page.locator('.room-video-wrapper iframe')
    this.audienceCounter = page.locator('.room-viewers')
    this.chatContainer = page.locator('.room-chat')
    this.chatMessages = page.locator('.room-chat-message')
    this.ctaBanner = page.locator('.room-cta-banner')
    this.ctaBuyButton = page.locator('.room-cta-button')
    this.originalPrice = page.locator('.room-cta-price-original')
    this.salePrice = page.locator('.room-cta-price-sale')
    this.loadingSpinner = page.locator('.room-loading')
    this.pageTitle = page.locator('.room-title')
  }

  async goto(slug: string) {
    await this.page.goto(`/room/${slug}`)
    // Wait for page content to load
    await this.page.waitForSelector('.room-loading', { state: 'hidden', timeout: 15000 }).catch(() => {})
    await this.page.waitForSelector('.room-page', { timeout: 15000 }).catch(() => {})
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

  async getCtaPrices(): Promise<{ original: string | null; sale: string | null }> {
    const original = await this.originalPrice.isVisible().catch(() => false)
      ? await this.originalPrice.textContent()
      : null
    const sale = await this.salePrice.isVisible().catch(() => false)
      ? await this.salePrice.textContent()
      : null
    return { original, sale }
  }

  async clickCta() {
    await this.ctaBuyButton.click()
  }
}
