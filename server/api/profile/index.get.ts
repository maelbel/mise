import { getProfile } from '../../services/profileService'

export default defineEventHandler((event) => getProfile(useDb(), requireUser(event).id))
