import type { Recipe } from '#shared/types/domain'
import { dietLabel, tagLabel } from '#shared/utils/labels'

export type RecipeFilter = 'all' | 'protein' | 'quick' | 'vegetarian' | 'glutenFree'

export const RECIPE_FILTERS: { id: RecipeFilter, label: string }[] = [
  { id: 'all', label: 'Toutes' },
  { id: 'protein', label: 'Riches en protéines' },
  { id: 'quick', label: 'Rapides' },
  { id: 'vegetarian', label: 'Végétariennes' },
  { id: 'glutenFree', label: 'Sans gluten' },
]

const QUICK_MAX_MIN = 20
const HIGH_PROTEIN_MIN_G = 30

const fold = (s: string) => s.toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '')

export function matchesRecipe(recipe: Recipe, filter: RecipeFilter, query: string): boolean {
  if (filter === 'quick' && recipe.timeMin > QUICK_MAX_MIN) return false
  if (filter === 'protein' && recipe.protein < HIGH_PROTEIN_MIN_G) return false
  if (filter === 'vegetarian' && !recipe.diet.some((d) => d === 'Vegetarian' || d === 'Vegan')) return false
  if (filter === 'glutenFree' && !recipe.diet.includes('Gluten-free')) return false
  const q = fold(query.trim())
  if (!q) return true
  return fold([recipe.name, ...recipe.tags.map(tagLabel), ...recipe.diet.map(dietLabel)].join(' ')).includes(q)
}

/** Search text and quick filters for a list of recipes. */
export function useRecipeFilters(recipes: Ref<Recipe[]>) {
  const query = ref('')
  const filter = ref<RecipeFilter>('all')
  const filtered = computed(() => recipes.value.filter((r) => matchesRecipe(r, filter.value, query.value)))
  return { query, filter, filtered }
}
