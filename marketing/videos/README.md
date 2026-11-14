# Farm Direct: real meat Reels

Three short vertical videos for Instagram Reels and Stories, for people who want real meat from a real farmer. Each one comes in two versions: **soon** ("Coming soon to iPhone") and **live** ("Free for iPhone"). Everything is in this folder. The same details, as data, are in `videos.json`. A preview of all three (a frame every 1.5 seconds) is in `out/overview.png`.

## Stop: hold these until the numbers are fixed

Checked on 13 November 2026. **Don't post any of the six files yet.**

The videos were made from the app build with **106 places**, and 41 of those list meat. On 13 November 2026 (commit `3034cbd`, marked for TestFlight), **45 independent butchers were added**. The app now has **151 places**, and the Meat filter shows **86** (45 of them butchers). That means:

1. **The numbers are out of date.** Videos 01 and 02 show "Tap Filters, pick Meat: 106 → 41 places". The app doesn't do that any more. Video 03 says "About 40 places" and "Nearly 30 list weekend hours". Today it's 86 and 73. The Instagram captions repeat the old numbers. A number that isn't true of the app breaks rule 1 below (and could breach the Australian Consumer Law).
2. **Butchers aren't farmers.** Straight after the Meat list, video 01 says "Ask the farmer the rest" and video 02 says "Real meat. Real farmers." Now that about half the Meat results are butcher shops, those lines can suggest every result is a farmer. `docs/APP_STORE.md` says the copy must never say where a butcher's meat comes from.
3. **The phone looks like an iPhone in 02 and 03.** The app screenshots show the Dynamic Island (the black pill at the top of the screen), and in videos 02 and 03 it shows inside the drawn phone. Video 01 paints it over. Apple doesn't allow pictures of its devices in our ads, so cover it the way video 01 does.

**Ways to fix it, for you to pick** (the designs have not been changed):
- Retake the App Store screenshots from the current build and re-cut the numbers. Words that are true today: "more than 150 places", "more than 80 list meat". Then reword the "farmer" lines so they don't cover butchers. Or
- Keep the farmer story and show only farm places. For example, a list filtered to farmers' markets, farm shops, farms and farm-gate stalls plus Meat, if the app can show that, which gives the 41 count. The captions must then say clearly that it's those places, not "Turn on Meat: 41".

Once the videos are fixed, re-render (see below), re-check the numbers and update this file and `videos.json`.

## The three videos

All files are in `out/`. Each one is 1080x1920 (9:16), 30 fps, H.264 with a silent audio track, and about 3 MB.

