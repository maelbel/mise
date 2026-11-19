import { getShoppingList } from '../../services/shoppingService'

export default defineEventHandler(async (event) => {
  const user = requireUser(event)
  const { week } = await getValidatedQuery(event, weekQuerySchema.parse)
  return getShoppingList(useDb(), user.id, week)
})
