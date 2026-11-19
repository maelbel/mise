const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/
const MONTHS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre']

function parseIso(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number) as [number, number, number]
  return new Date(Date.UTC(y, m - 1, d))
}

function toIso(date: Date): string {
  return date.toISOString().slice(0, 10)
}

/** Monday of the week containing `date` (local calendar day), as `YYYY-MM-DD`. */
export function startOfWeek(date: Date): string {
  const local = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
  const offset = (local.getUTCDay() + 6) % 7
  local.setUTCDate(local.getUTCDate() - offset)
  return toIso(local)
}

export function addDays(iso: string, days: number): string {
  const date = parseIso(iso)
  date.setUTCDate(date.getUTCDate() + days)
  return toIso(date)
}

export function isWeekStart(value: string): boolean {
  if (!ISO_DATE.test(value)) return false
  const date = parseIso(value)
  return toIso(date) === value && date.getUTCDay() === 1
}

/** Day of the month for day `day` (0 = Monday) of the week. */
export function dayOfMonth(weekStart: string, day: number): number {
  return parseIso(addDays(weekStart, day)).getUTCDate()
}

/** "1er" for the first of the month, the number otherwise. */
function dayNumber(date: Date): string {
  return date.getUTCDate() === 1 ? '1er' : String(date.getUTCDate())
}

/** "16 – 22 novembre", or "30 novembre – 6 décembre" across months. */
export function formatWeekRange(weekStart: string): string {
  const start = parseIso(weekStart)
  const end = parseIso(addDays(weekStart, 6))
  const endPart = `${dayNumber(end)} ${MONTHS[end.getUTCMonth()]}`
  return start.getUTCMonth() === end.getUTCMonth()
    ? `${dayNumber(start)} – ${endPart}`
    : `${dayNumber(start)} ${MONTHS[start.getUTCMonth()]} – ${endPart}`
}

/** "Semaine du 16 au 22 novembre", or "Semaine du 30 novembre au 6 décembre". */
export function formatWeekLabel(weekStart: string): string {
  const start = parseIso(weekStart)
  const end = parseIso(addDays(weekStart, 6))
  const endPart = `${dayNumber(end)} ${MONTHS[end.getUTCMonth()]}`
  const startPart = start.getUTCMonth() === end.getUTCMonth() ? dayNumber(start) : `${dayNumber(start)} ${MONTHS[start.getUTCMonth()]}`
  return `Semaine du ${startPart} au ${endPart}`
}

/** "lundi 16 novembre" for day `day` (0 = Monday) of the week. */
export function formatDayDate(weekStart: string, day: number, dayName: string): string {
  const date = parseIso(addDays(weekStart, day))
  return `${dayName.toLowerCase()} ${dayNumber(date)} ${MONTHS[date.getUTCMonth()]}`
}