| # | Files (soon / live) | The idea | What happens, second by second | Words on screen | Instagram caption | Hashtags |
|---|---|---|---|---|---|---|
| 1 | `01-paddock-not-petri-soon.mp4` / `01-paddock-not-petri-live.mp4` (13.2 s) | The bold "paddock, not petri dish" hook, then the proof in the app, then the honest next step: ask the farmer. | 0–1.9 hook on deep green with a drawn paddock fence. 1.9–3.5 the Explore list, "106 places across Australia", Filters tapped. 3.5–7.6 Meat picked, count flips 106 → 41, the meats listed. 7.6–8.9 the app's "not yet confirmed" note outlined. 8.9–11.1 "Ask the farmer the rest." 11.1–13.2 end card. | From a PADDOCK, / not a petri dish. / 106 places / across Australia / Tap Filters. / Pick [Meat] / 106 → 41 places / list meat. / Beef, lamb, / pork, chicken. / Check first. / Ask the farmer / the rest. / Farm Direct / Coming soon to iPhone (or Free for iPhone) | From a paddock, not a petri dish. Farm Direct finds farmers' markets, farm shops and farms across Australia. Turn on Meat: 41 places list beef, lamb, pork or chicken. Ask the farmer the rest. Follow for the launch. *(Live: end with "Free for iPhone." instead.)* **Numbers out of date, see above.** | #buylocal #farmersmarket #australianfood #supportlocalfarmers #farmshop #shoplocal |
| 2 | `02-meat-postcode-map-soon.mp4` / `02-meat-postcode-map-live.mp4` (13.5 s) | Meat with a postcode: search a town, turn on Meat, then the map, where every place has a pin. | 0–1.5 "Meat with a postcode." on a drawn paper tag. 1.5–4.8 phone: search a town or postcode, Filters, Meat, count 106 → 41. 4.8–7.8 the map: every place has a pin. 7.8–9.4 a pin tapped, Hours / Directions / Save. 9.9–11.4 "Real meat. Real farmers." 11.4–13.5 end card. | Meat / with a / postcode. / Search a town / or postcode. / Filters. / Meat. / 106 → 41 places / list meat. / Or the map. / Every place / has a pin. / Tap one. / Hours / Directions / Save / Then go. / Real meat. / Real farmers. / Farm Direct / Coming soon to iPhone (or Free for iPhone) | Meat with a postcode. Search a town or postcode, turn on Meat, and find farmers' markets and farm shops on the map, each with hours and directions. Free, no sign-up. Follow for the launch. *(Live: drop "Follow for the launch.")* | #buylocal #farmersmarket #farmshop #australianfood #shoplocal #supportlocalfarmers |
| 3 | `03-weekend-meat-run-soon.mp4` / `03-weekend-meat-run-live.mp4` (15.0 s) | The weekend: coffee, market, real meat. Meat and This weekend filters, the map for the drive, saved places that work with no signal. | 0–1.5 ticked checklist: Coffee, Market, Real meat. 1.5–3.0 Meat list, "About 40 places". 3.0–5.0 [Meat] [This weekend], "Nearly 30 list weekend hours". 5.0–8.0 dark map, "Pin it. Drive there." 8.0–10.6 Saved tab, "Save a few. List works with no signal." 11.1–12.9 "Check the hours before you go." 12.9–15.0 end card. | Coffee. / Market. / Real meat. / Meat filter on. / About 40 places / [Meat] [This weekend] / Nearly 30 / list weekend hours / Pin it. / Drive there. / Save a few. / List works / with no signal. / Check the hours / before you go. / Farm Direct / Coming soon to iPhone (or Free for iPhone) | Weekend list: coffee, market, real meat. Nearly 30 of the places listing meat publish Saturday or Sunday hours. Save a few, check the hours, then hit the road. Follow for the launch. *(Live: end with "Free for iPhone." instead.)* **Numbers out of date, see above.** | #farmersmarket #buylocal #weekendmarket #australianfood #farmshop #roadtripaustralia #shoplocal |

## Where every claim comes from

