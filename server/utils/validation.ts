import { z } from 'zod'
import { isWeekStart } from '#shared/utils/week'
import { DIFFICULTIES, MAX_PORTIONS, MAX_STOCK, MEAL_SLOTS, MIN_PORTIONS, UNITS } from '#shared/utils/constants'
import { PASSWORD_MAX_LENGTH, passwordProblem } from '#shared/utils/password'
import { ACTIVITY_LEVELS, ageOn, DIET_OPTIONS, PROFILE_LIMITS, todayIso } from '#shared/utils/targets'

export const weekStartSchema = z.string().refine(isWeekStart, 'Doit être un lundi, au format AAAA-MM-JJ')

export const weekQuerySchema = z.object({ week: weekStartSchema })

export const idParamSchema = z.object({ id: z.coerce.number().int().positive() })

const slotSchema = z.enum(MEAL_SLOTS as [string, ...string[]]).transform((s) => s as (typeof MEAL_SLOTS)[number])

export const slotUpdatesBodySchema = z.object({
  week: weekStartSchema,
  updates: z.array(z.object({
    day: z.number().int().min(0).max(6),
    slot: slotSchema,
    recipeId: z.number().int().positive().nullable().optional(),
    portions: z.number().int().min(MIN_PORTIONS).max(MAX_PORTIONS).optional(),
  })).min(1).max(21),
})

export const stockBodySchema = z.object({ quantity: z.number().min(0).max(MAX_STOCK) })

export const newIngredientBodySchema = z.object({
  name: z.string().trim().min(1).max(80),
  shelf: z.string().trim().min(1).max(60),
  unit: z.enum(UNITS as [string, ...string[]]).transform((u) => u as (typeof UNITS)[number]),
  priceCents: z.number().int().min(0).max(1_000_000),
})

export const newRecipeBodySchema = z.object({
  name: z.string().trim().min(1).max(120),
  timeMin: z.number().int().min(1).max(1440),
  difficulty: z.enum(DIFFICULTIES as [string, ...string[]]).transform((d) => d as (typeof DIFFICULTIES)[number]),
  kcal: z.number().int().min(0).max(10_000),
  protein: z.number().int().min(0).max(1000),
  carbs: z.number().int().min(0).max(1000),
  fat: z.number().int().min(0).max(1000),
  tags: z.array(z.string().trim().min(1).max(30)).max(10).default([]),
  diet: z.array(z.string().trim().min(1).max(30)).max(10).default([]),
  ingredients: z.array(z.object({
    ingredientId: z.number().int().positive(),
    quantity: z.number().positive().max(100_000),
  })).max(40).refine(
    (lines) => new Set(lines.map((l) => l.ingredientId)).size === lines.length,
    'Chaque ingrédient ne peut apparaître qu’une fois',
  ),
})

export const shoppingCheckBodySchema = z.object({
  week: weekStartSchema,
  ingredientId: z.number().int().positive(),
  checked: z.boolean(),
})

/** Postgres unique-violation error code. */
export function isUniqueViolation(error: unknown): boolean {
  const cause = (error as { cause?: { code?: string } })?.cause
  return (error as { code?: string })?.code === '23505' || cause?.code === '23505'
}

// --- Accounts and profile -------------------------------------------------

const emailSchema = z.string().trim().toLowerCase().max(254).pipe(z.email({ message: 'Adresse e-mail invalide' }))

const newPasswordSchema = z.string().superRefine((password, ctx) => {
  const problem = passwordProblem(password)
  if (problem) ctx.addIssue({ code: 'custom', message: problem })
})

export const loginBodySchema = z.object({
  email: z.string().trim().toLowerCase().max(254),
  password: z.string().min(1).max(PASSWORD_MAX_LENGTH),
})

export const passwordBodySchema = z.object({
  /** Not needed while the account still has a temporary password. */
  currentPassword: z.string().max(PASSWORD_MAX_LENGTH).optional(),
  newPassword: newPasswordSchema,
})

export const newMemberBodySchema = z.object({
  name: z.string().trim().min(1, 'Indiquez un prénom').max(60),
  email: emailSchema,
})

export const memberPatchBodySchema = z.object({ disabled: z.boolean() })

const optionalInt = (min: number, max: number) => z.number().int().min(min).max(max).nullable()
const tagList = z.array(z.string().trim().min(1).max(40)).max(20)
  .transform((list) => [...new Map(list.map((v) => [v.toLowerCase(), v])).values()])

export const profileBodySchema = z.object({
  sex: z.enum(['male', 'female', 'unspecified']).nullable(),
  birthDate: z.iso.date().nullable().refine((d) => {
    if (d === null) return true
    const age = ageOn(d, todayIso())
    return age >= PROFILE_LIMITS.age.min && age <= PROFILE_LIMITS.age.max
  }, `L’âge doit être entre ${PROFILE_LIMITS.age.min} et ${PROFILE_LIMITS.age.max} ans`),
  heightCm: z.number().min(PROFILE_LIMITS.heightCm.min).max(PROFILE_LIMITS.heightCm.max).nullable(),
  weightKg: z.number().min(PROFILE_LIMITS.weightKg.min).max(PROFILE_LIMITS.weightKg.max).nullable(),
  activity: z.number().int().min(0).max(ACTIVITY_LEVELS.length - 1).nullable(),
  goal: z.enum(['lose', 'maintain', 'gain']),
  pace: z.enum(['slow', 'normal', 'fast']),
  diet: z.array(z.enum(DIET_OPTIONS)).max(DIET_OPTIONS.length).transform((d) => [...new Set(d)] as string[]),
  avoid: tagList,
  weekdayMaxMinutes: optionalInt(5, 600),
  weeklyBudgetCents: optionalInt(0, 10_000_000),
  targetKcal: optionalInt(800, 10_000),
  targetProtein: optionalInt(10, 600),
  targetCarbs: optionalInt(0, 1500),
  targetFat: optionalInt(0, 600),
})
