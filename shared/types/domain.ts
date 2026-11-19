export type Unit = 'g' | 'mL' | 'pcs' | 'tbsp'

export type MealSlot = 'breakfast' | 'lunch' | 'dinner'

export type Difficulty = 'Easy' | 'Medium' | 'Hard'

export interface Ingredient {
  id: number
  name: string
  shelf: string
  /** Unit used in recipes and in stock. */
  unit: Unit
  /** Price of one purchase unit (kg, L or piece), in cents. */
  priceCents: number
  /** Quantity in stock, in `unit`. */
  stock: number
}

export interface RecipeIngredient {
  ingredientId: number
  /** Quantity for one serving, in the ingredient's unit. */
  quantity: number
}

export interface Recipe {
  id: number
  name: string
  timeMin: number
  difficulty: Difficulty
  /** Nutrition for one serving. */
  kcal: number
  protein: number
  carbs: number
  fat: number
  tags: string[]
  diet: string[]
  ingredients: RecipeIngredient[]
}

export interface PlanSlot {
  /** 0 = Monday … 6 = Sunday. */
  day: number
  slot: MealSlot
  recipeId: number | null
  portions: number
}

export interface WeekPlan {
  /** Monday of the week, `YYYY-MM-DD`. */
  weekStart: string
  slots: PlanSlot[]
}

export interface Nutrition {
  kcal: number
  protein: number
  carbs: number
  fat: number
  timeMin: number
}

export type SuggestionId = 'protein' | 'lighter' | 'variety' | 'stock'

export interface SlotChange {
  day: number
  slot: MealSlot
  fromRecipeId: number
  toRecipeId: number
}

export interface Suggestion {
  id: SuggestionId
  label: string
  question: string
  text: string
  changes: SlotChange[]
  deltaProtein: number
  deltaKcal: number
}

export interface ShoppingItem {
  ingredientId: number
  name: string
  shelf: string
  unit: Unit
  /** Quantity to buy, in the ingredient's unit. */
  quantity: number
  costCents: number
  checked: boolean
}

export interface ShoppingGroup {
  shelf: string
  items: ShoppingItem[]
}

export interface ShoppingList {
  weekStart: string
  groups: ShoppingGroup[]
  totalCents: number
}

// --- Accounts and profile -------------------------------------------------

export type Sex = 'male' | 'female' | 'unspecified'

export type Goal = 'lose' | 'maintain' | 'gain'

export type Pace = 'slow' | 'normal' | 'fast'

/** The logged-in user as the app sees it. */
export interface PublicUser {
  id: number
  email: string
  name: string
  isAdmin: boolean
  mustChangePassword: boolean
}

export type AccountStatus = 'active' | 'temporary' | 'disabled'

/** A family account as the admin sees it: no meals, no profile. */
export interface FamilyMember {
  id: number
  email: string
  name: string
  isAdmin: boolean
  status: AccountStatus
  createdAt: string
  lastLoginAt: string | null
}

export interface Profile {
  sex: Sex | null
  /** `YYYY-MM-DD`. */
  birthDate: string | null
  heightCm: number | null
  weightKg: number | null
  /** Index in ACTIVITY_LEVELS, 0 = sedentary … 4 = very active. */
  activity: number | null
  goal: Goal
  pace: Pace
  /** Diets the recipes must follow, e.g. `Vegetarian`. */
  diet: string[]
  /** Allergies and foods to avoid, matched against ingredient names. */
  avoid: string[]
  /** Longest cooking time for a weekday meal; null = no limit. */
  weekdayMaxMinutes: number | null
  weeklyBudgetCents: number | null
  /** Manual targets: each one set replaces the calculated value. */
  targetKcal: number | null
  targetProtein: number | null
  targetCarbs: number | null
  targetFat: number | null
}

export interface DailyTargets {
  kcal: number
  protein: number
  carbs: number
  fat: number
}

/** How the calculated targets were reached, to show the user. */
export interface TargetBreakdown {
  age: number
  /** Resting energy (Mifflin-St Jeor), kcal. */
  bmr: number
  activityFactor: number
  /** Resting energy × activity, kcal. */
  maintenance: number
  /** Percentage added to or taken from maintenance for the goal. */
  adjustmentPct: number
  proteinPerKg: number
  fatShare: number
  calculated: DailyTargets
}

export interface ProfileResponse {
  profile: Profile
  /** Null until the profile has enough to calculate them (or manual targets are set). */
  targets: DailyTargets | null
  breakdown: TargetBreakdown | null
  /** True when at least one manual target is in use. */
  manual: boolean
}
