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
  video_url?: string
  is_just_in_time: boolean
  use_wait_room: boolean
  organization_id: string
  created_by: string
  created_at: string
  updated_at: string
  audience_configs: AudienceConfigData | null  // OBJECT — UNIQUE on webinar_id
  cta_configs: CtaConfigData[]               // ARRAY — 1:N relationship
  simulated_messages?: any[]
  sales_notifications?: any[]
  polls?: any[]
  registration_pages: RegistrationPageData[]
  chat_messages: ChatMessageData[]
  login_customizations: LoginCustomizationData | null  // OBJECT — UNIQUE on webinar_id
}

export interface AudienceConfigData {
  id?: string
  webinar_id?: string
  mode: 'dynamic' | 'fixed' | 'none'
  fixed_count: number
  dynamic_min: number
  dynamic_max: number
  updated_at?: string
}

export interface CtaConfigData {
  id?: string
  webinar_id?: string
  title?: string
  description?: string
  button_text?: string
  button_url?: string
  original_price: number | null
  sale_price: number | null
  pitch_start_seconds: number
  show_at_seconds?: number
  hide_at_seconds?: number | null
  banner_desktop_url: string | null
  banner_mobile_url: string | null
  is_active?: boolean
}

export interface RegistrationPageBlock {
  type: string
  data?: {
    title?: string
    subtitle?: string
    cta?: string
    fields?: string[]
    items?: Array<{ title: string; description?: string }>
    text?: string
    content?: string
  }
}

export interface RegistrationPageData {
  id?: string
  webinar_id?: string
  blocks?: RegistrationPageBlock[]
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
  require_name?: boolean
  require_email?: boolean
  name_placeholder?: string
  email_placeholder?: string
  phone_placeholder?: string
  button_text?: string
  progress_bar_color?: string | null
  header_text?: string | null
  submit_button_text?: string | null
}

// Factory functions
export function createAudienceConfig(overrides?: Partial<AudienceConfigData>): AudienceConfigData {
  return {
    mode: 'dynamic',
    fixed_count: 42,
    dynamic_min: 35,
    dynamic_max: 50,
    ...overrides,
  }
}

export function createEmptyAudienceConfig(): AudienceConfigData {
  return {
    mode: 'none',
    fixed_count: 0,
    dynamic_min: 0,
    dynamic_max: 0,
  }
}

export function createCtaConfig(overrides?: Partial<CtaConfigData>): CtaConfigData {
  return {
    title: 'Oferta Especial',
    description: 'Compre agora com desconto',
    button_text: 'Quero essa oferta',
    button_url: 'https://example.com/checkout',
    original_price: 197.00,
    sale_price: 97.00,
    pitch_start_seconds: 0,
    show_at_seconds: 0,
    hide_at_seconds: null,
    banner_desktop_url: 'https://example.com/banner.jpg',
    banner_mobile_url: null,
    ...overrides,
  }
}

export function createRegistrationPage(overrides?: Partial<RegistrationPageData>): RegistrationPageData {
  return {
    blocks: [
      {
        type: 'hero',
        data: { title: 'Webinar Title', subtitle: 'Aprenda tudo sobre', cta: 'Quero participar' },
      },
      {
        type: 'form',
        data: { fields: ['name', 'email'] },
      },
    ],
    theme: { primaryColor: '#dc2626', backgroundColor: '#ffffff', textColor: '#111827' },
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
    require_name: true,
    require_email: true,
    name_placeholder: 'Seu nome completo',
    email_placeholder: 'seu@email.com',
    button_text: 'Garantir minha vaga',
    ...overrides,
  }
}

export function createWebinar(overrides?: Partial<WebinarData>): WebinarData {
  return {
    id: 'test-webinar-id',
    title: 'Test Webinar',
    slug: 'test-webinar',
    description: 'A test webinar for E2E',
    video_url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    scheduled_at: new Date(Date.now() + 3600000).toISOString(),
    status: 'published',
    webinar_type: 'live',
    is_just_in_time: false,
    use_wait_room: false,
    organization_id: 'test-org-id',
    created_by: 'test-user-id',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    audience_configs: createAudienceConfig(),       // OBJECT — UNIQUE on webinar_id
    cta_configs: [createCtaConfig()],               // ARRAY — 1:N relationship
    simulated_messages: [],
    sales_notifications: [],
    polls: [],
    registration_pages: [createRegistrationPage()],
    chat_messages: [
      createChatMessage({ time_seconds: 30, content: 'Welcome!' }),
      createChatMessage({ time_seconds: 60, content: 'Great content!' }),
    ],
    login_customizations: createLoginCustomization(), // OBJECT — UNIQUE on webinar_id
    ...overrides,
  }
}
