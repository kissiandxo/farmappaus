/** Explicit dates published by organisers or regional authorities. Local dates are never extrapolated. */
export interface MarketCalendar {
  source: string;
  publisher: string;
  opens: string;
  closes: string;
  dates: string[];
  specials?: Record<string, string>;
}

export const MARKET_CALENDARS: Readonly<Partial<Record<string, MarketCalendar>>> = {
  'real-nsw-bellingen-growers-market': {
    publisher: 'NSW Government',
    source: 'https://www.nsw.gov.au/visiting-and-exploring-nsw/nsw-events/bellingen-growers-market',
    opens: '07:30', closes: '11:30',
    dates: [
      '2026-11-28', '2026-12-05', '2026-12-12', '2026-12-26',
      '2027-01-02', '2027-01-09', '2027-01-23', '2027-01-30',
      '2027-02-06', '2027-02-13', '2027-02-27',
      '2027-03-06', '2027-03-13', '2027-03-27',
      '2027-04-03', '2027-04-10', '2027-04-24',
      '2027-05-01', '2027-05-08', '2027-05-22', '2027-05-29',
      '2027-06-05', '2027-06-12', '2027-06-26',
    ],
  },
  'real-wa-mundaring-garden-and-farmers-market': {
    publisher: 'Shire of Mundaring',
    source: 'https://www.mundaring.wa.gov.au/events/mundaring-garden-and-farmers-market/1135',
    opens: '08:00', closes: '12:00',
    dates: ['2026-11-28', '2026-12-05', '2026-12-12', '2026-12-19'],
  },
  'real-tas-bream-creek-farmers-market': {
    publisher: 'Bream Creek Farmers Market',
    source: 'https://breamcreekfarmersmarket.com.au/market-dates/',
    opens: '09:00', closes: '13:00',
    dates: ['2026-12-06'],
    specials: { '2026-12-06': 'Christmas Special Market' },
  },
  'real-nsw-orange-farmers-market': {
    publisher: 'Orange360',
    source: 'https://www.orange360.com.au/Things-to-do/Shopping-Markets/Local-Produce-Markets-Stores/View/64de0c078c8194677f9e2dd6/Orange-Farmers-Market',
    opens: '08:30', closes: '12:00',
    // May uses a different venue. This set ends before that change.
    dates: ['2026-12-12', '2027-01-09', '2027-02-13', '2027-03-13', '2027-04-10'],
  },
};
