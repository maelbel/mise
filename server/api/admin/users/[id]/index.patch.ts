import { NotAMemberError, setMemberDisabled } from '../../../../services/userService'

export default defineEventHandler(async (event) => {
  const { id } = await getValidatedRouterParams(event, idParamSchema.parse)
  const { disabled } = await readValidatedBody(event, memberPatchBodySchema.parse)
  try {
    await setMemberDisabled(useDb(), id, disabled)
    return { id, disabled }
  } catch (error) {
    if (error instanceof NotAMemberError) throw createError({ statusCode: 404, statusMessage: error.message })
    throw error
  }
})
