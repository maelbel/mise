import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import type { Db } from '../../server/utils/db'
import {
  changePassword, createUser, EmailTakenError, findUserById, listFamily, NotAMemberError,
  resetMemberPassword, setMemberDisabled, setUpAdmin, verifyLogin,
} from '../../server/services/userService'
import { listRecipes } from '../../server/services/recipeService'
import { ADMIN, freshTestDb, MEMBER } from './testDb'

let db: Db
let close: () => Promise<void>
let adminId: number
let memberId: number

beforeAll(async () => {
  const conn = await freshTestDb()
  db = conn.db
  close = conn.close
  adminId = conn.admin.id
  memberId = conn.member.id
})

afterAll(async () => {
  await close?.()
})

describe('login', () => {
  it('accepts the right password, with any email case', async () => {
    const result = await verifyLogin(db, '  ALICE@example.test ', ADMIN.password)
    expect(result.ok).toBe(true)
    expect((await findUserById(db, adminId))!.lastLoginAt).not.toBeNull()
  })

  it('gives the same answer for a wrong password and an unknown email', async () => {
    expect(await verifyLogin(db, ADMIN.email, 'wrong-password')).toEqual({ ok: false, reason: 'invalid' })
    expect(await verifyLogin(db, 'nobody@example.test', 'wrong-password')).toEqual({ ok: false, reason: 'invalid' })
  })
})

describe('family accounts', () => {
  it('creates a member with a temporary password and the starter data', async () => {
    const { user, temporaryPassword } = await createUser(db, { email: 'carol@example.test', name: 'Carol' })
    expect(temporaryPassword).toMatch(/^[2-9a-z]{4}-[2-9a-z]{4}-[2-9a-z]{4}$/)
    expect(user.mustChangePassword).toBe(true)
    expect(user.passwordHash).not.toContain(temporaryPassword)
    expect(await listRecipes(db, user.id)).toHaveLength(5)
    expect((await verifyLogin(db, 'carol@example.test', temporaryPassword!)).ok).toBe(true)
    await expect(createUser(db, { email: 'CAROL@example.test', name: 'Carol 2' })).rejects.toBeInstanceOf(EmailTakenError)
  })

  it('ends other sessions when the password changes', async () => {
    const before = (await findUserById(db, memberId))!
    const after = await changePassword(db, memberId, 'bob-new-password-1')
    expect(after.sessionVersion).toBe(before.sessionVersion + 1)
    expect(after.mustChangePassword).toBe(false)
    expect((await verifyLogin(db, MEMBER.email, MEMBER.password)).ok).toBe(false)
    expect((await verifyLogin(db, MEMBER.email, 'bob-new-password-1')).ok).toBe(true)
  })

  it('resets a member\'s password: temporary again, sessions ended', async () => {
    const before = (await findUserById(db, memberId))!
    const temporary = await resetMemberPassword(db, memberId)
    const after = (await findUserById(db, memberId))!
    expect(after.mustChangePassword).toBe(true)
    expect(after.sessionVersion).toBe(before.sessionVersion + 1)
    expect((await verifyLogin(db, MEMBER.email, temporary)).ok).toBe(true)
  })

  it('disables and enables a member, keeping their data', async () => {
    await setMemberDisabled(db, memberId, true)
    const member = await listFamily(db).then((list) => list.find((m) => m.id === memberId)!)
    expect(member.status).toBe('disabled')
    const temporary = await resetMemberPassword(db, memberId)
    expect(await verifyLogin(db, MEMBER.email, temporary)).toEqual({ ok: false, reason: 'disabled' })
    await setMemberDisabled(db, memberId, false)
    expect((await verifyLogin(db, MEMBER.email, temporary)).ok).toBe(true)
    expect(await listRecipes(db, memberId)).toHaveLength(5)
  })

  it('never resets or disables an admin from the family page', async () => {
    await expect(resetMemberPassword(db, adminId)).rejects.toBeInstanceOf(NotAMemberError)
    await expect(setMemberDisabled(db, adminId, true)).rejects.toBeInstanceOf(NotAMemberError)
  })

  it('creates a new admin when there is no older data to claim', async () => {
    const { claimed, user } = await setUpAdmin(db, { email: 'dana@example.test', name: 'Dana', password: 'dana-admin-password' })
    expect(claimed).toBe(false)
    expect(user.isAdmin).toBe(true)
    await expect(setUpAdmin(db, { email: 'eve@example.test', name: 'Eve', password: 'short' })).rejects.toThrow('Au moins 12')
  })
})
