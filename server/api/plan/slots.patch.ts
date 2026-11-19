import { UnknownRecipeError, updateSlots } from '../../services/planService'

export default defineEventHandler(async (event) => {
  const user = requireUser(event)
  const { week, updates } = await readValidatedBody(event, slotUpdatesBodySchema.parse)
  try {
    return await updateSlots(useDb(), user.id, week, updates)
  } catch (error) {
    if (error instanceof UnknownRecipeError) throw createError({ statusCode: 400, statusMessage: 'Recette inconnue' })
    throw error
  }
})
