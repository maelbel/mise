import { beforeEach, describe, expect, it } from 'vitest'
import { registerEndpoint } from '@nuxt/test-utils/runtime'
import { createPinia, setActivePinia } from 'pinia'
import { createError, readBody } from 'h3'
import type { WeekPlan } from '#shared/types/domain'
import { starterData, WEEK, withSlot } from '../fixtures'

describe('plan store', () => {
  let current: WeekPlan
  let patches: unknown[]

  beforeEach(() => {
    setActivePinia(createPinia())
    current = starterData().plan
    patches = []
    registerEndpoint('/api/plan', () => current)
    registerEndpoint('/api/plan/slots', {
      method: 'PATCH',
      handler: async (event) => {
        const body = await readBody<{ updates: { day: number, slot: 'breakfast' | 'lunch' | 'dinner', recipeId?: number | null, portions?: number }[] }>(event)
        patches.push(body)
        for (const u of body.updates) current = withSlot(current, u.day, u.slot, u)
        return current
      },
    })
  })

  it('applies Chef changes and undoes them', async () => {
    const store = usePlanStore()
    await store.load(WEEK)
    const { recipeId } = starterData()
    await store.applyChanges([{ day: 0, slot: 'dinner', fromRecipeId: recipeId('lentil'), toRecipeId: recipeId('salmon') }], 'Chef applied 1 change')

    expect(store.slotAt(0, 'dinner')?.recipeId).toBe(recipeId('salmon'))
    expect(store.lastChange?.note).toBe('Chef applied 1 change')

    await store.undo()
    expect(store.slotAt(0, 'dinner')?.recipeId).toBe(recipeId('lentil'))
    expect(store.lastChange).toBeNull()
    expect(patches).toHaveLength(2)
  })

  it('forgets the undo after a manual edit', async () => {
    const store = usePlanStore()
    await store.load(WEEK)
    const { recipeId } = starterData()
    await store.applyChanges([{ day: 0, slot: 'dinner', fromRecipeId: recipeId('lentil'), toRecipeId: recipeId('salmon') }], 'note')
    await store.setPortions(0, 'dinner', 3)
    expect(store.lastChange).toBeNull()
    expect(store.slotAt(0, 'dinner')?.portions).toBe(3)
  })
})

describe('ingredients store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    registerEndpoint('/api/ingredients', () => starterData().ingredients)
  })

  it('rolls the stock back when saving fails', async () => {
    registerEndpoint('/api/stock/1', { method: 'PUT', handler: () => { throw createError({ statusCode: 500 }) } })
    const store = useIngredientsStore()
    await store.load()
    await expect(store.setStock(1, 5)).rejects.toBeTruthy()
    expect(store.byId.get(1)?.stock).toBe(0)
  })

  it('never stores a negative stock', async () => {
    registerEndpoint('/api/stock/2', { method: 'PUT', handler: async (event) => readBody(event) })
    const store = useIngredientsStore()
    await store.load()
    await store.setStock(2, -100)
    expect(store.byId.get(2)?.stock).toBe(0)
  })
})

describe('shopping store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    registerEndpoint('/api/shopping', () => ({
      weekStart: WEEK,
      totalCents: 300,
      groups: [{ shelf: 'Dairy', items: [
        { ingredientId: 10, name: 'Yaourt grec', shelf: 'Dairy', unit: 'g', quantity: 200, costCents: 80, checked: false },
        { ingredientId: 11, name: 'Heavy cream', shelf: 'Dairy', unit: 'mL', quantity: 100, costCents: 220, checked: true },
      ] }],
    }))
    registerEndpoint('/api/shopping/checks', { method: 'PUT', handler: () => ({ ok: true }) })
  })

  it('counts what is done and what is left to pay', async () => {
    const store = useShoppingStore()
    await store.load(WEEK)
    expect(store.doneCount).toBe(1)
    expect(store.remainingCents).toBe(80)
    await store.toggle(10)
    expect(store.doneCount).toBe(2)
    expect(store.remainingCents).toBe(0)
  })
})
