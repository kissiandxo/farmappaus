import { Alert, Linking, Share } from 'react-native';

import { deepLinkPath, openEmail } from '../openLink';

describe('deepLinkPath', () => {
  it('reads the route from the app scheme', () => {
    expect(deepLinkPath('farmdirect://farm/real-nsw-carriageworks-farmers-market')).toBe('farm/real-nsw-carriageworks-farmers-market');
    expect(deepLinkPath('farmdirect:///farm/abc/')).toBe('farm/abc');
    expect(deepLinkPath('FarmDirect://farm/abc?utm=x#top')).toBe('farm/abc');
  });

  it('reads the route after /--/ on development URLs', () => {
    expect(deepLinkPath('exp://192.168.1.2:8081/--/farm/abc')).toBe('farm/abc');
    expect(deepLinkPath('exp://192.168.1.2:8081/--/')).toBe('');
  });

  it('is empty for the root, no URL and launch-only URLs', () => {
    for (const url of [null, undefined, '', 'farmdirect://', 'farmdirect:///', 'farmdirect://?x=1', 'exp://192.168.1.2:8081',
      'exp+farm-direct://expo-development-client/?url=http%3A%2F%2F192.168.1.2%3A8081', 'not a url']) {
      expect(deepLinkPath(url)).toBe('');
    }
  });
});

describe('openEmail', () => {
  let alert: jest.SpyInstance;
  let openURL: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    alert = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    openURL = jest.spyOn(Linking, 'openURL');
  });
  afterEach(() => jest.restoreAllMocks());

  it('opens the mail link when an app accepts it', async () => {
    openURL.mockResolvedValue(true);
    await openEmail('mailto:hello@example.com', 'hello@example.com');
    expect(openURL).toHaveBeenCalledWith('mailto:hello@example.com');
    expect(alert).not.toHaveBeenCalled();
  });

  it('shows the address and a share button when no app opens it', async () => {
    openURL.mockRejectedValue(new Error('no handler'));
    const share = jest.spyOn(Share, 'share').mockResolvedValue({ action: 'sharedAction', activityType: undefined });
    await openEmail('mailto:hello@example.com', 'hello@example.com');
    expect(alert).toHaveBeenCalledTimes(1);
    const [title, message, buttons] = alert.mock.calls[0];
    expect(title).toBe('No email app set up');
    expect(message).toBe('Email us at hello@example.com');
    expect(buttons.map((b: { text: string }) => b.text)).toEqual(['Share address', 'OK']);
    buttons[0].onPress();
    expect(share).toHaveBeenCalledWith({ message: 'hello@example.com' });
  });

  it('shows the fallback without a link', async () => {
    await openEmail(null, 'hello@example.com');
    expect(openURL).not.toHaveBeenCalled();
    expect(alert).toHaveBeenCalledWith('No email app set up', 'Email us at hello@example.com', expect.any(Array));
  });
});
