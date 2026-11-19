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
const TIMES = [{ v: '', l: 'Pas de limite' }, { v: '15', l: '15 min' }, { v: '30', l: '30 min' }, { v: '45', l: '45 min' }, { v: '60', l: '1 h' }]

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
  <div class="page">
    <PageHeader eyebrow="Mon compte" title="Profil" lead="Mise s’en sert pour calculer vos calories et vos protéines du jour. Vous seul le voyez." />

    <p v-if="loadError" class="alert" role="alert">Impossible de charger votre profil. Rechargez la page.</p>

    <div v-else class="layout">
      <div class="main">
        <section class="section" aria-labelledby="pf-body">
          <p class="eyebrow">Corps</p>
          <h2 id="pf-body" class="section-title">Pour estimer vos besoins</h2>
          <div class="grid">
            <label class="field">Date de naissance<input v-model="form.birthDate" class="input" type="date"></label>
            <label class="field">Taille (cm)<input v-model="form.heightCm" class="input tabular" inputmode="decimal"></label>
            <label class="field">Poids (kg)<input v-model="form.weightKg" class="input tabular" inputmode="decimal"></label>
          </div>
          <div class="field">
            <span id="pf-sex">Sexe, pour la formule de calcul</span>
            <div class="chips" role="radiogroup" aria-labelledby="pf-sex">
              <button v-for="s in SEXES" :key="s.id" type="button" role="radio" class="toggle" :aria-checked="form.sex === s.id" @click="form.sex = s.id">{{ s.label }}</button>
            </div>
            <p v-if="form.sex === 'unspecified'" class="hint">Mise utilise la moyenne des deux formules. Vous pouvez aussi saisir vos propres objectifs.</p>
          </div>
          <ul v-if="problems.length" class="alert problems" role="alert">
            <li v-for="p in problems" :key="p">{{ p }}</li>
          </ul>
        </section>

        <section class="section" aria-labelledby="pf-activity">
          <p class="eyebrow">Activité</p>
          <h2 id="pf-activity" class="section-title">Une semaine habituelle</h2>
          <div class="options" role="radiogroup" aria-labelledby="pf-activity">
            <button
              v-for="(level, i) in ACTIVITY_LEVELS" :key="level.label" type="button" role="radio" class="option"
              :aria-checked="form.activity === i" @click="form.activity = i"
            >
              <span class="option__dot" aria-hidden="true" />
              <span class="option__text"><strong>{{ level.label }}</strong><span>{{ level.description }}</span></span>
            </button>
          </div>
        </section>

        <section class="section" aria-labelledby="pf-goal">
          <p class="eyebrow">Objectif</p>
          <h2 id="pf-goal" class="section-title">Ce que vous visez</h2>
          <div class="chips" role="radiogroup" aria-labelledby="pf-goal">
            <button v-for="g in GOALS" :key="g.id" type="button" role="radio" class="toggle" :aria-checked="form.goal === g.id" @click="form.goal = g.id">{{ g.label }}</button>
          </div>
          <div v-if="form.goal !== 'maintain'" class="field">
            <span id="pf-pace">Rythme</span>
            <div class="chips" role="radiogroup" aria-labelledby="pf-pace">
              <button v-for="p in paces" :key="p.id" type="button" role="radio" class="toggle" :aria-checked="form.pace === p.id" @click="form.pace = p.id">{{ p.label }}</button>
            </div>
          </div>
        </section>

        <section class="section" aria-labelledby="pf-food">
          <p class="eyebrow">Alimentation</p>
          <h2 id="pf-food" class="section-title">Ce que Chef doit respecter</h2>
          <div class="field">
            <span id="pf-diet">Régime</span>
            <div class="chips" role="group" aria-labelledby="pf-diet">
              <button v-for="d in DIET_OPTIONS" :key="d" type="button" class="toggle" :aria-pressed="form.diet.includes(d)" @click="toggleDiet(d)">{{ dietLabel(d) }}</button>
            </div>
          </div>
          <div class="field">
            <label for="pf-avoid">Allergies et aliments à éviter</label>
            <ul v-if="form.avoid.length" class="avoid">
              <li v-for="a in form.avoid" :key="a" class="avoid__tag">
                {{ a }}
                <button type="button" class="avoid__remove" :aria-label="`Retirer ${a}`" @click="form.avoid = form.avoid.filter((x) => x !== a)"><AppIcon name="close" :size="14" /></button>
              </li>
            </ul>
            <div class="row">
              <input id="pf-avoid" v-model="form.avoidDraft" class="input" placeholder="Ex. : arachides" @keydown.enter.prevent="addAvoid">
              <button type="button" class="btn" @click="addAvoid">Ajouter</button>
            </div>
          </div>
        </section>

        <section class="section" aria-labelledby="pf-plan">
          <p class="eyebrow">Organisation</p>
          <h2 id="pf-plan" class="section-title">Votre temps et votre budget</h2>
          <div class="grid">
            <label class="field">Temps de cuisine en semaine
              <select v-model="form.weekdayMaxMinutes" class="input">
                <option v-for="t in TIMES" :key="t.v" :value="t.v">{{ t.l }}</option>
              </select>
            </label>
            <label class="field">Budget courses par semaine (€)<input v-model="form.weeklyBudget" class="input tabular" inputmode="decimal"></label>
          </div>
        </section>

        <section class="section" aria-labelledby="pf-account">
          <p class="eyebrow">Compte</p>
          <h2 id="pf-account" class="section-title">Connexion</h2>
          <dl class="account-row"><dt>E-mail de connexion</dt><dd class="tabular">{{ user?.email }}</dd></dl>
          <p v-if="pw.done" role="status" class="notice">{{ pw.done }}</p>
          <button v-if="!pw.open" type="button" class="btn section__btn" @click="pw.open = true; pw.done = ''">Changer le mot de passe</button>
          <form v-else class="pw" novalidate @submit.prevent="changePassword">
            <label class="field">Mot de passe actuel<input v-model="pw.current" class="input" type="password" autocomplete="current-password"></label>
            <label class="field">Nouveau mot de passe ({{ PASSWORD_MIN_LENGTH }} caractères ou plus)<input v-model="pw.next" class="input" type="password" autocomplete="new-password"></label>
            <label class="field">Confirmez-le<input v-model="pw.again" class="input" type="password" autocomplete="new-password"></label>
            <p v-if="pw.error" class="alert" role="alert">{{ pw.error }}</p>
            <div class="row">
              <button type="submit" class="btn btn--primary" :disabled="pw.busy">Enregistrer</button>
              <button type="button" class="btn" @click="pw.open = false; pw.error = ''">Annuler</button>
            </div>
          </form>
          <div class="row">
            <NuxtLink v-if="isAdmin" to="/family" class="btn">Gérer la famille <AppIcon name="chevronRight" :size="16" /></NuxtLink>
            <button type="button" class="btn" @click="logout"><AppIcon name="logout" :size="16" />Se déconnecter</button>
          </div>
        </section>
      </div>

      <aside class="side">
        <section class="targets ink-panel" aria-label="Vos objectifs du jour">
          <p class="eyebrow targets__source">{{ form.manual ? 'Vos objectifs' : 'Objectifs calculés' }}</p>
          <template v-if="preview.targets">
            <p class="targets__kcal mono">{{ formatNumber(preview.targets.kcal) }} <small>kcal par jour</small></p>
            <div class="targets__macros">
              <div><span>Protéines</span><strong class="mono targets__protein">{{ preview.targets.protein }} g</strong></div>
              <div><span>Glucides</span><strong class="mono">{{ preview.targets.carbs }} g</strong></div>
              <div><span>Lipides</span><strong class="mono">{{ preview.targets.fat }} g</strong></div>
            </div>
          </template>
          <p v-else class="targets__empty">Renseignez votre corps et votre activité pour voir vos objectifs.</p>
        </section>

        <button v-if="steps.length && !form.manual" type="button" class="btn mobile-only calc-toggle" :aria-expanded="calcOpen" @click="calcOpen = !calcOpen">
          {{ calcOpen ? 'Masquer le calcul' : 'Voir le calcul' }}
        </button>
        <section v-if="steps.length && !form.manual" class="section calc" :class="{ 'calc--closed': !calcOpen }" aria-labelledby="pf-how">
          <h2 id="pf-how" class="section-title">Comment c’est calculé</h2>
          <ol class="steps">
            <li v-for="s in steps" :key="s.label"><span><strong>{{ s.label }}</strong><small>{{ s.how }}</small></span><span class="tabular">{{ s.value }}</span></li>
          </ol>
        </section>

        <section class="section section--plain" aria-label="Objectifs personnalisés">
          <button type="button" class="btn" :aria-pressed="form.manual" @click="form.manual = !form.manual">
            {{ form.manual ? 'Revenir au calcul' : 'Saisir mes propres objectifs' }}
          </button>
          <template v-if="form.manual">
            <div class="grid grid--two">
              <label class="field">Calories (kcal)<input v-model="form.targetKcal" class="input tabular" inputmode="numeric" :placeholder="text(preview.breakdown?.calculated.kcal ?? null)"></label>
              <label class="field">Protéines (g)<input v-model="form.targetProtein" class="input tabular" inputmode="numeric" :placeholder="text(preview.breakdown?.calculated.protein ?? null)"></label>
              <label class="field">Glucides (g)<input v-model="form.targetCarbs" class="input tabular" inputmode="numeric"></label>
              <label class="field">Lipides (g)<input v-model="form.targetFat" class="input tabular" inputmode="numeric"></label>
            </div>
            <p class="hint">Un champ vide garde la valeur calculée.</p>
          </template>
        </section>

        <p v-if="saveMessage" role="status" class="notice">{{ saveMessage }}</p>
        <p v-if="saveError" role="alert" class="alert">{{ saveError }}</p>
        <button type="button" class="btn btn--primary" :disabled="saving" @click="save">{{ saving ? 'Enregistrement…' : 'Enregistrer le profil' }}</button>
        <p class="hint">Estimation indicative, pas un avis médical.</p>
      </aside>
    </div>
  </div>
