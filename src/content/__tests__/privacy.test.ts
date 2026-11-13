import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { PRIVACY_PLACEHOLDER, PRIVACY_SECTIONS, privacyMarkdown, privacySections } from '../privacy';

describe('privacy policy', () => {
  it('keeps docs/PRIVACY.md identical to the text shown in the app', () => {
    const doc = readFileSync(join(__dirname, '../../../docs/PRIVACY.md'), 'utf8');
    expect(doc).toBe(privacyMarkdown());
  });

  it('covers location, accounts, listings, claims, storage, sharing, deletion and contact', () => {
    const titles = PRIVACY_SECTIONS.map((s) => s.title.toLowerCase()).join(' | ');
    for (const topic of ['location', 'account', 'apple', 'list your farm', 'claim', 'kept', 'share', 'choices', 'contact']) {
      expect(titles).toContain(topic);
    }
  });

  it('makes the promises the app actually keeps', () => {
    const text = PRIVACY_SECTIONS.flatMap((s) => s.paragraphs).join(' ');
    expect(text).toMatch(/not sent to our servers/);
    expect(text).toMatch(/Delete my account/);
    expect(text).toMatch(/Remove from this iPhone/);
    expect(text).toMatch(/do not keep Apple’s sign-in token/);
    expect(text).toMatch(/do not sell your information/);
  });

  it('says plainly that version 1.0 has no accounts and sends nothing to Farm Direct', () => {
    const first = PRIVACY_SECTIONS.find((s) => /no accounts/i.test(s.title));
    expect(first).toBeDefined();
    const text = first!.paragraphs.join(' ');
    expect(text).toMatch(/no accounts and no sign-in/);
    expect(text).toMatch(/Nothing you do in the app is sent to Farm Direct/);
    expect(text).toMatch(/ordinary email/);
    expect(text).toMatch(/public sources/);
  });

  it('covers Apple Maps and the OpenStreetMap credit', () => {
    const text = PRIVACY_SECTIONS.flatMap((s) => s.paragraphs).join(' ');
    expect(text).toMatch(/Apple Maps, which is Apple’s service/);
    expect(text).toMatch(/© OpenStreetMap contributors/);
  });

  it('marks every account-only section so it is clear it does not apply to 1.0', () => {
    const accountOnly = PRIVACY_SECTIONS.filter((s) => /only when accounts are available/.test(s.title));
    const titles = accountOnly.map((s) => s.title.toLowerCase()).join(' | ');
    for (const topic of ['create an account', 'sign in with apple', 'list your farm', 'claim a listing', 'kept']) {
      expect(titles).toContain(topic);
    }
    // Sections that apply to both modes are not marked.
    for (const s of PRIVACY_SECTIONS.filter((x) => /location|maps|children|contact|choices|share/i.test(x.title))) {
      expect(s.title).not.toMatch(/only when accounts/);
    }
  });

  it('flags exactly the sections whose title says they need accounts', () => {
    for (const s of PRIVACY_SECTIONS) {
      expect(!!s.accountsOnly).toBe(/only when accounts are available/.test(s.title));
    }
  });

  it('without accounts, hides the account-only sections and the note pointing at them', () => {
    const sections = privacySections({ accounts: false });
    expect(sections.some((s) => s.accountsOnly)).toBe(false);
    const text = sections.flatMap((s) => s.paragraphs).join(' ');
    expect(text).not.toMatch(/only when accounts are available/);
    expect(text).not.toMatch(/Supabase/);
    expect(text).not.toMatch(/Delete my account/);
    // What 1.0 does is still all there.
    expect(text).toMatch(/no accounts and no sign-in/);
    expect(text).toMatch(/Remove from this iPhone/);
    expect(text).toMatch(/Apple’s geocoding service/);
    expect(text).toMatch(/do not sell your information/);
  });

  it('says only what 1.0 uses, with no mention of Expo updates', () => {
    const text = PRIVACY_SECTIONS.flatMap((s) => s.paragraphs).join(' ');
    expect(text).toMatch(/Farm Direct 1\.0 uses Apple \(the App Store, TestFlight and Apple Maps\)\./);
    expect(text).not.toMatch(/Expo/);
    expect(text).toMatch(/If you tried a test version that let you sign in with Apple/);
    expect(text).not.toMatch(/signed in with Apple in an earlier version/);
  });

  it('explains location: on the phone, only while open, Apple geocoding as the fallback, saved places local', () => {
    const location = PRIVACY_SECTIONS.find((s) => s.title === 'Your location')!;
    const text = location.paragraphs.join(' ');
    expect(text).toMatch(/only while the app is open/);
    expect(text).toMatch(/not sent to our servers/);
    expect(text).toMatch(/Apple’s geocoding service/);
    expect(PRIVACY_SECTIONS.flatMap((s) => s.paragraphs).join(' ')).toMatch(/places you save.*kept on your phone only/);
  });

  it('puts the support address in "Contact us" when it is set', () => {
    const contact = (opts?: { email?: string }) => privacySections(opts).find((s) => s.title === 'Contact us')!.paragraphs.join(' ');
    expect(contact({ email: 'hello@example.com' })).toBe('Email us at hello@example.com, or use “Contact us” on the About tab.');
    // Without an address the About tab has no "Contact us" row, so the policy must not point at it.
    expect(contact()).toBe('Use the support link on the Farm Direct page in the App Store.');
    expect(contact({ email: '  ' })).not.toMatch(/About tab/);
    expect(privacySections({ accounts: false }).find((s) => s.title === 'Contact us')!.paragraphs.join(' ')).not.toMatch(/About tab/);
    expect(contact({ email: 'a@b.au' })).toContain('a@b.au');
  });

  it('leaves out the Sign in with Apple test-build section when there is no such profile', () => {
    const text = privacySections({ accounts: false, legacyAppleProfile: false }).flatMap((s) => s.paragraphs).join(' ');
    expect(text).not.toMatch(/Sign in with Apple|Remove from this iPhone/);
    const withProfile = privacySections({ accounts: false, legacyAppleProfile: true }).flatMap((s) => s.paragraphs).join(' ');
    expect(withProfile).toContain('Remove from this iPhone');
  });

  it('shows "Who we are" only when the operator is known', () => {
    expect(privacySections().some((s) => s.title === 'Who we are')).toBe(false);
    const who = privacySections({ operator: 'Example Pty Ltd' }).find((s) => s.title === 'Who we are');
    expect(who?.paragraphs.join(' ')).toMatch(/run by Example Pty Ltd/);
  });

  it('writes placeholders into the Markdown until the address and operator are supplied, with no draft banner', () => {
    const md = privacyMarkdown();
    expect(md).toContain(`Email us at ${PRIVACY_PLACEHOLDER}`);
    expect(md).toContain(`## Who we are\n\nFarm Direct is run by ${PRIVACY_PLACEHOLDER}.`);
    expect(md).not.toMatch(/^> /m);
    const filled = privacyMarkdown({ email: 'hello@example.com', operator: 'Example Pty Ltd' });
    expect(filled).toContain('Email us at hello@example.com');
    expect(filled).toContain('Farm Direct is run by Example Pty Ltd.');
    expect(filled).not.toContain(PRIVACY_PLACEHOLDER);
  });
});
