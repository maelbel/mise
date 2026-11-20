<script setup lang="ts">
import type { Goal, Pace, Profile, Sex } from '#shared/types/domain'
import { PASSWORD_MIN_LENGTH, passwordProblem } from '#shared/utils/password'
import { ACTIVITY_LEVELS, ageOn, DIET_OPTIONS, GOAL_ADJUSTMENT, PROFILE_LIMITS, resolveTargets, todayIso } from '#shared/utils/targets'
import { dietLabel } from '#shared/utils/labels'

const formatDecimal = (n: number) => n.toLocaleString('fr-FR')

useHead({ title: 'Profil · Mise' })

const profileStore = useProfileStore()
const { user, isAdmin, logout, refresh } = useAccount()

const { error: loadError } = await useAsyncData('profile-page', async () => {
  await profileStore.load()
  return true
})

/** What the inputs hold: text for numbers, so a half-typed value stays as typed. */
interface Form {
  sex: Sex | null
  birthDate: string
  heightCm: string
  weightKg: string
  activity: number | null
  goal: Goal
  pace: Pace
  diet: string[]
  avoid: string[]
  avoidDraft: string
  weekdayMaxMinutes: string
  weeklyBudget: string
  manual: boolean
  targetKcal: string
  targetProtein: string
  targetCarbs: string
  targetFat: string
}

const text = (n: number | null) => (n == null ? '' : String(n))

function toForm(p: Profile): Form {
  return {
    sex: p.sex, birthDate: p.birthDate ?? '', heightCm: text(p.heightCm), weightKg: text(p.weightKg),
    activity: p.activity, goal: p.goal, pace: p.pace, diet: [...p.diet], avoid: [...p.avoid], avoidDraft: '',
    weekdayMaxMinutes: text(p.weekdayMaxMinutes),
    weeklyBudget: p.weeklyBudgetCents == null ? '' : String(p.weeklyBudgetCents / 100),
    manual: [p.targetKcal, p.targetProtein, p.targetCarbs, p.targetFat].some((v) => v != null),
    targetKcal: text(p.targetKcal), targetProtein: text(p.targetProtein), targetCarbs: text(p.targetCarbs), targetFat: text(p.targetFat),
  }
}

const form = reactive<Form>(toForm(profileStore.data?.profile ?? {
  sex: null, birthDate: null, heightCm: null, weightKg: null, activity: null, goal: 'maintain', pace: 'normal',
  diet: [], avoid: [], weekdayMaxMinutes: null, weeklyBudgetCents: null, targetKcal: null, targetProtein: null, targetCarbs: null, targetFat: null,
}))
watch(() => profileStore.data?.profile, (p) => p && Object.assign(form, toForm(p)))

const num = (v: string): number | null => {
  const n = Number(v.trim().replace(',', '.'))
  return v.trim() === '' || Number.isNaN(n) ? null : n
}
const int = (v: string): number | null => {
  const n = num(v)
  return n == null ? null : Math.round(n)
}

const draft = computed<Profile>(() => ({
  sex: form.sex, birthDate: form.birthDate || null, heightCm: num(form.heightCm), weightKg: num(form.weightKg),
  activity: form.activity, goal: form.goal, pace: form.goal === 'maintain' ? 'normal' : form.pace,
  diet: form.diet, avoid: form.avoid,
  weekdayMaxMinutes: int(form.weekdayMaxMinutes),
  weeklyBudgetCents: num(form.weeklyBudget) == null ? null : Math.round(num(form.weeklyBudget)! * 100),
  targetKcal: form.manual ? int(form.targetKcal) : null,
  targetProtein: form.manual ? int(form.targetProtein) : null,
  targetCarbs: form.manual ? int(form.targetCarbs) : null,
  targetFat: form.manual ? int(form.targetFat) : null,
}))

