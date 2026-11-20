import { describe, expect, it } from 'vitest'
import { costCents, formatPrice, formatQuantity, formatUnitPrice, parseQuantity, quantityInputValue, recipeCostCents, stockStep } from '../../shared/utils/units'
import { starterData } from '../fixtures'

describe('units and prices', () => {
  it('prices recipe quantities from the purchase price', () => {
    expect(costCents({ unit: 'g', priceCents: 1300 }, 150)).toBe(195) // 150 g at €13/kg
    expect(costCents({ unit: 'mL', priceCents: 300 }, 300)).toBe(90) // 300 mL at €3/L
    expect(costCents({ unit: 'tbsp', priceCents: 1000 }, 1)).toBe(15) // 1 tbsp = 15 mL at €10/L
    expect(costCents({ unit: 'pcs', priceCents: 50 }, 3)).toBe(150)
  })

  it('computes the cost of one serving of a recipe', () => {
    const { recipes, ingredientsById } = starterData()
    const chicken = recipes.find((r) => r.name.startsWith('Poulet rôti'))!
    // 150 g chicken 195 + 80 g rice 20 + 150 g broccoli 45 + 1 tbsp oil 15
    expect(recipeCostCents(chicken, ingredientsById)).toBe(275)
  })

  it('formats quantities and prices for people', () => {
    expect(formatQuantity(1500, 'g')).toBe('1,5 kg')
    expect(formatQuantity(1000, 'mL')).toBe('1 L')
    expect(formatQuantity(250, 'g')).toBe('250 g')
    expect(formatQuantity(3, 'pcs')).toBe('3 pièces')
    expect(formatPrice(275)).toBe('2,75 €')
    expect(formatQuantity(1, 'pcs')).toBe('1 pièce')
    expect(formatQuantity(2, 'tbsp')).toBe('2 c. à s.')
    expect(formatUnitPrice({ unit: 'tbsp', priceCents: 1000 })).toBe('10,00 € / L')
  })

  it('steps stock by 100 for weights and volumes, by 1 otherwise', () => {
    expect(stockStep('g')).toBe(100)
    expect(stockStep('mL')).toBe(100)
    expect(stockStep('pcs')).toBe(1)
    expect(stockStep('tbsp')).toBe(1)
  })
})

describe('typed stock quantities', () => {
  it('reads a comma or a dot, and ignores spaces', () => {
    expect(parseQuantity('250')).toBe(250)
    expect(parseQuantity('2,5')).toBe(2.5)
    expect(parseQuantity('2.5')).toBe(2.5)
    expect(parseQuantity(',5')).toBe(0.5)
    expect(parseQuantity(' 1 400 ')).toBe(1400)
    expect(parseQuantity('0')).toBe(0)
    expect(parseQuantity('1000000')).toBe(1_000_000)
  })

  it('refuses empty, negative, non-numeric and too large amounts', () => {
    for (const text of ['', '  ', '-5', 'abc', '2,5,1', '12kg', '1e3', '1000001']) {
      expect(parseQuantity(text), text).toBeNull()
    }
  })

  it('shows an amount with a French comma', () => {
    expect(quantityInputValue(2.5)).toBe('2,5')
    expect(quantityInputValue(1400)).toBe('1400')
  })
})
