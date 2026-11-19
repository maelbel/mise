import { describe, expect, it } from 'vitest'
import { dayNutrition, slotNutrition, sumNutrition } from '../../shared/utils/nutrition'
import { starterData, withSlot } from '../fixtures'

describe('nutrition', () => {
  it('multiplies nutrition by portions but not cooking time', () => {
    const { recipes } = starterData()
    expect(slotNutrition(recipes[0]!, 2)).toEqual({ kcal: 860, protein: 44, carbs: 130, fat: 20, timeMin: 5 })
  })

  it('totals a weekday like the design (bowl, chicken, lentil soup)', () => {
    const { plan, recipesById } = starterData()
    expect(dayNutrition(plan.slots, recipesById, 0)).toEqual({ kcal: 1390, protein: 88, carbs: 185, fat: 30, timeMin: 60 })
  })

  it('totals the week and skips empty slots', () => {
    const { plan, recipesById } = starterData()
    const week = sumNutrition(plan.slots, recipesById)
    expect(week.kcal).toBe(5 * 1390 + 2 * (430 + 780 + 710))
    const emptied = withSlot(plan, 0, 'dinner', { recipeId: null })
    expect(sumNutrition(emptied.slots, recipesById).kcal).toBe(week.kcal - 340)
  })
})
