import type { Difficulty, MealSlot, Unit } from '../types/domain'

export const MEAL_SLOTS: readonly MealSlot[] = ['breakfast', 'lunch', 'dinner']

export const MEAL_SLOT_LABELS: Record<MealSlot, string> = {
  breakfast: 'Petit-déjeuner',
  lunch: 'Déjeuner',
  dinner: 'Dîner',
}

export const DAY_NAMES = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'] as const

export const UNITS: readonly Unit[] = ['g', 'mL', 'pcs', 'tbsp']

export const DIFFICULTIES: readonly Difficulty[] = ['Easy', 'Medium', 'Hard']

/**
 * Shelf codes in store-walk order, as stored in the database. Unknown shelves
 * are listed after these. Shown in French through `shelfLabel`.
 */
export const SHELVES = [
  'Fruits & Vegetables',
  'Meat',
  'Fresh Produce',
  'Dairy',
  'Bakery',
  'Savory Pantry',
  'Sweet Pantry',
  'Liquids',
] as const

export const MIN_PORTIONS = 1
export const MAX_PORTIONS = 4
