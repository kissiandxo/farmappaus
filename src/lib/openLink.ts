import { Alert, Linking, Share } from 'react-native';

/** Opens an external link (web page, phone, email, Maps); shows an alert instead of an unhandled rejection if nothing can open it. */
export async function openLink(url: string): Promise<void> {
  try {
    await Linking.openURL(url);
  } catch {
    Alert.alert('Couldn’t open that', 'Check that the app for this link is installed, then try again.');
  }
}

/** Shown when an email can't be opened: the address itself, and a share sheet (which offers Copy) so it is never a dead end. */
function showEmailFallback(address: string): void {
  Alert.alert('No email app set up', `Email us at ${address}`, [
    {
      text: 'Share address',
      onPress: () => {
        Share.share({ message: address }).catch(() => {});
      },
    },
    { text: 'OK', style: 'cancel' },
  ]);
}

/**
 * Opens a pre-filled email (a `mailto:` link from src/domain/support.ts). If there is no link, or no app opens
 * it (for example no email account is set up, or the simulator), shows "No email app set up" with the address
 * and a "Share address" button instead. Never throws.
 *
 * It does not ask `Linking.canOpenURL('mailto:')` first: iOS answers false for schemes that are not listed in
 * the app's LSApplicationQueriesSchemes, which would hide the email composer from everyone. A rejected
 * `openURL` is the reliable signal.
 */
export async function openEmail(url: string | null, address: string): Promise<void> {
  if (!url) {
    showEmailFallback(address);
    return;
  }
  try {
    await Linking.openURL(url);
  } catch {
    showEmailFallback(address);
  }
}

/** The app's URL scheme (app.json `scheme`). */
const APP_SCHEME = 'farmdirect';
const URL_PATTERN = /^([a-z][a-z0-9+.-]*):\/\/(.*)$/i;

/**
 * The in-app path a launch URL points at, without leading or trailing slashes, query or fragment: "farm/abc" for
 * `farmdirect://farm/abc` or a development `exp://host:8081/--/farm/abc`. Returns "" for the app's root, for
 * no URL, and for URLs that only open the app (such as the development client's own launch link).
 */
export function deepLinkPath(url: string | null | undefined): string {
  const match = (url?.trim() ?? '').match(URL_PATTERN);
  if (!match) return '';
  const [, scheme, rest] = match;
  let path: string;
  if (scheme.toLowerCase() === APP_SCHEME) {
    // Custom schemes have no host: "farmdirect://farm/abc" is the route farm/abc.
    path = rest;
  } else {
    // Expo Go and dev servers put the route after "/--/".
    const marker = rest.indexOf('/--/');
    if (marker < 0) return '';
    path = rest.slice(marker + 4);
  }
  return path.split(/[?#]/)[0].replace(/^\/+|\/+$/g, '');
}
