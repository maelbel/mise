/** Message the server sends while the account still has a temporary password. */
const PASSWORD_FIRST = "Choisissez d'abord votre mot de passe"

/**
 * `$fetch` for the app's API. During server rendering it forwards the
 * request's cookies, so the session reaches the API. In the browser, an ended
 * session sends the user to the login page, and a temporary password to the
 * page where they choose their own.
 */
export function useApi(): typeof $fetch {
  if (import.meta.server) return useRequestFetch()
  return $fetch.create({
    onResponseError({ request, response }) {
      const url = typeof request === 'string' ? request : request.url
      if (url.includes('/api/auth/')) return
      if (response.status === 401) window.location.assign(`/login?redirect=${encodeURIComponent(window.location.pathname)}`)
      else if (response.status === 403 && response._data?.statusMessage === PASSWORD_FIRST) window.location.assign('/password')
    },
  }) as typeof $fetch
}
