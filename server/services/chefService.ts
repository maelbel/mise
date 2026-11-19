import type { Suggestion } from '#shared/types/domain'
import { indexById } from '#shared/utils/nutrition'
import type { Db } from '../utils/db'
import type { ChefAdvisor } from './chef/advisor'
import { ruleAdvisor } from './chef/ruleAdvisor'
import { listIngredients } from './ingredientService'
import { getWeekPlan } from './planService'
import { getProfile } from './profileService'
import { listRecipes } from './recipeService'

export async function getSuggestions(db: Db, userId: number, weekStart: string, advisor: ChefAdvisor = ruleAdvisor): Promise<Suggestion[]> {
  const [plan, recipes, ingredients, { profile, targets }] = await Promise.all([
    getWeekPlan(db, userId, weekStart),
    listRecipes(db, userId),
    listIngredients(db, userId),
    getProfile(db, userId),
  ])
  return advisor.suggestions({
    plan,
    recipes: indexById(recipes),
    ingredients: indexById(ingredients),
    targets,
    preferences: { diet: profile.diet, avoid: profile.avoid, weekdayMaxMinutes: profile.weekdayMaxMinutes },
  })
}
