import { describe, expect, it } from 'vitest'
import { loadDbConfig } from '../../server/utils/config'
import { newRecipeBodySchema, slotUpdatesBodySchema, weekQuerySchema } from '../../server/utils/validation'

describe('request validation', () => {
  it('only accepts a Monday as the week', () => {
    expect(weekQuerySchema.safeParse({ week: '2026-11-16' }).success).toBe(true)
    expect(weekQuerySchema.safeParse({ week: '2026-11-18' }).success).toBe(false)
  })

  it('rejects out-of-range slot updates', () => {
    const base = { week: '2026-11-16', updates: [{ day: 0, slot: 'lunch', portions: 2 }] }
    expect(slotUpdatesBodySchema.safeParse(base).success).toBe(true)
    expect(slotUpdatesBodySchema.safeParse({ ...base, updates: [{ day: 7, slot: 'lunch' }] }).success).toBe(false)
    expect(slotUpdatesBodySchema.safeParse({ ...base, updates: [{ day: 0, slot: 'brunch' }] }).success).toBe(false)
    expect(slotUpdatesBodySchema.safeParse({ ...base, updates: [{ day: 0, slot: 'lunch', portions: 5 }] }).success).toBe(false)
    expect(slotUpdatesBodySchema.safeParse({ ...base, updates: [] }).success).toBe(false)
  })

  it('rejects a recipe that lists the same ingredient twice', () => {
    const recipe = {
      name: 'Toast', timeMin: 5, difficulty: 'Easy', kcal: 200, protein: 6, carbs: 30, fat: 5,
      ingredients: [{ ingredientId: 1, quantity: 1 }, { ingredientId: 1, quantity: 2 }],
    }
    expect(newRecipeBodySchema.safeParse(recipe).success).toBe(false)
    expect(newRecipeBodySchema.safeParse({ ...recipe, ingredients: [] }).success).toBe(true)
  })
})

describe('database configuration', () => {
  const env = {
    POSTGRES_HOST: 'localhost', POSTGRES_PORT: '5432', POSTGRES_USER: 'u', POSTGRES_PASSWORD: 'p', POSTGRES_DB: 'd',
  }

  it('reads the settings and defaults the test database', () => {
    expect(loadDbConfig(env)).toEqual({ host: 'localhost', port: 5432, user: 'u', password: 'p', database: 'd', testDatabase: 'meal_planner_test' })
  })

  it('explains what is missing', () => {
    expect(() => loadDbConfig({ ...env, POSTGRES_PASSWORD: '' })).toThrow(/POSTGRES_PASSWORD/)
    expect(() => loadDbConfig({ ...env, POSTGRES_PORT: 'abc' })).toThrow(/POSTGRES_PORT/)
  })
})
