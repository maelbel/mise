import type { MealSlot, PlanSlot, SlotChange, WeekPlan } from '#shared/types/domain'

export interface SlotUpdate {
  day: number
  slot: MealSlot
  recipeId?: number | null
  portions?: number
}

interface LastChange {
  note: string
  undo: SlotUpdate[]
}

export const usePlanStore = defineStore('plan', () => {
  const api = useApi()
  const plan = ref<WeekPlan | null>(null)
  const lastChange = ref<LastChange | null>(null)

  function slotAt(day: number, slot: MealSlot): PlanSlot | undefined {
    return plan.value?.slots.find((s) => s.day === day && s.slot === slot)
  }

  async function load(week: string): Promise<void> {
    if (plan.value?.weekStart !== week) lastChange.value = null
    plan.value = await api<WeekPlan>('/api/plan', { query: { week } })
  }

  async function update(updates: SlotUpdate[]): Promise<void> {
    if (!plan.value || !updates.length) return
    plan.value = await api<WeekPlan>('/api/plan/slots', {
      method: 'PATCH',
      body: { week: plan.value.weekStart, updates },
    })
  }

  async function setRecipe(day: number, slot: MealSlot, recipeId: number | null): Promise<void> {
    lastChange.value = null
    await update([{ day, slot, recipeId }])
  }

  async function setPortions(day: number, slot: MealSlot, portions: number): Promise<void> {
    lastChange.value = null
    await update([{ day, slot, portions }])
  }

  /** Applies Chef's swaps and keeps what is needed to undo them. */
  async function applyChanges(changes: SlotChange[], note: string): Promise<void> {
    await update(changes.map((c) => ({ day: c.day, slot: c.slot, recipeId: c.toRecipeId })))
    lastChange.value = { note, undo: changes.map((c) => ({ day: c.day, slot: c.slot, recipeId: c.fromRecipeId })) }
  }

  /** Puts back the recipes Chef's swaps replaced. */
  async function revertChanges(changes: SlotChange[]): Promise<void> {
    lastChange.value = null
    await update(changes.map((c) => ({ day: c.day, slot: c.slot, recipeId: c.fromRecipeId })))
  }

  async function undo(): Promise<void> {
    if (!lastChange.value) return
    const { undo: updates } = lastChange.value
    lastChange.value = null
    await update(updates)
  }

  return { plan, lastChange, slotAt, load, setRecipe, setPortions, applyChanges, revertChanges, undo }
})
