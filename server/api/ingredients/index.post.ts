import { createIngredient } from '../../services/ingredientService'

export default defineEventHandler(async (event) => {
  const user = requireUser(event)
  const body = await readValidatedBody(event, newIngredientBodySchema.parse)
  try {
    setResponseStatus(event, 201)
    return await createIngredient(useDb(), user.id, body)
  } catch (error) {
    if (isUniqueViolation(error)) throw createError({ statusCode: 409, statusMessage: 'Un ingrédient porte déjà ce nom' })
    throw error
  }
})
