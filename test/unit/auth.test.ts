import { describe, expect, it } from 'vitest'
import { normalizeEmail, passwordProblem } from '#shared/utils/password'
import { LoginLimiter } from '../../server/utils/loginLimiter'
import { generateTemporaryPassword, hashSecret, verifySecret } from '../../server/utils/passwordHash'
import { loginBodySchema, newMemberBodySchema, passwordBodySchema, profileBodySchema } from '../../server/utils/validation'
import { emptyProfile } from '#shared/utils/targets'

describe('password rules', () => {
  it('asks for 12 characters and refuses only spaces', () => {
    expect(passwordProblem('short')).toContain('12')
    expect(passwordProblem(' '.repeat(12))).toContain('spaces')
    expect(passwordProblem('long-enough-pw')).toBeNull()
    expect(passwordProblem('x'.repeat(201))).toContain('200')
  })

  it('compares emails in lower case without spaces', () => {
    expect(normalizeEmail('  Alice@Example.TEST ')).toBe('alice@example.test')
  })
})

describe('temporary passwords', () => {
  it('are readable groups and differ every time', () => {
    const list = Array.from({ length: 50 }, generateTemporaryPassword)
    for (const p of list) expect(p).toMatch(/^[2-9a-hjkmnp-z]{4}-[2-9a-hjkmnp-z]{4}-[2-9a-hjkmnp-z]{4}$/)
    expect(new Set(list).size).toBe(50)
  })
})

describe('password hashing', () => {
  it('verifies the right password only', async () => {
    const hash = await hashSecret('correct-horse-battery')
    expect(hash).not.toContain('correct-horse-battery')
    expect(await verifySecret(hash, 'correct-horse-battery')).toBe(true)
    expect(await verifySecret(hash, 'correct-horse-batterz')).toBe(false)
  })
})

describe('LoginLimiter', () => {
  it('blocks after the limit for the rest of the window, per key', () => {
    let now = 0
    const limiter = new LoginLimiter({ max: 3, windowMs: 60_000, now: () => now })
    for (let i = 0; i < 3; i++) {
      expect(limiter.retryAfter('a')).toBe(0)
      limiter.fail('a')
      now += 1000
    }
    expect(limiter.retryAfter('a')).toBe(57)
    expect(limiter.retryAfter('b')).toBe(0)
    now = 60_001
    expect(limiter.retryAfter('a')).toBe(0)
  })

  it('forgets a key after a success', () => {
    const limiter = new LoginLimiter({ max: 1, windowMs: 60_000, now: () => 0 })
    limiter.fail('a')
    expect(limiter.retryAfter('a')).toBeGreaterThan(0)
    limiter.reset('a')
    expect(limiter.retryAfter('a')).toBe(0)
  })
})

describe('account and profile validation', () => {
  it('normalizes emails and checks new passwords', () => {
    expect(loginBodySchema.parse({ email: ' Bob@Example.test', password: 'x' }).email).toBe('bob@example.test')
    expect(newMemberBodySchema.safeParse({ name: 'Bob', email: 'not-an-email' }).success).toBe(false)
    const short = passwordBodySchema.safeParse({ newPassword: 'short' })
    expect(short.success).toBe(false)
    expect(short.error?.issues[0]?.message).toContain('12')
  })

  it('accepts a full profile and refuses impossible values', () => {
    const ok = profileBodySchema.safeParse({ ...emptyProfile(), sex: 'female', birthDate: '1990-06-01', heightCm: 165, weightKg: 60, activity: 4, diet: ['Vegan', 'Vegan'] })
    expect(ok.success).toBe(true)
    expect(ok.data?.diet).toEqual(['Vegan'])
    expect(profileBodySchema.safeParse({ ...emptyProfile(), activity: 5 }).success).toBe(false)
    expect(profileBodySchema.safeParse({ ...emptyProfile(), birthDate: '2024-01-01' }).success).toBe(false)
    expect(profileBodySchema.safeParse({ ...emptyProfile(), diet: ['Paleo'] }).success).toBe(false)
    expect(profileBodySchema.safeParse({ ...emptyProfile(), targetKcal: 100 }).success).toBe(false)
  })
})
