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
    for (const topic of ['location', 'account', 'list your farm', 'claim', 'kept', 'share', 'choices', 'contact']) {
      expect(titles).toContain(topic);
    }
  });

  it('makes the promises the app actually keeps', () => {
    const text = PRIVACY_SECTIONS.flatMap((s) => s.paragraphs).join(' ');
    expect(text).toMatch(/not sent to our servers/);
    expect(text).toMatch(/Delete my account/);
    expect(text).toMatch(/do not sell your information/);
  });
});
