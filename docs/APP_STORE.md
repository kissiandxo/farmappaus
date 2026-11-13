# App Store listing

Draft text for App Store Connect, in Australian English. Edit freely. Limits are Apple's.

## Basics

| Field | Text |
|---|---|
| Name (30) | Farm Direct (check it is free when you create the record) |
| Subtitle (30) | Buy local, direct from farmers |
| Category | Food & Drink (primary), Lifestyle (secondary) |
| Keywords (100) | farm,farmers market,local food,eggs,honey,beef,lamb,pork,organic,free range,farm gate,produce |
| Price | Free, no in-app purchases |
| Support URL | *You need to provide this* (a simple page or email link) |
| Privacy policy URL | *You need to host `docs/PRIVACY.md` at a public address* |

## Promotional text (170)

Find farm gates, farm shops and farmers’ markets near you and buy milk, eggs, meat, honey, fruit and veg straight from the people who grow it.

## Description

Farm Direct helps you buy good food straight from the people who grow it, so more of your money goes to the farmer.

Find farms, farm-gate stalls, farm shops and farmers’ markets near you, anywhere in Australia, by GPS or by suburb or postcode. See them on a list or on a map.

• Filter by what you want: milk, eggs, chicken, beef, lamb, pork, honey, fruit and vegetables
• Choose how far you’ll travel, in kilometres
• See who is open right now
• Look for free-range, grass-fed, organic, pasture-raised and spray-free
• Read each farm’s story, see prices in dollars, opening hours, pick-up and delivery options, and how they take payment
• Get directions in Apple Maps, or call the farmer
• Save your favourite places
• Made to be easy to read, with large text that follows your iPhone’s text size setting
• Works with patchy reception: your last-seen listings are kept on your phone

For farmers it’s free. Create a listing, update what’s in stock in a few taps, and add your photos, hours and licence details. Every listing is checked before it goes live. Know a farm that should be here? Suggest it.

You pay the farmer directly at the farm gate, stall or market. Farm Direct doesn’t take payments or a cut.

## Screenshots to take (on your iPhone, from TestFlight)

1. List of nearby places with “Near [your suburb]”
2. Filters open (eggs selected, distance chosen)
3. Map with pins
4. A farm profile (products and prices)
5. A farm profile (hours, how to pay, licence)
6. Saved places

Use the largest iPhone you have; App Store Connect scales them. Take them from real (not sample) listings once you have a pilot region, or clearly sample ones before then.

## Age rating

Answer Apple’s questionnaire honestly. Expect **4+**: no violence, gambling, mature themes or unrestricted web access. Listings are written by farmers and reviewed before they are published.

## App Privacy (the “nutrition label”)

Check these against the app when you submit. They match the current code and `docs/PRIVACY.md`.

| Question | Answer |
|---|---|
| Do you or third parties track users? | **No.** There are no ads or analytics. |
| Contact info: email address | **Collected**, linked to the user, for app functionality (accounts). |
| Contact info: phone number | **Collected** from farmers (shown publicly on their listing) and from people claiming a listing (reviewers only), for app functionality. |
| User content: photos and other user content | **Collected**, linked to the user, for app functionality (listing photos, stories, suggestions, reports). |
| Identifiers: user ID | **Collected**, linked to the user, for app functionality. |
| Location | **Not collected.** Location is used on the phone only to measure distances and is not sent to our servers. (Apple Maps is Apple’s service.) |
| Diagnostics, usage data, purchases, financial info, health, browsing history | Not collected. |

## Notes for App Review

> Farm Direct connects people with local Australian farms. There are no payments or purchases in the app.
>
> **Demo account for reviewers:** email `[create a reviewer account and put it here]`, password `[ ]`. This account is a farmer and can create a draft listing. (Do not make the reviewer account an administrator.)
>
> **Accounts:** email and password only, no third-party sign-in. Account deletion is in the app: Account tab → Delete my account.
>
> **User-generated content (Guideline 1.2):** farm listings are written by farmers. Every listing, claim and suggestion is reviewed by us before it is published. Signed-in users can report any listing (open a listing → Report a problem with this listing). Listings that can’t meet food-safety rules (for example raw milk, or meat without a licence) are blocked from publication.
>
> **Location:** only used when you tap “Use my current location”, to show nearby places. You can instead search any suburb or postcode.
>
> **Camera and photos:** only used by farmers to add pictures to their own listing.

## Before submitting

- [ ] Bundle ID in `app.json` matches App Store Connect.
- [ ] Support URL and privacy policy URL filled in.
- [ ] Reviewer demo account created, and a few real or clearly labelled listings visible.
- [ ] Screenshots uploaded.
- [ ] Export compliance: the app only uses Apple’s standard encryption (HTTPS), already declared with `ITSAppUsesNonExemptEncryption: false`.
