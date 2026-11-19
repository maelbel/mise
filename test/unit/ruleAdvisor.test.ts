import { describe, expect, it } from 'vitest'
import {
  isAllowed,
  lighterSuggestion,
  proteinSuggestion,
  ruleAdvisor,
  stockSuggestion,
  varietySuggestion,
} from '../../server/services/chef/ruleAdvisor'
import type { ChefContext } from '../../server/services/chef/advisor'
import { starterData, withSlot } from '../fixtures'

function context(): ChefContext & ReturnType<typeof starterData> {
  const data = starterData()
  return { ...data, recipes: data.recipesById, ingredients: data.ingredientsById }
}

describe('rule-based Chef', () => {
  it('swaps low-protein weekday dinners for salmon pasta, like the design', () => {
    const ctx = context()
    const s = proteinSuggestion(ctx)
    expect(s.changes).toHaveLength(5)
    expect(s.changes.every((c) => c.slot === 'dinner' && c.day < 5)).toBe(true)
    expect(s.changes.every((c) => c.fromRecipeId === ctx.recipeId('lentil') && c.toRecipeId === ctx.recipeId('salmon'))).toBe(true)
    expect(s.deltaProtein).toBe(5 * (38 - 18))
    expect(s.deltaKcal).toBe(5 * (710 - 340))
  })

  it('counts portions in the deltas', () => {
    const ctx = context()
    const plan = withSlot(ctx.plan, 0, 'dinner', { portions: 2 })
    expect(proteinSuggestion({ ...ctx, plan }).deltaProtein).toBe(6 * 20)
  })

  it('has nothing to change when weekday dinners have enough protein', () => {
    const ctx = context()
    let plan = ctx.plan
    for (let day = 0; day < 5; day++) plan = withSlot(plan, day, 'dinner', { recipeId: ctx.recipeId('salmon') })
    const s = proteinSuggestion({ ...ctx, plan })
    expect(s.changes).toEqual([])
    expect(s.text).toMatch(/rien à changer/)
  })

  it('replaces heavy weekend meals with the lightest recipe not already eaten that day', () => {
    const ctx = context()
    const s = lighterSuggestion(ctx)
    expect(s.changes).toEqual([
      { day: 5, slot: 'lunch', fromRecipeId: ctx.recipeId('burger'), toRecipeId: ctx.recipeId('lentil') },
      { day: 6, slot: 'lunch', fromRecipeId: ctx.recipeId('burger'), toRecipeId: ctx.recipeId('lentil') },
    ])
    expect(s.deltaKcal).toBe(2 * (340 - 780))
  })

  it('breaks up repeated lunches and dinners without repeating a recipe within a day', () => {
    const ctx = context()
    const s = varietySuggestion(ctx)
    expect(s.changes.length).toBeGreaterThan(0)
    let plan = ctx.plan
    for (const c of s.changes) plan = withSlot(plan, c.day, c.slot, { recipeId: c.toRecipeId })
    for (let day = 0; day < 7; day++) {
      const ids = plan.slots.filter((x) => x.day === day).map((x) => x.recipeId)
      expect(new Set(ids).size).toBe(ids.length)
    }
    expect(s.changes.every((c) => c.slot !== 'breakfast')).toBe(true)
  })

  it('lists recipes that storage covers, and never changes the plan', () => {
    const ctx = context()
    expect(stockSuggestion(ctx).text).toMatch(/ne couvre encore aucune recette/)
    const full = new Map([...ctx.ingredients].map(([id, i]) => [id, { ...i, stock: 10_000 }]))
    const s = stockSuggestion({ ...ctx, ingredients: full })
    expect(s.text).toContain('Bol protéiné aux fruits')
    expect(s.changes).toEqual([])
  })

  it('returns the four suggestions in a stable order', async () => {
    const all = await ruleAdvisor.suggestions(context())
    expect(all.map((s) => s.id)).toEqual(['protein', 'lighter', 'variety', 'stock'])
  })
})

describe('Chef with a profile', () => {
  const none = { diet: [], avoid: [], weekdayMaxMinutes: null }

  it('derives its thresholds from the daily targets', () => {
    const ctx = context()
    // 150 g a day → 50 g per meal: every weekday dinner is under it, but no recipe beats 48 g without being taken.
    const s = proteinSuggestion({ ...ctx, targets: { kcal: 3000, protein: 150, carbs: 300, fat: 100 } })
    expect(s.text).toContain('150 g de protéines par jour')
    // A 2,000 kcal day makes a 700 kcal meal heavy: the weekend salmon dinners are swapped too.
    const lighter = lighterSuggestion({ ...ctx, targets: { kcal: 2000, protein: 100, carbs: 250, fat: 67 } })
    expect(lighter.changes.some((c) => c.fromRecipeId === ctx.recipeId('salmon'))).toBe(true)
    expect(lighterSuggestion(ctx).changes.some((c) => c.fromRecipeId === ctx.recipeId('salmon'))).toBe(false)
  })

  it('never proposes a recipe with a food to avoid', () => {
    const ctx = context()
    const s = proteinSuggestion({ ...ctx, preferences: { ...none, avoid: ['SAUMON'] } })
    expect(s.changes.some((c) => c.toRecipeId === ctx.recipeId('salmon'))).toBe(false)
  })

  it('only proposes recipes that follow the diet', () => {
    const ctx = context()
    const veg = { ...ctx, preferences: { ...none, diet: ['Vegetarian'] } }
    // The lentil soup is vegan, which counts as vegetarian; salmon pasta is neither.
    expect(isAllowed(ctx.recipesById.get(ctx.recipeId('lentil'))!, 0, veg)).toBe(true)
    expect(isAllowed(ctx.recipesById.get(ctx.recipeId('salmon'))!, 0, veg)).toBe(false)
    // Without a diet Chef swaps in salmon pasta; with one, nothing that breaks it.
    expect(proteinSuggestion(ctx).changes.length).toBe(5)
    expect(proteinSuggestion(veg).changes).toEqual([])
  })

  it('keeps weekday meals within the cooking time', () => {
    const ctx = context()
    const s = proteinSuggestion({ ...ctx, preferences: { ...none, weekdayMaxMinutes: 15 } })
    expect(s.changes).toEqual([])
  })
})
