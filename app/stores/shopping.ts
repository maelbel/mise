import type { ShoppingList } from '#shared/types/domain'

export const useShoppingStore = defineStore('shopping', () => {
  const api = useApi()
  const list = ref<ShoppingList | null>(null)

  const items = computed(() => list.value?.groups.flatMap((g) => g.items) ?? [])
  const doneCount = computed(() => items.value.filter((i) => i.checked).length)
  const remainingCents = computed(() => items.value.filter((i) => !i.checked).reduce((sum, i) => sum + i.costCents, 0))

  async function load(week: string): Promise<void> {
    list.value = await api<ShoppingList>('/api/shopping', { query: { week } })
  }

  /** Optimistic: the box ticks at once and unticks again if the save fails. */
  async function toggle(ingredientId: number): Promise<void> {
    const item = items.value.find((i) => i.ingredientId === ingredientId)
    if (!item || !list.value) return
    item.checked = !item.checked
    try {
      await api('/api/shopping/checks', {
        method: 'PUT',
        body: { week: list.value.weekStart, ingredientId, checked: item.checked },
      })
    } catch (error) {
      item.checked = !item.checked
      throw error
    }
  }

  async function reset(): Promise<void> {
    if (!list.value) return
    await api('/api/shopping/checks', { method: 'DELETE', query: { week: list.value.weekStart } })
    for (const item of items.value) item.checked = false
  }

  return { list, items, doneCount, remainingCents, load, toggle, reset }
})
