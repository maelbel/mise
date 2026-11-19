import { listFamily } from '../../../services/userService'

export default defineEventHandler(() => listFamily(useDb()))
