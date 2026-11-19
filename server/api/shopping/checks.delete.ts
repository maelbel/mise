import { resetChecks } from '../../services/shoppingService'

export default defineEventHandler(async (event) => {
  const user = requireUser(event)
  const { week } = await getValidatedQuery(event, weekQuerySchema.parse)
  await resetChecks(useDb(), user.id, week)
  setResponseStatus(event, 204)
  return null
})
