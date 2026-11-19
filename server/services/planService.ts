import { and, desc, eq, lt } from 'drizzle-orm'
import type { MealSlot, PlanSlot, WeekPlan } from '#shared/types/domain'
import { MEAL_SLOTS } from '#shared/utils/constants'
import { mealPlanSlots } from '../db/schema'
import type { Db } from '../utils/db'
import { foreignRecipeIds } from './recipeService'

export interface SlotUpdate {
  day: number
  slot: MealSlot
  recipeId?: number | null
  portions?: number
}

export class UnknownRecipeError extends Error {
  constructor(readonly ids: number[]) {
    super(`Recette(s) inconnue(s) : ${ids.join(', ')}`)
  }
}

const SLOT_ORDER = new Map(MEAL_SLOTS.map((s, i) => [s, i]))

function sortSlots(slots: PlanSlot[]): PlanSlot[] {
  return slots.sort((a, b) => a.day - b.day || SLOT_ORDER.get(a.slot)! - SLOT_ORDER.get(b.slot)!)
}

function emptyWeek(): PlanSlot[] {
  const slots: PlanSlot[] = []
  for (let day = 0; day < 7; day++) {
    for (const slot of MEAL_SLOTS) slots.push({ day, slot, recipeId: null, portions: 1 })
  }
  return slots
}

async function readSlots(db: Db, userId: number, weekStart: string): Promise<PlanSlot[]> {
  const rows = await db
    .select({ day: mealPlanSlots.day, slot: mealPlanSlots.slot, recipeId: mealPlanSlots.recipeId, portions: mealPlanSlots.portions })
    .from(mealPlanSlots)
    .where(and(eq(mealPlanSlots.userId, userId), eq(mealPlanSlots.weekStart, weekStart)))
  return sortSlots(rows)
}

/**
 * The user's plan for a week. A week opened for the first time starts as a
 * copy of their latest earlier week, or empty when there is none.
 */
export async function getWeekPlan(db: Db, userId: number, weekStart: string): Promise<WeekPlan> {
  const existing = await readSlots(db, userId, weekStart)
  if (existing.length) return { weekStart, slots: existing }

  const [previous] = await db
    .select({ weekStart: mealPlanSlots.weekStart })
    .from(mealPlanSlots)
    .where(and(eq(mealPlanSlots.userId, userId), lt(mealPlanSlots.weekStart, weekStart)))
    .orderBy(desc(mealPlanSlots.weekStart))
    .limit(1)
  const template = previous ? await readSlots(db, userId, previous.weekStart) : []
  const byKey = new Map(template.map((s) => [`${s.day}:${s.slot}`, s]))
  const slots = emptyWeek().map((s) => byKey.get(`${s.day}:${s.slot}`) ?? s)

  await db
    .insert(mealPlanSlots)
    .values(slots.map((s) => ({ userId, weekStart, ...s })))
    .onConflictDoNothing()
  return { weekStart, slots: await readSlots(db, userId, weekStart) }
}

/** Applies slot updates in one transaction and returns the whole week. Only the user's recipes can be placed. */
export async function updateSlots(db: Db, userId: number, weekStart: string, updates: SlotUpdate[]): Promise<WeekPlan> {
  const recipeIds = updates.map((u) => u.recipeId).filter((id): id is number => typeof id === 'number')
  const foreign = await foreignRecipeIds(db, userId, recipeIds)
  if (foreign.length) throw new UnknownRecipeError(foreign)

  await getWeekPlan(db, userId, weekStart)
  await db.transaction(async (tx) => {
    for (const u of updates) {
      const set: Partial<{ recipeId: number | null, portions: number }> = {}
      if (u.recipeId !== undefined) set.recipeId = u.recipeId
      if (u.portions !== undefined) set.portions = u.portions
      if (!Object.keys(set).length) continue
      await tx
        .update(mealPlanSlots)
        .set(set)
        .where(and(
          eq(mealPlanSlots.userId, userId),
          eq(mealPlanSlots.weekStart, weekStart),
          eq(mealPlanSlots.day, u.day),
          eq(mealPlanSlots.slot, u.slot),
        ))
    }
  })
  return { weekStart, slots: await readSlots(db, userId, weekStart) }
}
