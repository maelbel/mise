import type { DailyTargets, Goal, Pace, Profile, Sex, TargetBreakdown } from '../types/domain'

export interface ActivityLevel {
  factor: number
  label: string
  description: string
}

export const ACTIVITY_LEVELS: readonly ActivityLevel[] = [
  { factor: 1.2, label: 'Sédentaire', description: 'Assis presque toute la journée, peu de marche' },
  { factor: 1.375, label: 'Légère', description: 'Marche au quotidien ou sport 1 à 3 fois par semaine' },
  { factor: 1.55, label: 'Modérée', description: 'Sport 3 à 5 fois par semaine' },
  { factor: 1.725, label: 'Élevée', description: 'Sport intense 6 ou 7 fois par semaine' },
  { factor: 1.9, label: 'Très élevée', description: 'Travail physique et entraînement chaque jour' },
]

/** Percentage of maintenance calories added or removed, by goal and pace. */
export const GOAL_ADJUSTMENT: Record<Goal, Record<Pace, number>> = {
  lose: { slow: -10, normal: -15, fast: -20 },
  maintain: { slow: 0, normal: 0, fast: 0 },
  gain: { slow: 5, normal: 10, fast: 15 },
}

/** Grams of protein per kg of body weight, by goal. */
export const PROTEIN_PER_KG: Record<Goal, number> = { lose: 2.0, maintain: 1.6, gain: 1.8 }

/** Share of calories from fat. Carbs take what is left. */
export const FAT_SHARE = 0.3

export const PROFILE_LIMITS = {
  age: { min: 14, max: 100 },
  heightCm: { min: 100, max: 250 },
  weightKg: { min: 30, max: 300 },
} as const

export const DIET_OPTIONS = ['Vegetarian', 'Vegan', 'Gluten-free', 'Lactose-free'] as const

/** Mifflin-St Jeor constant. `unspecified` takes the average of the two. */
const SEX_CONSTANT: Record<Sex, number> = { male: 5, female: -161, unspecified: -78 }

const KCAL_PER_G = { protein: 4, carbs: 4, fat: 9 } as const

/** Full years between `birthDate` and `today`, both `YYYY-MM-DD`. */
export function ageOn(birthDate: string, today: string): number {
  const [by, bm, bd] = birthDate.split('-').map(Number) as [number, number, number]
  const [ty, tm, td] = today.split('-').map(Number) as [number, number, number]
  return ty - by - (tm < bm || (tm === bm && td < bd) ? 1 : 0)
}

const inRange = (v: number, r: { min: number, max: number }) => v >= r.min && v <= r.max

/** Fat and carbs that complete a calorie and protein target. */
export function splitMacros(kcal: number, protein: number): { carbs: number, fat: number } {
  const fat = Math.round((kcal * FAT_SHARE) / KCAL_PER_G.fat)
  const carbs = Math.max(0, Math.round((kcal - protein * KCAL_PER_G.protein - fat * KCAL_PER_G.fat) / KCAL_PER_G.carbs))
  return { carbs, fat }
}

/**
 * Daily targets from the body, activity and goal. Null when a value is
 * missing or out of range.
 */
export function calculateTargets(profile: Profile, today: string): TargetBreakdown | null {
  const { sex, birthDate, heightCm, weightKg, activity } = profile
  if (!sex || !birthDate || heightCm == null || weightKg == null || activity == null) return null
  const level = ACTIVITY_LEVELS[activity]
  const age = ageOn(birthDate, today)
  if (!level || !inRange(age, PROFILE_LIMITS.age) || !inRange(heightCm, PROFILE_LIMITS.heightCm) || !inRange(weightKg, PROFILE_LIMITS.weightKg)) {
    return null
  }
  const bmr = 10 * weightKg + 6.25 * heightCm - 5 * age + SEX_CONSTANT[sex]
  const maintenance = bmr * level.factor
  const adjustmentPct = GOAL_ADJUSTMENT[profile.goal][profile.pace]
  const kcal = Math.round((maintenance * (1 + adjustmentPct / 100)) / 10) * 10
  const proteinPerKg = PROTEIN_PER_KG[profile.goal]
  const protein = Math.round(weightKg * proteinPerKg)
  return {
    age,
    bmr: Math.round(bmr),
    activityFactor: level.factor,
    maintenance: Math.round(maintenance),
    adjustmentPct,
    proteinPerKg,
    fatShare: FAT_SHARE,
    calculated: { kcal, protein, ...splitMacros(kcal, protein) },
  }
}

/**
 * The targets the app uses: manual values first, calculated ones for the
 * rest. Fat and carbs left empty follow the calories and protein in use.
 */
export function resolveTargets(profile: Profile, today: string): { targets: DailyTargets | null, breakdown: TargetBreakdown | null, manual: boolean } {
  const breakdown = calculateTargets(profile, today)
  const manual = [profile.targetKcal, profile.targetProtein, profile.targetCarbs, profile.targetFat].some((v) => v != null)
  const kcal = profile.targetKcal ?? breakdown?.calculated.kcal
  const protein = profile.targetProtein ?? breakdown?.calculated.protein
  if (kcal == null || protein == null) return { targets: null, breakdown, manual }
  const rest = splitMacros(kcal, protein)
  return {
    targets: { kcal, protein, carbs: profile.targetCarbs ?? rest.carbs, fat: profile.targetFat ?? rest.fat },
    breakdown,
    manual,
  }
}

export function emptyProfile(): Profile {
  return {
    sex: null, birthDate: null, heightCm: null, weightKg: null, activity: null, goal: 'maintain', pace: 'normal',
    diet: [], avoid: [], weekdayMaxMinutes: null, weeklyBudgetCents: null,
    targetKcal: null, targetProtein: null, targetCarbs: null, targetFat: null,
  }
}

/** Today as `YYYY-MM-DD`, in local time. */
export function todayIso(now = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`
}
