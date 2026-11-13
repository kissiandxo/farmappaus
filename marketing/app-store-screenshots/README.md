# App Store screenshots

Seven real screenshots of Farm Direct 1.0, taken on an iPhone 6.9-inch simulator by `.github/workflows/screenshots.yml`. Each is 1320 x 2868, the size App Store Connect asks for.

| File | Screen |
|---|---|
| `01-explore.png` | Explore: 106 places, search, location and filters |
| `02-explore-meat.png` | Explore with the Meat filter on: 41 places |
| `03-place-farm-shop.png` | A farm shop's page: hours, directions, call, produce |
| `04-place-market.png` | A weekly farmers' market's page |
| `05-saved.png` | Saved places |
| `06-map.png` | The map, with a pin for every place |
| `07-map-dark.png` | The same map in dark appearance |

They come from two runs of the same app code on 13 November 2026: files 01 to 05 from the run for commit `1cea1b8`, and the two map shots from the run for commit `43f21f9`. One run cannot yet capture all seven: the screenshot build stops stepping to the next screen after it has switched tabs once, so the map (a tab switch) and the screens after it need a second run with a different order. That is a limit of the screenshot tooling, not of the app.

The places shown are real listings from public sources and are marked in the app as not confirmed by their owners. Retake the screenshots if the listings or the design change.
