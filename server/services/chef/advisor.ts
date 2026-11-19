import type { DailyTargets, Ingredient, Recipe, Suggestion, WeekPlan } from '#shared/types/domain'

/** What Chef must respect when it proposes a recipe. */
export interface ChefPreferences {
  /** Every recipe proposed must list each of these diets. */
  diet: string[]
  /** Recipes with an ingredient whose name contains one of these are never proposed. */
  avoid: string[]
  /** Longest cooking time for a weekday meal; null = no limit. */
  weekdayMaxMinutes: number | null
}

export interface ChefContext {
  plan: WeekPlan
  recipes: ReadonlyMap<number, Recipe>
  ingredients: ReadonlyMap<number, Ingredient>
  /** The user's daily targets, when their profile has them. */
  targets?: DailyTargets | null
  preferences?: ChefPreferences
}

/**
 * Source of Chef's suggestions. Today only the rule-based advisor exists; a
 * Claude-based advisor can implement the same interface later without any
 * change to the API or the screens.
 */
export interface ChefAdvisor {
  suggestions(ctx: ChefContext): Promise<Suggestion[]>
}
