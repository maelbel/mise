import type { Ingredient, Recipe, ShoppingGroup, ShoppingItem, ShoppingList, WeekPlan } from '../types/domain'
import { SHELVES } from './constants'
import { costCents } from './units'

/** Total quantity of each ingredient the week plan needs, by ingredient id. */
export function weekNeeds(plan: WeekPlan, recipes: ReadonlyMap<number, Recipe>): Map<number, number> {
  const needs = new Map<number, number>()
  for (const slot of plan.slots) {
    const recipe = slot.recipeId === null ? undefined : recipes.get(slot.recipeId)
    if (!recipe) continue
    for (const line of recipe.ingredients) {
      needs.set(line.ingredientId, (needs.get(line.ingredientId) ?? 0) + line.quantity * slot.portions)
    }
  }
  return needs
}

function shelfRank(shelf: string): number {
  const index = (SHELVES as readonly string[]).indexOf(shelf)
  return index === -1 ? SHELVES.length : index
}

/** What to buy for the week: what the plan needs minus what is in stock, grouped by shelf. */
export function buildShoppingList(
  plan: WeekPlan,
  recipes: ReadonlyMap<number, Recipe>,
  ingredients: ReadonlyMap<number, Ingredient>,
  checkedIds: ReadonlySet<number>,
): ShoppingList {
  const byShelf = new Map<string, ShoppingItem[]>()
  let totalCents = 0

  for (const [ingredientId, need] of weekNeeds(plan, recipes)) {
    const ingredient = ingredients.get(ingredientId)
    if (!ingredient) continue
    const missing = need - ingredient.stock
    if (missing <= 0) continue
    const quantity = ingredient.unit === 'pcs' ? Math.ceil(missing) : Math.round(missing)
    const item: ShoppingItem = {
      ingredientId,
      name: ingredient.name,
      shelf: ingredient.shelf,
      unit: ingredient.unit,
      quantity,
      costCents: costCents(ingredient, quantity),
      checked: checkedIds.has(ingredientId),
    }
    totalCents += item.costCents
    const items = byShelf.get(ingredient.shelf) ?? []
    items.push(item)
    byShelf.set(ingredient.shelf, items)
  }

  const groups: ShoppingGroup[] = [...byShelf.entries()]
    .sort(([a], [b]) => shelfRank(a) - shelfRank(b) || a.localeCompare(b))
    .map(([shelf, items]) => ({ shelf, items: items.sort((a, b) => a.name.localeCompare(b.name)) }))

  return { weekStart: plan.weekStart, groups, totalCents }
}
