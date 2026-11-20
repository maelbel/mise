import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import type { Db } from '../../server/utils/db'
import { seedUser } from '../../server/db/seed'
import { createIngredient, listIngredients, setStock, UnitLockedError, updateIngredient } from '../../server/services/ingredientService'
import { createRecipe, listRecipes, UnknownIngredientError, updateRecipe } from '../../server/services/recipeService'
import { getWeekPlan, UnknownRecipeError, updateSlots } from '../../server/services/planService'
import { getShoppingList, resetChecks, setChecked } from '../../server/services/shoppingService'
import { getSuggestions } from '../../server/services/chefService'
import { getProfile, saveProfile } from '../../server/services/profileService'
import { emptyProfile } from '../../shared/utils/targets'
import { addDays, startOfWeek } from '../../shared/utils/week'
import { freshTestDb } from './testDb'

// The accounts get their starter plan for the current week.
const WEEK = startOfWeek(new Date())
const NEXT_WEEK = addDays(WEEK, 7)
const EARLY_WEEK = '2020-01-06'

let db: Db
let close: () => Promise<void>
let alice: number
let bob: number

beforeAll(async () => {
  const conn = await freshTestDb()
  db = conn.db
  close = conn.close
  alice = conn.admin.id
  bob = conn.member.id
})

afterAll(async () => {
  await close?.()
})

async function ids(userId: number) {
  const [recipes, ingredients] = await Promise.all([listRecipes(db, userId), listIngredients(db, userId)])
  return {
    recipe: (name: string) => recipes.find((r) => r.name === name)!.id,
    ingredient: (name: string) => ingredients.find((i) => i.name === name)!.id,
  }
}

describe('starter data', () => {
  it('gives each account its own copy, once', async () => {
    expect(await listRecipes(db, alice)).toHaveLength(5)
    expect(await listIngredients(db, alice)).toHaveLength(20)
    expect(await seedUser(db, alice, WEEK)).toBe(false)
    expect(await listRecipes(db, alice)).toHaveLength(5)
    const [a, b] = await Promise.all([ids(alice), ids(bob)])
    expect(a.recipe('Soupe de lentilles corail')).not.toBe(b.recipe('Soupe de lentilles corail'))
  })
})

describe('plan service', () => {
  it('returns the seeded week with 21 slots in day and meal order', async () => {
    const plan = await getWeekPlan(db, alice, WEEK)
    expect(plan.slots).toHaveLength(21)
    expect(plan.slots.slice(0, 3).map((s) => s.slot)).toEqual(['breakfast', 'lunch', 'dinner'])
  })

  it('starts a new week as a copy of the latest earlier week', async () => {
    const [week, next] = await Promise.all([getWeekPlan(db, alice, WEEK), getWeekPlan(db, alice, NEXT_WEEK)])
    expect(next.slots.map((s) => s.recipeId)).toEqual(week.slots.map((s) => s.recipeId))
  })

  it('starts an empty week when nothing comes before it', async () => {
    const plan = await getWeekPlan(db, alice, EARLY_WEEK)
    expect(plan.slots.every((s) => s.recipeId === null && s.portions === 1)).toBe(true)
  })

  it('updates recipes and portions of several slots at once', async () => {
    const { recipe } = await ids(alice)
    const plan = await updateSlots(db, alice, NEXT_WEEK, [
      { day: 0, slot: 'dinner', recipeId: recipe('Pâtes crémeuses au saumon') },
      { day: 1, slot: 'lunch', portions: 3 },
      { day: 2, slot: 'breakfast', recipeId: null },
    ])
    const at = (day: number, slot: string) => plan.slots.find((s) => s.day === day && s.slot === slot)!
    expect(at(0, 'dinner').recipeId).toBe(recipe('Pâtes crémeuses au saumon'))
    expect(at(1, 'lunch').portions).toBe(3)
    expect(at(2, 'breakfast').recipeId).toBeNull()
    const original = await getWeekPlan(db, alice, WEEK)
    expect(original.slots.find((s) => s.day === 0 && s.slot === 'dinner')!.recipeId).toBe(recipe('Soupe de lentilles corail'))
  })
})

