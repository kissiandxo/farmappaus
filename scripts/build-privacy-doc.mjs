// Regenerates docs/PRIVACY.md from src/content/privacy.ts. Usage: npm run build:privacy
// Uses Node's built-in TypeScript type stripping, so privacy.ts must stay free of imports and enums.
import { writeFileSync } from 'node:fs';

const { privacyMarkdown } = await import('../src/content/privacy.ts');
writeFileSync(new URL('../docs/PRIVACY.md', import.meta.url), privacyMarkdown());
console.log('Wrote docs/PRIVACY.md');
