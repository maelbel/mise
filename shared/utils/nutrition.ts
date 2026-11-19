import type { Nutrition, PlanSlot, Recipe } from '../types/domain'

export function emptyNutrition(): Nutrition {
  return { kcal: 0, protein: 0, carbs: 0, fat: 0, timeMin: 0 }
}

/** Nutrition of one planned meal. Cooking time does not grow with portions. */
export function slotNutrition(recipe: Recipe, portions: number): Nutrition {
  return {
    kcal: recipe.kcal * portions,
    protein: recipe.protein * portions,
    carbs: recipe.carbs * portions,
    fat: recipe.fat * portions,
    timeMin: recipe.timeMin,
  }
}

export function sumNutrition(slots: readonly PlanSlot[], recipes: ReadonlyMap<number, Recipe>): Nutrition {
  const total = emptyNutrition()
  for (const slot of slots) {
    const recipe = slot.recipeId === null ? undefined : recipes.get(slot.recipeId)
    if (!recipe) continue
    const n = slotNutrition(recipe, slot.portions)
    total.kcal += n.kcal
    total.protein += n.protein
    total.carbs += n.carbs
    total.fat += n.fat
    total.timeMin += n.timeMin
  }
  return total
}

export function dayNutrition(slots: readonly PlanSlot[], recipes: ReadonlyMap<number, Recipe>, day: number): Nutrition {
  return sumNutrition(slots.filter((s) => s.day === day), recipes)
}

export function indexById<T extends { id: number }>(items: readonly T[]): Map<number, T> {
  return new Map(items.map((item) => [item.id, item]))
}
