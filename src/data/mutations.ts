import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';

import type { Farm, ProductCategory, StateCode, VenueType } from '../domain/types';
import { supabase } from '../lib/supabase';
import {
  farmToRow,
  groupFarms,
  licenceToRow,
  productToRow,
  type FarmRow,
  type LicenceRow,
  type ProductRow,
} from './mappers';

function client() {
  if (!supabase) throw new Error('Backend is not configured');
  return supabase;
}

/** Throws the database error (its message is turned into plain English by friendlyDbError). */
function check<T>(result: { data: T; error: { message: string } | null }): T {
  if (result.error) throw new Error(result.error.message);
  return result.data;
}

// ------------------------------------------------------------------ reading
async function loadChildren(farmIds: string[]) {
  if (farmIds.length === 0) return { products: [] as ProductRow[], licences: [] as LicenceRow[] };
  const db = client();
  const [products, licences] = await Promise.all([
    db.from('products').select('*').in('farm_id', farmIds).order('created_at'),
    db.from('licences').select('*').in('farm_id', farmIds).order('created_at'),
  ]);
  return { products: check(products) as ProductRow[], licences: check(licences) as LicenceRow[] };
}

/** One listing by id, whatever its status (only works for the owner, an admin, or if it is live). */
export async function fetchFarmById(id: string): Promise<Farm | null> {
  const row = check(await client().from('farms').select('*').eq('id', id).maybeSingle()) as FarmRow | null;
  if (!row) return null;
  const { products, licences } = await loadChildren([id]);
  return groupFarms([row], products, licences)[0];
}

export async function fetchMyFarms(userId: string): Promise<Farm[]> {
  const rows = check(
    await client().from('farms').select('*').eq('owner_id', userId).order('created_at', { ascending: false }),
  ) as FarmRow[];
  const { products, licences } = await loadChildren(rows.map((r) => r.id));
  return groupFarms(rows, products, licences);
}

// ------------------------------------------------------------------ farmer writes
/** Saves a listing and its products and licences. Returns the listing id. */
export async function saveFarm(farm: Farm, ownerId: string): Promise<string> {
  const db = client();
  let id = farm.id;
  if (id) {
    check(await db.from('farms').update(farmToRow(farm)).eq('id', id));
  } else {
    const created = check(
      await db.from('farms').insert({ ...farmToRow(farm), owner_id: ownerId }).select('id').single(),
    ) as { id: string };
    id = created.id;
  }

  const existing = check(await db.from('products').select('id').eq('farm_id', id)) as { id: string }[];
  const keepProducts = new Set(farm.products.map((p) => p.id).filter(Boolean));
  for (const row of existing) {
    if (!keepProducts.has(row.id)) check(await db.from('products').delete().eq('id', row.id));
  }
  for (const product of farm.products) {
    if (product.id) check(await db.from('products').update(productToRow(product, id)).eq('id', product.id));
    else check(await db.from('products').insert(productToRow(product, id)));
  }

  const existingLicences = check(await db.from('licences').select('id').eq('farm_id', id)) as { id: string }[];
  const keepLicences = new Set(farm.licences.map((l) => l.id).filter(Boolean));
  for (const row of existingLicences) {
    if (!keepLicences.has(row.id)) check(await db.from('licences').delete().eq('id', row.id));
  }
  for (const licence of farm.licences) {
    if (licence.id) check(await db.from('licences').update(licenceToRow(licence, id)).eq('id', licence.id));
    else check(await db.from('licences').insert(licenceToRow(licence, id)));
  }
  return id;
}

export async function submitForReview(farmId: string): Promise<void> {
  check(await client().from('farms').update({ status: 'pending' }).eq('id', farmId));
}

export async function deleteFarm(farmId: string): Promise<void> {
  check(await client().from('farms').delete().eq('id', farmId));
}

export async function setProductStock(productId: string, inStock: boolean): Promise<void> {
  check(await client().from('products').update({ in_stock: inStock }).eq('id', productId));
}

export async function setProductPrice(productId: string, priceCents: number | null): Promise<void> {
  check(await client().from('products').update({ price_cents: priceCents }).eq('id', productId));
}