describe('ingredients, stock and shopping', () => {
  it('subtracts stock from the shopping list', async () => {
    const { ingredient } = await ids(alice)
    const yogurt = () => getShoppingList(db, alice, WEEK).then((l) => l.groups.flatMap((g) => g.items).find((i) => i.ingredientId === ingredient('Yaourt grec')))
    expect((await yogurt())?.quantity).toBe(200)
    expect(await setStock(db, alice, ingredient('Yaourt grec'), 1400)).toBe(true)
    expect(await yogurt()).toBeUndefined()
  })

  it('remembers checked items per week and resets them', async () => {
    const { ingredient } = await ids(alice)
    const rice = ingredient('Riz')
    await setChecked(db, alice, WEEK, rice, true)
    await setChecked(db, alice, WEEK, rice, true)
    const checked = async (week: string) =>
      (await getShoppingList(db, alice, week)).groups.flatMap((g) => g.items).find((i) => i.ingredientId === rice)?.checked
    expect(await checked(WEEK)).toBe(true)
    expect(await checked(NEXT_WEEK)).toBe(false)
    await resetChecks(db, alice, WEEK)
    expect(await checked(WEEK)).toBe(false)
  })

  it('creates an ingredient with no stock and refuses duplicates for the same user only', async () => {
    const created = await createIngredient(db, alice, { name: 'Spinach', shelf: 'Fruits & Vegetables', unit: 'g', priceCents: 600 })
    expect(created.stock).toBe(0)
    await expect(createIngredient(db, alice, { name: 'Spinach', shelf: 'Dairy', unit: 'g', priceCents: 1 })).rejects.toThrow()
    await expect(createIngredient(db, bob, { name: 'Spinach', shelf: 'Fruits & Vegetables', unit: 'g', priceCents: 500 })).resolves.toBeTruthy()
  })
})

describe('recipes', () => {
  it('creates a recipe with its ingredients', async () => {
    const { ingredient } = await ids(alice)
    const recipe = await createRecipe(db, alice, {
      name: 'Spinach Omelette', timeMin: 10, difficulty: 'Easy', kcal: 320, protein: 24, carbs: 4, fat: 22,
      tags: ['Quick'], diet: ['Vegetarian'],
      ingredients: [{ ingredientId: ingredient('Spinach'), quantity: 80 }],
    })
    const listed = (await listRecipes(db, alice)).find((r) => r.id === recipe.id)
    expect(listed?.ingredients).toEqual([{ ingredientId: ingredient('Spinach'), quantity: 80 }])
  })

  it('refuses unknown ingredients and saves nothing', async () => {
    const before = (await listRecipes(db, alice)).length
    await expect(createRecipe(db, alice, {
      name: 'Ghost Stew', timeMin: 10, difficulty: 'Easy', kcal: 1, protein: 1, carbs: 1, fat: 1, tags: [], diet: [],
      ingredients: [{ ingredientId: 999_999, quantity: 1 }],
    })).rejects.toBeInstanceOf(UnknownIngredientError)
    expect(await listRecipes(db, alice)).toHaveLength(before)
  })
})

