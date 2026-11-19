import type { Ingredient, MealSlot, Recipe, SlotChange, Suggestion, SuggestionId, WeekPlan } from '#shared/types/domain'
import type { ChefAdvisor, ChefContext } from './advisor'

/** Used when the profile has no targets yet. */
const DEFAULT_PROTEIN_PER_MEAL_G = 30
const DEFAULT_HEAVY_MEAL_KCAL = 750
/** With targets: a meal over this share of the day's calories counts as heavy. */
const HEAVY_MEAL_SHARE = 0.35
const MEALS_PER_DAY = 3
const REPEAT_THRESHOLD_DAYS = 4
const WEEKDAYS = 5

const LABELS: Record<SuggestionId, { label: string, question: string }> = {
  protein: { label: 'Plus de protéines', question: 'Augmenter mes protéines cette semaine' },
  lighter: { label: 'Week-end plus léger', question: 'Alléger mon week-end' },
  variety: { label: 'Plus de variété', question: 'Varier ma semaine' },
  stock: { label: 'Que cuisiner maintenant ?', question: 'Que puis-je cuisiner avec ma réserve ?' },
}

/** Mutable copy of the plan's recipe ids, so successive swaps see each other. */
class PlanDraft {
  private readonly ids = new Map<string, number | null>()

  constructor(readonly plan: WeekPlan) {
    for (const s of plan.slots) this.ids.set(PlanDraft.key(s.day, s.slot), s.recipeId)
  }

  static key(day: number, slot: MealSlot): string {
    return `${day}:${slot}`
  }

  recipeIdsOnDay(day: number, except: MealSlot): Set<number> {
    const ids = new Set<number>()
    for (const s of this.plan.slots) {
      const id = this.ids.get(PlanDraft.key(s.day, s.slot))
      if (s.day === day && s.slot !== except && id != null) ids.add(id)
    }
    return ids
  }

  set(day: number, slot: MealSlot, recipeId: number): void {
    this.ids.set(PlanDraft.key(day, slot), recipeId)
  }

  usage(recipeId: number): number {
    let count = 0
    for (const id of this.ids.values()) if (id === recipeId) count++
    return count
  }
}

/** Protein one meal should bring, from the daily target when there is one. */
export function proteinPerMeal(ctx: ChefContext): number {
  return ctx.targets ? Math.round(ctx.targets.protein / MEALS_PER_DAY) : DEFAULT_PROTEIN_PER_MEAL_G
}

/** Calories above which a meal counts as heavy, from the daily target when there is one. */
export function heavyMealKcal(ctx: ChefContext): number {
  return ctx.targets ? Math.round(ctx.targets.kcal * HEAVY_MEAL_SHARE) : DEFAULT_HEAVY_MEAL_KCAL
}

const fold = (s: string) => s.toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '')

/** Whether Chef may propose `recipe` on `day`: diet, foods to avoid and weekday cooking time. */
export function isAllowed(recipe: Recipe, day: number, ctx: ChefContext): boolean {
  const prefs = ctx.preferences
  if (!prefs) return true
  const diets = new Set(recipe.diet.map(fold))
  if (diets.has('vegan')) diets.add('vegetarian')
  if (!prefs.diet.every((d) => diets.has(fold(d)))) return false
  const avoid = prefs.avoid.map(fold).filter(Boolean)
  if (avoid.length && recipe.ingredients.some((line) => {
    const name = ctx.ingredients.get(line.ingredientId)?.name
    return name !== undefined && avoid.some((a) => fold(name).includes(a))
  })) return false
  if (day < WEEKDAYS && prefs.weekdayMaxMinutes != null && recipe.timeMin > prefs.weekdayMaxMinutes) return false
  return true
}

function names(ids: Iterable<number>, recipes: ReadonlyMap<number, Recipe>): string {
  const list = [...new Set(ids)].map((id) => recipes.get(id)?.name ?? 'une recette')
  if (list.length <= 1) return list[0] ?? ''
  return `${list.slice(0, -1).join(', ')} et ${list.at(-1)}`
}

function build(
  id: SuggestionId,
  ctx: ChefContext,
  changes: SlotChange[],
  text: string,
): Suggestion {
  let deltaProtein = 0
  let deltaKcal = 0
  for (const c of changes) {
    const portions = ctx.plan.slots.find((s) => s.day === c.day && s.slot === c.slot)?.portions ?? 1
    const from = ctx.recipes.get(c.fromRecipeId)
    const to = ctx.recipes.get(c.toRecipeId)
    if (!from || !to) continue
    deltaProtein += (to.protein - from.protein) * portions
    deltaKcal += (to.kcal - from.kcal) * portions
  }
  return { id, ...LABELS[id], text, changes, deltaProtein, deltaKcal }
}

