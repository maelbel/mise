import { describe, expect, it } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import DayMealList from '~/components/week/DayMealList.vue'
import SuggestionView from '~/components/week/SuggestionView.vue'
import RecipeCard from '~/components/recipes/RecipeCard.vue'
import RecipeFormDialog from '~/components/recipes/RecipeFormDialog.vue'
import IngredientFormDialog from '~/components/recipes/IngredientFormDialog.vue'
import StockStepper from '~/components/storage/StockStepper.vue'
import { matchesRecipe } from '~/composables/useRecipeFilters'
import type { PlannedDay } from '~/composables/useWeekSummary'
import { starterData } from '../fixtures'

describe('DayMealList', () => {
  it('shows each meal and emits the slot to edit', async () => {
    const { recipes } = starterData()
    const day: PlannedDay = {
      day: 2, name: 'Mercredi', short: 'Mer.', dateNumber: 18, date: 'mercredi 18 novembre',
      totals: { kcal: 0, protein: 0, carbs: 0, fat: 0, timeMin: 0 },
      meals: [
        { day: 2, slot: 'breakfast', slotLabel: 'Breakfast', portions: 2, recipe: recipes[0]!, nutrition: { kcal: 860, protein: 44, carbs: 130, fat: 20, timeMin: 5 } },
        { day: 2, slot: 'lunch', slotLabel: 'Lunch', portions: 1, recipe: null, nutrition: { kcal: 0, protein: 0, carbs: 0, fat: 0, timeMin: 0 } },
      ],
    }
    const wrapper = await mountSuspended(DayMealList, { props: { day } })
    expect(wrapper.text()).toContain('Bol protéiné aux fruits')
    expect(wrapper.text()).toContain('×2')
    expect(wrapper.text()).toContain('860 kcal')
    expect(wrapper.text()).toContain('Ajouter un repas')

    await wrapper.findAll('button')[1]!.trigger('click')
    expect(wrapper.emitted('edit')).toEqual([[2, 'lunch']])
  })
})

describe('SuggestionView', () => {
  it('shows the swaps with recipe names and signed deltas', async () => {
    const { recipes, recipeId } = starterData()
    useRecipesStore().recipes = recipes
    const wrapper = await mountSuspended(SuggestionView, {
      props: {
        suggestion: {
          id: 'lighter', label: 'Lighter weekend', question: 'Make my weekend lighter', text: 'Lighter weekend.',
          changes: [{ day: 5, slot: 'lunch', fromRecipeId: recipeId('burger'), toRecipeId: recipeId('lentil') }],
          deltaProtein: -22, deltaKcal: -440,
        },
      },
    })
    expect(wrapper.text()).toContain('Samedi · Déjeuner')
    expect(wrapper.text()).toContain('Burger maison et frites')
    expect(wrapper.text()).toContain('−22 g de protéines')
    expect(wrapper.text()).toContain('Appliquer 1 changement')
    await wrapper.find('button').trigger('click')
    expect(wrapper.emitted('apply')).toHaveLength(1)
  })
})

describe('StockStepper', () => {
  const yogurt = { name: 'Yaourt grec', unit: 'g' as const, stock: 400 }

  it('saves a typed amount on Enter', async () => {
    const wrapper = await mountSuspended(StockStepper, { props: { ingredient: yogurt } })
    const input = wrapper.find('input')
    expect((input.element as HTMLInputElement).value).toBe('400')
    await input.setValue('1 250,5')
    await input.trigger('keydown', { key: 'Enter' })
    expect(wrapper.emitted('change')).toEqual([[1250.5]])
  })

  it('drops an amount it can\'t read, and Escape cancels', async () => {
    const wrapper = await mountSuspended(StockStepper, { props: { ingredient: yogurt } })
    const input = wrapper.find('input')
    await input.setValue('-3')
    await input.trigger('blur')
    expect(wrapper.emitted('invalid')).toHaveLength(1)
    expect((input.element as HTMLInputElement).value).toBe('400')
    await input.setValue('900')
    await input.trigger('keydown', { key: 'Escape' })
    await input.trigger('blur')
    expect((input.element as HTMLInputElement).value).toBe('400')
    expect(wrapper.emitted('change')).toBeUndefined()
  })

  it('still steps with − and +, never below zero', async () => {
    const wrapper = await mountSuspended(StockStepper, { props: { ingredient: { ...yogurt, stock: 50 } } })
    const [minus, plus] = wrapper.findAll('button')
    await plus!.trigger('click')
    await minus!.trigger('click')
    expect(wrapper.emitted('change')).toEqual([[150], [0]])
  })

  it('shows the new amount when the stock changes', async () => {
    const wrapper = await mountSuspended(StockStepper, { props: { ingredient: yogurt } })
    await wrapper.setProps({ ingredient: { ...yogurt, stock: 2.5 } })
    expect((wrapper.find('input').element as HTMLInputElement).value).toBe('2,5')
  })
})

describe('recipes', () => {
  it('marks the selected recipe card as pressed', async () => {
    const wrapper = await mountSuspended(RecipeCard, { props: { recipe: starterData().recipes[1]!, selected: true } })
    expect(wrapper.find('button').attributes('aria-pressed')).toBe('true')
    expect(wrapper.text()).toContain('Pâtes crémeuses au saumon')
  })

  // Dialogs render in the page body, outside the mounted component.
  it('opens the recipe form filled in when editing', async () => {
    const salmon = starterData().recipes[1]!
    const wrapper = await mountSuspended(RecipeFormDialog, { props: { open: true, recipe: salmon } })
    const dialog = document.body.querySelector('[role="dialog"]')!
    expect(dialog.textContent).toContain('Modifier la recette')
    expect(dialog.querySelector('input')!.value).toBe(salmon.name)
    expect(dialog.querySelectorAll('[id^="line-ing-"]')).toHaveLength(salmon.ingredients.length)
    wrapper.unmount()
  })

  it('locks the unit of an ingredient in use', async () => {
    const ingredient = starterData().ingredients[0]!
    const wrapper = await mountSuspended(IngredientFormDialog, { props: { open: true, ingredient, unitLocked: true } })
    const dialog = document.body.querySelector('[role="dialog"]')!
    expect(dialog.textContent).toContain('Modifier l’ingrédient')
    expect(dialog.querySelector('input')!.value).toBe(ingredient.name)
    expect(dialog.querySelector<HTMLButtonElement>('#ingredient-unit')!.disabled).toBe(true)
    expect(dialog.textContent).toContain('L’unité est fixée')
    wrapper.unmount()
  })

  it('filters by search text, tags, diet, time and protein', () => {
    const [bowl, salmon, , , lentil] = starterData().recipes
    expect(matchesRecipe(bowl!, 'quick', '')).toBe(true)
    expect(matchesRecipe(lentil!, 'quick', '')).toBe(false)
    expect(matchesRecipe(salmon!, 'protein', '')).toBe(true)
    expect(matchesRecipe(bowl!, 'protein', '')).toBe(false)
    expect(matchesRecipe(lentil!, 'all', 'vegan')).toBe(true)
    expect(matchesRecipe(salmon!, 'all', '  SAUMON ')).toBe(true)
    expect(matchesRecipe(salmon!, 'all', 'vegan')).toBe(false)
  })
})
