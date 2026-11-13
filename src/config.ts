// Build-time settings that are not secrets. EXPO_PUBLIC_* values are read when the app is bundled.
// Direct `process.env.EXPO_PUBLIC_*` access is what lets Expo inline the value, so keep it that way.

/**
 * Where "Suggest a place", "Contact us", "Report a problem" and "Is this your place?" send email.
 * Set EXPO_PUBLIC_SUPPORT_EMAIL for the build (the GitHub repository variable SUPPORT_EMAIL).
 * When it is empty those rows are hidden, so the app never offers an email it cannot send.
 */
export const SUPPORT_EMAIL: string = (process.env.EXPO_PUBLIC_SUPPORT_EMAIL ?? '').trim();
