import type { Ingredient, Recipe, Unit } from '../types/domain'
import { MAX_STOCK } from './constants'
import { unitLabel } from './labels'

interface PurchaseUnit {
  label: string
  /** How many recipe units make one purchase unit. */
  perPurchase: number
}

const ML_PER_TBSP = 15

export const PURCHASE_UNITS: Record<Unit, PurchaseUnit> = {
  g: { label: 'kg', perPurchase: 1000 },
  mL: { label: 'L', perPurchase: 1000 },
  tbsp: { label: 'L', perPurchase: 1000 / ML_PER_TBSP },
  pcs: { label: 'pièce', perPurchase: 1 },
}

/** Cost in cents of `quantity` (in recipe units) of an ingredient. */
export function costCents(ingredient: Pick<Ingredient, 'unit' | 'priceCents'>, quantity: number): number {
  return Math.round((quantity / PURCHASE_UNITS[ingredient.unit].perPurchase) * ingredient.priceCents)
}

/** Cost in cents of one serving of a recipe. Unknown ingredients count as free. */
export function recipeCostCents(recipe: Recipe, ingredients: ReadonlyMap<number, Ingredient>): number {
  return recipe.ingredients.reduce((sum, line) => {
    const ingredient = ingredients.get(line.ingredientId)
    return ingredient ? sum + costCents(ingredient, line.quantity) : sum
  }, 0)
}

/** "4,32 €", with a non-breaking space before the euro sign. */
export function formatPrice(cents: number): string {
  return `${(cents / 100).toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`
}

/** "3,00 € / kg", "0,30 € / pièce". */
export function formatUnitPrice(ingredient: Pick<Ingredient, 'unit' | 'priceCents'>): string {
  return `${formatPrice(ingredient.priceCents)} / ${PURCHASE_UNITS[ingredient.unit].label}`
}

/** At most one decimal, with a French comma: 1.5 → "1,5". */
function trim(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(1).replace(/\.0$/, '').replace('.', ',')
}

/** Readable quantity: 1500 g → "1,5 kg", 3 pcs → "3 pièces", 2 tbsp → "2 c. à s.". */
export function formatQuantity(quantity: number, unit: Unit): string {
  if (unit === 'g' && quantity >= 1000) return `${trim(quantity / 1000)} kg`
  if (unit === 'mL' && quantity >= 1000) return `${trim(quantity / 1000)} L`
  return `${trim(quantity)} ${unitLabel(unit, quantity)}`
}

/**
 * A stock quantity typed by hand, in the ingredient's unit: "2,5", "2.5" or " 250 ".
 * Null when it isn't a number between 0 and MAX_STOCK.
 */
export function parseQuantity(text: string): number | null {
  const cleaned = text.trim().replace(/\s/g, '').replace(',', '.')
  if (!/^\d+(\.\d+)?$|^\.\d+$/.test(cleaned)) return null
  const value = Number(cleaned)
  return value <= MAX_STOCK ? value : null
}

/** A quantity as shown in an input, with a French comma: 2.5 → "2,5". */
export function quantityInputValue(quantity: number): string {
  return String(quantity).replace('.', ',')
}

/** Step used by the + / − buttons in storage. */
export function stockStep(unit: Unit): number {
  return unit === 'g' || unit === 'mL' ? 100 : 1
}
