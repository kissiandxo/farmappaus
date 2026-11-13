import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { PRIVACY_SECTIONS, privacyMarkdown } from '../privacy';

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
});
