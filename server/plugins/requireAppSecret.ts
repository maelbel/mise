/**
 * Sessions are sealed with a key derived from NUXT_APP_SECRET. In dev Nuxt
 * generates one; a built server refuses to start without it rather than fail
 * on the first login.
 */
export default defineNitroPlugin(() => {
  if (import.meta.dev) return
  const secret: unknown = useRuntimeConfig().appSecret
  if (typeof secret !== 'string' || secret.length < 32) {
    throw new Error('NUXT_APP_SECRET is missing or shorter than 32 characters. Generate one with `openssl rand -base64 32` and set it in the environment.')
  }
})
