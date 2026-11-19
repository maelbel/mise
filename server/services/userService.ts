import { and, asc, eq, isNull, sql } from 'drizzle-orm'
import type { AccountStatus, FamilyMember, PublicUser } from '#shared/types/domain'
import { normalizeEmail, passwordProblem } from '../../shared/utils/password'
import { startOfWeek } from '../../shared/utils/week'
import { users } from '../db/schema'
import { seedUser } from '../db/seed'
import type { Db } from '../utils/db'
import { burnVerifyTime, generateTemporaryPassword, hashSecret, verifySecret } from '../utils/passwordHash'

export type UserRow = typeof users.$inferSelect

export class EmailTakenError extends Error {
  constructor() {
    super('Un compte utilise déjà cette adresse')
  }
}

export class NotAMemberError extends Error {
  constructor() {
    super('Aucun membre de la famille avec cet identifiant')
  }
}

export function toPublicUser(u: UserRow): PublicUser {
  return { id: u.id, email: u.email, name: u.name, isAdmin: u.isAdmin, mustChangePassword: u.mustChangePassword }
}

function status(u: UserRow): AccountStatus {
  if (u.disabledAt) return 'disabled'
  return u.mustChangePassword ? 'temporary' : 'active'
}

export async function findUserById(db: Db, id: number): Promise<UserRow | undefined> {
  const [row] = await db.select().from(users).where(eq(users.id, id))
  return row
}

export async function findUserByEmail(db: Db, email: string): Promise<UserRow | undefined> {
  const [row] = await db.select().from(users).where(eq(users.email, normalizeEmail(email)))
  return row
}

export type LoginResult =
  | { ok: true, user: UserRow }
  | { ok: false, reason: 'invalid' | 'disabled' }

/**
 * Checks an email and password. Unknown emails and wrong passwords give the
 * same answer and take about as long; a disabled account is only revealed to
 * someone who knows its password.
 */
export async function verifyLogin(db: Db, email: string, password: string): Promise<LoginResult> {
  const user = await findUserByEmail(db, email)
  if (!user?.passwordHash) {
    await burnVerifyTime(password)
    return { ok: false, reason: 'invalid' }
  }
  if (!(await verifySecret(user.passwordHash, password))) return { ok: false, reason: 'invalid' }
  if (user.disabledAt) return { ok: false, reason: 'disabled' }
  await db.update(users).set({ lastLoginAt: new Date() }).where(eq(users.id, user.id))
  return { ok: true, user }
}

/**
 * Creates an account with the starter data. Without `password`, it gets a
 * temporary one (returned once) that must be changed at first login.
 */
export async function createUser(
  db: Db,
  input: { email: string, name: string, isAdmin?: boolean, password?: string },
): Promise<{ user: UserRow, temporaryPassword: string | null }> {
  const email = normalizeEmail(input.email)
  if (await findUserByEmail(db, email)) throw new EmailTakenError()
  const temporaryPassword = input.password ? null : generateTemporaryPassword()
  const passwordHash = await hashSecret(input.password ?? temporaryPassword!)
  const user = await db.transaction(async (tx) => {
    const [row] = await tx
      .insert(users)
      .values({ email, name: input.name.trim(), passwordHash, isAdmin: input.isAdmin ?? false, mustChangePassword: !input.password })
      .returning()
    await seedUser(tx, row!.id, startOfWeek(new Date()))
    return row!
  })
  return { user, temporaryPassword }
}

/**
 * Sets up the admin from the command line. The placeholder owner left by the
 * migration (data from before accounts) becomes this admin and keeps its data.
 */
export async function setUpAdmin(db: Db, input: { email: string, name: string, password: string }): Promise<{ user: UserRow, claimed: boolean }> {
  const problem = passwordProblem(input.password)
  if (problem) throw new Error(problem)
  const email = normalizeEmail(input.email)
  const existing = await findUserByEmail(db, email)
  if (existing) throw new EmailTakenError()
  const [placeholder] = await db.select().from(users).where(isNull(users.passwordHash)).orderBy(asc(users.id)).limit(1)
  if (placeholder) {
    const [row] = await db
      .update(users)
      .set({ email, name: input.name.trim(), passwordHash: await hashSecret(input.password), isAdmin: true, mustChangePassword: false, disabledAt: null })
      .where(eq(users.id, placeholder.id))
      .returning()
    return { user: row!, claimed: true }
  }
  const { user } = await createUser(db, { ...input, isAdmin: true })
  return { user, claimed: false }
}

/** Saves a new password chosen by the user. Other sessions stop working. */
export async function changePassword(db: Db, userId: number, newPassword: string): Promise<UserRow> {
  const [row] = await db
    .update(users)
    .set({ passwordHash: await hashSecret(newPassword), mustChangePassword: false, sessionVersion: sql`${users.sessionVersion} + 1` })
    .where(eq(users.id, userId))
    .returning()
  return row!
}

export async function listFamily(db: Db): Promise<FamilyMember[]> {
  const rows = await db.select().from(users).orderBy(asc(users.id))
  return rows
    .filter((u) => u.passwordHash !== null)
    .map((u) => ({
      id: u.id, email: u.email, name: u.name, isAdmin: u.isAdmin, status: status(u),
      createdAt: u.createdAt.toISOString(), lastLoginAt: u.lastLoginAt?.toISOString() ?? null,
    }))
}

/** Only members (not admins) can be reset or disabled from the family page. */
async function member(db: Db, id: number): Promise<UserRow> {
  const [row] = await db.select().from(users).where(and(eq(users.id, id), eq(users.isAdmin, false)))
  if (!row) throw new NotAMemberError()
  return row
}

/** Gives a member a new temporary password; their sessions end. */
export async function resetMemberPassword(db: Db, id: number): Promise<string> {
  await member(db, id)
  const temporaryPassword = generateTemporaryPassword()
  await db
    .update(users)
    .set({ passwordHash: await hashSecret(temporaryPassword), mustChangePassword: true, sessionVersion: sql`${users.sessionVersion} + 1` })
    .where(eq(users.id, id))
  return temporaryPassword
}

/** Blocks or restores a member's login. Their data is kept either way. */
export async function setMemberDisabled(db: Db, id: number, disabled: boolean): Promise<void> {
  await member(db, id)
  await db
    .update(users)
    .set(disabled ? { disabledAt: new Date(), sessionVersion: sql`${users.sessionVersion} + 1` } : { disabledAt: null })
    .where(eq(users.id, id))
}
