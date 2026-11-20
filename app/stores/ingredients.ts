import type { Ingredient } from '#shared/types/domain'
import { indexById } from '#shared/utils/nutrition'

export type NewIngredientInput = Pick<Ingredient, 'name' | 'shelf' | 'unit' | 'priceCents'>

const sortByName = (list: Ingredient[]): Ingredient[] => list.sort((a, b) => a.name.localeCompare(b.name))

export const useIngredientsStore = defineStore('ingredients', () => {
  const api = useApi()
  const ingredients = ref<Ingredient[]>([])
  const byId = computed(() => indexById(ingredients.value))
  const shelves = computed(() => [...new Set(ingredients.value.map((i) => i.shelf))])

  async function load(): Promise<void> {
    ingredients.value = await api<Ingredient[]>('/api/ingredients')
  }

  async function create(input: NewIngredientInput): Promise<Ingredient> {
    const ingredient = await api<Ingredient>('/api/ingredients', { method: 'POST', body: input })
    ingredients.value = sortByName([...ingredients.value, ingredient])
    return ingredient
  }

  /** Saves the ingredient and puts the server's version in place of the old one, keeping the name order. */
  async function update(id: number, input: NewIngredientInput): Promise<Ingredient> {
    const ingredient = await api<Ingredient>(`/api/ingredients/${id}`, { method: 'PUT', body: input })
    ingredients.value = sortByName(ingredients.value.map((i) => (i.id === id ? ingredient : i)))
    return ingredient
  }

  /** Optimistic: the screen updates at once and rolls back if the save fails. */
  async function setStock(ingredientId: number, quantity: number): Promise<void> {
    const ingredient = ingredients.value.find((i) => i.id === ingredientId)
    if (!ingredient) return
    const previous = ingredient.stock
    ingredient.stock = Math.max(0, quantity)
    try {
      await api(`/api/stock/${ingredientId}`, { method: 'PUT', body: { quantity: ingredient.stock } })
    } catch (error) {
      ingredient.stock = previous
      throw error
    }
  }

  return { ingredients, byId, shelves, load, create, update, setStock }
})