const problems = computed(() => {
  const list: string[] = []
  const p = draft.value
  const range = (v: number | null, r: { min: number, max: number }) => v == null || (v >= r.min && v <= r.max)
  if (p.birthDate && !range(ageOn(p.birthDate, todayIso()), PROFILE_LIMITS.age)) list.push(`Date de naissance : entre ${PROFILE_LIMITS.age.min} et ${PROFILE_LIMITS.age.max} ans.`)
  if (form.heightCm && !range(p.heightCm, PROFILE_LIMITS.heightCm)) list.push(`Taille : entre ${PROFILE_LIMITS.heightCm.min} et ${PROFILE_LIMITS.heightCm.max} cm.`)
  if (form.weightKg && !range(p.weightKg, PROFILE_LIMITS.weightKg)) list.push(`Poids : entre ${PROFILE_LIMITS.weightKg.min} et ${PROFILE_LIMITS.weightKg.max} kg.`)
  if (form.heightCm && p.heightCm == null) list.push('La taille doit être un nombre.')
  if (form.weightKg && p.weightKg == null) list.push('Le poids doit être un nombre.')
  return list
})

const preview = computed(() => resolveTargets(draft.value, todayIso()))
const steps = computed(() => {
  const b = preview.value.breakdown
  if (!b) return []
  const level = ACTIVITY_LEVELS[draft.value.activity ?? 0]!
  const pct = b.adjustmentPct === 0 ? '±0 %' : `${b.adjustmentPct > 0 ? '+' : '−'}${Math.abs(b.adjustmentPct)} %`
  return [
    { label: 'Métabolisme de base', how: `Mifflin-St Jeor, ${b.age} ans, ${formatDecimal(draft.value.heightCm!)} cm, ${formatDecimal(draft.value.weightKg!)} kg`, value: `${formatNumber(b.bmr)} kcal` },
    { label: `Activité ${level.label.toLowerCase()}`, how: `× ${formatDecimal(b.activityFactor)}`, value: `${formatNumber(b.maintenance)} kcal` },
    { label: `Objectif : ${GOALS.find((g) => g.id === draft.value.goal)!.label.toLowerCase()}`, how: pct, value: `${formatNumber(b.calculated.kcal)} kcal` },
    { label: 'Protéines', how: `${formatDecimal(b.proteinPerKg)} g par kg de poids`, value: `${b.calculated.protein} g` },
    { label: 'Lipides', how: `${Math.round(b.fatShare * 100)} % des calories`, value: `${b.calculated.fat} g` },
    { label: 'Glucides', how: 'le reste des calories', value: `${b.calculated.carbs} g` },
  ]
})

const SEXES: { id: Sex, label: string }[] = [
  { id: 'male', label: 'Homme' }, { id: 'female', label: 'Femme' }, { id: 'unspecified', label: 'Ne pas préciser' },
]
const GOALS: { id: Goal, label: string }[] = [
  { id: 'lose', label: 'Perdre du poids' }, { id: 'maintain', label: 'Maintenir' }, { id: 'gain', label: 'Prendre du muscle' },
]
const paces = computed(() => (['slow', 'normal', 'fast'] as const).map((id) => {
  const pct = GOAL_ADJUSTMENT[form.goal][id]
  return { id, label: `${{ slow: 'Doucement', normal: 'Normal', fast: 'Rapide' }[id]} · ${pct > 0 ? '+' : '−'}${Math.abs(pct)} %` }
}))
/** Weekday cooking time; "none" stands for no limit (a select option can't be empty). */
const TIMES = [
  { value: 'none', label: 'Pas de limite' },
  { value: '15', label: '15 min' },
  { value: '30', label: '30 min' },
  { value: '45', label: '45 min' },
  { value: '60', label: '1 h' },
]
const weekdayTime = computed({
  get: () => form.weekdayMaxMinutes || 'none',
  set: (v: string) => {
    form.weekdayMaxMinutes = v === 'none' ? '' : v
  },
})

function toggleDiet(d: string): void {
  form.diet = form.diet.includes(d) ? form.diet.filter((x) => x !== d) : [...form.diet, d]
}

