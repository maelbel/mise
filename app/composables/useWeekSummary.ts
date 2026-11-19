import type { MealSlot, Nutrition, PlanSlot, Recipe } from '#shared/types/domain'
import { DAY_NAMES, MEAL_SLOTS, MEAL_SLOT_LABELS } from '#shared/utils/constants'
import { dayNutrition, emptyNutrition, slotNutrition, sumNutrition } from '#shared/utils/nutrition'
import { dayOfMonth, formatDayDate } from '#shared/utils/week'

export interface PlannedMeal {
  day: number
  slot: MealSlot
  slotLabel: string
  portions: number
  recipe: Recipe | null
  nutrition: Nutrition
}

export interface PlannedDay {
  day: number
  name: string
  short: string
  dateNumber: number
  /** "lundi 16 novembre". */
  date: string
  meals: PlannedMeal[]
  totals: Nutrition
}

/** Days, meals and totals of the loaded week, ready for display. */
export function useWeekSummary() {
  const planStore = usePlanStore()
  const recipesStore = useRecipesStore()

  const days = computed<PlannedDay[]>(() => {
    const plan = planStore.plan
    if (!plan) return []
    const recipes = recipesStore.byId
    return DAY_NAMES.map((name, day) => ({
      day,
      name,
      short: `${name.slice(0, 3)}.`,
      dateNumber: dayOfMonth(plan.weekStart, day),
      date: formatDayDate(plan.weekStart, day, name),
      totals: dayNutrition(plan.slots, recipes, day),
      meals: MEAL_SLOTS.map((slot): PlannedMeal => {
        const planned: PlanSlot | undefined = plan.slots.find((s) => s.day === day && s.slot === slot)
        const recipe = planned?.recipeId != null ? recipes.get(planned.recipeId) ?? null : null
        const portions = planned?.portions ?? 1
        return {
          day,
          slot,
          slotLabel: MEAL_SLOT_LABELS[slot],
          portions,
          recipe,
          nutrition: recipe ? slotNutrition(recipe, portions) : emptyNutrition(),
        }
      }),
    }))
  })

  const weekTotals = computed<Nutrition>(() =>
    planStore.plan ? sumNutrition(planStore.plan.slots, recipesStore.byId) : emptyNutrition(),
  )

  return { days, weekTotals }
}
