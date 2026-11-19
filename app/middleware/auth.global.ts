/**
 * Logged out: only /login. Temporary password: only /password. Admin pages:
 * admins only. The server checks all of this again on every API call.
 */
export default defineNuxtRouteMiddleware((to) => {
  const { loggedIn, user } = useUserSession()

  if (!loggedIn.value) {
    if (to.path === '/login') return
    return navigateTo({ path: '/login', query: to.fullPath === '/' ? {} : { redirect: to.fullPath } })
  }
  if (user.value?.mustChangePassword) {
    if (to.path !== '/password') return navigateTo('/password')
    return
  }
  if (to.path === '/login') return navigateTo('/')
  if (to.path === '/family' && !user.value?.isAdmin) return navigateTo('/')
})
