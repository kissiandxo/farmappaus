// Build-time settings that are not secrets. EXPO_PUBLIC_* values are read when the app is bundled.
// Direct `process.env.EXPO_PUBLIC_*` access is what lets Expo inline the value, so keep it that way.

/**
 * Where "Suggest a place", "Contact us", "Report a problem" and "Is this your place?" send email.
 * Set EXPO_PUBLIC_SUPPORT_EMAIL for the build (the GitHub repository variable SUPPORT_EMAIL).
 * When it is empty those rows are hidden, so the app never offers an email it cannot send.
 */
export const SUPPORT_EMAIL: string = (process.env.EXPO_PUBLIC_SUPPORT_EMAIL ?? '').trim();

/**
 * Only set for the simulator build that takes App Store screenshots (.github/workflows/screenshots.yml).
 * Skips the first-launch welcome and pre-saves a few places so the Saved tab is not empty.
 * Never set for TestFlight or App Store builds.
 */
export const SCREENSHOT_MODE: boolean = process.env.EXPO_PUBLIC_SCREENSHOT_MODE === '1';
export const SCREENSHOT_SAVED_IDS: readonly string[] = [
  'real-nsw-carriageworks-farmers-market',
  'real-sa-beerenberg-farm',
  'real-act-capital-region-farmers-market',
];

/** Screens the screenshot build visits in order, one every SCREENSHOT_STEP_MS after launch. */
export const SCREENSHOT_STEP_MS = 20000;
export const SCREENSHOT_TOUR: readonly string[] = [
  '/map',
  '/farm/real-nsw-carriageworks-farmers-market',
  '/farm/real-sa-beerenberg-farm',
  '/saved',
  '/',
];
