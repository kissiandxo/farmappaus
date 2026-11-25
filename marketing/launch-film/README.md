# Farm Direct launch media

| File | Where to use it | Length |
|---|---|---|
| [Hero film](farm-direct-hero.mp4) | App Store preview, 886 × 1920 | 21 seconds |
| [Independent butcher Reel](reel-butcher.mp4) | Instagram Reels, 1080 × 1920 | 11.5 seconds |
| [Farm shop Reel](reel-farm-shop.mp4) | Instagram Reels, 1080 × 1920 | 11 seconds |
| [Farmers’ market Reel](reel-market.mp4) | Instagram Reels, 1080 × 1920 | 11 seconds |

Use the [organic captions](captions.md) with the matching Reel. The captions include a prelaunch ending and a download link to use once the Australian listing is live. The music is an original instrumental composed and rendered for these edits.

The [interaction recording](source/gestures.mp4) shows a fresh guest opening the walkthrough, filtering for meat, opening Feather and Bone, and saving the shop. It uses the real iPhone 17 Pro Max simulator running iOS 26.5. The edit begins 123.5 seconds into the original simulator recording to omit boot and test-runner setup. The automated interaction checks passed. The original recording and full-resolution screenshots were recovered from the workflow artifact. [Interaction test](https://github.com/kissiandxo/farmappaus/actions/runs/45609367849) · [Original capture files](https://github.com/kissiandxo/farmappaus/tree/capture/iphone-45609367849/marketing/launch-film/source)

The farm shop Reel also uses the [Torello Farm simulator recording](source/iphone-simulator.mp4). The three cover images and other screenshot sources are in the [App Store gallery](../app-store-screenshots). [Directory recording](https://github.com/kissiandxo/farmappaus/actions/runs/45602600542)

## Rebuild the edits

Install FFmpeg, Pillow and NumPy. Save Instrument Serif Regular as `instrument.ttf` and the DM Sans variable font with optical-size and weight axes as `dm.ttf` in a local fonts directory. Both are available from [Google Fonts](https://fonts.google.com/).

```bash
export FARM_FILM_FONTS=/path/to/fonts
python marketing/launch-film/gallery.py
python marketing/launch-film/render.py --interaction gestures.mp4 --explore-time 1.4 --tour-time 8.0 --filter-time 22.8 --butcher-time 31.6 --shop-time 132
```
