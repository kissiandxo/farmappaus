import { directionsUrl, hostLabel, mailtoUrl, telUrl, websiteUrl } from '../links';

describe('directionsUrl', () => {
  it('builds an Apple Maps driving link with an encoded name', () => {
    expect(directionsUrl({ name: 'Sample Downs Pork & Poultry', lat: -27.5598, lng: 151.9507 })).toBe(
      'http://maps.apple.com/?daddr=-27.5598,151.9507&q=Sample%20Downs%20Pork%20%26%20Poultry&dirflg=d',
    );
  });
});

describe('directionsUrl with an address', () => {
  it('sends the street address with suburb, state and postcode instead of coordinates', () => {
    const url = directionsUrl({
      name: 'Coburg Farmers Market',
      lat: -37.74,
      lng: 144.97,
      address: 'Coburg Primary School, 92 Bell St',
      locality: 'Coburg',
      state: 'VIC',
      postcode: '3058',
    });
    expect(url).toBe(
      `http://maps.apple.com/?daddr=${encodeURIComponent('Coburg Primary School, 92 Bell St, Coburg VIC 3058')}&dirflg=d`,
    );
    expect(url).not.toContain('-37.74');
  });

  it('drops bracketed asides and falls back to coordinates for a blank address', () => {
    const withAside = directionsUrl({ name: 'X', lat: 1, lng: 2, address: 'Eagle Farm Racecourse (Gate 4), Racecourse Road', locality: 'Ascot', state: 'QLD', postcode: '' });
    expect(decodeURIComponent(withAside)).toContain('daddr=Eagle Farm Racecourse, Racecourse Road, Ascot QLD&');
    expect(directionsUrl({ name: 'X', lat: 1, lng: 2, address: '  ' })).toContain('daddr=1,2');
  });
});

describe('telUrl', () => {
  it('strips spaces and punctuation', () => {
    expect(telUrl('07 4123 4567')).toBe('tel:0741234567');
    expect(telUrl('(02) 9999-0000')).toBe('tel:0299990000');
    expect(telUrl('+61 400 000 000')).toBe('tel:+61400000000');
  });

  it('returns null when there are no digits', () => {
    expect(telUrl('call us')).toBeNull();
    expect(telUrl('')).toBeNull();
  });
});

describe('websiteUrl', () => {
  it('adds https when missing and keeps http(s) links', () => {
    expect(websiteUrl('example.com.au')).toBe('https://example.com.au/');
    expect(websiteUrl('  http://example.com/shop ')).toBe('http://example.com/shop');
    expect(websiteUrl('https://example.com.au/path?x=1')).toBe('https://example.com.au/path?x=1');
  });

  it('rejects unsafe schemes and junk', () => {
    expect(websiteUrl('javascript:alert(1)')).toBeNull();
    expect(websiteUrl('file:///etc/passwd')).toBeNull();
    expect(websiteUrl('tel:0400000000')).toBeNull();
    expect(websiteUrl('not a website')).toBeNull();
    expect(websiteUrl('localhost')).toBeNull();
    expect(websiteUrl('')).toBeNull();
  });
});

describe('hostLabel', () => {
  it('shows just the host name, without www', () => {
    expect(hostLabel('https://www.southsidefarmersmarket.com.au/find-us')).toBe('southsidefarmersmarket.com.au');
    expect(hostLabel('https://mfm.com.au/')).toBe('mfm.com.au');
  });

  it('rejects links that are not web pages', () => {
    expect(hostLabel('javascript:alert(1)')).toBeNull();
    expect(hostLabel('')).toBeNull();
  });
});

describe('mailtoUrl', () => {
  it('encodes the subject and body, with spaces as %20 and line breaks as %0A', () => {
    expect(mailtoUrl('help@example.com', 'Hello & welcome', 'Line one\nLine two')).toBe(
      'mailto:help@example.com?subject=Hello%20%26%20welcome&body=Line%20one%0ALine%20two',
    );
  });

  it('round-trips awkward characters', () => {
    const url = mailtoUrl('a@b.co', 'Fred’s “Farm” 50% off?', 'a=b&c=d #1 é')!;
    const query = new URLSearchParams(url.slice(url.indexOf('?') + 1).replace(/\+/g, '%2B'));
    expect(query.get('subject')).toBe('Fred’s “Farm” 50% off?');
    expect(query.get('body')).toBe('a=b&c=d #1 é');
  });

  it('leaves out blank parts and trims the address', () => {
    expect(mailtoUrl('  help@example.com ')).toBe('mailto:help@example.com');
    expect(mailtoUrl('help@example.com', '', 'Hi')).toBe('mailto:help@example.com?body=Hi');
    expect(mailtoUrl('help@example.com', 'Hi', '')).toBe('mailto:help@example.com?subject=Hi');
  });

  it('keeps the subject on one line', () => {
    expect(mailtoUrl('help@example.com', 'One\r\nBcc: x@y.com')).toBe('mailto:help@example.com?subject=One%20Bcc%3A%20x%40y.com');
  });

  it('returns null for a blank, malformed or multiple address', () => {
    expect(mailtoUrl('')).toBeNull();
    expect(mailtoUrl('   ')).toBeNull();
    expect(mailtoUrl('not an email')).toBeNull();
    expect(mailtoUrl('a@b.co,c@d.co')).toBeNull();
    expect(mailtoUrl('a@b.co?cc=x@y.com')).toBeNull();
    expect(mailtoUrl('a@b')).toBeNull();
  });
});
