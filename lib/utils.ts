import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Format a stored date for display in a clinical view.
 *
 * Chart fields were rendering the raw column value, so a nurse opening a patient
 * saw `2025-10-16T04:13:59.678Z` in the Surgery field. A clinician reading a
 * timestamp where a date belongs reasonably concludes the rest of the chart is
 * untrustworthy, so this is a correctness issue and not only a cosmetic one.
 *
 * Deliberately returns the fallback rather than `Invalid Date` for anything
 * unparseable — a chart must never display a value a reader could mistake for data.
 */
export function formatDate(value: string | number | Date | null | undefined, fallback = 'N/A'): string {
  if (value === null || value === undefined || value === '') return fallback
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return fallback
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
}
