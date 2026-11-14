# Direct-sale food-safety notes (Australia)

> **Not legal advice.** This is a starting point from a desktop review. Rules differ by state/territory, change over time, and some are under review. Each farmer remains responsible for their own compliance, and we should confirm details with each regulator before launch. ✅ = found in official or near-official sources; ⚠️ = verify.

## What the research found

**Raw (unpasteurised) milk** ✅
- Sale of raw milk for human consumption is prohibited across Australia. Dairy products must be pasteurised or equivalent (Food Standards Code Std 4.2.4; enforced by states, e.g. NSW Food Authority, Dairy Food Safety Victoria).
- Victoria permits "not for human consumption" raw milk only from a licensed dairy with approved treatment and labelling. Out of scope for v1.
- **App rule:** milk and dairy listings must declare pasteurised. Raw/"bath"/"cosmetic" milk cannot be listed.
  Sources: [Dairy Food Safety Victoria](https://dairysafe.vic.gov.au/consumers/keeping-dairy-food-safe/is-raw-milk-dangerous), [Std 4.2.4](https://www.legislation.gov.au/F2012L00294/2017-04-13/2017-04-13/text/original/epub/OEBPS/document_1/document_1.html), [NSW Food Authority circular](https://www.foodauthority.nsw.gov.au/sites/default/files/_Documents/circulars/GenCirc-2014-06.pdf).

**Eggs** ✅/⚠️
- National Std 4.2.5 (eggs and egg products) is enforced by states; FSANZ has a review (P1060) in progress.
- Stamping and registration thresholds differ. Found: NSW and Tasmania exempt farm-gate sellers from stamping up to 20 dozen a week (NSW small producers still notify the Food Authority); Victoria exempts under 50 hens; South Australia has its own thresholds ⚠️.
- **App rule:** egg listings capture the state registration/notification number where applicable, and whether eggs are stamped or exempt.
  Sources: [Tasmania egg scheme](https://nre.tas.gov.au/biosecurity-tasmania/product-integrity/food-safety/eggs/egg-food-safety-scheme), [NSW Food Authority](https://www.foodauthority.nsw.gov.au/media/4626), [PIRSA SA](https://pir.sa.gov.au/eggs).

**Meat (beef, lamb, pork, chicken)** ✅/⚠️
- Animals sold for human consumption must be slaughtered and processed at a licensed/registered facility. Farm slaughter is for personal use only.
- Victoria: PrimeSafe licenses meat businesses; pre-packaged retail meat from a licensed facility can be sold at farm gates and farmers' markets (market sales need council notification).
- Other states use their own authorities ⚠️ (e.g. NSW Food Authority, Safe Food Production Queensland, PIRSA, WA DPIRD/Health, Biosecurity Tasmania).
- **App rule:** meat listings must state the licensed facility or licence number that processed the product.
  Sources: [PrimeSafe packaged meat fact sheet](https://www.primesafe.vic.gov.au/wp-content/uploads/2024/03/Packaged-Meat-Fact-Sheet-FINAL.pdf), [PrimeSafe retail licence](https://www.primesafe.vic.gov.au/licensing/about-your-licence/retail-butcher-shop-licence).

**Honey, fruit and vegetables** ⚠️
- Generally lower burden, but Food Standards Code labelling applies to packaged food, and farmers' markets/stalls need council permits or notification. Licence field is optional.

## How this shapes the data model

`listing_licences` (one farm can have several):

| Field | Notes |
|---|---|
| `category` | `dairy`, `eggs`, `meat`, `poultry`, `other` |
| `regulator` | e.g. NSW Food Authority, PrimeSafe, Dairy Food Safety Victoria, PIRSA, Safe Food Production QLD, council |
| `licence_number` | free text |
| `expires_on` | optional ISO date; expired licences shown as expired |
| `status` | `self_declared` (default) or `admin_checked` (after manual review) |

Listing rules:
- Dairy: `pasteurised` must be true; no raw milk products.
- Meat/poultry/eggs/dairy: a licence/accreditation entry is **required** before those products can go live (self-declared allowed; admin-checked is badged).
- UI shows "Licence declared by farmer" or "Checked by Farm Direct", plus: *Check the licence with your state regulator if unsure.*
- Admins can request licence evidence during review.
