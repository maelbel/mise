import { listRecipes } from '../../services/recipeService'

export default defineEventHandler((event) => listRecipes(useDb(), requireUser(event).id))
