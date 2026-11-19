import { and, eq, inArray } from 'drizzle-orm'
import type { ShoppingList } from '#shared/types/domain'
import { indexById } from '#shared/utils/nutrition'
import { buildShoppingList } from '#shared/utils/shopping'
import { ingredients, shoppingChecks } from '../db/schema'
import type { Db } from '../utils/db'
import { listIngredients, ownsIngredient } from './ingredientService'
import { getWeekPlan } from './planService'
import { listRecipes } from './recipeService'

export async function getShoppingList(db: Db, userId: number, weekStart: string): Promise<ShoppingList> {
  const [plan, recipes, owned, checks] = await Promise.all([
    getWeekPlan(db, userId, weekStart),
    listRecipes(db, userId),
    listIngredients(db, userId),
    db
      .select({ ingredientId: shoppingChecks.ingredientId })
      .from(shoppingChecks)
      .innerJoin(ingredients, eq(ingredients.id, shoppingChecks.ingredientId))
      .where(and(eq(shoppingChecks.weekStart, weekStart), eq(ingredients.userId, userId))),
  ])
  return buildShoppingList(plan, indexById(recipes), indexById(owned), new Set(checks.map((c) => c.ingredientId)))
}

/** Ticks or unticks one of the user's ingredients. Returns false when it isn't theirs. */
export async function setChecked(db: Db, userId: number, weekStart: string, ingredientId: number, checked: boolean): Promise<boolean> {
  if (!(await ownsIngredient(db, userId, ingredientId))) return false
  if (checked) {
    await db.insert(shoppingChecks).values({ weekStart, ingredientId }).onConflictDoNothing()
  } else {
    await db
      .delete(shoppingChecks)
      .where(and(eq(shoppingChecks.weekStart, weekStart), eq(shoppingChecks.ingredientId, ingredientId)))
  }
  return true
}

export async function resetChecks(db: Db, userId: number, weekStart: string): Promise<void> {
  const mine = db.select({ id: ingredients.id }).from(ingredients).where(eq(ingredients.userId, userId))
  await db.delete(shoppingChecks).where(and(eq(shoppingChecks.weekStart, weekStart), inArray(shoppingChecks.ingredientId, mine)))
}
