/** "2 320": French grouping, rounded. */
export function formatNumber(value: number): string {
  return Math.round(value).toLocaleString('fr-FR')
}

/** "+100", "−44" or "±0", with a real minus sign. */
export function formatSigned(value: number): string {
  const sign = value > 0 ? '+' : value < 0 ? '−' : '±'
  return `${sign}${formatNumber(Math.abs(value))}`
}

export function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return h ? `${h} h ${m} min` : `${m} min`
}

/** "1 recette", "3 recettes". */
export function plural(count: number, singular: string, pluralForm = `${singular}s`): string {
  return `${count} ${count > 1 ? pluralForm : singular}`
}