function addAvoid(): void {
  const v = form.avoidDraft.trim()
  if (v && !form.avoid.some((a) => a.toLowerCase() === v.toLowerCase())) form.avoid = [...form.avoid, v]
  form.avoidDraft = ''
}

const saving = ref(false)
const saveMessage = ref('')
const saveError = ref('')

async function save(): Promise<void> {
  saveMessage.value = ''
  saveError.value = problems.value[0] ?? ''
  if (saveError.value) return
  saving.value = true
  try {
    await profileStore.save(draft.value)
    saveMessage.value = 'Profil enregistré. Semaine et Chef utilisent vos nouveaux objectifs.'
  } catch (e) {
    saveError.value = (e as { statusMessage?: string }).statusMessage === 'Validation Error'
      ? 'Certaines valeurs sont hors limites. Vérifiez les champs et réessayez.'
      : 'Enregistrement impossible. Réessayez.'
  } finally {
    saving.value = false
  }
}

/** A form section: a rule above, then its eyebrow, title and fields. */
const SECTION = 'flex flex-col gap-4 border-t border-default pt-6'

const targetMacros = computed(() => {
  const t = preview.value.targets
  return t
    ? [
        { label: 'Protéines', value: t.protein, accent: true },
        { label: 'Glucides', value: t.carbs },
        { label: 'Lipides', value: t.fat },
      ]
    : []
})

/** On phones the calculation folds away under the targets card. */
const calcOpen = ref(false)

// Password change (not the first-login one).
const pw = reactive({ open: false, current: '', next: '', again: '', error: '', done: '', busy: false })

async function changePassword(): Promise<void> {
  pw.error = !pw.current ? 'Saisissez votre mot de passe actuel.' : (passwordProblem(pw.next) ?? (pw.next === pw.again ? '' : 'Les deux nouveaux mots de passe ne correspondent pas.'))
  if (pw.error) return
  pw.busy = true
  try {
    await $fetch('/api/auth/password', { method: 'POST', body: { currentPassword: pw.current, newPassword: pw.next } })
    await refresh()
    Object.assign(pw, { open: false, current: '', next: '', again: '', done: 'Mot de passe modifié. Vos autres appareils devront se reconnecter.' })
  } catch (e) {
    pw.error = (e as { statusMessage?: string }).statusMessage ?? 'Impossible de changer le mot de passe.'
  } finally {
    pw.busy = false
  }
}
</script>

