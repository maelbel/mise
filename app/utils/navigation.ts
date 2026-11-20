/** Line icons from app/assets/icons used in the phone tab bar, shown as `i-mise-<name>`. */
type NavIcon = 'calendar' | 'book' | 'jar' | 'fridge' | 'cart' | 'sparkle'

export interface NavItem {
  to: string
  label: string
  icon: NavIcon
  /** Shown in the phone's tab bar. */
  mobile: boolean
  /** Other paths that light this entry up (on phones, Ingrédients sits under Réserve). */
  also?: string[]
}

export const NAV_ITEMS: readonly NavItem[] = [
  { to: '/', label: 'Semaine', icon: 'calendar', mobile: true },
  { to: '/recipes', label: 'Recettes', icon: 'book', mobile: true },
  { to: '/ingredients', label: 'Ingrédients', icon: 'jar', mobile: false },
  { to: '/storage', label: 'Réserve', icon: 'fridge', mobile: true, also: ['/ingredients'] },
  { to: '/shopping', label: 'Courses', icon: 'cart', mobile: true },
  { to: '/chef', label: 'Chef', icon: 'sparkle', mobile: true },
]
