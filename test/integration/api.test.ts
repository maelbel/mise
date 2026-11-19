import { randomBytes } from 'node:crypto'
import { fileURLToPath } from 'node:url'
import { afterAll, beforeEach, describe, expect, it } from 'vitest'
import { fetch, setup } from '@nuxt/test-utils/e2e'
import type { FamilyMember, ProfileResponse, PublicUser, Recipe, WeekPlan } from '../../shared/types/domain'
import { emptyProfile } from '../../shared/utils/targets'
import { startOfWeek } from '../../shared/utils/week'
import { ADMIN, freshTestDb, MEMBER } from './testDb'

const WEEK = startOfWeek(new Date())

// The built server reads its settings from the environment: the test database,
// and a throwaway session secret made for this run only.
const conn = await freshTestDb()
process.env.POSTGRES_DB = conn.config.testDatabase
process.env.NUXT_APP_SECRET = randomBytes(32).toString('base64')

afterAll(async () => {
  await conn.close()
})

await setup({ rootDir: fileURLToPath(new URL('../..', import.meta.url)), server: true, browser: false })

/** Calls the API like a browser would: JSON in, the session cookie sent along. */
async function call(path: string, options: { method?: string, body?: unknown, cookie?: string } = {}) {
  const res = await fetch(path, {
    method: options.method ?? 'GET',
    headers: {
      ...(options.body === undefined ? {} : { 'content-type': 'application/json' }),
      ...(options.cookie ? { cookie: options.cookie } : {}),
    },
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
    redirect: 'manual',
  })
  const cookie = res.headers.getSetCookie().map((c) => c.split(';')[0]).find((c) => c.startsWith('nuxt-auth-session='))
  const text = await res.text()
  let data: unknown = text
  try {
    data = JSON.parse(text)
  } catch { /* not JSON */ }
  return { status: res.status, data, cookie, headers: res.headers }
}

async function login(email: string, password: string): Promise<string> {
  const res = await call('/api/auth/login', { method: 'POST', body: { email, password } })
  expect(res.status).toBe(200)
  expect(res.cookie).toBeTruthy()
  return res.cookie!
}

describe('without a session', () => {
  it('refuses the API and sends pages to the login page', async () => {
    expect((await call('/api/recipes')).status).toBe(401)
    expect((await call('/api/admin/users')).status).toBe(401)
    const page = await call('/')
    expect([301, 302, 307]).toContain(page.status)
    expect(page.headers.get('location')).toContain('/login')
  })

  it('serves the login page', async () => {
    const page = await call('/login')
    expect(page.status).toBe(200)
    expect(String(page.data)).toContain('Connexion')
  })
})

describe('login', () => {
  it('refuses a wrong password without saying whether the email exists', async () => {
    const wrong = await call('/api/auth/login', { method: 'POST', body: { email: ADMIN.email, password: 'nope-nope-nope' } })
    const unknown = await call('/api/auth/login', { method: 'POST', body: { email: 'nobody@example.test', password: 'nope-nope-nope' } })
    expect(wrong.status).toBe(401)
    expect(unknown.status).toBe(401)
    expect((wrong.data as { statusMessage: string }).statusMessage).toBe((unknown.data as { statusMessage: string }).statusMessage)
  })

  it('locks an email after 5 failures', async () => {
    for (let i = 0; i < 5; i++) {
      expect((await call('/api/auth/login', { method: 'POST', body: { email: 'target@example.test', password: `guess-${i}` } })).status).toBe(401)
    }
    const locked = await call('/api/auth/login', { method: 'POST', body: { email: 'target@example.test', password: 'guess-6' } })
    expect(locked.status).toBe(429)
    expect(Number(locked.headers.get('retry-after'))).toBeGreaterThan(0)
  })

  it('logs in, then out', async () => {
    const cookie = await login(ADMIN.email, ADMIN.password)
    const me = await call('/api/me', { cookie })
    expect((me.data as PublicUser).email).toBe(ADMIN.email)
    expect((me.data as PublicUser & { passwordHash?: string }).passwordHash).toBeUndefined()
    const out = await call('/api/auth/logout', { method: 'POST', cookie })
    expect(out.status).toBe(204)
    expect((await call('/api/me', { cookie: out.cookie })).status).toBe(401)
  })

  it('serves the week page to a logged-in user', async () => {
    const cookie = await login(ADMIN.email, ADMIN.password)
    const page = await call('/', { cookie })
    expect(page.status).toBe(200)
    expect(String(page.data)).toContain('Au menu cette semaine')
  })
})