/**
 * Shrinks a photo to a 1600 px wide JPEG (small enough for patchy reception, and always a format
 * browsers can show, even if the phone gave us HEIC), uploads it, and returns its public URL.
 */
export async function uploadFarmPhoto(farmId: string, localUri: string): Promise<string> {
  const db = client();
  const rendered = await ImageManipulator.manipulate(localUri).resize({ width: 1600 }).renderAsync();
  const jpeg = await rendered.saveAsync({ format: SaveFormat.JPEG, compress: 0.7 });
  const bytes = await (await fetch(jpeg.uri)).arrayBuffer();
  const path = `${farmId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.jpg`;
  const upload = await db.storage.from('farm-photos').upload(path, bytes, { contentType: 'image/jpeg' });
  if (upload.error) throw new Error(upload.error.message);
  return db.storage.from('farm-photos').getPublicUrl(path).data.publicUrl;
}

// ------------------------------------------------------------------ everyone
export async function submitClaim(input: { farmId: string; userId: string; abn: string; phone: string; note: string }) {
  check(
    await client().from('claims').insert({
      farm_id: input.farmId,
      user_id: input.userId,
      abn: input.abn.replace(/\s/g, ''),
      phone: input.phone,
      note: input.note.trim(),
    }),
  );
}

export async function submitReport(input: { farmId: string; userId: string; reason: string }) {
  check(await client().from('reports').insert({ farm_id: input.farmId, user_id: input.userId, reason: input.reason.trim() }));
}

export interface SuggestionInput {
  userId: string;
  name: string;
  venueType: VenueType;
  state: StateCode;
  locality: string;
  postcode: string;
  lat: number;
  lng: number;
  products: ProductCategory[];
  notes: string;
}

export async function submitSuggestion(input: SuggestionInput) {
  check(
    await client().from('suggestions').insert({
      user_id: input.userId,
      name: input.name.trim(),
      venue_type: input.venueType,
      state: input.state,
      locality: input.locality,
      postcode: input.postcode,
      lat: input.lat,
      lng: input.lng,
      products: input.products,
      notes: input.notes.trim(),
    }),
  );
}

// ------------------------------------------------------------------ admin
export interface ClaimItem {
  id: string;
  farm_id: string;
  abn: string;
  phone: string;
  note: string;
  created_at: string;
  farms: { name: string; locality: string; state: string } | null;
}

export interface SuggestionItem {
  id: string;
  name: string;
  venue_type: VenueType;
  state: StateCode;
  locality: string;
  postcode: string;
  products: ProductCategory[];
  notes: string;
  created_at: string;
}

export interface ReviewQueue {
  farms: Farm[];
  claims: ClaimItem[];
  suggestions: SuggestionItem[];
}

export async function fetchReviewQueue(): Promise<ReviewQueue> {
  const db = client();
  const [farms, claims, suggestions] = await Promise.all([
    db.from('farms').select('*').eq('status', 'pending').order('updated_at'),
    db.from('claims').select('*, farms(name, locality, state)').eq('status', 'pending').order('created_at'),
    db.from('suggestions').select('*').eq('status', 'pending').order('created_at'),
  ]);
  const farmRows = check(farms) as FarmRow[];
  const { products, licences } = await loadChildren(farmRows.map((r) => r.id));
  return {
    farms: groupFarms(farmRows, products, licences),
    claims: check(claims) as ClaimItem[],
    suggestions: check(suggestions) as SuggestionItem[],
  };
}

export async function reviewFarm(farmId: string, decision: 'approve' | 'reject' | 'request_changes', note?: string) {
  check(await client().rpc('review_farm', { p_farm: farmId, p_decision: decision, p_note: note?.trim() || null }));
}

export async function reviewClaim(claimId: string, approve: boolean) {
  check(await client().rpc('review_claim', { p_claim: claimId, p_approve: approve }));
}

export async function convertSuggestion(id: string): Promise<string> {
  return check(await client().rpc('convert_suggestion', { p_id: id })) as string;
}

export async function rejectSuggestion(id: string) {
  check(await client().from('suggestions').update({ status: 'rejected' }).eq('id', id));
}

export async function setLicenceChecked(licenceId: string, checked: boolean) {
  check(await client().rpc('set_licence_checked', { p_licence: licenceId, p_checked: checked }));
}
