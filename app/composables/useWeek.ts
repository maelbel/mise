import { addDays, formatWeekLabel, startOfWeek } from '#shared/utils/week'

/** The week shown across the app, shared by every page. */
export function useWeek() {
  const week = useState<string>('week', () => startOfWeek(new Date()))
  const label = computed(() => formatWeekLabel(week.value))
  const isCurrent = computed(() => week.value === startOfWeek(new Date()))

  function previous(): void {
    week.value = addDays(week.value, -7)
  }
  function next(): void {
    week.value = addDays(week.value, 7)
  }
  function goToCurrent(): void {
    week.value = startOfWeek(new Date())
  }

  return { week, label, isCurrent, previous, next, goToCurrent }
}
