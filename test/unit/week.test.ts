import { describe, expect, it } from 'vitest'
import { addDays, dayOfMonth, formatWeekLabel, formatWeekRange, isWeekStart, startOfWeek } from '../../shared/utils/week'

describe('week utils', () => {
  it('finds the Monday of any day of the week', () => {
    expect(startOfWeek(new Date(2026, 10, 19))).toBe('2026-11-16') // Thursday
    expect(startOfWeek(new Date(2026, 10, 16))).toBe('2026-11-16') // Monday
    expect(startOfWeek(new Date(2026, 10, 22))).toBe('2026-11-16') // Sunday
  })

  it('adds days across months and years', () => {
    expect(addDays('2026-11-30', 1)).toBe('2026-12-01')
    expect(addDays('2026-12-28', 7)).toBe('2027-01-04')
    expect(addDays('2026-11-16', -7)).toBe('2026-11-09')
  })

  it('accepts only real Mondays', () => {
    expect(isWeekStart('2026-11-16')).toBe(true)
    expect(isWeekStart('2026-11-17')).toBe(false)
    expect(isWeekStart('2026-02-30')).toBe(false)
    expect(isWeekStart('16/11/2026')).toBe(false)
  })

  it('labels the week like the design', () => {
    expect(formatWeekLabel('2026-11-02')).toBe('Semaine du 2 au 8 novembre')
    expect(formatWeekLabel('2026-11-30')).toBe('Semaine du 30 novembre au 6 décembre')
    expect(formatWeekLabel('2026-06-01')).toBe('Semaine du 1er au 7 juin')
    expect(formatWeekRange('2026-11-16')).toBe('16 – 22 novembre')
  })

  it('gives the day of the month of each day', () => {
    expect(dayOfMonth('2026-11-30', 0)).toBe(30)
    expect(dayOfMonth('2026-11-30', 6)).toBe(6)
  })
})
