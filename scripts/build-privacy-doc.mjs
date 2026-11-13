// Regenerates docs/PRIVACY.md from src/content/privacy.ts. Usage: npm run build:privacy
// Uses Node's built-in TypeScript type stripping, so privacy.ts must stay free of imports and enums.
// The support address and operator name come from EXPO_PUBLIC_SUPPORT_EMAIL and EXPO_PUBLIC_OPERATOR_NAME
// when set; otherwise the document says "(to be added before publishing)". The copy committed to the repo is
// built without them (the drift test in src/content/__tests__/privacy.test.ts checks that copy).
import { writeFileSync } from 'node:fs';

const { privacyMarkdown, PRIVACY_PLACEHOLDER } = await import('../src/content/privacy.ts');
const email = (process.env.EXPO_PUBLIC_SUPPORT_EMAIL ?? '').trim();
const operator = (process.env.EXPO_PUBLIC_OPERATOR_NAME ?? '').trim();
writeFileSync(new URL('../docs/PRIVACY.md', import.meta.url), privacyMarkdown({ email, operator }));
console.log(`Wrote docs/PRIVACY.md (support email: ${email || PRIVACY_PLACEHOLDER}; operator: ${operator || PRIVACY_PLACEHOLDER})`);
