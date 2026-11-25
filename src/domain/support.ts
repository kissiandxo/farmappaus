import { mailtoUrl } from './links';

/** The few facts about a place that go into a pre-filled email. */
export interface PlaceRef {
  id: string;
  name: string;
  locality: string;
  state: string;
  postcode?: string;
}

const placeLines = (place: PlaceRef): string[] => [
  `Place: ${place.name}`,
  `Location: ${[place.locality, place.state, place.postcode].filter(Boolean).join(' ')}`,
  `Listing ID: ${place.id}`,
];

/** "Report a problem" email for one place. Null when there is no support address. */
export function reportMailto(to: string, place: PlaceRef): string | null {
  return mailtoUrl(
    to,
    `Farm Direct: problem with ${place.name}`,
    [
      'Hi Farm Direct,',
      '',
      'I’d like to report a problem with this place.',
      '',
      ...placeLines(place),
      '',
      'What’s wrong (for example wrong hours, closed, moved or a wrong phone number):',
      '',
      '',
    ].join('\n'),
  );
}

/** "Is this your place?" email: the owner asks to claim or update one place. */
export function claimMailto(to: string, place: PlaceRef): string | null {
  return mailtoUrl(
    to,
    `Farm Direct: claim or update ${place.name}`,
    [
      'Hi Farm Direct,',
      '',
      'I own or run this place and would like to claim it or update its details.',
      '',
      ...placeLines(place),
      '',
      'My name:',
      'My role (owner, manager, stallholder):',
      'Best phone number:',
      'What should change:',
      '',
    ].join('\n'),
  );
}

/** "Suggest a place" email, with a short template to fill in. */
export function suggestMailto(to: string): string | null {
  return mailtoUrl(
    to,
    'Farm Direct: suggest a place',
    [
      'Hi Farm Direct,',
      '',
      'I’d like to suggest a farm, stall, shop, market or butcher.',
      '',
      'Name:',
      'Suburb, state and postcode:',
      'What it sells:',
      'Website or where I found it:',
      'Do you own or run it (yes or no):',
      '',
    ].join('\n'),
  );
}

/** "Own a farm, stall, market or butcher shop? List it or claim it" email, for a place that is not in the app yet. */
export function listMailto(to: string): string | null {
  return mailtoUrl(
    to,
    'Farm Direct: list or claim my place',
    [
      'Hi Farm Direct,',
      '',
      'I own or run a farm, stall, market or butcher shop and would like it listed, or to claim it if it is already in the app.',
      '',
      'Name of the place:',
      'Address or suburb:',
      'What you sell:',
      'Opening hours:',
      'Phone or website you are happy to have shown:',
      'Best way to reach me:',
      '',
    ].join('\n'),
  );
}

/**
 * The version shown on the About tab and put in the "Contact us" email: "1.0.0 (12)" when the build number
 * is known, "1.0.0" when it isn't, and "" with no version.
 */
export function versionLabel(version?: string | null, buildNumber?: string | null): string {
  const v = version?.trim() ?? '';
  if (!v) return '';
  const build = buildNumber?.trim();
  return build ? `${v} (${build})` : v;
}

/** "Contact us" email. The app version (see `versionLabel`) helps us look into problems. */
export function contactMailto(to: string, appVersion?: string): string | null {
  return mailtoUrl(
    to,
    'Farm Direct: hello',
    ['Hi Farm Direct,', '', '', '', appVersion ? `App version: ${appVersion}` : ''].join('\n').trimEnd() + '\n',
  );
}
