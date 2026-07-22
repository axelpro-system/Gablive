import { Page } from '@playwright/test'

// Types matching the Supabase schema
export interface WebinarData {
  id: string
  title: string
  slug: string
  description: string
  scheduled_at: string
  status: string
  webinar_type: string
  is_just_in_time: boolean
  use_wait_room: boolean
  organization_id: string
  created_by: string
  created_at: string
  updated_at: string
  audience_configs: AudienceConfigData | null  // OBJECT, NOT array — UNIQUE constraint
  cta_configs: CtaConfigData | null
  registration_pages: RegistrationPageData[]
  chat_messages: ChatMessageData[]
  login_customizations: LoginCustomizationData | null  // OBJECT, NOT array — UNIQUE constraint
}

export interface AudienceConfigData {
  id?: string
  webinar_id?: string
  mode: 'dynamic' | 'fixed' | 'none'
  current_count: number
  min_count?: number
  max_count?: number
  updated_at?: string
}

export interface CtaConfigData {
  id?: string
  webinar_id?: string
  original_price: number | null
  sale_price: number | null
  pitch_start_seconds: number
  banner_desktop_url: string | null
  banner_mobile_url: string | null
  is_active?: boolean
}

export interface RegistrationPageData {
  id?: string
  webinar_id?: string
  blocks?: any[]
  theme?: any
  published?: boolean
}

export interface ChatMessageData {
  id?: string
  webinar_id?: string
  content: string
  author_name: string
  time_seconds: number
  is_simulated: boolean
}

export interface LoginCustomizationData {
  id?: string
  webinar_id?: string
  show_logo?: boolean
  logo_url?: string | null
  require_phone?: boolean
  progress_bar_color?: string | null
  header_text?: string | null
  submit_button_text?: string | null
}

// Factory functions
export function createAudienceConfig(overrides?: Partial<AudienceConfigData>): AudienceConfigData {
  return {
    mode: 'dynamic',
    current_count: 42,
    ...overrides,
  }
}

export function createCtaConfig(overrides?: Partial<CtaConfigData>): CtaConfigData {
  return {
    original_price: 197.00,
    sale_price: 97.00,
    pitch_start_seconds: 120,
    banner_desktop_url: 'https://example.com/banner.jpg',
    banner_mobile_url: null,
    ...overrides,
  }
}

export function createRegistrationPage(overrides?: Partial<RegistrationPageData>): RegistrationPageData {
  return {
    blocks: [
      { type: 'hero', content: { title: 'Webinar Title' } },
      { type: 'form', content: {} },
    ],
    theme: { primaryColor: '#ff0000' },
    published: true,
    ...overrides,
  }
}

export function createChatMessage(overrides?: Partial<ChatMessageData>): ChatMessageData {
  return {
    content: 'Great webinar!',
    author_name: 'Participant',
    time_seconds: 60,
    is_simulated: true,
    ...overrides,
  }
}

export function createLoginCustomization(overrides?: Partial<LoginCustomizationData>): LoginCustomizationData {
  return {
    show_logo: true,
    logo_url: null,
    require_phone: false,
    ...overrides,
  }
}

export function createWebinar(overrides?: Partial<WebinarData>): WebinarData {
  return {
    id: 'test-webinar-id',
    title: 'Test Webinar',
    slug: 'test-webinar',
    description: 'A test webinar for E2E',
    scheduled_at: new Date(Date.now() + 3600000).toISOString(),
    status: 'published',
    webinar_type: 'live',
    is_just_in_time: false,
    use_wait_room: false,
    organization_id: 'test-org-id',
    created_by: 'test-user-id',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    audience_configs: createAudienceConfig(),  // OBJECT, not array
    cta_configs: createCtaConfig(),
    registration_pages: [createRegistrationPage()],
    chat_messages: [
      createChatMessage({ time_seconds: 30, content: 'Welcome!' }),
      createChatMessage({ time_seconds: 60, content: 'Great content!' }),
    ],
    login_customizations: createLoginCustomization(),  // OBJECT, not array
    ...overrides,
  }
}
