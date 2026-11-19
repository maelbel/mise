import { NotAMemberError, resetMemberPassword } from '../../../../services/userService'

/** New temporary password for a member. It is in this response only. */
export default defineEventHandler(async (event) => {
  const { id } = await getValidatedRouterParams(event, idParamSchema.parse)
  try {
    return { id, temporaryPassword: await resetMemberPassword(useDb(), id) }
  } catch (error) {
    if (error instanceof NotAMemberError) throw createError({ statusCode: 404, statusMessage: error.message })
    throw error
  }
})
