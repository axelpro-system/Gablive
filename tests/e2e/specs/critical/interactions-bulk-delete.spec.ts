import { test, expect, Page } from '@playwright/test'

const USER_ID = '11111111-1111-1111-1111-111111111111'
const ORG_ID = '22222222-2222-2222-2222-222222222222'
const WEBINAR_ID = '33333333-3333-3333-3333-333333333333'
const PROJECT_REF = 'lgmtuabuuarxyfnhidbr'

function fakeJwt(payload: Record<string, unknown>) {
  const enc = (obj: unknown) => Buffer.from(JSON.stringify(obj)).toString('base64url')
  return `${enc({ alg: 'HS256', typ: 'JWT' })}.${enc(payload)}.sig`
}

function json(route: { fulfill: Function }, body: unknown, extra: Record<string, unknown> = {}) {
  return route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify(body),
    ...extra,
  })
}

async function mockAuthenticatedEditor(page: Page) {
  const now = Math.floor(Date.now() / 1000)
  const user = {
    id: USER_ID,
    email: 'operator@example.com',
    aud: 'authenticated',
    role: 'authenticated',
    app_metadata: { provider: 'email' },
    user_metadata: { name: 'Operador' },
  }
  const accessToken = fakeJwt({
    sub: USER_ID,
    email: user.email,
    role: 'authenticated',
    aud: 'authenticated',
    exp: now + 3600,
    iat: now,
  })
  const session = {
    access_token: accessToken,
    refresh_token: 'refresh-token',
    token_type: 'bearer',
    expires_in: 3600,
    expires_at: now + 3600,
    user,
  }

  const profile = {
    id: 'profile-1',
    user_id: USER_ID,
    org_id: ORG_ID,
    role: 'owner',
    display_name: 'Operador',
    email: user.email,
    locale: 'pt-BR',
    organizations: { id: ORG_ID, name: 'Org Teste', slug: 'org-teste' },
  }

  const webinar = {
    id: WEBINAR_ID,
    org_id: ORG_ID,
    title: 'Webinar Bulk Delete',
    slug: 'webinar-bulk-delete',
    status: 'draft',
    type: 'recorded',
    video_url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
  }

  let messages = [
    { id: 'msg-1', webinar_id: WEBINAR_ID, author_name: 'Maria S.', message: 'Primeira', timestamp_seconds: 10 },
    { id: 'msg-2', webinar_id: WEBINAR_ID, author_name: 'João C.', message: 'Segunda', timestamp_seconds: 20 },
    { id: 'msg-3', webinar_id: WEBINAR_ID, author_name: 'Ana L.', message: 'Terceira', timestamp_seconds: 30 },
  ]
  let ctas = [
    { id: 'cta-1', webinar_id: WEBINAR_ID, title: 'Oferta A', button_text: 'Comprar', button_url: 'https://example.com/a', show_at_seconds: 60, sale_price: 97 },
    { id: 'cta-2', webinar_id: WEBINAR_ID, title: 'Oferta B', button_text: 'Garantir', button_url: 'https://example.com/b', show_at_seconds: 120, sale_price: 47 },
  ]
  let sales = [
    { id: 'sale-1', webinar_id: WEBINAR_ID, buyer_name: 'Carla', buyer_location: 'SP', product_name: 'Curso', show_at_seconds: 80 },
    { id: 'sale-2', webinar_id: WEBINAR_ID, buyer_name: 'Bruno', buyer_location: 'RJ', product_name: 'Mentoria', show_at_seconds: 140 },
  ]
  const polls: unknown[] = []
  const audience = {
    id: 'aud-1',
    webinar_id: WEBINAR_ID,
    mode: 'none',
    fixed_count: 0,
    dynamic_min: 0,
    dynamic_max: 0,
  }

  const parseInFilter = (url: string) => {
    const match = url.match(/id=in\.\(([^)]+)\)/)
    if (!match) return []
    return match[1].split(',').map((id) => id.replace(/^"|"$/g, ''))
  }

  await page.addInitScript(
    ({ storageKey, sessionJson }) => {
      window.localStorage.setItem(storageKey, sessionJson)
    },
    { storageKey: `sb-${PROJECT_REF}-auth-token`, sessionJson: JSON.stringify(session) },
  )

  await page.route('**/auth/v1/**', async (route) => {
    const url = route.request().url()
    if (url.includes('/token')) {
      return json(route, session)
    }
    return json(route, user)
  })

  await page.route('**/rest/v1/**', async (route) => {
    const req = route.request()
    const url = req.url()
    const method = req.method()
    const accept = req.headers()['accept'] || ''
    const asSingle = accept.includes('application/vnd.pgrst.object+json')

    const fulfillRows = (rows: unknown) => {
      if (asSingle) {
        const row = Array.isArray(rows) ? rows[0] ?? null : rows
        return json(route, row)
      }
      return json(route, Array.isArray(rows) ? rows : [rows])
    }

    if (url.includes('/profiles')) return fulfillRows(profile)
    if (url.includes('/rpc/ensure_user_profile')) return json(route, profile)
    if (url.includes('/organizations')) return fulfillRows(profile.organizations)
    if (url.includes('/webinars')) return fulfillRows(webinar)
    if (url.includes('/audience_configs')) {
      if (method === 'POST') return json(route, audience)
      return fulfillRows(audience)
    }
    if (url.includes('/polls')) return fulfillRows(polls)
    if (url.includes('/audit_logs')) return json(route, { id: 'audit-1' })

    if (url.includes('/simulated_messages')) {
      if (method === 'DELETE') {
        const ids = parseInFilter(url)
        messages = messages.filter((m) => !ids.includes(m.id))
        return json(route, [])
      }
      return fulfillRows(messages)
    }
    if (url.includes('/cta_configs')) {
      if (method === 'DELETE') {
        const ids = parseInFilter(url)
        ctas = ctas.filter((c) => !ids.includes(c.id))
        return json(route, [])
      }
      return fulfillRows(ctas)
    }
    if (url.includes('/sales_notifications')) {
      if (method === 'DELETE') {
        const ids = parseInFilter(url)
        sales = sales.filter((s) => !ids.includes(s.id))
        return json(route, [])
      }
      return fulfillRows(sales)
    }

    return json(route, asSingle ? null : [])
  })
}

