# Farm Direct launch media

| File | Where to use it | Length |
|---|---|---|
| [Hero film](farm-direct-hero.mp4) | App Store preview, 886 × 1920 | 21 seconds |
| [Independent butcher Reel](reel-butcher.mp4) | Instagram Reels, 1080 × 1920 | 11.5 seconds |
| [Farm shop Reel](reel-farm-shop.mp4) | Instagram Reels, 1080 × 1920 | 11 seconds |
| [Farmers’ market Reel](reel-market.mp4) | Instagram Reels, 1080 × 1920 | 11 seconds |

Use the [organic captions](captions.md) with the matching Reel. The captions include a prelaunch ending and a download link to use once the Australian listing is live. The music is an original instrumental composed and rendered for these edits.

The [interaction recording](source/gestures.mp4) follows a guest from the native welcome and spotlight tour into Explore, the independent butcher directory and Saved. The source was trimmed 228.6 seconds into the original iPhone recording to remove simulator startup. [Original native capture](https://github.com/kissiandxo/farmappaus/actions/runs/45691133706) The three-stop list comes from an additional shopping flow that saves Bilpin Fruit Bowl, Carriageworks Farmers Market and Feather and Bone. [Weekend shopping capture](https://github.com/kissiandxo/farmappaus/actions/runs/45691133706)

The final App Store build also passed the native VoiceOver card, long-press and share-sheet checks. [Build 63 interaction test](https://github.com/kissiandxo/farmappaus/actions/runs/45690245419)

The farm shop Reel also uses the [Torello Farm simulator recording](source/iphone-simulator.mp4). The store cover images and their original screenshots are in the [App Store gallery](../app-store-screenshots). [Directory recording](https://github.com/kissiandxo/farmappaus/actions/runs/45602600542)

## Rebuild the edits

Install FFmpeg, Pillow and NumPy. Save Instrument Serif Regular as `instrument.ttf` and the DM Sans variable font with optical-size and weight axes as `dm.ttf` in a local fonts directory. Both are available from [Google Fonts](https://fonts.google.com/).

```bash
export FARM_FILM_FONTS=/path/to/fonts
python marketing/launch-film/gallery.py
python marketing/launch-film/render.py --interaction gestures.mp4 --explore-time 45.2 --tour-time 6.1 --filter-time 20.9 --butcher-time 68.5 --market-time 31.7 --shop-time 132
```
