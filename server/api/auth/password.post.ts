import { changePassword, toPublicUser } from '../../services/userService'
import { verifySecret } from '../../utils/passwordHash'

/**
 * Sets the user's own password. The current one is asked for, except right
 * after login with a temporary password. Other devices are logged out; this
 * one stays logged in.
 */
export default defineEventHandler(async (event) => {
  const user = requireUser(event)
  const { currentPassword, newPassword } = await readValidatedBody(event, passwordBodySchema.parse)
  if (!user.mustChangePassword) {
    if (!currentPassword || !user.passwordHash || !(await verifySecret(user.passwordHash, currentPassword))) {
      throw createError({ statusCode: 400, statusMessage: 'Votre mot de passe actuel est incorrect' })
    }
  }
  if (user.passwordHash && (await verifySecret(user.passwordHash, newPassword))) {
    throw createError({ statusCode: 400, statusMessage: "Choisissez un mot de passe différent de l'actuel" })
  }
  const updated = await changePassword(useDb(), user.id, newPassword)
  await startSession(event, updated)
  return toPublicUser(updated)
})
