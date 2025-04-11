import { format, parseISO, isValid } from 'date-fns';

/**
 * Safely formats a date string, returning 'N/A' if the input is invalid or null.
 * @param dateString The date string to format.
 * @returns The formatted date string (e.g., 'Jan 01, 2023') or 'N/A'.
 */
export const formatSafeDate = (dateString: string | undefined | null): string => {
  if (!dateString) return 'N/A';
  try {
    const date = parseISO(dateString);
    return isValid(date) ? format(date, 'MMM dd, yyyy') : 'N/A';
  } catch {
    return 'N/A';
  }
};

// Add other date utility functions here if needed 