describe('family admin', () => {
  let admin: string
  let member: string

  // The test server is only reachable inside tests and beforeEach hooks.
  beforeEach(async () => {
    if (admin) return
    admin = await login(ADMIN.email, ADMIN.password)
    member = await login(MEMBER.email, MEMBER.password)
  })

  it('is for the admin only', async () => {
    expect((await call('/api/admin/users', { cookie: member })).status).toBe(403)
    const list = await call('/api/admin/users', { cookie: admin })
    expect(list.status).toBe(200)
    expect((list.data as FamilyMember[]).map((m) => m.email)).toEqual([ADMIN.email, MEMBER.email])
  })

  it('creates a member who must choose a password before anything else', async () => {
    const created = await call('/api/admin/users', { method: 'POST', cookie: admin, body: { name: 'Carol', email: 'Carol@Example.test' } })
    expect(created.status).toBe(201)
    const { member: carol, temporaryPassword } = created.data as { member: FamilyMember, temporaryPassword: string }
    expect(carol.status).toBe('temporary')
    expect((await call('/api/admin/users', { method: 'POST', cookie: admin, body: { name: 'C', email: 'carol@example.test' } })).status).toBe(409)

    const temp = await login('carol@example.test', temporaryPassword)
    expect((await call('/api/recipes', { cookie: temp })).status).toBe(403)
    expect((await call('/api/auth/password', { method: 'POST', cookie: temp, body: { newPassword: 'short' } })).status).toBe(400)
    const changed = await call('/api/auth/password', { method: 'POST', cookie: temp, body: { newPassword: 'carol-own-password' } })
    expect(changed.status).toBe(200)
    expect((changed.data as PublicUser).mustChangePassword).toBe(false)
    // This device stays logged in with the refreshed cookie; the old one is over.
    expect((await call('/api/recipes', { cookie: changed.cookie })).status).toBe(200)
    expect((await call('/api/recipes', { cookie: temp })).status).toBe(401)
  })

  it('resets and disables a member, ending their sessions', async () => {
    const list = (await call('/api/admin/users', { cookie: admin })).data as FamilyMember[]
    const carol = list.find((m) => m.email === 'carol@example.test')!
    const carolSession = await login('carol@example.test', 'carol-own-password')

    const reset = await call(`/api/admin/users/${carol.id}/reset-password`, { method: 'POST', cookie: admin })
    expect(reset.status).toBe(200)
    expect((await call('/api/me', { cookie: carolSession })).status).toBe(401)

    const { temporaryPassword } = reset.data as { temporaryPassword: string }
    const disabled = await call(`/api/admin/users/${carol.id}`, { method: 'PATCH', cookie: admin, body: { disabled: true } })
    expect(disabled.status).toBe(200)
    expect((await call('/api/auth/login', { method: 'POST', body: { email: 'carol@example.test', password: temporaryPassword } })).status).toBe(403)

    const self = list.find((m) => m.isAdmin)!
    expect((await call(`/api/admin/users/${self.id}`, { method: 'PATCH', cookie: admin, body: { disabled: true } })).status).toBe(404)
  })
})

describe('separate data', () => {
  let alice: string
  let bob: string
  let aliceRecipe: Recipe

  beforeEach(async () => {
    if (alice) return
    alice = await login(ADMIN.email, ADMIN.password)
    bob = await login(MEMBER.email, MEMBER.password)
    const recipes = (await call('/api/recipes', { cookie: alice })).data as Recipe[]
    const created = await call('/api/recipes', {
      method: 'POST', cookie: alice,
      body: { name: 'Alice Soup', timeMin: 10, difficulty: 'Easy', kcal: 200, protein: 10, carbs: 20, fat: 5, ingredients: [recipes[0]!.ingredients[0]] },
    })
    expect(created.status).toBe(201)
    aliceRecipe = created.data as Recipe
  })

  it('lists only your own recipes', async () => {
    const bobs = (await call('/api/recipes', { cookie: bob })).data as Recipe[]
    expect(bobs).toHaveLength(5)
    expect(bobs.some((r) => r.id === aliceRecipe.id)).toBe(false)
  })

  it('refuses the other account\'s recipes and ingredients', async () => {
    const aliceIngredient = aliceRecipe.ingredients[0]!.ingredientId
    const slot = await call('/api/plan/slots', { method: 'PATCH', cookie: bob, body: { week: WEEK, updates: [{ day: 0, slot: 'lunch', recipeId: aliceRecipe.id }] } })
    expect(slot.status).toBe(400)
    expect((await call(`/api/stock/${aliceIngredient}`, { method: 'PUT', cookie: bob, body: { quantity: 1 } })).status).toBe(404)
    expect((await call('/api/shopping/checks', { method: 'PUT', cookie: bob, body: { week: WEEK, ingredientId: aliceIngredient, checked: true } })).status).toBe(404)
  })

  it('keeps week plans apart', async () => {
    const changed = await call('/api/plan/slots', { method: 'PATCH', cookie: bob, body: { week: WEEK, updates: [{ day: 3, slot: 'lunch', portions: 4 }] } })
    expect((changed.data as WeekPlan).slots.find((s) => s.day === 3 && s.slot === 'lunch')!.portions).toBe(4)
    const alicePlan = (await call(`/api/plan?week=${WEEK}`, { cookie: alice })).data as WeekPlan
    expect(alicePlan.slots.find((s) => s.day === 3 && s.slot === 'lunch')!.portions).toBe(1)
  })

  it('still validates input', async () => {
    expect((await call('/api/plan?week=2026-11-18', { cookie: bob })).status).toBe(400)
    const dup = await call('/api/ingredients', { method: 'POST', cookie: bob, body: { name: 'Banane', shelf: 'Fruits & Vegetables', unit: 'pcs', priceCents: 30 } })
    expect(dup.status).toBe(409)
  })
})

describe('profile', () => {
  it('saves a profile and returns its targets', async () => {
    const cookie = await login(MEMBER.email, MEMBER.password)
    const empty = (await call('/api/profile', { cookie })).data as ProfileResponse
    expect(empty.targets).toBeNull()
    const saved = await call('/api/profile', {
      method: 'PUT', cookie,
      body: { ...emptyProfile(), sex: 'female', birthDate: '1990-06-01', heightCm: 165, weightKg: 60, activity: 2, goal: 'lose', pace: 'slow', diet: ['Vegetarian'], avoid: ['Peanuts', 'peanuts'] },
    })
    expect(saved.status).toBe(200)
    const body = saved.data as ProfileResponse
    expect(body.targets?.protein).toBe(120)
    expect(body.profile.avoid).toEqual(['peanuts'])
    const bad = await call('/api/profile', { method: 'PUT', cookie, body: { ...emptyProfile(), heightCm: 20 } })
    expect(bad.status).toBe(400)
  })
})
