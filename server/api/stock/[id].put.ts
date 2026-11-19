import { setStock } from '../../services/ingredientService'

export default defineEventHandler(async (event) => {
  const user = requireUser(event)
  const { id } = await getValidatedRouterParams(event, idParamSchema.parse)
  const { quantity } = await readValidatedBody(event, stockBodySchema.parse)
  const found = await setStock(useDb(), user.id, id, quantity)
  if (!found) throw createError({ statusCode: 404, statusMessage: 'Ingrédient introuvable' })
  return { ingredientId: id, quantity }
})
