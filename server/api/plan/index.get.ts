import { getWeekPlan } from '../../services/planService'

export default defineEventHandler(async (event) => {
  const user = requireUser(event)
  const { week } = await getValidatedQuery(event, weekQuerySchema.parse)
  return getWeekPlan(useDb(), user.id, week)
})
