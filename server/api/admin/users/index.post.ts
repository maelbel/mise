import { createUser, EmailTakenError, listFamily } from '../../../services/userService'

/** Creates a member account. The temporary password is in this response only. */
export default defineEventHandler(async (event) => {
  const { name, email } = await readValidatedBody(event, newMemberBodySchema.parse)
  try {
    const { user, temporaryPassword } = await createUser(useDb(), { name, email })
    setResponseStatus(event, 201)
    const member = (await listFamily(useDb())).find((m) => m.id === user.id)!
    return { member, temporaryPassword }
  } catch (error) {
    if (error instanceof EmailTakenError) throw createError({ statusCode: 409, statusMessage: error.message })
    throw error
  }
})
