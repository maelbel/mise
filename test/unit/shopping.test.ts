import { describe, expect, it } from 'vitest'
import { buildShoppingList, weekNeeds } from '../../shared/utils/shopping'
import { SHELVES } from '../../shared/utils/constants'
import { starterData, withSlot } from '../fixtures'

describe('shopping list', () => {
  it('adds up what every planned meal needs, times its portions', () => {
    const { plan, recipesById, ingredientId } = starterData()
    expect(weekNeeds(plan, recipesById).get(ingredientId('Yaourt grec'))).toBe(7 * 200)
    const doubled = withSlot(plan, 0, 'breakfast', { portions: 2 })
    expect(weekNeeds(doubled, recipesById).get(ingredientId('Yaourt grec'))).toBe(8 * 200)
  })

  it('subtracts what is in storage', () => {
    const { plan, recipesById, ingredientsById, ingredientId } = starterData()
    const list = buildShoppingList(plan, recipesById, ingredientsById, new Set())
    const yogurt = list.groups.flatMap((g) => g.items).find((i) => i.ingredientId === ingredientId('Yaourt grec'))
    expect(yogurt?.quantity).toBe(1400 - 1200)
  })

  it('leaves out what storage fully covers', () => {
    const { plan, recipesById, ingredients, ingredientId } = starterData()
    const stocked = ingredients.map((i) => (i.name === 'Banane' ? { ...i, stock: 10 } : i))
    const list = buildShoppingList(plan, recipesById, new Map(stocked.map((i) => [i.id, i])), new Set())
    expect(list.groups.flatMap((g) => g.items).some((i) => i.ingredientId === ingredientId('Banane'))).toBe(false)
  })

  it('rounds pieces up to whole items', () => {
    const { plan, recipesById, ingredientsById, ingredientId } = starterData()
    // Onion: 0.5 per lentil soup (5), salmon pasta (2) and burger (2) = 4.5
    const onion = buildShoppingList(plan, recipesById, ingredientsById, new Set())
      .groups.flatMap((g) => g.items).find((i) => i.ingredientId === ingredientId('Oignon'))
    expect(onion?.quantity).toBe(5)
    expect(onion?.costCents).toBe(200)
  })

  it('groups by shelf in store order, keeps checks and totals the cost', () => {
    const { plan, recipesById, ingredientsById, ingredientId } = starterData()
    const list = buildShoppingList(plan, recipesById, ingredientsById, new Set([ingredientId('Riz')]))
    const order = list.groups.map((g) => SHELVES.indexOf(g.shelf as (typeof SHELVES)[number]))
    expect(order).toEqual([...order].sort((a, b) => a - b))
    const items = list.groups.flatMap((g) => g.items)
    expect(items.find((i) => i.ingredientId === ingredientId('Riz'))?.checked).toBe(true)
    expect(list.totalCents).toBe(items.reduce((sum, i) => sum + i.costCents, 0))
  })
})
