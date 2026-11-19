import { count, eq } from 'drizzle-orm'
import { MEAL_SLOTS } from '../../shared/utils/constants'
import type { Db } from '../utils/db'
import { ingredients, mealPlanSlots, recipeIngredients, recipes, stock } from './schema'
import { SEED_INGREDIENTS, SEED_RECIPES, SEED_STOCK, seedPlanRecipe } from './seedData'

type Tx = Parameters<Parameters<Db['transaction']>[0]>[0]

/**
 * Gives a user the starter recipes, ingredients, stock and a plan for
 * `weekStart`. Does nothing when the user already has ingredients, so it is
 * safe to call again.
 */
export async function seedUser(db: Db | Tx, userId: number, weekStart: string): Promise<boolean> {
  const [existing] = await db.select({ n: count() }).from(ingredients).where(eq(ingredients.userId, userId))
  if ((existing?.n ?? 0) > 0) return false

  const insertedIngredients = await db
    .insert(ingredients)
    .values(SEED_INGREDIENTS.map(([name, shelf, unit, priceCents]) => ({ userId, name, shelf, unit, priceCents })))
    .returning({ id: ingredients.id, name: ingredients.name })
  const ingredientId = new Map(insertedIngredients.map((i) => [i.name, i.id]))

  const stockRows = Object.entries(SEED_STOCK).map(([name, quantity]) => ({ ingredientId: ingredientId.get(name)!, quantity }))
  if (stockRows.length) await db.insert(stock).values(stockRows)

  const recipeId = new Map<string, number>()
  for (const r of SEED_RECIPES) {
    const { key, ingredients: lines, ...fields } = r
    const [row] = await db.insert(recipes).values({ userId, ...fields }).returning({ id: recipes.id })
    recipeId.set(key, row!.id)
    await db.insert(recipeIngredients).values(
      lines.map(([name, quantity]) => ({ recipeId: row!.id, ingredientId: ingredientId.get(name)!, quantity })),
    )
  }

  const slots = []
  for (let day = 0; day < 7; day++) {
    for (const slot of MEAL_SLOTS) {
      slots.push({ userId, weekStart, day, slot, recipeId: recipeId.get(seedPlanRecipe(day, slot))!, portions: 1 })
    }
  }
  await db.insert(mealPlanSlots).values(slots)
  return true
}
