import { displayName, mergeAppleProfile, parseLocalProfile, shouldShowWelcome, type LocalProfile } from '../onboarding';

const saved: LocalProfile = { appleUserId: 'u1', givenName: 'Sam', familyName: 'Lee', email: 'sam@example.com' };

describe('shouldShowWelcome', () => {
  it('waits until the flag has loaded', () => {
    expect(shouldShowWelcome({ loaded: false, seen: false, signedIn: false })).toBe(false);
  });
  it('shows once on first launch', () => {
    expect(shouldShowWelcome({ loaded: true, seen: false, signedIn: false })).toBe(true);
  });
  it('does not show again after it was seen', () => {
    expect(shouldShowWelcome({ loaded: true, seen: true, signedIn: false })).toBe(false);
  });
  it('does not show to someone already signed in', () => {
    expect(shouldShowWelcome({ loaded: true, seen: false, signedIn: true })).toBe(false);
  });
});

describe('mergeAppleProfile', () => {
  it('creates a profile from the first sign-in', () => {
    expect(mergeAppleProfile(null, { appleUserId: 'u1', givenName: 'Sam', familyName: 'Lee', email: 'a@b.co' })).toEqual({
      appleUserId: 'u1',
      givenName: 'Sam',
      familyName: 'Lee',
      email: 'a@b.co',
    });
  });
  it('never overwrites saved values with null, undefined or blank', () => {
    const merged = mergeAppleProfile(saved, { appleUserId: 'u1', givenName: null, familyName: '  ', email: undefined });
    expect(merged).toEqual(saved);
  });
  it('takes new values when Apple sends them', () => {
    expect(mergeAppleProfile(saved, { appleUserId: 'u1', givenName: 'Samuel' }).givenName).toBe('Samuel');
  });
  it('starts fresh for a different Apple user', () => {
    expect(mergeAppleProfile(saved, { appleUserId: 'u2' })).toEqual({
      appleUserId: 'u2',
      givenName: null,
      familyName: null,
      email: null,
    });
  });
});

describe('parseLocalProfile', () => {
  it('round-trips a saved profile', () => {
    expect(parseLocalProfile(JSON.stringify(saved))).toEqual(saved);
  });
  it('rejects missing, bad or wrongly shaped JSON', () => {
    expect(parseLocalProfile(null)).toBeNull();
    expect(parseLocalProfile('')).toBeNull();
    expect(parseLocalProfile('{not json')).toBeNull();
    expect(parseLocalProfile('42')).toBeNull();
    expect(parseLocalProfile('null')).toBeNull();
    expect(parseLocalProfile('{"givenName":"Sam"}')).toBeNull();
    expect(parseLocalProfile('{"appleUserId":""}')).toBeNull();
    expect(parseLocalProfile('{"appleUserId":7}')).toBeNull();
  });
  it('drops fields of the wrong type', () => {
    expect(parseLocalProfile('{"appleUserId":"u1","givenName":5,"email":"x@y.zz"}')).toEqual({
      appleUserId: 'u1',
      givenName: null,
      familyName: null,
      email: 'x@y.zz',
    });
  });
});

describe('displayName', () => {
  it('uses the full name', () => expect(displayName(saved)).toBe('Sam Lee'));
  it('uses one name part alone', () => expect(displayName({ ...saved, familyName: null })).toBe('Sam'));
  it('falls back to the email', () => expect(displayName({ givenName: null, familyName: null, email: 'a@b.co' })).toBe('a@b.co'));
  it('falls back to a plain label', () => {
    expect(displayName({ givenName: ' ', familyName: null, email: null })).toBe('Apple account');
    expect(displayName(null)).toBe('Apple account');
  });
});