</template>

<style scoped>
.layout {
  gap: 64px;
}

.main {
  flex: 999 1 560px;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 40px;
}

.side {
  flex: 1 1 360px;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.section {
  padding-top: 24px;
  border-top: 1px solid var(--c-line);
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.section--plain {
  padding-top: 0;
  border-top: 0;
}

.section__btn {
  align-self: flex-start;
}

.section > .eyebrow {
  margin-bottom: -8px;
}

.grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(min(100%, 200px), 1fr));
  gap: 16px;
}

.grid--two {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.row {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.row .input {
  flex: 1 1 200px;
}

.options {
  display: flex;
  flex-direction: column;
  border-top: 1px solid var(--c-line);
}

.option {
  width: 100%;
  min-height: 56px;
  padding: 8px 16px;
  border: 0;
  border-bottom: 1px solid var(--c-line);
  border-radius: 0;
  background: transparent;
  color: var(--c-text);
  display: flex;
  align-items: center;
  gap: 16px;
  text-align: left;
  cursor: pointer;
}

.option[aria-checked='true'] {
  background: var(--c-surface);
}

.option__dot {
  width: 16px;
  height: 16px;
  flex-shrink: 0;
  border-radius: 50%;
  border: 1px solid var(--c-line-strong);
}

.option[aria-checked='true'] .option__dot {
  border: 5px solid var(--c-text);
}

.option__text {
  display: flex;
  flex-direction: column;
  gap: 2px;
  font-size: 14px;
  color: var(--c-text-2);
}

.option__text strong {
  font-size: 16px;
  font-weight: 500;
  color: var(--c-text);
}

.problems {
  margin: 0;
  list-style: none;
}

.avoid {
  margin: 0;
  padding: 0;
  list-style: none;
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.avoid__tag {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding-left: 16px;
  border: 1px solid var(--c-line-strong);
  border-radius: var(--radius);
  font-size: 15px;
}

.avoid__remove {
  width: 44px;
  height: 42px;
  border: 0;
  background: transparent;
  color: var(--c-text);
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.account-row {
  margin: 0;
  display: flex;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 16px;
  font-size: 14px;
}

.account-row dt {
  color: var(--c-text-2);
}

.account-row dd {
  margin: 0;
  font-family: var(--font-mono);
}

.pw {
  padding: 16px;
  border-radius: var(--radius);
  background: var(--c-surface);
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.targets {
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.targets__source {
  color: var(--c-mark-light);
}

.targets__kcal {
  font-size: 40px;
  line-height: 1;
}

.targets__kcal small {
  font-size: 12px;
  color: var(--c-stone);
}

.targets__macros {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  border-top: 1px solid var(--c-text-2);
}

.targets__macros div {
  padding: 16px 8px 0 16px;
  display: flex;
  flex-direction: column;
  gap: 4px;
  font-size: 14px;
  color: var(--c-stone);
}

.targets__macros div:first-child {
  padding-left: 0;
}

.targets__macros div + div {
  border-left: 1px solid var(--c-text-2);
}

.targets__macros strong {
  font-size: 16px;
  font-weight: 400;
  color: var(--c-surface);
}

.targets__macros .targets__protein {
  color: var(--c-mark-light);
}

.targets__empty {
  font-size: 15px;
  color: var(--c-stone);
}

.steps {
  margin: 0;
  padding: 0;
  list-style: none;
  border-top: 1px solid var(--c-line);
}

.steps li {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  gap: 16px;
  padding: 8px 0;
  border-bottom: 1px solid var(--c-line);
  font-size: 15px;
}

.steps li > span:first-child {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.steps strong {
  font-weight: 400;
}

.steps small {
  font-size: 13px;
  color: var(--c-text-2);
}

.steps li > span:last-child {
  flex-shrink: 0;
  font-family: var(--font-mono);
  font-size: 13px;
}

@media (max-width: 899px) {
  /* Phones: targets card and calculation first, then the form, then saving. */
  .layout {
    flex-direction: column;
    align-items: stretch;
    gap: 24px;
  }

  .side {
    display: contents;
  }

  .main {
    width: 100%;
    order: 0;
    margin-top: 16px;
  }

  .targets {
    order: -3;
  }

  .calc-toggle {
    order: -2;
  }

  .calc {
    order: -1;
  }

  .calc--closed {
    display: none;
  }

  .side > *:not(.targets):not(.calc-toggle):not(.calc) {
    order: 1;
  }

  .targets__kcal {
    font-size: 32px;
  }
}
</style>
