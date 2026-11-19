import { describe, expect, it } from 'vitest'
import type { Profile } from '#shared/types/domain'
import { ageOn, calculateTargets, emptyProfile, resolveTargets, splitMacros } from '#shared/utils/targets'

const TODAY = '2026-11-19'
const base: Profile = { ...emptyProfile(), sex: 'male', birthDate: '1992-03-14', heightCm: 178, weightKg: 74, activity: 1 }

describe('ageOn', () => {
  it('counts full years only', () => {
    expect(ageOn('1992-03-14', TODAY)).toBe(34)
    expect(ageOn('1992-11-19', TODAY)).toBe(34)
    expect(ageOn('1992-11-20', TODAY)).toBe(33)
  })
})

describe('calculateTargets', () => {
  it('follows Mifflin-St Jeor and the activity factor', () => {
    const b = calculateTargets(base, TODAY)!
    expect(b.age).toBe(34)
    expect(b.bmr).toBe(1688) // 10×74 + 6.25×178 − 5×34 + 5
    expect(b.maintenance).toBe(2320) // × 1.375
    expect(b.calculated).toEqual({ kcal: 2320, protein: 118, carbs: 289, fat: 77 })
  })

  it('adjusts calories and protein for the goal and pace', () => {
    const gain = calculateTargets({ ...base, activity: 2, goal: 'gain', pace: 'normal' }, TODAY)!
    expect(gain.adjustmentPct).toBe(10)
    expect(gain.calculated.kcal).toBe(2880)
    expect(gain.calculated.protein).toBe(133) // 1.8 g × 74 kg
    const lose = calculateTargets({ ...base, goal: 'lose', pace: 'fast' }, TODAY)!
    expect(lose.adjustmentPct).toBe(-20)
    expect(lose.calculated.kcal).toBe(1860)
    expect(lose.calculated.protein).toBe(148)
  })

  it('uses the right constant for each sex, the average when unspecified', () => {
    const kcal = (sex: Profile['sex']) => calculateTargets({ ...base, sex }, TODAY)!.bmr
    expect(kcal('male') - kcal('female')).toBe(166)
    expect(kcal('unspecified')).toBe(1605)
  })

  it('needs every body value, within range', () => {
    expect(calculateTargets({ ...base, weightKg: null }, TODAY)).toBeNull()
    expect(calculateTargets({ ...base, activity: null }, TODAY)).toBeNull()
    expect(calculateTargets({ ...base, heightCm: 99 }, TODAY)).toBeNull()
    expect(calculateTargets({ ...base, birthDate: '2020-01-01' }, TODAY)).toBeNull()
  })
})

describe('resolveTargets', () => {
  it('uses manual values first and completes the rest', () => {
    const r = resolveTargets({ ...base, targetKcal: 2000 }, TODAY)
    expect(r.manual).toBe(true)
    expect(r.targets).toEqual({ kcal: 2000, protein: 118, ...splitMacros(2000, 118) })
  })

  it('works with manual targets only, and returns nothing without enough data', () => {
    expect(resolveTargets({ ...emptyProfile(), targetKcal: 1800, targetProtein: 90 }, TODAY).targets).toEqual({ kcal: 1800, protein: 90, carbs: 225, fat: 60 })
    expect(resolveTargets({ ...emptyProfile(), targetKcal: 1800 }, TODAY).targets).toBeNull()
    expect(resolveTargets(emptyProfile(), TODAY)).toEqual({ targets: null, breakdown: null, manual: false })
  })
})
