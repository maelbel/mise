import type { PublicUser } from '#shared/types/domain'

/** The logged-in user and the account actions shared by the layout and pages. */
export function useAccount() {
  const session = useUserSession()
  const user = computed<PublicUser | null>(() => session.user.value ?? null)
  const initial = computed(() => (user.value?.name.trim().charAt(0) || '?').toUpperCase())

  async function logout(): Promise<void> {
    await $fetch('/api/auth/logout', { method: 'POST' }).catch(() => {})
    // A full reload drops every store, so nothing of this account stays in memory.
    reloadNuxtApp({ path: '/login', force: true })
  }

  return { user, initial, isAdmin: computed(() => !!user.value?.isAdmin), refresh: session.fetch, logout }
}
