import { readFile, writeFile } from 'node:fs/promises';

const source = new URL('../src/data/realListings.json', import.meta.url);
const target = new URL('../website/places.json', import.meta.url);
const listings = JSON.parse(await readFile(source, 'utf8'));
const places = listings.map(({ name, type, locality, state, postcode, address, description, products, hoursAsStated, website, sources, researchedOn }) => ({
  name, type, locality, state, postcode, address, description, products,
  hours: hoursAsStated, source: website || sources[0], checked: researchedOn,
}));
await writeFile(target, JSON.stringify(places) + '\n');
