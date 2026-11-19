import type { DailyTargets, Profile, ProfileResponse } from '#shared/types/domain'

export const useProfileStore = defineStore('profile', () => {
  const api = useApi()
  const data = ref<ProfileResponse | null>(null)
  const targets = computed<DailyTargets | null>(() => data.value?.targets ?? null)

  async function load(): Promise<void> {
    data.value = await api<ProfileResponse>('/api/profile')
  }

  async function save(profile: Profile): Promise<ProfileResponse> {
    data.value = await api<ProfileResponse>('/api/profile', { method: 'PUT', body: profile })
    return data.value
  }

  return { data, targets, load, save }
})
