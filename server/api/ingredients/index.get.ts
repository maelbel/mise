import { listIngredients } from '../../services/ingredientService'

export default defineEventHandler((event) => listIngredients(useDb(), requireUser(event).id))