/** Weekday dinners under the protein target → the highest-protein recipe that isn't heavy or already eaten that day. */
export function proteinSuggestion(ctx: ChefContext): Suggestion {
  const target = proteinPerMeal(ctx)
  const heavy = heavyMealKcal(ctx)
  const draft = new PlanDraft(ctx.plan)
  const changes: SlotChange[] = []
  for (const s of ctx.plan.slots) {
    const current = s.recipeId === null ? undefined : ctx.recipes.get(s.recipeId)
    if (s.day >= WEEKDAYS || s.slot !== 'dinner' || !current || current.protein >= target) continue
    const taken = draft.recipeIdsOnDay(s.day, s.slot)
    const best = [...ctx.recipes.values()]
      .filter((r) => r.protein > current.protein && r.kcal <= heavy && !taken.has(r.id) && isAllowed(r, s.day, ctx))
      .sort((a, b) => b.protein - a.protein || a.kcal - b.kcal)[0]
    if (!best) continue
    draft.set(s.day, s.slot, best.id)
    changes.push({ day: s.day, slot: s.slot, fromRecipeId: current.id, toRecipeId: best.id })
  }
  const goal = ctx.targets ? `votre objectif de ${ctx.targets.protein} g de protéines par jour` : 'une semaine riche en protéines'
  const text = changes.length
    ? `Vos dîners de semaine sont vos repas les moins riches en protéines. Remplacer ${names(changes.map((c) => c.fromRecipeId), ctx.recipes)} par ${names(changes.map((c) => c.toRecipeId), ctx.recipes)} vous rapproche nettement de ${goal}.`
    : `Chaque dîner de semaine apporte déjà au moins ${target} g de protéines, ou aucune de vos recettes ne fait mieux : rien à changer.`
  return build('protein', ctx, changes, text)
}

/** Heavy weekend meals → the lightest recipe not already eaten that day. */
export function lighterSuggestion(ctx: ChefContext): Suggestion {
  const heavy = heavyMealKcal(ctx)
  const draft = new PlanDraft(ctx.plan)
  const changes: SlotChange[] = []
  for (const s of ctx.plan.slots) {
    const current = s.recipeId === null ? undefined : ctx.recipes.get(s.recipeId)
    if (s.day < WEEKDAYS || !current || current.kcal < heavy) continue
    const taken = draft.recipeIdsOnDay(s.day, s.slot)
    const lightest = [...ctx.recipes.values()]
      .filter((r) => r.kcal < current.kcal && !taken.has(r.id) && isAllowed(r, s.day, ctx))
      .sort((a, b) => a.kcal - b.kcal)[0]
    if (!lightest) continue
    draft.set(s.day, s.slot, lightest.id)
    changes.push({ day: s.day, slot: s.slot, fromRecipeId: current.id, toRecipeId: lightest.id })
  }
  const text = changes.length
    ? `Votre week-end a les repas les plus lourds de la semaine. ${names(changes.map((c) => c.toRecipeId), ctx.recipes)} à la place de ${names(changes.map((c) => c.fromRecipeId), ctx.recipes)} allège samedi et dimanche.`
    : 'Votre week-end est déjà aussi léger que la semaine : rien à changer.'
  return build('lighter', ctx, changes, text)
}

/** A lunch or dinner repeated on many days → every second repeat becomes the least-used other recipe. */
export function varietySuggestion(ctx: ChefContext): Suggestion {
  const draft = new PlanDraft(ctx.plan)
  const changes: SlotChange[] = []
  for (const slot of ['lunch', 'dinner'] as const) {
    const bySlot = ctx.plan.slots.filter((s) => s.slot === slot && s.recipeId !== null).sort((a, b) => a.day - b.day)
    const counts = new Map<number, number>()
    for (const s of bySlot) counts.set(s.recipeId!, (counts.get(s.recipeId!) ?? 0) + 1)
    for (const [recipeId, count] of counts) {
      if (count < REPEAT_THRESHOLD_DAYS) continue
      const repeats = bySlot.filter((s) => s.recipeId === recipeId)
      repeats.forEach((s, index) => {
        if (index % 2 === 0) return
        const taken = draft.recipeIdsOnDay(s.day, slot)
        const alternative = [...ctx.recipes.values()]
          .filter((r) => r.id !== recipeId && !taken.has(r.id) && isAllowed(r, s.day, ctx))
          .sort((a, b) => draft.usage(a.id) - draft.usage(b.id) || a.id - b.id)[0]
        if (!alternative) return
        draft.set(s.day, slot, alternative.id)
        changes.push({ day: s.day, slot, fromRecipeId: recipeId, toRecipeId: alternative.id })
      })
    }
  }
  const text = changes.length
    ? 'Vous mangez le même déjeuner ou le même dîner presque tous les jours. Ce mélange n’utilise que vos recettes : la liste de courses reste courte.'
    : 'Votre semaine mélange déjà bien vos recettes : rien à changer.'
  return build('variety', ctx, changes, text)
}

function canCook(recipe: Recipe, ingredients: ReadonlyMap<number, Ingredient>): boolean {
  return recipe.ingredients.length > 0
    && recipe.ingredients.every((line) => (ingredients.get(line.ingredientId)?.stock ?? 0) >= line.quantity)
}

/** Recipes that storage covers for one serving. Changes nothing in the plan. */
export function stockSuggestion(ctx: ChefContext): Suggestion {
  const cookable = [...ctx.recipes.values()].filter((r) => canCook(r, ctx.ingredients) && isAllowed(r, WEEKDAYS, ctx))
  const text = cookable.length
    ? `Avec ce qu'il y a dans votre réserve, vous pouvez cuisiner tout de suite : ${names(cookable.map((r) => r.id), ctx.recipes)}.`
    : 'Votre réserve ne couvre encore aucune recette complète. Mettez-la à jour après vos prochaines courses et je vous dirai quoi cuisiner.'
  return build('stock', ctx, [], text)
}

export const ruleAdvisor: ChefAdvisor = {
  async suggestions(ctx) {
    return [proteinSuggestion(ctx), lighterSuggestion(ctx), varietySuggestion(ctx), stockSuggestion(ctx)]
  },
}
