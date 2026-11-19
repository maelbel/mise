import { getSuggestions } from '../../services/chefService'

export default defineEventHandler(async (event) => {
  const user = requireUser(event)
  const { week } = await getValidatedQuery(event, weekQuerySchema.parse)
  return getSuggestions(useDb(), user.id, week)
})
