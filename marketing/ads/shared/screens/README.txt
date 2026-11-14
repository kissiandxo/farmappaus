Real iPhone screenshots of the finished Farm Direct app. Each is 1320x2868 (iPhone 6.9-inch).

01-explore.png       The Explore list with no filter: 106 places, search field, location row, place cards.
                     Not used by any of the five ads; shared/template.html uses it.
02-explore-meat.png  The same list with the Meat filter on: "41 places · nearest first", cards with
                     Beef, Pork, Chicken and other produce chips. Used by ad 2 (02-real-meat-tap).
03-map.png           The map of the NSW coast: coloured pins, a numbered cluster, "Sydney NSW 2000" and
                     "Filters" capsules, locate and fit buttons, the tab bar. Used by ad 5 (05-pin-drive-buy).
                     Apple's small "Maps" attribution is in the lower left (about rows 2120-2180); ad 5 crops
                     above row 2100 so it never appears.

To replace a screenshot:
1. Take the new screen on a 6.9-inch iPhone or simulator so it is 1320x2868 PNG.
2. Save it here under the same file name (the ads point at these exact names).
3. Run: cd marketing/ads && node render.mjs && node contact-sheet.mjs
4. Look at ads 2 and 5 in out/. Ad 2 must still show at least two whole places at the same size,
   with the crop falling between two cards. Ad 5 must still show no Apple "Maps" logo.
   If the layout of a new screen has moved, the crop values in that ad's ad.html need adjusting.
5. If the counts on the screen change (for example "41 places"), re-check the numbers in
   ../../README.md and ../../ads.json against src/data/realListings.json.

Do not add placeholder or mock screens here, and never use a screen that shows one named place on
its own as the focus of an ad.
