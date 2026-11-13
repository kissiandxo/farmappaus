// Single source for the privacy policy text. It is shown in the app (src/app/privacy.tsx) and
// copied into docs/PRIVACY.md by `npm run build:privacy`. A test fails if the two drift apart.
// Keep this file free of imports and enums: scripts/build-privacy-doc.mjs loads it with Node's type stripping.
// DRAFT: have it reviewed by an Australian privacy lawyer before the public launch.

export interface PrivacySection {
  title: string;
  paragraphs: string[];
  /** Only applies when the app has accounts (a backend is connected). Left out of the in-app policy in 1.0. */
  accountsOnly?: boolean;
  /** Only applies to someone who still has a profile from a Sign in with Apple test build on this phone. */
  legacyProfileOnly?: boolean;
}

export interface PrivacyOptions {
  /** The support address (EXPO_PUBLIC_SUPPORT_EMAIL). Without it, "Contact us" points at the App Store support link. */
  email?: string;
  /** Who runs Farm Direct (EXPO_PUBLIC_OPERATOR_NAME). Without it, "Who we are" is left out. */
  operator?: string;
  /** Include the sections that only apply with accounts. Default true. */
  accounts?: boolean;
  /** Include the section about a profile kept from a Sign in with Apple test build. Default true. */
  legacyAppleProfile?: boolean;
}

export const PRIVACY_UPDATED = '13 November 2026';

/** Written into docs/PRIVACY.md where the support address or operator name has not been supplied yet. */
export const PRIVACY_PLACEHOLDER = '(to be added before publishing)';

/** Points readers of the full policy at the sections that do not apply to 1.0. Dropped when those sections are hidden. */
const ACCOUNTS_NOTE =
  'The sections below headed “only when accounts are available” do not apply to Farm Direct 1.0. They describe how we would handle your information if a later version offers accounts, and we would tell you in the app first.';

