import { and, asc, eq } from 'drizzle-orm'
import type { Ingredient, Unit } from '#shared/types/domain'
import { ingredients, recipeIngredients, stock } from '../db/schema'
import type { Db } from '../utils/db'

export interface NewIngredient {
  name: string
  shelf: string
  unit: Unit
  priceCents: number
}

export async function listIngredients(db: Db, userId: number): Promise<Ingredient[]> {
  const rows = await db
    .select({
      id: ingredients.id,
      name: ingredients.name,
      shelf: ingredients.shelf,
      unit: ingredients.unit,
      priceCents: ingredients.priceCents,
      stock: stock.quantity,
    })
    .from(ingredients)
    .leftJoin(stock, eq(stock.ingredientId, ingredients.id))
    .where(eq(ingredients.userId, userId))
    .orderBy(asc(ingredients.name))
  return rows.map((r) => ({ ...r, stock: r.stock ?? 0 }))
}

export async function createIngredient(db: Db, userId: number, input: NewIngredient): Promise<Ingredient> {
  const [row] = await db.insert(ingredients).values({ userId, ...input }).returning()
  if (!row) throw new Error('Ingredient was not created')
  const { userId: _owner, ...ingredient } = row
  return { ...ingredient, stock: 0 }
}

export class UnitLockedError extends Error {
  constructor() {
    super('L’unité ne peut pas changer : l’ingrédient sert dans une recette ou est en réserve')
  }
}

/**
 * Updates one of the user's ingredients. Returns null when it isn't theirs or doesn't exist.
 * Recipe quantities and stock are stored in the ingredient's unit, so the unit can only
 * change while nothing uses it: otherwise this throws UnitLockedError.
 */
export async function updateIngredient(db: Db, userId: number, ingredientId: number, input: NewIngredient): Promise<Ingredient | null> {
  return db.transaction(async (tx) => {
    const [current] = await tx
      .select({ unit: ingredients.unit, stock: stock.quantity })
      .from(ingredients)
      .leftJoin(stock, eq(stock.ingredientId, ingredients.id))
      .where(and(eq(ingredients.id, ingredientId), eq(ingredients.userId, userId)))
    if (!current) return null
    const stockQuantity = current.stock ?? 0
    if (input.unit !== current.unit) {
      const [usedInRecipe] = await tx
        .select({ id: recipeIngredients.recipeId })
        .from(recipeIngredients)
        .where(eq(recipeIngredients.ingredientId, ingredientId))
        .limit(1)
      if (usedInRecipe || stockQuantity > 0) throw new UnitLockedError()
    }
    const [row] = await tx.update(ingredients).set(input).where(eq(ingredients.id, ingredientId)).returning()
    if (!row) throw new Error('Ingredient was not updated')
    const { userId: _owner, ...ingredient } = row
    return { ...ingredient, stock: stockQuantity }
  })
}

/** True when the ingredient exists and belongs to the user. */
export async function ownsIngredient(db: Db, userId: number, ingredientId: number): Promise<boolean> {
  const [row] = await db
    .select({ id: ingredients.id })
    .from(ingredients)
    .where(and(eq(ingredients.id, ingredientId), eq(ingredients.userId, userId)))
  return !!row
}

/** Sets the stock of one of the user's ingredients. Returns false when it isn't theirs or doesn't exist. */
export async function setStock(db: Db, userId: number, ingredientId: number, quantity: number): Promise<boolean> {
  if (!(await ownsIngredient(db, userId, ingredientId))) return false
  await db
    .insert(stock)
    .values({ ingredientId, quantity })
    .onConflictDoUpdate({ target: stock.ingredientId, set: { quantity } })
  return true
}
