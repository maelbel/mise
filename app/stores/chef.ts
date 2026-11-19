import type { Suggestion, SuggestionId } from '#shared/types/domain'

export const useChefStore = defineStore('chef', () => {
  const api = useApi()
  const suggestions = ref<Suggestion[]>([])

  function byId(id: SuggestionId): Suggestion | undefined {
    return suggestions.value.find((s) => s.id === id)
  }

  /** The first suggestion that would change the plan, shown as a tip on the week page. */
  const tip = computed(() => suggestions.value.find((s) => s.changes.length > 0) ?? null)

  async function load(week: string): Promise<void> {
    suggestions.value = await api<Suggestion[]>('/api/chef/suggestions', { query: { week } })
  }

  return { suggestions, tip, byId, load }
})
