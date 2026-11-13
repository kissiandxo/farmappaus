import { claimMailto, contactMailto, listMailto, reportMailto, suggestMailto, versionLabel, type PlaceRef } from '../support';

const place: PlaceRef = { id: 'real-12', name: 'Coburg Farmers Market', locality: 'Coburg', state: 'VIC', postcode: '3058' };
const TO = 'hello@example.com';

/** Splits a mailto link back into its decoded subject and body. */
function parse(url: string | null) {
  expect(url).not.toBeNull();
  const [head, query = ''] = (url as string).split('?');
  const params = new URLSearchParams(query);
  return { to: head.replace('mailto:', ''), subject: params.get('subject') ?? '', body: params.get('body') ?? '' };
}

describe('support emails', () => {
  it('report names the place and its id', () => {
    const mail = parse(reportMailto(TO, place));
    expect(mail.to).toBe(TO);
    expect(mail.subject).toBe('Farm Direct: problem with Coburg Farmers Market');
    expect(mail.body).toContain('Place: Coburg Farmers Market');
    expect(mail.body).toContain('Location: Coburg VIC 3058');
    expect(mail.body).toContain('Listing ID: real-12');
  });

  it('claim names the place and its id', () => {
    const mail = parse(claimMailto(TO, place));
    expect(mail.subject).toBe('Farm Direct: claim or update Coburg Farmers Market');
    expect(mail.body).toContain('Listing ID: real-12');
    expect(mail.body).toContain('Best phone number:');
  });

  it('copes with a place that has no postcode', () => {
    const mail = parse(reportMailto(TO, { ...place, postcode: '' }));
    expect(mail.body).toContain('Location: Coburg VIC\n');
  });

  it('suggest, list and contact are pre-filled with a short template', () => {
    expect(parse(suggestMailto(TO)).subject).toBe('Farm Direct: suggest a place');
    expect(parse(suggestMailto(TO)).body).toContain('Suburb, state and postcode:');
    expect(parse(listMailto(TO)).subject).toBe('Farm Direct: list or claim my place');
    expect(parse(listMailto(TO)).body).toContain('Opening hours:');
    expect(parse(contactMailto(TO)).subject).toBe('Farm Direct: hello');
  });

  it('contact adds the app version when given', () => {
    expect(parse(contactMailto(TO, '1.0.0')).body).toContain('App version: 1.0.0');
    expect(parse(contactMailto(TO)).body).not.toContain('App version');
  });

  it('contact carries the version with its build number, as shown on the About tab', () => {
    expect(parse(contactMailto(TO, versionLabel('1.0.0', '12'))).body).toContain('App version: 1.0.0 (12)');
  });

  it('every builder returns null without a support address', () => {
    for (const to of ['', '  ']) {
      expect(reportMailto(to, place)).toBeNull();
      expect(claimMailto(to, place)).toBeNull();
      expect(suggestMailto(to)).toBeNull();
      expect(listMailto(to)).toBeNull();
      expect(contactMailto(to, '1.0.0')).toBeNull();
    }
  });

  it('a place name with symbols stays intact after encoding', () => {
    const mail = parse(reportMailto(TO, { ...place, name: 'Fred & Sons’ “Honey” 100%' }));
    expect(mail.body).toContain('Place: Fred & Sons’ “Honey” 100%');
  });
});

describe('versionLabel', () => {
  it('adds the build number in brackets when there is one', () => {
    expect(versionLabel('1.0.0', '12')).toBe('1.0.0 (12)');
  });

  it('shows the version alone without a build number', () => {
    expect(versionLabel('1.0.0')).toBe('1.0.0');
    expect(versionLabel('1.0.0', null)).toBe('1.0.0');
    expect(versionLabel('1.0.0', '  ')).toBe('1.0.0');
  });

  it('is empty without a version', () => {
    expect(versionLabel(undefined, '12')).toBe('');
    expect(versionLabel('', '12')).toBe('');
    expect(versionLabel(null)).toBe('');
  });
});
