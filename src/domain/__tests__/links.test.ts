import { directionsUrl, telUrl, websiteUrl } from '../links';

describe('directionsUrl', () => {
  it('builds an Apple Maps driving link with an encoded name', () => {
    expect(directionsUrl({ name: 'Sample Downs Pork & Poultry', lat: -27.5598, lng: 151.9507 })).toBe(
      'http://maps.apple.com/?daddr=-27.5598,151.9507&q=Sample%20Downs%20Pork%20%26%20Poultry&dirflg=d',
    );
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
