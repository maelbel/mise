import { createRecipe, UnknownIngredientError } from '../../services/recipeService'

export default defineEventHandler(async (event) => {
  const user = requireUser(event)
  const body = await readValidatedBody(event, newRecipeBodySchema.parse)
  try {
    setResponseStatus(event, 201)
    return await createRecipe(useDb(), user.id, body)
  } catch (error) {
    if (error instanceof UnknownIngredientError) throw createError({ statusCode: 400, statusMessage: error.message })
    if (isUniqueViolation(error)) throw createError({ statusCode: 409, statusMessage: 'Une recette porte déjà ce nom' })
    throw error
  }
})