describe('editing recipes', () => {
  const base = { timeMin: 10, difficulty: 'Easy' as const, kcal: 300, protein: 10, carbs: 40, fat: 8, tags: [], diet: [] }

  it('renames a recipe, replaces its ingredients and keeps it in the plan', async () => {
    const { ingredient } = await ids(alice)
    const toast = await createRecipe(db, alice, { ...base, name: 'Toast', ingredients: [{ ingredientId: ingredient('Riz'), quantity: 50 }] })
    await updateSlots(db, alice, NEXT_WEEK, [{ day: 2, slot: 'breakfast', recipeId: toast.id }])

    const updated = await updateRecipe(db, alice, toast.id, {
      ...base, name: 'Tartine aux épinards', kcal: 280, tags: ['Quick'],
      ingredients: [{ ingredientId: ingredient('Spinach'), quantity: 40 }],
    })

    expect(updated).toMatchObject({ id: toast.id, name: 'Tartine aux épinards', kcal: 280, tags: ['Quick'] })
    const listed = (await listRecipes(db, alice)).find((r) => r.id === toast.id)
    expect(listed?.name).toBe('Tartine aux épinards')
    expect(listed?.ingredients).toEqual([{ ingredientId: ingredient('Spinach'), quantity: 40 }])
    const plan = await getWeekPlan(db, alice, NEXT_WEEK)
    expect(plan.slots.find((s) => s.day === 2 && s.slot === 'breakfast')!.recipeId).toBe(toast.id)
  })

  it('refuses a name already taken or an unknown ingredient, and changes nothing', async () => {
    const { recipe, ingredient } = await ids(alice)
    const id = recipe('Tartine aux épinards')
    await expect(updateRecipe(db, alice, id, { ...base, name: 'Soupe de lentilles corail', ingredients: [] })).rejects.toThrow()
    await expect(updateRecipe(db, alice, id, { ...base, name: 'Ghost Toast', ingredients: [{ ingredientId: 999_999, quantity: 1 }] }))
      .rejects.toBeInstanceOf(UnknownIngredientError)
    const listed = (await listRecipes(db, alice)).find((r) => r.id === id)
    expect(listed?.name).toBe('Tartine aux épinards')
    expect(listed?.ingredients).toEqual([{ ingredientId: ingredient('Spinach'), quantity: 40 }])
  })

  it('never edits the other user\'s recipe or uses their ingredients', async () => {
    const [a, b] = await Promise.all([ids(alice), ids(bob)])
    expect(await updateRecipe(db, bob, a.recipe('Tartine aux épinards'), { ...base, name: 'Stolen', ingredients: [] })).toBeNull()
    await expect(updateRecipe(db, bob, b.recipe('Soupe de lentilles corail'), {
      ...base, name: 'Soupe de lentilles corail', ingredients: [{ ingredientId: a.ingredient('Riz'), quantity: 1 }],
    })).rejects.toBeInstanceOf(UnknownIngredientError)
    expect((await listRecipes(db, alice)).some((r) => r.name === 'Stolen')).toBe(false)
  })
})

describe('editing ingredients', () => {
  it('renames, moves and reprices an ingredient, keeping its stock', async () => {
    const created = await createIngredient(db, alice, { name: 'Kale', shelf: 'Dairy', unit: 'g', priceCents: 500 })
    const updated = await updateIngredient(db, alice, created.id, { name: 'Chou kale', shelf: 'Fruits & Vegetables', unit: 'g', priceCents: 650 })
    expect(updated).toEqual({ id: created.id, name: 'Chou kale', shelf: 'Fruits & Vegetables', unit: 'g', priceCents: 650, stock: 0 })
    await expect(updateIngredient(db, alice, created.id, { name: 'Riz', shelf: 'Dairy', unit: 'g', priceCents: 1 })).rejects.toThrow()
  })

  it('changes the unit only while no recipe and no stock use it', async () => {
    const free = await createIngredient(db, alice, { name: 'Citron', shelf: 'Fruits & Vegetables', unit: 'g', priceCents: 300 })
    expect((await updateIngredient(db, alice, free.id, { name: 'Citron', shelf: 'Fruits & Vegetables', unit: 'pcs', priceCents: 40 }))?.unit).toBe('pcs')

    const stocked = await createIngredient(db, alice, { name: 'Farine', shelf: 'Dairy', unit: 'g', priceCents: 120 })
    await setStock(db, alice, stocked.id, 500)
    await expect(updateIngredient(db, alice, stocked.id, { name: 'Farine', shelf: 'Dairy', unit: 'pcs', priceCents: 120 }))
      .rejects.toBeInstanceOf(UnitLockedError)

    const { ingredient } = await ids(alice)
    const spinach = ingredient('Spinach') // used by the omelette
    await expect(updateIngredient(db, alice, spinach, { name: 'Spinach', shelf: 'Fruits & Vegetables', unit: 'pcs', priceCents: 600 }))
      .rejects.toBeInstanceOf(UnitLockedError)
    // Same unit: the rest can still change.
    expect((await updateIngredient(db, alice, spinach, { name: 'Épinards', shelf: 'Fruits & Vegetables', unit: 'g', priceCents: 600 }))?.name).toBe('Épinards')
    expect((await listIngredients(db, alice)).find((i) => i.id === stocked.id)).toMatchObject({ unit: 'g', stock: 500 })
  })

  it('never edits the other user\'s ingredient', async () => {
    const a = await ids(alice)
    expect(await updateIngredient(db, bob, a.ingredient('Riz'), { name: 'Mine', shelf: 'Dairy', unit: 'g', priceCents: 1 })).toBeNull()
    expect((await listIngredients(db, alice)).some((i) => i.name === 'Riz')).toBe(true)
  })
})

