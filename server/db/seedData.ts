import type { Difficulty, MealSlot, Unit } from '../../shared/types/domain'

/** [name, shelf, unit, price in cents per kg / L / piece] */
export const SEED_INGREDIENTS: [string, string, Unit, number][] = [
  ['Banane', 'Fruits & Vegetables', 'pcs', 30],
  ['Brocoli', 'Fruits & Vegetables', 'g', 300],
  ['Carotte', 'Fruits & Vegetables', 'g', 150],
  ['Oignon', 'Fruits & Vegetables', 'pcs', 40],
  ['Pomme de terre', 'Fruits & Vegetables', 'g', 200],
  ['Blanc de poulet', 'Meat', 'g', 1300],
  ['Bœuf haché', 'Meat', 'g', 1100],
  ['Saumon', 'Fresh Produce', 'g', 2200],
  ['Cheddar', 'Dairy', 'g', 1200],
  ['Yaourt grec', 'Dairy', 'g', 400],
  ['Crème liquide', 'Dairy', 'mL', 400],
  ['Parmesan', 'Dairy', 'g', 1800],
  ['Pain à burger', 'Bakery', 'pcs', 50],
  ['Pâtes', 'Savory Pantry', 'g', 200],
  ['Lentilles corail', 'Savory Pantry', 'g', 400],
  ['Riz', 'Savory Pantry', 'g', 250],
  ['Bouillon de légumes', 'Savory Pantry', 'mL', 300],
  ['Miel', 'Sweet Pantry', 'g', 1200],
  ['Flocons d’avoine', 'Sweet Pantry', 'g', 300],
  ['Huile d’olive', 'Liquids', 'tbsp', 1000],
]

export const SEED_STOCK: Record<string, number> = { 'Yaourt grec': 1200 }

interface SeedRecipe {
  key: string
  name: string
  timeMin: number
  difficulty: Difficulty
  kcal: number
  protein: number
  carbs: number
  fat: number
  tags: string[]
  diet: string[]
  /** [ingredient name, quantity per serving] */
  ingredients: [string, number][]
}

export const SEED_RECIPES: SeedRecipe[] = [
  {
    key: 'bowl', name: 'Bol protéiné aux fruits', timeMin: 5, difficulty: 'Easy', kcal: 430, protein: 22, carbs: 65, fat: 10,
    tags: ['Health', 'Quick'], diet: ['Vegetarian', 'Gluten-free'],
    ingredients: [['Yaourt grec', 200], ['Banane', 1], ['Flocons d’avoine', 40], ['Miel', 10]],
  },
  {
    key: 'salmon', name: 'Pâtes crémeuses au saumon', timeMin: 20, difficulty: 'Medium', kcal: 710, protein: 38, carbs: 75, fat: 28,
    tags: ['Treat', 'Weekend'], diet: [],
    ingredients: [['Saumon', 150], ['Pâtes', 100], ['Crème liquide', 50], ['Parmesan', 15], ['Oignon', 0.5], ['Huile d’olive', 1]],
  },
  {
    key: 'chicken', name: 'Poulet rôti, riz et brocoli', timeMin: 25, difficulty: 'Easy', kcal: 620, protein: 48, carbs: 70, fat: 14,
    tags: ['Health', 'Protein'], diet: ['Gluten-free', 'Lactose-free'],
    ingredients: [['Blanc de poulet', 150], ['Riz', 80], ['Brocoli', 150], ['Huile d’olive', 1]],
  },
  {
    key: 'burger', name: 'Burger maison et frites', timeMin: 25, difficulty: 'Easy', kcal: 780, protein: 40, carbs: 65, fat: 38,
    tags: ['Treat', 'Weekend'], diet: [],
    ingredients: [['Bœuf haché', 150], ['Pain à burger', 1], ['Cheddar', 30], ['Pomme de terre', 250], ['Oignon', 0.5], ['Huile d’olive', 1]],
  },
  {
    key: 'lentil', name: 'Soupe de lentilles corail', timeMin: 30, difficulty: 'Easy', kcal: 340, protein: 18, carbs: 50, fat: 6,
    tags: ['Health', 'Quick'], diet: ['Vegan', 'Vegetarian', 'Gluten-free', 'Lactose-free'],
    ingredients: [['Lentilles corail', 80], ['Carotte', 100], ['Oignon', 0.5], ['Bouillon de légumes', 300], ['Huile d’olive', 1]],
  },
]

const WEEKDAY: Record<MealSlot, string> = { breakfast: 'bowl', lunch: 'chicken', dinner: 'lentil' }
const WEEKEND: Record<MealSlot, string> = { breakfast: 'bowl', lunch: 'burger', dinner: 'salmon' }

/** Recipe key for each day (0 = Monday) and slot of the starter week. */
export function seedPlanRecipe(day: number, slot: MealSlot): string {
  return (day < 5 ? WEEKDAY : WEEKEND)[slot]
}
