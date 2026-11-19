// Shape of the session kept by nuxt-auth-utils.
declare module '#auth-utils' {
  interface User {
    id: number
    email: string
    name: string
    isAdmin: boolean
    mustChangePassword: boolean
  }

  interface UserSession {
    /** The user's session version when they logged in: a newer one ends this session. */
    version: number
    loggedInAt: number
  }
}

export {}
