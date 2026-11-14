#!/usr/bin/env python3
"""Overview sheet for the Farm Direct videos.

    python3 marketing/videos/overview.py            (uses the -soon files)
    python3 marketing/videos/overview.py --cta=live

One labelled row per video, a frame every 1.5 seconds (plus the last frame),
written to marketing/videos/out/overview.png. Needs ffmpeg, ffprobe and Pillow.
"""
import json
import os
import subprocess
import sys
import tempfile

from PIL import Image, ImageDraw, ImageFont

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, 'out')
VIDEOS = [
    ('01-paddock-not-petri', 'Paddock, Not Petri Dish'),
    ('02-meat-postcode-map', 'Meat With a Postcode'),
    ('03-weekend-meat-run', 'Weekend Meat Run'),
]
STEP = 1.5
TILE_W, TILE_H = 216, 384
LABEL_W, PAD, CAP = 440, 16, 30
FONT_DIR = '/usr/share/fonts/opentype/inter'


def font(name, size):
    try:
        return ImageFont.truetype(os.path.join(FONT_DIR, name), size)
    except OSError:
        return ImageFont.load_default()


def duration(path):
    out = subprocess.run(['ffprobe', '-v', 'error', '-show_entries', 'format=duration',
                          '-of', 'json', path], capture_output=True, text=True, check=True).stdout
    return float(json.loads(out)['format']['duration'])


def frame(path, t, dest):
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-ss', f'{t:.3f}', '-i', path, '-frames:v', '1',
                    '-vf', f'scale={TILE_W}:{TILE_H}', dest], check=True)
    return Image.open(dest).convert('RGB')


def main():
    cta = 'soon'
    for a in sys.argv[1:]:
        if a.startswith('--cta='):
            cta = a.split('=', 1)[1]
    rows = []
    with tempfile.TemporaryDirectory() as tmp:
        for slug, title in VIDEOS:
            path = os.path.join(OUT, f'{slug}-{cta}.mp4')
            dur = duration(path)
            times, t = [], 0.0
            while t < dur - 0.2:
                times.append(t)
                t += STEP
            times.append(round(dur - 0.1, 2))
            tiles = [(tt, frame(path, tt, os.path.join(tmp, f'{slug}-{i}.png'))) for i, tt in enumerate(times)]
            rows.append((slug, title, dur, tiles))

        cols = max(len(r[3]) for r in rows)
        width = LABEL_W + cols * (TILE_W + PAD) + PAD
        row_h = TILE_H + CAP + PAD * 2
        head = 90
        sheet = Image.new('RGB', (width, head + row_h * len(rows)), '#F2F2F0')
        d = ImageDraw.Draw(sheet)
        d.text((PAD * 2, 24), f'Farm Direct Reels: a frame every {STEP:g} s ({cta} variant)',
               fill='#123F1E', font=font('InterDisplay-Bold.otf', 40))
        for r, (slug, title, dur, tiles) in enumerate(rows):
            y = head + r * row_h
            d.rectangle([0, y, width, y + row_h - 4], fill='#FFFFFF')
            d.text((PAD * 2, y + 40), title, fill='#123F1E', font=font('Inter-Bold.otf', 26))
            d.text((PAD * 2, y + 80), f'{slug}-{cta}.mp4', fill='#555555', font=font('Inter-Regular.otf', 17))
            d.text((PAD * 2, y + 108), f'{dur:.1f} s, 1080x1920, 30 fps', fill='#555555',
                   font=font('Inter-Regular.otf', 17))
            for c, (tt, im) in enumerate(tiles):
                x = LABEL_W + c * (TILE_W + PAD)
                sheet.paste(im, (x, y + PAD))
                d.text((x + 4, y + PAD + TILE_H + 6), f'{tt:.2f} s', fill='#333333',
                       font=font('Inter-Medium.otf', 18))
        dest = os.path.join(OUT, 'overview.png')
        sheet.save(dest)
        print('wrote', dest, sheet.size)


if __name__ == '__main__':
    main()
