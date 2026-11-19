export const PASSWORD_MIN_LENGTH = 12
export const PASSWORD_MAX_LENGTH = 200

/** Why a new password is refused, or null when it is fine. */
export function passwordProblem(password: string): string | null {
  if (password.length < PASSWORD_MIN_LENGTH) return `Au moins ${PASSWORD_MIN_LENGTH} caractères.`
  if (password.length > PASSWORD_MAX_LENGTH) return `Au plus ${PASSWORD_MAX_LENGTH} caractères.`
  if (!password.trim()) return 'Le mot de passe ne peut pas être fait que d’espaces.'
  return null
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase()
}
