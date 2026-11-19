import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { sql } from 'drizzle-orm'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import type { Db } from '../../server/utils/db'
import { listRecipes } from '../../server/services/recipeService'
import { getWeekPlan } from '../../server/services/planService'
import { listFamily, setUpAdmin, verifyLogin } from '../../server/services/userService'
import { emptyTestDb } from './testDb'

const MIGRATIONS = 'server/db/migrations'

async function runMigrationFile(db: Db, prefix: string): Promise<void> {
  const file = readdirSync(MIGRATIONS).find((f) => f.startsWith(prefix) && f.endsWith('.sql'))!
  for (const statement of readFileSync(join(MIGRATIONS, file), 'utf8').split('--> statement-breakpoint')) {
    if (statement.trim()) await db.execute(sql.raw(statement))
  }
}

let db: Db
let close: () => Promise<void>

beforeAll(async () => {
  const conn = await emptyTestDb()
  db = conn.db
  close = conn.close
  // A database from before accounts, with a little data in it.
  await runMigrationFile(db, '0000_')
  await db.execute(sql`INSERT INTO ingredients (name, shelf, unit, price_cents) VALUES ('Rice', 'Savory Pantry', 'g', 250)`)
  await db.execute(sql`INSERT INTO recipes (name, time_min, difficulty, kcal, protein, carbs, fat) VALUES ('Plain Rice', 20, 'Easy', 350, 7, 78, 1)`)
  await db.execute(sql`INSERT INTO meal_plan_slots (week_start, day, slot, recipe_id, portions) SELECT '2026-11-16', 0, 'lunch', id, 2 FROM recipes`)
  await runMigrationFile(db, '0001_')
})

afterAll(async () => {
  await close?.()
})

describe('migration to accounts', () => {
  it('gives the existing data to a placeholder owner that cannot log in', async () => {
    const owners = await db.execute<{ id: number, password_hash: string | null }>(sql`SELECT id, password_hash FROM users`)
    expect(owners).toHaveLength(1)
    expect(owners[0]!.password_hash).toBeNull()
    expect(await listFamily(db)).toHaveLength(0)
    expect((await verifyLogin(db, 'owner@mise.invalid', '')).ok).toBe(false)
  })

  it('hands that data to the admin set up from the command line', async () => {
    const { user, claimed } = await setUpAdmin(db, { email: 'Admin@Example.test', name: 'Admin', password: 'a-long-admin-password' })
    expect(claimed).toBe(true)
    expect(user.email).toBe('admin@example.test')
    expect((await listRecipes(db, user.id)).map((r) => r.name)).toEqual(['Plain Rice'])
    const plan = await getWeekPlan(db, user.id, '2026-11-16')
    expect(plan.slots.find((s) => s.day === 0 && s.slot === 'lunch')!.portions).toBe(2)
    expect((await verifyLogin(db, 'admin@example.test', 'a-long-admin-password')).ok).toBe(true)
  })
})
