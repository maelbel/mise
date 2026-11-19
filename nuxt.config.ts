// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  modules: ['@pinia/nuxt', '@nuxt/fonts', '@nuxt/test-utils/module', 'nuxt-auth-utils'],
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },
  css: ['~/assets/css/main.css'],
  components: [{ path: '~/components', pathPrefix: false }],
  fonts: {
    // The "Mael Belliard" design system: Jost for text, Josefin Sans for the
    // wordmark and eyebrows, JetBrains Mono for numbers.
    families: [
      { name: 'Jost', provider: 'google', weights: [400, 500], styles: ['normal', 'italic'] },
      { name: 'Josefin Sans', provider: 'google', weights: [300, 400] },
      { name: 'JetBrains Mono', provider: 'google', weights: [400] },
    ],
  },
  app: {
    head: {
      title: 'Mise',
      htmlAttrs: { lang: 'fr' },
      meta: [{ name: 'viewport', content: 'width=device-width, initial-scale=1' }],
    },
  },
  runtimeConfig: {
    session: {
      // Logged in for 30 days on a device, unless the password changes or the account is disabled.
      maxAge: 60 * 60 * 24 * 30,
      // Secure cookies need HTTPS (localhost is fine). For plain HTTP on a home
      // network, set NUXT_SESSION_COOKIE_SECURE=false.
      cookie: { sameSite: 'lax', secure: true },
    },
  },
  typescript: { strict: true },
})
