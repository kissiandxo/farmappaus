// Single source for the privacy policy text. It is shown in the app (src/app/privacy.tsx) and
// copied into docs/PRIVACY.md by `npm run build:privacy`. A test fails if the two drift apart.
// DRAFT: have it reviewed by an Australian privacy lawyer before the public launch.

export interface PrivacySection {
  title: string;
  paragraphs: string[];
}

export const PRIVACY_UPDATED = '13 November 2026';

export const PRIVACY_SECTIONS: PrivacySection[] = [
  {
    title: 'The short version',
    paragraphs: [
      'Farm Direct helps you find food from local farmers. We collect as little as we can. We do not sell your information, show ads, or track you across other apps or websites.',
    ],
  },
  {
    title: 'Your location',
    paragraphs: [
      'If you tap “Use my current location”, the app uses your phone’s location to work out which places are near you and how far away they are. This happens on your phone. Your location is not sent to our servers.',
      'The last place you chose is saved on your phone only, so the app still works when you have no reception.',
      'The Map tab uses Apple Maps. Apple receives map requests when you view the map, under Apple’s own privacy policy.',
    ],
  },
  {
    title: 'If you create an account',
    paragraphs: [
      'We keep your email address and a password you choose. Your password is handled by our sign-in provider and stored in a scrambled form. We never see it.',
      'Your account lets you sign in, keep your saved places on every phone, and lets reviewers know who sent a suggestion, claim or report.',
    ],
  },
  {
    title: 'If you list your farm',
    paragraphs: [
      'What you enter for a listing is shown publicly once we approve it: your name or business name, suburb and map pin, story, products, prices, opening hours, phone number, website, licence or accreditation details, and photos. Only enter what you are happy for anyone to see.',
    ],
  },
  {
    title: 'If you claim a listing or suggest a place',
    paragraphs: [
      'When you claim a listing we ask for your ABN, a phone number and a short note. Only Farm Direct reviewers see these, and we use them only to check the claim.',
      'When you suggest a place, the details you give (its name, suburb and any notes) are seen only by reviewers until a listing is approved.',
      'If you report a listing, your reason and your account are seen only by reviewers.',
    ],
  },
  {
    title: 'Where your information is kept',
    paragraphs: [
      'Account details, listings and photos are stored with our database provider, Supabase, in Australia (Sydney).',
    ],
  },
  {
    title: 'Who we share it with',
    paragraphs: [
      'We do not sell your information. We use a small number of services to run the app: Supabase (storage and sign-in), Apple (the App Store, TestFlight and Apple Maps), and Expo (which delivers app updates, not your personal information).',
    ],
  },
  {
    title: 'Your choices',
    paragraphs: [
      'You can delete your account at any time in the app: Account tab, then “Delete my account”. This removes your account, your saved places and any draft listings. Listings that have already been published stay on the map without an owner. To have one removed, contact us.',
      'You can see and change your own listing at any time. For anything else, such as a copy of your information, contact us. You also have rights under the Privacy Act 1988 (Cth). If you are unhappy with how we handle a request, you can contact the Office of the Australian Information Commissioner (oaic.gov.au).',
    ],
  },
  {
    title: 'Children',
    paragraphs: ['Farm Direct is not aimed at children.'],
  },
  {
    title: 'Contact us',
    paragraphs: ['Use the support link on the Farm Direct page in the App Store.'],
  },
  {
    title: 'Changes',
    paragraphs: [
      `We may update this policy. The date it was last changed is at the top (currently ${PRIVACY_UPDATED}). We will tell you in the app about changes that matter.`,
    ],
  },
];

/** The same text as Markdown, used for docs/PRIVACY.md. */
export function privacyMarkdown(): string {
  const body = PRIVACY_SECTIONS.map((s) => `## ${s.title}\n\n${s.paragraphs.join('\n\n')}`).join('\n\n');
  return `# Farm Direct privacy policy\n\nLast updated: ${PRIVACY_UPDATED}\n\n> Draft text. It is generated from \`src/content/privacy.ts\` (run \`npm run build:privacy\`). Have it reviewed by an Australian privacy lawyer before the public launch.\n\n${body}\n`;
}
