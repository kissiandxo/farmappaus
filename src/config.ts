// Build-time settings that are not secrets. EXPO_PUBLIC_* values are read when the app is bundled.
// Direct `process.env.EXPO_PUBLIC_*` access is what lets Expo inline the value, so keep it that way.

import type { ScreenshotScene } from './domain/screenshotTour';

/**
 * Where "Suggest a place", "Contact us", "Report a problem" and "Is this your place?" send email.
 * Set EXPO_PUBLIC_SUPPORT_EMAIL for the build (the GitHub repository variable SUPPORT_EMAIL).
 * When it is empty those rows are hidden, so the app never offers an email it cannot send.
 */
export const SUPPORT_EMAIL: string = (process.env.EXPO_PUBLIC_SUPPORT_EMAIL ?? '').trim();

/**
 * The person or business that runs Farm Direct, shown in the privacy policy's "Who we are" section.
 * Set EXPO_PUBLIC_OPERATOR_NAME for the build (the GitHub repository variable OPERATOR_NAME).
 * When it is empty that section is left out of the in-app policy.
 */
export const OPERATOR_NAME: string = (process.env.EXPO_PUBLIC_OPERATOR_NAME ?? '').trim();

/**
 * Only set for the simulator build that takes App Store screenshots (.github/workflows/screenshots.yml).
 * Skips the first-launch welcome and pre-saves a few places so the Saved tab is not empty.
 * Never set for TestFlight or App Store builds (testflight.yml fails if it is set).
 * expo-constants (SDK 58) has no simulator flag and expo-device is not installed, so this cannot also be
 * tied to "running in the simulator"; OTA updates are off for 1.0, so only a simulator build can carry it.
 */
export const SCREENSHOT_MODE: boolean = process.env.EXPO_PUBLIC_SCREENSHOT_MODE === '1';
export const SCREENSHOT_SAVED_IDS: readonly string[] = [
  'real-vic-torello-farm',
  'real-sa-barossa-farmers-market',
  'real-sa-beerenberg-farm',
];

/**
 * The scenes the screenshot build shows, in order. The app starts on scene 0 and moves on one scene each time
 * the system appearance goes from dark back to light (the workflow does that with `simctl ui appearance`).
 * No timers: the CI simulator is too slow for a timetable. Each `shot` must match, in order, the screenshot
 * names in .github/workflows/screenshots.yml (a test checks this).
 * - Torello Farm (VIC): a farm shop selling its own beef and lamb, street address, open 7 days 8am to 6pm.
 * - Barossa Farmers Market (SA): weekly Saturday market with chicken and lamb listed, street address.
 */
export const SCREENSHOT_SCENES: readonly ScreenshotScene[] = [
  { shot: '01-explore', href: '/', filters: 'none', query: '' },
  { shot: '02-explore-meat', href: '/', filters: 'meat', query: '' },
  { shot: '03-place-meat', href: '/farm/real-vic-torello-farm', filters: 'none', query: '' },
  { shot: '04-place-market', href: '/farm/real-sa-barossa-farmers-market' },
  { shot: '05-saved', href: '/saved' },
  // The map comes LAST: with the map on screen the simulator is too slow to notice appearance
  // changes, so the tour cannot step past it. The workflow then takes one more shot of this same
  // scene in dark appearance (07-map-dark), which needs no step.
  { shot: '06-map', href: '/map', filters: 'none', query: '' },
];
