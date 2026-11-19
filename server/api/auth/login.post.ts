import { toPublicUser, verifyLogin } from '../../services/userService'

export default defineEventHandler(async (event) => {
  const { email, password } = await readValidatedBody(event, loginBodySchema.parse)
  const address = getRequestIP(event) ?? 'unknown'

  const wait = Math.max(loginLimits.email.retryAfter(email), loginLimits.address.retryAfter(address))
  if (wait > 0) {
    setResponseHeader(event, 'Retry-After', wait)
    throw createError({ statusCode: 429, statusMessage: `Trop de tentatives. Réessayez dans ${Math.ceil(wait / 60)} min.` })
  }

  const result = await verifyLogin(useDb(), email, password)
  if (!result.ok) {
    loginLimits.email.fail(email)
    loginLimits.address.fail(address)
    if (result.reason === 'disabled') throw createError({ statusCode: 403, statusMessage: "Ce compte est désactivé. Demandez à l'administrateur de la famille." })
    throw createError({ statusCode: 401, statusMessage: 'E-mail ou mot de passe incorrect' })
  }

  loginLimits.email.reset(email)
  await startSession(event, result.user)
  return toPublicUser(result.user)
})
