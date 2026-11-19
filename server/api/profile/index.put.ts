import { saveProfile } from '../../services/profileService'

export default defineEventHandler(async (event) => {
  const user = requireUser(event)
  const profile = await readValidatedBody(event, profileBodySchema.parse)
  return saveProfile(useDb(), user.id, profile)
})