/** The policy's sections, filled in with the support address and operator name when they are known. */
export function privacySections(opts: PrivacyOptions = {}): PrivacySection[] {
  const email = opts.email?.trim();
  const operator = opts.operator?.trim();
  const accounts = opts.accounts ?? true;
  const legacyAppleProfile = opts.legacyAppleProfile ?? true;

  const sections: PrivacySection[] = [
    {
      title: 'The short version',
      paragraphs: [
        'Farm Direct helps you find farmers’ markets, farm shops, farm-gate stalls, farms and independent butchers near you. We collect as little as we can. We do not sell your information, show ads, or track you across other apps or websites.',
      ],
    },
    ...(operator
      ? [
          {
            title: 'Who we are',
            paragraphs: [`Farm Direct is run by ${operator}. “We” and “us” in this policy means them.`],
          },
        ]
      : []),
    {
      title: 'Farm Direct 1.0: no accounts',
      paragraphs: [
        'Farm Direct 1.0 has no accounts and no sign-in. Nothing you do in the app is sent to Farm Direct: not your location, your searches and filters, or the places you save.',
        'The places you save, the last location you chose and a few app settings are kept on your phone only, so the app still works without reception. Deleting the app deletes them.',
        'The places in the app are built into it. They come from public sources, such as each place’s own website and council or tourism pages, and their owners have not confirmed them.',
        'If you choose to email us (for example to suggest a place, report a problem or claim a listing), your email app sends the message. We receive your email address and whatever you write. We use it only to reply and to look into your request, and we handle it as ordinary email.',
        ...(accounts ? [ACCOUNTS_NOTE] : []),
      ],
    },
    {
      title: 'Your location',
      paragraphs: [
        'If you tap “Use my location”, the app uses your phone’s location, only while the app is open, to sort places by distance and show how far away they are. This happens on your phone. Your location is not sent to our servers.',
        'To name the area you are in, the app first looks for a nearby town among the places built into it. If it can’t find one, it asks Apple’s geocoding service to turn the coordinates into a town name. Apple handles that request under its own privacy policy.',
        'The last location you chose is saved on your phone only, so the app still works when you have no reception.',
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
      accountsOnly: true,
      paragraphs: [
        'We keep your email address and a password you choose. Your password is handled by our sign-in provider and stored in a scrambled form. We never see it.',
        'Your account lets you sign in, keep your saved places on every phone, and lets reviewers know who sent a suggestion, claim or report.',
      ],
    },
    {
      title: 'If you sign in with Apple (only when accounts are available)',
      accountsOnly: true,
      paragraphs: [
        'Signing in is optional. If you use Sign in with Apple, Apple gives the app a private user ID and, the first time only, the name and email address you choose to share. You can hide your email with Apple’s private relay.',
        'With an online account, Apple’s sign-in token is checked by our sign-in provider, Supabase, and your name and email are kept with your account like any other account details.',
      ],
    },
    {
      title: 'If you tried a test version with Sign in with Apple',
      legacyProfileOnly: true,
      paragraphs: [
        'If you tried a test version that let you sign in with Apple, your name, email address and Apple user ID are kept on your phone only. They are not sent to our servers. We do not keep Apple’s sign-in token. “Remove from this iPhone” on the About tab deletes them. If you revoke Farm Direct in your Apple ID settings, the app removes them the next time it opens.',
      ],
    },
    {
      title: 'If you list your farm (only when accounts are available)',
      accountsOnly: true,
      paragraphs: [
        'What you enter for a listing is shown publicly once we approve it: your name or business name, suburb and map pin, story, products, prices, opening hours, phone number, website, licence or accreditation details, and photos. Only enter what you are happy for anyone to see.',
      ],
    },
    {
      title: 'If you claim a listing or suggest a place in the app (only when accounts are available)',
      accountsOnly: true,
      paragraphs: [
        'When you claim a listing we ask for your ABN, a phone number and a short note. Only Farm Direct reviewers see these, and we use them only to check the claim.',
        'When you suggest a place, the details you give (its name, suburb and any notes) are seen only by reviewers until a listing is approved.',
        'If you report a listing, your reason and your account are seen only by reviewers.',
      ],
    },
    {
      title: 'Where your information is kept (only when accounts are available)',
      accountsOnly: true,
      paragraphs: [
        'Account details, listings and photos are stored with our database provider, Supabase, in Australia (Sydney).',
      ],
    },
    {
      title: 'Who we share it with',
      paragraphs: ['We do not sell your information. Farm Direct 1.0 uses Apple (the App Store, TestFlight and Apple Maps).'],
    },
    {
      title: 'Storage and sign-in provider (only when accounts are available)',
      accountsOnly: true,
      paragraphs: ['When accounts are available we also use Supabase for storage and sign-in.'],
    },
    {
      title: 'Your choices',
      paragraphs: [
        'In Farm Direct 1.0 you can delete everything the app keeps by deleting the app. Emails you send us are held in our email, and you can ask us to delete them.',
        'For anything else, such as a copy of your information, contact us. You also have rights under the Privacy Act 1988 (Cth). If you are unhappy with how we handle a request, you can contact the Office of the Australian Information Commissioner (oaic.gov.au).',
      ],
    },
    {
      title: 'Deleting your account or listing (only when accounts are available)',
      accountsOnly: true,
      paragraphs: [
        'You can delete your account at any time in the app: Account tab, then “Delete my account”. This removes your account, your saved places and any draft listings. Listings that have already been published stay on the map without an owner. To have one removed, contact us.',
        'You can see and change your own listing at any time.',
      ],
    },
    {
      title: 'Children',
      paragraphs: ['Farm Direct is not aimed at children.'],
    },
    {
      title: 'Contact us',
      paragraphs: [
        email
          ? `Email us at ${email}, or use “Contact us” on the About tab.`
          : 'Use the support link on the Farm Direct page in the App Store.',
      ],
    },
    {
      title: 'Changes',
      paragraphs: [
        `We may update this policy. The date it was last changed is at the top (currently ${PRIVACY_UPDATED}). We will tell you in the app about changes that matter.`,
      ],
    },
  ];

  return sections.filter((s) => (accounts || !s.accountsOnly) && (legacyAppleProfile || !s.legacyProfileOnly));
}

/** Every section, with no support address or operator name filled in. */
export const PRIVACY_SECTIONS: PrivacySection[] = privacySections();

/**
 * The full policy (every section) as Markdown, used for docs/PRIVACY.md. A missing support address or operator
 * name is written as PRIVACY_PLACEHOLDER, so the published document shows what is still to be supplied.
 */
export function privacyMarkdown(opts: { email?: string; operator?: string } = {}): string {
  const sections = privacySections({
    email: opts.email?.trim() || PRIVACY_PLACEHOLDER,
    operator: opts.operator?.trim() || PRIVACY_PLACEHOLDER,
    accounts: true,
  });
  const body = sections.map((s) => `## ${s.title}\n\n${s.paragraphs.join('\n\n')}`).join('\n\n');
  return `# Farm Direct privacy policy\n\nLast updated: ${PRIVACY_UPDATED}\n\n${body}\n`;
}
