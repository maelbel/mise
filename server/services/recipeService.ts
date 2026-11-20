import { and, asc, eq, inArray } from 'drizzle-orm'
import type { Difficulty, Recipe, RecipeIngredient } from '#shared/types/domain'
import { ingredients, recipeIngredients, recipes } from '../db/schema'
import type { Db } from '../utils/db'

export interface NewRecipe {
  name: string
  timeMin: number
  difficulty: Difficulty
  kcal: number
  protein: number
  carbs: number
  fat: number
  tags: string[]
  diet: string[]
  ingredients: RecipeIngredient[]
}

export class UnknownIngredientError extends Error {
  constructor(readonly ids: number[]) {
    super(`Ingrédient(s) inconnu(s) : ${ids.join(', ')}`)
  }
}

export async function listRecipes(db: Db, userId: number): Promise<Recipe[]> {
  const [rows, lines] = await Promise.all([
    db.select().from(recipes).where(eq(recipes.userId, userId)).orderBy(asc(recipes.id)),
    db
      .select({ recipeId: recipeIngredients.recipeId, ingredientId: recipeIngredients.ingredientId, quantity: recipeIngredients.quantity })
      .from(recipeIngredients)
      .innerJoin(recipes, eq(recipes.id, recipeIngredients.recipeId))
      .where(eq(recipes.userId, userId)),
  ])
  const byRecipe = new Map<number, RecipeIngredient[]>()
  for (const line of lines) {
    const list = byRecipe.get(line.recipeId) ?? []
    list.push({ ingredientId: line.ingredientId, quantity: line.quantity })
    byRecipe.set(line.recipeId, list)
  }
  return rows.map(({ userId: _owner, ...r }) => ({ ...r, ingredients: byRecipe.get(r.id) ?? [] }))
}

/** The ids among `ids` that are not recipes of the user. */
export async function foreignRecipeIds(db: Db, userId: number, ids: number[]): Promise<number[]> {
  const unique = [...new Set(ids)]
  if (!unique.length) return []
  const found = await db.select({ id: recipes.id }).from(recipes).where(and(inArray(recipes.id, unique), eq(recipes.userId, userId)))
  const known = new Set(found.map((f) => f.id))
  return unique.filter((id) => !known.has(id))
}

type Tx = Parameters<Parameters<Db['transaction']>[0]>[0]

/** Throws UnknownIngredientError unless every line uses one of the user's own ingredients. */
async function assertOwnIngredients(tx: Tx, userId: number, lines: RecipeIngredient[]): Promise<void> {
  const ids = [...new Set(lines.map((l) => l.ingredientId))]
  if (!ids.length) return
  // Someone else's id counts as unknown.
  const found = await tx
    .select({ id: ingredients.id })
    .from(ingredients)
    .where(and(inArray(ingredients.id, ids), eq(ingredients.userId, userId)))
  const known = new Set(found.map((f) => f.id))
  const missing = ids.filter((id) => !known.has(id))
  if (missing.length) throw new UnknownIngredientError(missing)
}

export async function createRecipe(db: Db, userId: number, input: NewRecipe): Promise<Recipe> {
  return db.transaction(async (tx) => {
    await assertOwnIngredients(tx, userId, input.ingredients)
    const { ingredients: lines, ...fields } = input
    const [row] = await tx.insert(recipes).values({ userId, ...fields }).returning()
    if (!row) throw new Error('Recipe was not created')
    if (lines.length) {
      await tx.insert(recipeIngredients).values(lines.map((l) => ({ recipeId: row.id, ...l })))
    }
    const { userId: _owner, ...recipe } = row
    return { ...recipe, ingredients: lines }
  })
}

/**
 * Replaces the fields and the ingredient list of one of the user's recipes.
 * Returns null when it isn't theirs or doesn't exist. Planned meals keep pointing to it.
 */
export async function updateRecipe(db: Db, userId: number, recipeId: number, input: NewRecipe): Promise<Recipe | null> {
  return db.transaction(async (tx) => {
    const [owned] = await tx
      .select({ id: recipes.id })
      .from(recipes)
      .where(and(eq(recipes.id, recipeId), eq(recipes.userId, userId)))
    if (!owned) return null
    await assertOwnIngredients(tx, userId, input.ingredients)
    const { ingredients: lines, ...fields } = input
    const [row] = await tx.update(recipes).set(fields).where(eq(recipes.id, recipeId)).returning()
    if (!row) throw new Error('Recipe was not updated')
    await tx.delete(recipeIngredients).where(eq(recipeIngredients.recipeId, recipeId))
    if (lines.length) {
      await tx.insert(recipeIngredients).values(lines.map((l) => ({ recipeId, ...l })))
    }
    const { userId: _owner, ...recipe } = row
    return { ...recipe, ingredients: lines }
  })
}
