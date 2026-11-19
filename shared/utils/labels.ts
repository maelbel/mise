import type { Difficulty, Unit } from '../types/domain'

/**
 * French labels for values stored as codes. The database keeps the codes
 * (shelves, diets, tags, difficulty), so older data and Chef's matching keep
 * working; only what is shown changes. Unknown values are shown as they are.
 */

export const SHELF_LABELS: Record<string, string> = {
  'Fruits & Vegetables': 'Fruits et légumes',
  'Meat': 'Boucherie',
  'Fresh Produce': 'Frais',
  'Dairy': 'Crèmerie',
  'Bakery': 'Boulangerie',
  'Savory Pantry': 'Épicerie salée',
  'Sweet Pantry': 'Épicerie sucrée',
  'Liquids': 'Liquides',
}

export const DIFFICULTY_LABELS: Record<Difficulty, string> = { Easy: 'Facile', Medium: 'Moyen', Hard: 'Difficile' }

export const DIET_LABELS: Record<string, string> = {
  'Vegetarian': 'Végétarien',
  'Vegan': 'Vegan',
  'Gluten-free': 'Sans gluten',
  'Lactose-free': 'Sans lactose',
}

export const TAG_LABELS: Record<string, string> = {
  Health: 'Santé',
  Quick: 'Rapide',
  Treat: 'Plaisir',
  Weekend: 'Week-end',
  Protein: 'Protéines',
}

export const shelfLabel = (shelf: string): string => SHELF_LABELS[shelf] ?? shelf
export const dietLabel = (diet: string): string => DIET_LABELS[diet] ?? diet
export const tagLabel = (tag: string): string => TAG_LABELS[tag] ?? tag
export const difficultyLabel = (d: Difficulty): string => DIFFICULTY_LABELS[d] ?? d

/** Unit as written after a quantity: "3 pièces", "2 c. à s.". */
export function unitLabel(unit: Unit, quantity = 1): string {
  if (unit === 'pcs') return quantity > 1 ? 'pièces' : 'pièce'
  if (unit === 'tbsp') return 'c. à s.'
  return unit
}

/** Name of a unit on its own, for forms. */
export const UNIT_NAMES: Record<Unit, string> = {
  g: 'Au poids (g)',
  mL: 'Au volume (mL)',
  pcs: 'À la pièce',
  tbsp: 'À la cuillère (c. à s.)',
}
