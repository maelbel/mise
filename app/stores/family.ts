import type { FamilyMember } from '#shared/types/domain'

/** Family accounts, for the admin. */
export const useFamilyStore = defineStore('family', () => {
  const api = useApi()
  const members = ref<FamilyMember[]>([])

  async function load(): Promise<void> {
    members.value = await api<FamilyMember[]>('/api/admin/users')
  }

  /** Creates a member and returns their temporary password, which is never available again. */
  async function create(name: string, email: string): Promise<{ member: FamilyMember, temporaryPassword: string }> {
    const result = await api<{ member: FamilyMember, temporaryPassword: string }>('/api/admin/users', { method: 'POST', body: { name, email } })
    members.value = [...members.value, result.member]
    return result
  }

  async function resetPassword(id: number): Promise<string> {
    const { temporaryPassword } = await api<{ temporaryPassword: string }>(`/api/admin/users/${id}/reset-password`, { method: 'POST' })
    await load()
    return temporaryPassword
  }

  async function setDisabled(id: number, disabled: boolean): Promise<void> {
    await api(`/api/admin/users/${id}`, { method: 'PATCH', body: { disabled } })
    await load()
  }

  return { members, load, create, resetPassword, setDisabled }
})
