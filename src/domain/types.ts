export type StateCode = 'NSW' | 'VIC' | 'QLD' | 'SA' | 'WA' | 'TAS' | 'NT' | 'ACT';

export const STATE_NAMES: Record<StateCode, string> = {
  NSW: 'New South Wales',
  VIC: 'Victoria',
  QLD: 'Queensland',
  SA: 'South Australia',
  WA: 'Western Australia',
  TAS: 'Tasmania',
  NT: 'Northern Territory',
  ACT: 'Australian Capital Territory',
};

export type VenueType = 'farm' | 'farm_gate_stall' | 'farm_shop' | 'farmers_market';

export const VENUE_LABELS: Record<VenueType, string> = {
  farm: 'Farm',
  farm_gate_stall: 'Farm-gate stall',
  farm_shop: 'Farm shop',
  farmers_market: "Farmers' market",
};

export type ProductCategory =
  | 'milk'
  | 'eggs'
  | 'chicken'
  | 'beef'
  | 'lamb'
  | 'pork'
  | 'honey'
  | 'fruit'
  | 'veg';

export const PRODUCT_CATEGORIES: ProductCategory[] = [
  'milk',
  'eggs',
  'chicken',
  'beef',
  'lamb',
  'pork',
  'honey',
  'fruit',
  'veg',
];

export const PRODUCT_LABELS: Record<ProductCategory, string> = {
  milk: 'Milk',
  eggs: 'Eggs',
  chicken: 'Chicken',
  beef: 'Beef',
  lamb: 'Lamb',
  pork: 'Pork',
  honey: 'Honey',
  fruit: 'Fruit',
  veg: 'Vegetables',
};

export type FarmTag = 'free_range' | 'grass_fed' | 'organic' | 'pasture_raised' | 'spray_free';

export const FARM_TAGS: FarmTag[] = [
  'free_range',
  'grass_fed',
  'organic',
  'pasture_raised',
  'spray_free',
];

export const TAG_LABELS: Record<FarmTag, string> = {
  free_range: 'Free-range',
  grass_fed: 'Grass-fed',
  organic: 'Organic',
  pasture_raised: 'Pasture-raised',
  spray_free: 'Spray-free',
};

export type DayKey = 'sun' | 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat';

/** [open, close] as 24-hour "HH:mm" in the farm's local time. */
export type TimeRange = readonly [string, string];

export type OpeningHours =
  | {
      kind: 'weekly';
      days: Partial<Record<DayKey, TimeRange[]>>;
      note?: string;
      /**
       * True when the pattern is not plainly "every week" (monthly, seasonal, fortnightly), or the
       * times are not published. The status label then reads "Check dates" instead of "Open now".
       */
      irregular?: boolean;
    }
  | { kind: 'always'; note?: string }
  | { kind: 'appointment'; note?: string };

export type Fulfilment = 'pickup' | 'delivery';
export type PaymentType = 'cash' | 'card' | 'bank_transfer' | 'honesty_box';

export const FULFILMENT_LABELS: Record<Fulfilment, string> = {
  pickup: 'Pick-up from the farm or stall',
  delivery: 'Local delivery',
};

export const PAYMENT_LABELS: Record<PaymentType, string> = {
  cash: 'Cash',
  card: 'Card',
  bank_transfer: 'Bank transfer',
  honesty_box: 'Honesty box (cash)',
};

export const LICENCE_LABELS: Record<LicenceCategory, string> = {
  dairy: 'Dairy',
  eggs: 'Eggs',
  meat: 'Meat',
  poultry: 'Poultry',
  other: 'Other',
};

export interface Product {
  /** Database id; absent for products not saved yet. */
  id?: string;
  category: ProductCategory;
  name: string;
  /** Price in Australian cents (AUD). */
  priceCents?: number;
  /** e.g. "dozen", "kg", "1 L". */
  unit?: string;
  inStock: boolean;
  /** Required to be true for milk. Raw milk cannot be listed. */
  pasteurised?: boolean;
}

export type LicenceCategory = 'dairy' | 'eggs' | 'meat' | 'poultry' | 'other';

export type ListingStatus = 'draft' | 'pending' | 'live' | 'rejected';

export interface Licence {
  /** Database id; absent for licences not saved yet. */
  id?: string;
  category: LicenceCategory;
  regulator: string;
  licenceNumber: string;
  /** ISO date, YYYY-MM-DD. */
  expiresOn?: string;
  status: 'self_declared' | 'admin_checked';
}

export interface Farm {
  id: string;
  name: string;
  type: VenueType;
  state: StateCode;
  locality: string;
  postcode: string;
  lat: number;
  lng: number;
  story: string;
  /** Public image URLs (Supabase Storage). Empty/absent for sample data. */
  photos?: string[];
  products: Product[];
  tags: FarmTag[];
  hours: OpeningHours;
  fulfilment: Fulfilment[];
  paymentTypes: PaymentType[];
  licences: Licence[];
  phone?: string;
  website?: string;
  /** True for placeholder data. Never shown as a real farm. */
  isSample: boolean;
  /** ISO date, YYYY-MM-DD. */
  updatedOn: string;
  /** Review state. Public lists only ever contain "live"; owners and admins see the rest. */
  status?: ListingStatus;
  ownerId?: string | null;
  /** Message from the reviewer when changes were requested or the listing was rejected. */
  reviewNote?: string | null;
  /** Street address or venue as published by the source. Optional; not stored in the database. */
  address?: string;
  /** True for places taken from public sources that no owner has claimed or confirmed yet. */
  unclaimed?: boolean;
  /** True when lat/lng is the locality centre rather than the exact spot. */
  locationApprox?: boolean;
  /** Public web pages the details came from. */
  sources?: string[];
  /** Other things sold there, in the source's words (not itemised as products). */
  otherProducts?: string;
}
