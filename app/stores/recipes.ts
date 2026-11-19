import type { Recipe } from '#shared/types/domain'
import { indexById } from '#shared/utils/nutrition'

export type NewRecipeInput = Omit<Recipe, 'id'>

export const useRecipesStore = defineStore('recipes', () => {
  const api = useApi()
  const recipes = ref<Recipe[]>([])
  const byId = computed(() => indexById(recipes.value))

  async function load(): Promise<void> {
    recipes.value = await api<Recipe[]>('/api/recipes')
  }

  async function create(input: NewRecipeInput): Promise<Recipe> {
    const recipe = await api<Recipe>('/api/recipes', { method: 'POST', body: input })
    recipes.value = [...recipes.value, recipe]
    return recipe
  }

  return { recipes, byId, load, create }
})
