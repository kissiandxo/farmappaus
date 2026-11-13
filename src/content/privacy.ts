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
      'Farm Direct helps you find farmers’ markets, farm shops and farm-gate stalls near you. We collect as little as we can. We do not sell your information, show ads, or track you across other apps or websites.',
    ],
  },
  {
    title: 'Farm Direct 1.0: no accounts',
    paragraphs: [
      'Farm Direct 1.0 has no accounts and no sign-in. Nothing you do in the app is sent to Farm Direct: not your location, your searches and filters, or the places you save.',
      'The places you save and the last location you chose are kept on your phone only, so the app still works without reception. Deleting the app deletes them.',
      'The places in the app are built into it. They come from public sources, such as each place’s own website and council or tourism pages, and their owners have not confirmed them.',
      'If you choose to email us (for example to suggest a place, report a problem or claim a listing), your email app sends the message. We receive your email address and whatever you write. We use it only to reply and to look into your request, and we handle it as ordinary email.',
      'The sections below headed “only when accounts are available” do not apply to Farm Direct 1.0. They describe how we would handle your information if a later version offers accounts, and we would tell you in the app first.',
    ],
  },
  {
    title: 'Your location',
    paragraphs: [
      'If you tap “Use my current location”, the app uses your phone’s location to work out which places are near you and how far away they are. This happens on your phone. Your location is not sent to our servers.',
      'The last place you chose is saved on your phone only, so the app still works when you have no reception.',
    ],
  },
  {
    title: 'Maps and directions',
    paragraphs: [
      'The Map tab and directions use Apple Maps, which is Apple’s service. Apple receives map requests when you view the map or ask for directions, under Apple’s own privacy policy.',
      'Place locations were found using OpenStreetMap data. Map locations © OpenStreetMap contributors.',
    ],
  },
  {
    title: 'If you create an account (only when accounts are available)',
    paragraphs: [
      'We keep your email address and a password you choose. Your password is handled by our sign-in provider and stored in a scrambled form. We never see it.',
      'Your account lets you sign in, keep your saved places on every phone, and lets reviewers know who sent a suggestion, claim or report.',
    ],
  },
  {
    title: 'If you sign in with Apple (only when accounts are available)',
    paragraphs: [
      'Signing in is optional. If you use Sign in with Apple, Apple gives the app a private user ID and, the first time only, the name and email address you choose to share. You can hide your email with Apple’s private relay.',
      'With an online account, Apple’s sign-in token is checked by our sign-in provider, Supabase, and your name and email are kept with your account like any other account details.',
      'If you signed in with Apple in an earlier version of the app, your name, email address and that user ID are kept on your phone only. They are not sent to our servers. We do not keep Apple’s sign-in token. “Remove from this iPhone” on the About tab deletes them. If you revoke Farm Direct in your Apple ID settings, the app removes them the next time it opens.',
    ],
  },
  {
    title: 'If you list your farm (only when accounts are available)',
    paragraphs: [
      'What you enter for a listing is shown publicly once we approve it: your name or business name, suburb and map pin, story, products, prices, opening hours, phone number, website, licence or accreditation details, and photos. Only enter what you are happy for anyone to see.',
    ],
  },
  {
    title: 'If you claim a listing or suggest a place in the app (only when accounts are available)',
    paragraphs: [
      'When you claim a listing we ask for your ABN, a phone number and a short note. Only Farm Direct reviewers see these, and we use them only to check the claim.',
      'When you suggest a place, the details you give (its name, suburb and any notes) are seen only by reviewers until a listing is approved.',
      'If you report a listing, your reason and your account are seen only by reviewers.',
    ],
  },
  {
    title: 'Where your information is kept (only when accounts are available)',
    paragraphs: [
      'Account details, listings and photos are stored with our database provider, Supabase, in Australia (Sydney).',
    ],
  },
  {
    title: 'Who we share it with',
    paragraphs: [
      'We do not sell your information. Farm Direct 1.0 uses Apple (the App Store, TestFlight and Apple Maps) and Expo, which delivers app updates, not your personal information. When accounts are available we also use Supabase for storage and sign-in.',
    ],
  },
  {
    title: 'Your choices',
    paragraphs: [
      'In Farm Direct 1.0 you can delete everything the app keeps by deleting the app. Emails you send us are held in our email, and you can ask us to delete them.',
      'When accounts are available you can delete your account at any time in the app: Account tab, then “Delete my account”. This removes your account, your saved places and any draft listings. Listings that have already been published stay on the map without an owner. To have one removed, contact us.',
      'You can see and change your own listing at any time. For anything else, such as a copy of your information, contact us. You also have rights under the Privacy Act 1988 (Cth). If you are unhappy with how we handle a request, you can contact the Office of the Australian Information Commissioner (oaic.gov.au).',
    ],
  },
  {
    title: 'Children',
    paragraphs: ['Farm Direct is not aimed at children.'],
  },
  {
    title: 'Contact us',
    paragraphs: ['Use “Contact us” on the About tab, or the support link on the Farm Direct page in the App Store.'],
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