| Claim in the videos | Source | True today? |
|---|---|---|
| 106 places | `src/data/realListings.json` without butchers; screenshot `01-explore.png` | **No.** 151 now |
| 41 places list meat / about 40 | records whose `products` include beef, lamb, pork or chicken, without butchers; `02-explore-meat.png` | **No.** The Meat filter now shows 86 (41 aren't butchers) |
| Nearly 30 list weekend hours | meat places with weekly hours on Saturday or Sunday, without butchers (29) | **No.** 73 of 86 now |
| Across Australia | places in every state and territory (`docs/APP_STORE.md`) | Yes. The videos never say every town |
| Filters, then Meat; Meat covers beef, lamb, pork, chicken | `docs/APP_STORE.md` (review notes) | Yes |
| Search by town or postcode | `docs/APP_STORE.md`; the search field in the screenshots | Yes |
| This weekend filter | `docs/APP_STORE.md`; `src/components/FilterPanel.tsx` | Yes |
| Every place has a pin; hours, Directions (Apple Maps), Save | `docs/APP_STORE.md` | Yes |
| List and saved places work with no signal (maps need a connection) | `docs/APP_STORE.md` | Yes. The video says "List", not the map |
| Not yet confirmed by owners; check before you go | the app's own note, shown in the screenshots | Yes |
| Free, no sign-up | `docs/APP_STORE.md` | Yes |

**How to re-check the numbers.** From the repo folder, run:

```bash
python3 -c "
import json
r = json.load(open('src/data/realListings.json'))
M = {'beef','lamb','pork','chicken'}
for label, rs in [('all', r), ('without butchers', [x for x in r if x['type'] != 'butcher'])]:
    meat = [x for x in rs if M & set(x['products'])]
    wk = [x for x in meat if x['hours']['kind'] == 'weekly' and set(x['hours'].get('days') or {}) & {'sat','sun'}]
    print(label, 'places', len(rs), 'meat', len(meat), 'weekend', len(wk))
"
```

On 13 November 2026 this printed `all places 151 meat 86 weekend 73` and `without butchers places 106 meat 41 weekend 29`. Also check the number on the app's own list (the "N places" line under the location) on the TestFlight build.

## Which version to post when

- **soon** ("Coming soon to iPhone") can go up before launch, once the hold above is fixed. Its captions end "Follow for the launch."
- **live** ("Free for iPhone") is only for once the app is actually on the App Store. Before that, "Free for iPhone" isn't true. Use the live caption (no "Follow for the launch").
- Don't post a soon video after launch. Switch to the live files.

## How to post

1. In Instagram, tap **+** and choose **Reel**. Pick the MP4 from `out/`.
2. Tap the music button and add a track from **Instagram's own music library** (that's the only music we're licensed to use). Keep it low; the words carry the video.
3. Paste the caption and hashtags from the table above (or from `videos.json`).
4. **Set the cover frame.** Video 01's first frame works. Video 02 starts on a blank tag and video 03 on empty boxes, so pick about 1.2 s for 02 ("Meat with a postcode.") and about 1.0 s for 03 (the ticked list). Check the cover crops cleanly to the square grid view.
5. Share to Feed as well if you like, then post.

## Why the videos are silent

We have no licence for any music or voiceover, so nothing is built in. Each file has a silent audio track only because Instagram wants one. Most people watch with the sound off anyway, so every word is on screen: big, centred, one to four words at a time. Add licensed audio from Instagram's library when posting.

## The rules these videos follow, and why

1. **Every fact must be true of the app today and checkable from the data.** Round numbers down, never up, and never suggest every town is covered. (This is the rule the current files break; see the hold.)
2. **No claims about how animals were raised, or about quality, health, price or safety.** No "grass-fed", "free-range", "organic", "hormone-free", "healthier", "cheaper" and so on. Farm Direct doesn't check any of that. We only say the shopper can ask.
3. **"Paddock, not petri dish" and "Real meat. Real farmers." are positioning, not claims about anyone else.** They describe what Farm Direct is. The videos never say or hint that supermarkets, companies, scientists or the government are pushing lab-grown meat, never scare anyone about health or safety, and never name or knock any business.
4. **No single place is the hero.** Only the list, filter and map screens are used, always with several places showing. Never a single place's page, and no place is enlarged. Nobody is endorsing us and we're not partnered with anyone.
5. **Apple's rules.** No Apple logo, no App Store badge, no picture of an Apple device (only a plain drawn phone outline), and the Apple Maps credit in the map's corner is kept out of frame. (The Dynamic Island in 02 and 03 needs covering; see the hold.)
6. **Instagram's rules.** Nothing about the viewer's personal traits, no shock content, no before/after, no swearing, and text big enough to read on a phone.
7. **Only our own visuals.** Type, colour, simple shapes we drew, the app icon and real app screenshots. No stock photos, no found footage, no AI images.
8. **End card** says only "Coming soon to iPhone" or "Free for iPhone", with the icon and "Farm Direct".

## Safe zones

Instagram puts its own buttons and text over a Reel. In the 1080x1920 frame, all important words and pictures stay out of:
- the top **220 px**,
- the bottom **380 px** (the end-card logo and name can come down to 300 px from the bottom),
- the right-hand **130 px** (the like, comment and share buttons).

`render.mjs` warns if anything strays into these areas.

## Re-rendering (for example after the app screenshots change)

The videos are web pages (`NN-name/video.html`, using `shared/`) recorded frame by frame. The screenshots come from `marketing/app-store-screenshots/`. After replacing those screenshots, or editing a video:

```bash
cd marketing/videos
node render.mjs 01-paddock-not-petri 02-meat-postcode-map 03-weekend-meat-run   # both versions, about 2 minutes
python3 overview.py                                                             # rebuilds out/overview.png
```

Check the numbers on the new screenshots match the words in the videos. Changing a screenshot doesn't change the captions, which are written in each `video.html`. Needs Node with Playwright (Chromium), ffmpeg and Python with Pillow.

## Files

- `out/*-soon.mp4`, `out/*-live.mp4`: the six videos
- `out/overview.png`: a frame every 1.5 s of each video (soon version)
- `videos.json`: the post pack as data, including the blockers
- `render.mjs`, `shared/`, `NN-name/video.html`: the source
- `overview.py`: builds the overview sheet
- Older files in `out/` (`template-*`, `*-sheet.png`) are working previews from earlier rounds, not for posting.
