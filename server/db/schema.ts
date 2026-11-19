import { sql } from 'drizzle-orm'
import {
  boolean,
  check,
  date,
  doublePrecision,
  index,
  integer,
  pgEnum,
  pgTable,
  primaryKey,
  serial,
  smallint,
  text,
  timestamp,
  unique,
} from 'drizzle-orm/pg-core'

export const unitEnum = pgEnum('unit', ['g', 'mL', 'pcs', 'tbsp'])
export const mealSlotEnum = pgEnum('meal_slot', ['breakfast', 'lunch', 'dinner'])
export const difficultyEnum = pgEnum('difficulty', ['Easy', 'Medium', 'Hard'])
export const sexEnum = pgEnum('sex', ['male', 'female', 'unspecified'])
export const goalEnum = pgEnum('goal', ['lose', 'maintain', 'gain'])
export const paceEnum = pgEnum('pace', ['slow', 'normal', 'fast'])

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  /** Always stored in lower case. */
  email: text('email').notNull().unique(),
  name: text('name').notNull(),
  /** Null only for the placeholder owner created when older data was migrated: it cannot log in. */
  passwordHash: text('password_hash'),
  isAdmin: boolean('is_admin').notNull().default(false),
  /** Set for a temporary password: the user must choose their own before anything else. */
  mustChangePassword: boolean('must_change_password').notNull().default(true),
  disabledAt: timestamp('disabled_at', { withTimezone: true }),
  /** Bumped on password change, reset or deactivation: older sessions stop working. */
  sessionVersion: integer('session_version').notNull().default(1),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  lastLoginAt: timestamp('last_login_at', { withTimezone: true }),
})

export const profiles = pgTable('profiles', {
  userId: integer('user_id').primaryKey().references(() => users.id, { onDelete: 'cascade' }),
  sex: sexEnum('sex'),
  birthDate: date('birth_date', { mode: 'string' }),
  heightCm: doublePrecision('height_cm'),
  weightKg: doublePrecision('weight_kg'),
  /** 0 = sedentary … 4 = very active. */
  activity: smallint('activity'),
  goal: goalEnum('goal').notNull().default('maintain'),
  pace: paceEnum('pace').notNull().default('normal'),
  diet: text('diet').array().notNull().default(sql`'{}'::text[]`),
  avoid: text('avoid').array().notNull().default(sql`'{}'::text[]`),
  weekdayMaxMinutes: integer('weekday_max_minutes'),
  weeklyBudgetCents: integer('weekly_budget_cents'),
  targetKcal: integer('target_kcal'),
  targetProtein: integer('target_protein'),
  targetCarbs: integer('target_carbs'),
  targetFat: integer('target_fat'),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [check('profiles_activity_range', sql`${t.activity} BETWEEN 0 AND 4`)])

export const ingredients = pgTable('ingredients', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  shelf: text('shelf').notNull(),
  unit: unitEnum('unit').notNull(),
  /** Price of one purchase unit (kg, L or piece), in cents. */
  priceCents: integer('price_cents').notNull().default(0),
}, (t) => [
  unique('ingredients_user_name_unique').on(t.userId, t.name),
  check('ingredients_price_positive', sql`${t.priceCents} >= 0`),
])

/** Owned through its ingredient. */
export const stock = pgTable('stock', {
  ingredientId: integer('ingredient_id').primaryKey().references(() => ingredients.id, { onDelete: 'cascade' }),
  quantity: doublePrecision('quantity').notNull().default(0),
}, (t) => [check('stock_quantity_positive', sql`${t.quantity} >= 0`)])

export const recipes = pgTable('recipes', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  timeMin: integer('time_min').notNull(),
  difficulty: difficultyEnum('difficulty').notNull(),
  kcal: integer('kcal').notNull(),
  protein: integer('protein').notNull(),
  carbs: integer('carbs').notNull(),
  fat: integer('fat').notNull(),
  tags: text('tags').array().notNull().default(sql`'{}'::text[]`),
  diet: text('diet').array().notNull().default(sql`'{}'::text[]`),
}, (t) => [unique('recipes_user_name_unique').on(t.userId, t.name)])

/** Owned through its recipe; the services only link ingredients of the same user. */
export const recipeIngredients = pgTable('recipe_ingredients', {
  recipeId: integer('recipe_id').notNull().references(() => recipes.id, { onDelete: 'cascade' }),
  ingredientId: integer('ingredient_id').notNull().references(() => ingredients.id, { onDelete: 'restrict' }),
  /** Quantity for one serving, in the ingredient's unit. */
  quantity: doublePrecision('quantity').notNull(),
}, (t) => [
  primaryKey({ columns: [t.recipeId, t.ingredientId] }),
  check('recipe_ingredients_quantity_positive', sql`${t.quantity} > 0`),
])

export const mealPlanSlots = pgTable('meal_plan_slots', {
  userId: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  weekStart: date('week_start', { mode: 'string' }).notNull(),
  day: smallint('day').notNull(),
  slot: mealSlotEnum('slot').notNull(),
  recipeId: integer('recipe_id').references(() => recipes.id, { onDelete: 'set null' }),
  portions: smallint('portions').notNull().default(1),
}, (t) => [
  primaryKey({ columns: [t.userId, t.weekStart, t.day, t.slot] }),
  check('meal_plan_slots_day_range', sql`${t.day} BETWEEN 0 AND 6`),
  check('meal_plan_slots_portions_range', sql`${t.portions} BETWEEN 1 AND 4`),
])

/** Owned through its ingredient. */
export const shoppingChecks = pgTable('shopping_checks', {
  weekStart: date('week_start', { mode: 'string' }).notNull(),
  ingredientId: integer('ingredient_id').notNull().references(() => ingredients.id, { onDelete: 'cascade' }),
}, (t) => [
  primaryKey({ columns: [t.weekStart, t.ingredientId] }),
  index('shopping_checks_ingredient_idx').on(t.ingredientId),
])
