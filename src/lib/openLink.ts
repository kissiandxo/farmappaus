import { Alert, Linking } from 'react-native';

/** Opens an external link (web page, phone, email, Maps); shows an alert instead of an unhandled rejection if nothing can open it. */
export async function openLink(url: string): Promise<void> {
  try {
    await Linking.openURL(url);
  } catch {
    Alert.alert('Couldn’t open that', 'Check that the app for this link is installed, then try again.');
  }
}
