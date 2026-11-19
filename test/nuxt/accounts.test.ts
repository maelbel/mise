import { beforeEach, describe, expect, it } from 'vitest'
import { mountSuspended, registerEndpoint } from '@nuxt/test-utils/runtime'
import { createPinia, setActivePinia } from 'pinia'
import { readBody } from 'h3'
import type { FamilyMember, ProfileResponse } from '#shared/types/domain'
import { emptyProfile } from '#shared/utils/targets'
import DayTotalsCard from '~/components/week/DayTotalsCard.vue'
import type { PlannedDay } from '~/composables/useWeekSummary'

const day: PlannedDay = {
  day: 0, name: 'Lundi', short: 'Lun.', dateNumber: 16, date: 'lundi 16 novembre',
  totals: { kcal: 1390, protein: 88, carbs: 180, fat: 30, timeMin: 60 },
  meals: [],
}

describe('DayTotalsCard', () => {
  it('shows the day against the targets when there are some', async () => {
    const wrapper = await mountSuspended(DayTotalsCard, { props: { day, target: { kcal: 2320, protein: 118, carbs: 289, fat: 77 } } })
    expect(wrapper.text()).toContain('/ 2 320 kcal')
    expect(wrapper.text()).toContain('88 / 118 g')
    expect(wrapper.text()).toContain('Il manque 930 kcal')
    expect(wrapper.find('[role="progressbar"]').attributes('aria-valuenow')).toBe('60')
  })

  it('shows plain totals without targets', async () => {
    const wrapper = await mountSuspended(DayTotalsCard, { props: { day } })
    expect(wrapper.text()).not.toContain('objectif')
    expect(wrapper.find('[role="progressbar"]').exists()).toBe(false)
  })
})

describe('profile store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('loads and saves the profile with its targets', async () => {
    let saved: unknown
    const response: ProfileResponse = { profile: emptyProfile(), targets: null, breakdown: null, manual: false }
    registerEndpoint('/api/profile', { method: 'GET', handler: () => response })
    registerEndpoint('/api/profile', {
      method: 'PUT',
      handler: async (event) => {
        saved = await readBody(event)
        return { ...response, targets: { kcal: 2000, protein: 100, carbs: 225, fat: 67 } }
      },
    })
    const store = useProfileStore()
    await store.load()
    expect(store.targets).toBeNull()
    await store.save({ ...emptyProfile(), weightKg: 62 })
    expect((saved as { weightKg: number }).weightKg).toBe(62)
    expect(store.targets?.kcal).toBe(2000)
  })
})

describe('family store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('adds a created member and hands back the temporary password once', async () => {
    const carol: FamilyMember = { id: 3, email: 'carol@example.test', name: 'Carol', isAdmin: false, status: 'temporary', createdAt: '2026-11-19T10:00:00Z', lastLoginAt: null }
    registerEndpoint('/api/admin/users', { method: 'GET', handler: () => [] })
    registerEndpoint('/api/admin/users', { method: 'POST', handler: () => ({ member: carol, temporaryPassword: 'k7qm-x2pd-9vtr' }) })
    const store = useFamilyStore()
    await store.load()
    const { temporaryPassword } = await store.create('Carol', 'carol@example.test')
    expect(temporaryPassword).toBe('k7qm-x2pd-9vtr')
    expect(store.members.map((m) => m.name)).toEqual(['Carol'])
    expect(JSON.stringify(store.members)).not.toContain('k7qm')
  })
})