describe('separate accounts', () => {
  it('never shows one user the other user\'s recipes or ingredients', async () => {
    const aliceRecipes = new Set((await listRecipes(db, alice)).map((r) => r.id))
    const bobRecipes = await listRecipes(db, bob)
    expect(bobRecipes.some((r) => aliceRecipes.has(r.id))).toBe(false)
    expect(bobRecipes.some((r) => r.name === 'Spinach Omelette')).toBe(false)
  })

  it('refuses to use, stock, tick or cook with the other user\'s data', async () => {
    const a = await ids(alice)
    await expect(updateSlots(db, bob, WEEK, [{ day: 0, slot: 'lunch', recipeId: a.recipe('Spinach Omelette') }]))
      .rejects.toBeInstanceOf(UnknownRecipeError)
    expect(await setStock(db, bob, a.ingredient('Riz'), 5)).toBe(false)
    expect(await setChecked(db, bob, WEEK, a.ingredient('Riz'), true)).toBe(false)
    await expect(createRecipe(db, bob, {
      name: 'Borrowed Rice', timeMin: 10, difficulty: 'Easy', kcal: 1, protein: 1, carbs: 1, fat: 1, tags: [], diet: [],
      ingredients: [{ ingredientId: a.ingredient('Riz'), quantity: 1 }],
    })).rejects.toBeInstanceOf(UnknownIngredientError)
    // Alice's data did not change.
    expect((await listIngredients(db, alice)).find((i) => i.name === 'Riz')!.stock).toBe(0)
  })

  it('keeps plans apart', async () => {
    const b = await ids(bob)
    await updateSlots(db, bob, WEEK, [{ day: 6, slot: 'dinner', recipeId: b.recipe('Soupe de lentilles corail'), portions: 4 }])
    const alicePlan = await getWeekPlan(db, alice, WEEK)
    expect(alicePlan.slots.find((s) => s.day === 6 && s.slot === 'dinner')!.portions).toBe(1)
  })
})

describe('profile', () => {
  it('starts empty without targets, then saves and calculates them', async () => {
    const empty = await getProfile(db, bob)
    expect(empty.targets).toBeNull()
    const saved = await saveProfile(db, bob, {
      ...emptyProfile(), sex: 'male', birthDate: '1992-03-14', heightCm: 178, weightKg: 74, activity: 1,
    }, '2026-11-19')
    expect(saved.targets).toEqual({ kcal: 2320, protein: 118, carbs: 289, fat: 77 })
    expect((await getProfile(db, bob, '2026-11-19')).profile.weightKg).toBe(74)
    expect((await getProfile(db, alice)).targets).toBeNull()
  })
})

describe('chef', () => {
  it('suggests the protein swap for the seeded week', async () => {
    const { recipe } = await ids(alice)
    const suggestions = await getSuggestions(db, alice, WEEK)
    const protein = suggestions.find((s) => s.id === 'protein')!
    expect(protein.changes.length).toBe(5)
    expect(protein.changes.every((c) => c.toRecipeId === recipe('Pâtes crémeuses au saumon'))).toBe(true)
  })

  it('follows the profile: foods to avoid are never proposed', async () => {
    await saveProfile(db, alice, { ...emptyProfile(), avoid: ['saumon'] })
    const protein = (await getSuggestions(db, alice, WEEK)).find((s) => s.id === 'protein')!
    const { recipe } = await ids(alice)
    expect(protein.changes.some((c) => c.toRecipeId === recipe('Pâtes crémeuses au saumon'))).toBe(false)
  })
})