<template>
  <div class="flex flex-col gap-6 md:gap-10">
    <PageHeader eyebrow="Mon compte" title="Profil" lead="Mise s’en sert pour calculer vos calories et vos protéines du jour. Vous seul le voyez." />

    <UAlert v-if="loadError" color="error" role="alert" title="Impossible de charger votre profil. Rechargez la page." />

    <!-- Phones: targets card and calculation first, then the form, then saving. -->
    <div v-else class="flex flex-wrap items-start gap-16 max-md:flex-col max-md:items-stretch max-md:gap-6">
      <div class="flex min-w-0 flex-[999_1_560px] flex-col gap-10 max-md:mt-4 max-md:w-full">
        <section :class="SECTION" aria-labelledby="pf-body">
          <AppEyebrow class="-mb-2">Corps</AppEyebrow>
          <h2 id="pf-body" class="text-xl font-medium leading-[1.3]">Pour estimer vos besoins</h2>
          <div class="grid grid-cols-[repeat(auto-fill,minmax(min(100%,200px),1fr))] gap-4">
            <UFormField label="Date de naissance">
              <UInput v-model="form.birthDate" class="w-full" type="date" />
            </UFormField>
            <UFormField label="Taille (cm)">
              <UInput v-model="form.heightCm" class="w-full" :ui="{ base: 'font-mono' }" inputmode="decimal" />
            </UFormField>
            <UFormField label="Poids (kg)">
              <UInput v-model="form.weightKg" class="w-full" :ui="{ base: 'font-mono' }" inputmode="decimal" />
            </UFormField>
          </div>
          <div class="flex flex-col gap-2 text-sm text-muted">
            <span id="pf-sex">Sexe, pour la formule de calcul</span>
            <div class="flex flex-wrap gap-2" role="radiogroup" aria-labelledby="pf-sex">
              <AppToggle v-for="s in SEXES" :key="s.id" radio :pressed="form.sex === s.id" @click="form.sex = s.id">{{ s.label }}</AppToggle>
            </div>
            <p v-if="form.sex === 'unspecified'">Mise utilise la moyenne des deux formules. Vous pouvez aussi saisir vos propres objectifs.</p>
          </div>
          <UAlert v-if="problems.length" color="error" role="alert">
            <template #description>
              <ul class="m-0 list-none p-0">
                <li v-for="p in problems" :key="p">{{ p }}</li>
              </ul>
            </template>
          </UAlert>
        </section>

        <section :class="SECTION" aria-labelledby="pf-activity">
          <AppEyebrow class="-mb-2">Activité</AppEyebrow>
          <h2 id="pf-activity" class="text-xl font-medium leading-[1.3]">Une semaine habituelle</h2>
          <div class="flex flex-col border-t border-default" role="radiogroup" aria-labelledby="pf-activity">
            <UButton
              v-for="(level, i) in ACTIVITY_LEVELS"
              :key="level.label"
              variant="ghost"
              role="radio"
              class="min-h-14 w-full gap-4 rounded-none border-b border-default px-4 py-2 text-left text-default hover:bg-transparent"
              :class="{ 'bg-muted hover:bg-muted': form.activity === i }"
              :aria-checked="form.activity === i"
              @click="form.activity = i"
            >
              <span class="size-4 shrink-0 rounded-full border" :class="form.activity === i ? 'border-[5px] border-inverted' : 'border-accented'" aria-hidden="true" />
              <span class="flex flex-col gap-0.5 text-sm text-muted">
                <strong class="text-base font-medium text-default">{{ level.label }}</strong>
                <span>{{ level.description }}</span>
              </span>
            </UButton>
          </div>
        </section>

        <section :class="SECTION" aria-labelledby="pf-goal">
          <AppEyebrow class="-mb-2">Objectif</AppEyebrow>
          <h2 id="pf-goal" class="text-xl font-medium leading-[1.3]">Ce que vous visez</h2>
          <div class="flex flex-wrap gap-2" role="radiogroup" aria-labelledby="pf-goal">
            <AppToggle v-for="g in GOALS" :key="g.id" radio :pressed="form.goal === g.id" @click="form.goal = g.id">{{ g.label }}</AppToggle>
          </div>
          <div v-if="form.goal !== 'maintain'" class="flex flex-col gap-2 text-sm text-muted">
            <span id="pf-pace">Rythme</span>
            <div class="flex flex-wrap gap-2" role="radiogroup" aria-labelledby="pf-pace">
              <AppToggle v-for="p in paces" :key="p.id" radio :pressed="form.pace === p.id" @click="form.pace = p.id">{{ p.label }}</AppToggle>
            </div>
          </div>
        </section>

        <section :class="SECTION" aria-labelledby="pf-food">
          <AppEyebrow class="-mb-2">Alimentation</AppEyebrow>
          <h2 id="pf-food" class="text-xl font-medium leading-[1.3]">Ce que Chef doit respecter</h2>
          <div class="flex flex-col gap-2 text-sm text-muted">
            <span id="pf-diet">Régime</span>
            <div class="flex flex-wrap gap-2" role="group" aria-labelledby="pf-diet">
              <AppToggle v-for="d in DIET_OPTIONS" :key="d" :pressed="form.diet.includes(d)" @click="toggleDiet(d)">{{ dietLabel(d) }}</AppToggle>
            </div>
          </div>
          <div class="flex flex-col gap-2 text-sm text-muted">
            <label for="pf-avoid">Allergies et aliments à éviter</label>
            <ul v-if="form.avoid.length" class="m-0 flex list-none flex-wrap gap-2 p-0">
              <li v-for="a in form.avoid" :key="a" class="inline-flex items-center gap-1 rounded-sm border border-accented pl-4 text-[15px] text-default">
                {{ a }}
                <UButton
                  variant="ghost"
                  icon="i-mise-close"
                  square
                  class="h-[42px] w-11 text-default hover:bg-transparent"
                  :ui="{ leadingIcon: 'size-3.5' }"
                  :aria-label="`Retirer ${a}`"
                  @click="form.avoid = form.avoid.filter((x) => x !== a)"
                />
              </li>
            </ul>
            <div class="flex flex-wrap gap-2">
              <UInput id="pf-avoid" v-model="form.avoidDraft" class="flex-[1_1_200px]" placeholder="Ex. : arachides" @keydown.enter.prevent="addAvoid" />
              <UButton label="Ajouter" @click="addAvoid" />
            </div>
          </div>
        </section>

        <section :class="SECTION" aria-labelledby="pf-plan">
          <AppEyebrow class="-mb-2">Organisation</AppEyebrow>
          <h2 id="pf-plan" class="text-xl font-medium leading-[1.3]">Votre temps et votre budget</h2>
          <div class="grid grid-cols-[repeat(auto-fill,minmax(min(100%,200px),1fr))] gap-4">
            <UFormField label="Temps de cuisine en semaine">
              <USelect v-model="weekdayTime" class="w-full" :items="TIMES" />
            </UFormField>
            <UFormField label="Budget courses par semaine (€)">
              <UInput v-model="form.weeklyBudget" class="w-full" :ui="{ base: 'font-mono' }" inputmode="decimal" />
            </UFormField>
          </div>
        </section>

        <section :class="SECTION" aria-labelledby="pf-account">
          <AppEyebrow class="-mb-2">Compte</AppEyebrow>
          <h2 id="pf-account" class="text-xl font-medium leading-[1.3]">Connexion</h2>
          <dl class="m-0 flex flex-wrap justify-between gap-4 text-sm">
            <dt class="text-muted">E-mail de connexion</dt>
            <dd class="m-0 font-mono">{{ user?.email }}</dd>
          </dl>
          <UAlert v-if="pw.done" role="status" :title="pw.done" />
          <UButton v-if="!pw.open" label="Changer le mot de passe" class="self-start" @click="pw.open = true; pw.done = ''" />
          <form v-else class="flex flex-col gap-4 rounded-sm bg-muted p-4" novalidate @submit.prevent="changePassword">
            <UFormField label="Mot de passe actuel">
              <UInput v-model="pw.current" class="w-full" type="password" autocomplete="current-password" />
            </UFormField>
            <UFormField :label="`Nouveau mot de passe (${PASSWORD_MIN_LENGTH} caractères ou plus)`">
              <UInput v-model="pw.next" class="w-full" type="password" autocomplete="new-password" />
            </UFormField>
            <UFormField label="Confirmez-le">
              <UInput v-model="pw.again" class="w-full" type="password" autocomplete="new-password" />
            </UFormField>
            <UAlert v-if="pw.error" color="error" role="alert" :title="pw.error" />
            <div class="flex flex-wrap gap-2">
              <UButton type="submit" variant="solid" label="Enregistrer" :disabled="pw.busy" />
              <UButton label="Annuler" @click="pw.open = false; pw.error = ''" />
            </div>
          </form>
          <div class="flex flex-wrap gap-2">
            <UButton v-if="isAdmin" to="/family" label="Gérer la famille" trailing-icon="i-mise-chevron-right" />
            <UButton icon="i-mise-logout" label="Se déconnecter" @click="logout" />
          </div>
        </section>
      </div>

      <aside class="flex min-w-0 flex-[1_1_360px] flex-col gap-6 max-md:contents">
        <section class="flex flex-col gap-4 rounded-sm bg-inverted p-6 text-limestone-200 max-md:order-[-3]" aria-label="Vos objectifs du jour">
          <AppEyebrow light>{{ form.manual ? 'Vos objectifs' : 'Objectifs calculés' }}</AppEyebrow>
          <template v-if="preview.targets">
            <p class="font-mono text-[40px] leading-none max-md:text-[32px]">
              {{ formatNumber(preview.targets.kcal) }} <small class="text-xs text-limestone-500">kcal par jour</small>
            </p>
            <div class="grid grid-cols-3 border-t border-limestone-800">
              <div
                v-for="(m, i) in targetMacros"
                :key="m.label"
                class="flex flex-col gap-1 pt-4 pr-2 text-sm text-limestone-500"
                :class="i ? 'border-l border-limestone-800 pl-4' : 'pl-0'"
              >
                <span>{{ m.label }}</span>
                <strong class="font-mono text-base font-normal" :class="m.accent ? 'text-brass-300' : 'text-limestone-200'">{{ m.value }} g</strong>
              </div>
            </div>
          </template>
          <p v-else class="text-[15px] text-limestone-500">Renseignez votre corps et votre activité pour voir vos objectifs.</p>
        </section>

        <UButton
          v-if="steps.length && !form.manual"
          :label="calcOpen ? 'Masquer le calcul' : 'Voir le calcul'"
          class="justify-center md:hidden max-md:order-[-2]"
          :aria-expanded="calcOpen"
          @click="calcOpen = !calcOpen"
        />
        <section
          v-if="steps.length && !form.manual"
          :class="[SECTION, 'max-md:order-[-1]', { 'max-md:hidden': !calcOpen }]"
          aria-labelledby="pf-how"
        >
          <h2 id="pf-how" class="text-xl font-medium leading-[1.3]">Comment c’est calculé</h2>
          <ol class="m-0 list-none border-t border-default p-0">
            <li v-for="s in steps" :key="s.label" class="flex items-baseline justify-between gap-4 border-b border-default py-2 text-[15px]">
              <span class="flex flex-col gap-0.5">
                <span>{{ s.label }}</span>
                <small class="text-[13px] text-muted">{{ s.how }}</small>
              </span>
              <span class="shrink-0 font-mono text-[13px]">{{ s.value }}</span>
            </li>
          </ol>
        </section>

        <section class="flex flex-col gap-4 max-md:order-1" aria-label="Objectifs personnalisés">
          <UButton
            :label="form.manual ? 'Revenir au calcul' : 'Saisir mes propres objectifs'"
            class="justify-center"
            :aria-pressed="form.manual"
            @click="form.manual = !form.manual"
          />
          <template v-if="form.manual">
            <div class="grid grid-cols-2 gap-4">
              <UFormField label="Calories (kcal)">
                <UInput v-model="form.targetKcal" class="w-full" :ui="{ base: 'font-mono' }" inputmode="numeric" :placeholder="text(preview.breakdown?.calculated.kcal ?? null)" />
              </UFormField>
              <UFormField label="Protéines (g)">
                <UInput v-model="form.targetProtein" class="w-full" :ui="{ base: 'font-mono' }" inputmode="numeric" :placeholder="text(preview.breakdown?.calculated.protein ?? null)" />
              </UFormField>
              <UFormField label="Glucides (g)">
                <UInput v-model="form.targetCarbs" class="w-full" :ui="{ base: 'font-mono' }" inputmode="numeric" />
              </UFormField>
              <UFormField label="Lipides (g)">
                <UInput v-model="form.targetFat" class="w-full" :ui="{ base: 'font-mono' }" inputmode="numeric" />
              </UFormField>
            </div>
            <p class="text-sm text-muted">Un champ vide garde la valeur calculée.</p>
          </template>
        </section>

        <UAlert v-if="saveMessage" role="status" :title="saveMessage" class="max-md:order-1" />
        <UAlert v-if="saveError" color="error" role="alert" :title="saveError" class="max-md:order-1" />
        <UButton variant="solid" class="justify-center max-md:order-1" :disabled="saving" :label="saving ? 'Enregistrement…' : 'Enregistrer le profil'" @click="save" />
        <p class="text-sm text-muted max-md:order-1">Estimation indicative, pas un avis médical.</p>
      </aside>
    </div>
  </div>
</template>
