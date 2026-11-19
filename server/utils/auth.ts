import type { H3Event } from 'h3'
import type { UserRow } from '../services/userService'
import { toPublicUser } from '../services/userService'

/** API paths open without a session. Everything else under /api needs one. */
export const PUBLIC_API_PATHS = new Set(['/api/auth/login', '/api/auth/logout'])

/** API paths still allowed while the account has a temporary password. */
export const TEMPORARY_PASSWORD_PATHS = new Set(['/api/auth/password', '/api/auth/logout', '/api/me'])

/** The logged-in user, set by the auth middleware. Throws 401 when there is none. */
export function requireUser(event: H3Event): UserRow {
  const user = event.context.user as UserRow | undefined
  if (!user) throw createError({ statusCode: 401, statusMessage: 'Connectez-vous' })
  return user
}

/** Starts (or refreshes) the session for `user`, tied to their current session version. */
export async function startSession(event: H3Event, user: UserRow): Promise<void> {
  await replaceUserSession(event, { user: toPublicUser(user), version: user.sessionVersion, loggedInAt: Date.now() })
}
