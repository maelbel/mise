import { findUserById } from '../services/userService'

/**
 * Guards every /api route: a valid session for an enabled account whose
 * session version still matches, a chosen password (not a temporary one), and
 * admin rights for /api/admin.
 */
export default defineEventHandler(async (event) => {
  const path = getRequestURL(event).pathname
  if (!path.startsWith('/api/') || path.startsWith('/api/_auth/') || PUBLIC_API_PATHS.has(path)) return

  const session = await getUserSession(event)
  if (!session.user) throw createError({ statusCode: 401, statusMessage: 'Connectez-vous' })

  const user = await findUserById(useDb(), session.user.id)
  if (!user || !user.passwordHash || user.disabledAt || user.sessionVersion !== session.version) {
    await clearUserSession(event)
    throw createError({ statusCode: 401, statusMessage: 'Votre session a pris fin, reconnectez-vous' })
  }
  event.context.user = user

  if (user.mustChangePassword && !TEMPORARY_PASSWORD_PATHS.has(path)) {
    throw createError({ statusCode: 403, statusMessage: "Choisissez d'abord votre mot de passe" })
  }
  if (path.startsWith('/api/admin/') && !user.isAdmin) {
    throw createError({ statusCode: 403, statusMessage: "Réservé à l'administrateur de la famille" })
  }
})
