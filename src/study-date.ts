export const localDateKey = (value: Date | string): string => {
  const date = typeof value === 'string' ? new Date(value) : value
  return Number.isFinite(date.getTime()) ? date.toLocaleDateString('sv-SE') : ''
}
