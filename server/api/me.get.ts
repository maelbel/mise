import { toPublicUser } from '../services/userService'

export default defineEventHandler((event) => toPublicUser(requireUser(event)))
