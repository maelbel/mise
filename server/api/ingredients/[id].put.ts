import type { Ingredient } from '#shared/types/domain'
import { UnitLockedError, updateIngredient } from '../../services/ingredientService'

export default defineEventHandler(async (event) => {
  const user = requireUser(event)
  const { id } = await getValidatedRouterParams(event, idParamSchema.parse)
  const body = await readValidatedBody(event, newIngredientBodySchema.parse)
  let ingredient: Ingredient | null
  try {
    ingredient = await updateIngredient(useDb(), user.id, id, body)
  } catch (error) {
    if (error instanceof UnitLockedError) throw createError({ statusCode: 409, statusMessage: error.message })
    if (isUniqueViolation(error)) throw createError({ statusCode: 409, statusMessage: 'Un ingrédient porte déjà ce nom' })
    throw error
  }
  if (!ingredient) throw createError({ statusCode: 404, statusMessage: 'Ingrédient introuvable' })
  return ingredient
})
