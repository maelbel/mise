import { setChecked } from '../../services/shoppingService'

export default defineEventHandler(async (event) => {
  const user = requireUser(event)
  const { week, ingredientId, checked } = await readValidatedBody(event, shoppingCheckBodySchema.parse)
  const found = await setChecked(useDb(), user.id, week, ingredientId, checked)
  if (!found) throw createError({ statusCode: 404, statusMessage: 'Ingrédient introuvable' })
  return { ingredientId, checked }
})
