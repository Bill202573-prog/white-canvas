import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Parse a date string (YYYY-MM-DD) to a Date object in local timezone.
 * This avoids timezone issues where "2026-02-08" would become "2026-02-07" in some timezones.
 */
export function parseLocalDate(dateStr: string): Date {
  if (!dateStr) return new Date();
  // Handle ISO format dates (could have time part)
  const datePart = dateStr.split('T')[0];
  const [year, month, day] = datePart.split('-').map(Number);
  return new Date(year, month - 1, day);
}
