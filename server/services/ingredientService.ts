import { and, asc, eq } from 'drizzle-orm'
import type { Ingredient, Unit } from '#shared/types/domain'
import { ingredients, stock } from '../db/schema'
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