test.describe('Interactions bulk delete selectors', () => {
  test('selects and bulk-deletes chat, offer and sales items', async ({ page }) => {
    await mockAuthenticatedEditor(page)
    await page.goto(`/webinars/${WEBINAR_ID}?tab=interactions`)

    await expect(page.getByRole('heading', { name: 'Timeline do Chat Simulado' })).toBeVisible({ timeout: 15000 })
    await expect(page.getByRole('group', { name: 'Seleção em massa' })).toBeVisible()

    const chatChecks = page.locator('.timeline-item input[type="checkbox"]')
    await expect(chatChecks).toHaveCount(3)

    await chatChecks.nth(0).check()
    await chatChecks.nth(1).check()
    await expect(page.getByRole('button', { name: /Apagar selecionados \(2\)/ })).toBeVisible()

    page.once('dialog', (dialog) => dialog.dismiss())
    await page.getByRole('button', { name: /Apagar selecionados \(2\)/ }).click()
    await expect(chatChecks).toHaveCount(3)

    page.once('dialog', (dialog) => dialog.accept())
    await page.getByRole('button', { name: /Apagar selecionados \(2\)/ }).click()
    await expect(chatChecks).toHaveCount(1)
    await expect(page.getByText('Terceira')).toBeVisible()

    await page.getByRole('button', { name: 'Ofertas (CTAs)' }).click()
    await expect(page.getByRole('heading', { name: 'Ofertas e Banners (CTAs)' })).toBeVisible()
    const ctaChecks = page.locator('.timeline-item input[type="checkbox"]')
    await expect(ctaChecks).toHaveCount(2)
    await page.getByLabel('Selecionar todos').click()
    await expect(page.getByRole('button', { name: /Apagar selecionados \(2\)/ })).toBeVisible()
    page.once('dialog', (dialog) => dialog.accept())
    await page.getByRole('button', { name: /Apagar selecionados \(2\)/ }).click()
    await expect(page.getByText('Nenhuma oferta configurada.')).toBeVisible()

    await page.getByRole('button', { name: 'Vendas', exact: true }).click()
    await expect(page.getByRole('heading', { name: /Prova Social/ })).toBeVisible()
    const saleChecks = page.locator('.timeline-item input[type="checkbox"]')
    await expect(saleChecks).toHaveCount(2)
    await saleChecks.nth(0).check()
    page.once('dialog', (dialog) => dialog.accept())
    await page.getByRole('button', { name: /Apagar selecionados \(1\)/ }).click()
    await expect(saleChecks).toHaveCount(1)
    await expect(page.getByText('Bruno')).toBeVisible()
  })
})
