import { shareStops, shareText } from '../share';
import { makeFarm } from './fixtures';

describe('shareText', () => {
  const farm = makeFarm({
    name: 'Bilpin Growers Market',
    type: 'farmers_market',
    locality: 'Bilpin',
    state: 'NSW',
    postcode: '2758',
    lat: -33.5,
    lng: 150.52,
    address: 'Bilpin District Hall, Bells Line of Road',
    website: 'bilpinmarket.com.au',
    hours: { kind: 'weekly', days: { sat: [['08:00', '12:00']] } },
  });

  it('lists the name, type and suburb, address, website and a Maps link in order', () => {
    expect(shareText(farm).split('\n')).toEqual([
      'Bilpin Growers Market',
      "Farmers' market · Bilpin NSW 2758",
      'Bilpin District Hall, Bells Line of Road',
      'https://bilpinmarket.com.au/',
      'http://maps.apple.com/?q=Bilpin%20Growers%20Market&ll=-33.5,150.52',
    ]);
  });

  it('leaves out a missing address', () => {
    const lines = shareText({ ...farm, address: undefined }).split('\n');
    expect(lines).toHaveLength(4);
    expect(lines[2]).toBe('https://bilpinmarket.com.au/');
  });

  it('leaves out a missing or unusable website', () => {
    expect(shareText({ ...farm, website: undefined }).split('\n')).toHaveLength(4);
    expect(shareText({ ...farm, website: 'javascript:alert(1)' })).not.toContain('javascript');
  });

  it('never mentions opening times or app links', () => {
    const text = shareText(farm).toLowerCase();
    expect(text).not.toContain('open');
    expect(text).not.toContain('farmdirect://');
    expect(text).not.toMatch(/\d:\d\d [ap]m/);
  });

  it('does not pin an approximate place at the suburb centre', () => {
    const text = shareText({ ...farm, locationApprox: true });
    expect(text).not.toContain('ll=');
    expect(text.split('\n').pop()).toBe(
      `http://maps.apple.com/?q=${encodeURIComponent('Bilpin District Hall, Bells Line of Road, Bilpin NSW 2758')}`,
    );
  });
});

it('shares saved stops in display order with addresses and a Maps link for each', () => {
  const farms = [makeFarm({ name: 'Shop A', address: '14 High St' }), makeFarm({ name: 'Market B' })];
  const message = shareStops(farms, true);
  expect(message).toMatch(/^My weekend food stops\n\n1\. Shop A\n14 High St, Testville, NSW/);
  expect(message).toContain('2. Market B\nTestville, NSW');
  expect(message.match(/maps\.apple\.com/g)).toHaveLength(2);
  expect(shareStops(farms.slice(0, 1), false)).not.toContain('Market B');
});
