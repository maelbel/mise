import type { Ingredient, MealSlot, Recipe, WeekPlan } from '../shared/types/domain'
import { MEAL_SLOTS } from '../shared/utils/constants'
import { indexById } from '../shared/utils/nutrition'
import { SEED_INGREDIENTS, SEED_RECIPES, SEED_STOCK, seedPlanRecipe } from '../server/db/seedData'

export const WEEK = '2026-11-16'

/** The starter data as the API would return it, with ids starting at 1. */
export function starterData() {
  const ingredients: Ingredient[] = SEED_INGREDIENTS.map(([name, shelf, unit, priceCents], i) => ({
    id: i + 1, name, shelf, unit, priceCents, stock: SEED_STOCK[name] ?? 0,
  }))
  const ingredientId = new Map(ingredients.map((i) => [i.name, i.id]))
  const recipeIdByKey = new Map<string, number>()
  const recipes: Recipe[] = SEED_RECIPES.map(({ key, ingredients: lines, ...fields }, i) => {
    recipeIdByKey.set(key, i + 1)
    return {
      id: i + 1,
      ...fields,
      ingredients: lines.map(([name, quantity]) => ({ ingredientId: ingredientId.get(name)!, quantity })),
    }
  })
  const plan: WeekPlan = { weekStart: WEEK, slots: [] }
  for (let day = 0; day < 7; day++) {
    for (const slot of MEAL_SLOTS) {
      plan.slots.push({ day, slot, recipeId: recipeIdByKey.get(seedPlanRecipe(day, slot))!, portions: 1 })
    }
  }
  return {
    ingredients,
    recipes,
    plan,
    recipeId: (key: string) => recipeIdByKey.get(key)!,
    ingredientId: (name: string) => ingredientId.get(name)!,
    recipesById: indexById(recipes),
    ingredientsById: indexById(ingredients),
  }
}

export function withSlot(plan: WeekPlan, day: number, slot: MealSlot, patch: { recipeId?: number | null, portions?: number }): WeekPlan {
  return {
    ...plan,
    slots: plan.slots.map((s) => (s.day === day && s.slot === slot ? { ...s, ...patch } : s)),
  }
}
