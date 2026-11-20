import type { Recipe } from '#shared/types/domain'
import { UnknownIngredientError, updateRecipe } from '../../services/recipeService'

export default defineEventHandler(async (event) => {
  const user = requireUser(event)
  const { id } = await getValidatedRouterParams(event, idParamSchema.parse)
  const body = await readValidatedBody(event, newRecipeBodySchema.parse)
  let recipe: Recipe | null
  try {
    recipe = await updateRecipe(useDb(), user.id, id, body)
  } catch (error) {
    if (error instanceof UnknownIngredientError) throw createError({ statusCode: 400, statusMessage: error.message })
    if (isUniqueViolation(error)) throw createError({ statusCode: 409, statusMessage: 'Une recette porte déjà ce nom' })
    throw error
  }
  if (!recipe) throw createError({ statusCode: 404, statusMessage: 'Recette introuvable' })
  return recipe
})
