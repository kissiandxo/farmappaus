"""Render the Farm Direct App Store preview and Instagram Reels from real iPhone captures.

Needs FFmpeg, Pillow, NumPy, and the Instrument Serif Regular and DM Sans variable
fonts from Google Fonts. Set FARM_FILM_FONTS to their directory (instrument.ttf, dm.ttf).
"""
from dataclasses import dataclass
import os
from pathlib import Path
import subprocess
import tempfile
import wave

import numpy as np
from PIL import Image, ImageDraw, ImageFont


HERE = Path(__file__).resolve().parent
SCREEN = HERE.parent / "app-store-screenshots"
SOURCE = HERE / "source"
ICON = HERE.parents[1] / "assets/images/icon.png"
FONTS = Path(os.environ.get("FARM_FILM_FONTS", HERE / "fonts"))
FPS = 30
RATE = 44100


@dataclass
class Shot:
    headline: str
    detail: str
    source: str
    seconds: float
    start: float = 0
    focus: str = "full"


@dataclass
class Film:
    name: str
    shots: list[Shot]
    paper: str
    ink: str
    accent: str
    preview: bool = False


def font(size, weight=500, serif=False):
    face = ImageFont.truetype(str(FONTS / ("instrument.ttf" if serif else "dm.ttf")), size)
    if not serif:
        face.set_variation_by_axes([28, weight])
    return face


def plate(film, shot, size, dest):
    w, h = size
    unit = w / 1080
    px = lambda x: round(x * unit)
    img = Image.new("RGB", size, film.paper)
    draw = ImageDraw.Draw(img)
    x = px(68)
    y = px(54 if film.preview else 120)
    icon_size = px(62)
    icon = Image.open(ICON).convert("RGB").resize((icon_size, icon_size), Image.Resampling.LANCZOS)
    mask = Image.new("L", icon.size)
    ImageDraw.Draw(mask).rounded_rectangle((0, 0, icon_size-1, icon_size-1), px(14), fill=255)
    img.paste(icon, (x, y), mask)
    draw.text((x + icon_size + px(18), y + icon_size // 2), "Farm Direct", font=font(px(38), 675),
              fill=film.ink, anchor="lm")
    y += icon_size + px(45)
    lines = shot.headline.split("\n")
    title = font(px(110 if len(lines) > 1 else 99), serif=True)
    max_width = w - 2*x
    while any(draw.textlength(line, font=title) > max_width for line in lines):
        title = font(title.size - 1, serif=True)
    for line in lines:
        draw.text((x, y), line, font=title, fill=film.ink, anchor="lt")
        y += round(title.size * 0.97)
    y += px(18)
    caption = font(px(34), 480)
    for line in shot.detail.split("\n"):
        if draw.textlength(line, font=caption) > max_width:
            raise ValueError(f"Caption too wide: {line}")
        draw.text((x, y), line, font=caption, fill=film.ink, anchor="lt")
        y += px(45)
    top = y + px(29)
    if film.preview:
        # Full-height native frames with matched source proportions. Keep the home indicator visible.
        sw = min(w - px(70), round((h-top-px(32)) * 1320/2868))
        sw = sw // 2 * 2
        sh = round(sw*2868/1320) // 2 * 2
    else:
        sw = (w - 2*x) // 2 * 2
        last = shot is film.shots[-1]
        sh = (h - top - px(355 if last else 220)) // 2 * 2
        if last:
            draw.line((x, h-px(325), w-x, h-px(325)), fill=film.accent, width=px(2))
            draw.text((x,h-px(300)), "Save this for your next market run", font=font(px(30), 600), fill=film.ink, anchor="lt")
    left = (w-sw)//2
    draw.rounded_rectangle((left-2,top-2,left+sw+1,top+sh+1), radius=px(22), fill=film.accent)
    img.save(dest)
    return left, top, sw, sh


def soundtrack(path, duration, tempo):
    # Original four-chord fingerpicked cue. Each string has a separate attack, decay and stereo position.
    total = round(duration * RATE)
    mix = np.zeros((total, 2))
    beat = 60/tempo
    chords = [(50,57,62,66,69,76), (47,54,59,62,66,73),
              (43,50,55,59,62,69), (45,52,57,61,64,71)]
    for tick in range(int(duration / (beat/2)) + 1):
        chord = chords[(tick//8) % len(chords)]
        string = (0,2,4,3,1,2,5,3)[tick % 8]
        begin = round(tick * beat/2 * RATE)
        count = min(total-begin, round(RATE*2.4))
        if count <= 0:
            break
        t = np.arange(count)/RATE
        hz = 440 * 2**((chord[string]-69)/12)
        note = sum(level * np.sin(2*np.pi*hz*n*t) * np.exp(-t*(1.65+n*.65))
                   for n,level in ((1,1),(2,.37),(3,.16),(4,.07),(6,.025)))
        note *= (1-np.exp(-t*160)) * (.95 if string < 2 else .68)
        pan = .28 + string*.078
        mix[begin:begin+count] += note[:,None] * np.array([np.cos(pan*np.pi/2), np.sin(pan*np.pi/2)])
    for delay,gain in ((.073,.09),(.139,.065),(.213,.04)):
        offset = round(RATE*delay)
        mix[offset:] += mix[:-offset, ::-1]*gain
    mix *= .46 / max(np.abs(mix).max(),1)
    tail = min(total, round(RATE*.7))
    mix[-tail:] *= np.linspace(1,0,tail)[:,None]
    with wave.open(str(path),"wb") as out:
        out.setparams((2,2,RATE,0,"NONE","not compressed"))
        out.writeframes((mix*32767).astype("<i2").tobytes())


def ff(*args):
    subprocess.run(["ffmpeg","-nostdin","-hide_banner","-loglevel","error","-y",*map(str,args)],check=True)


def render(film):
    size = (886,1920) if film.preview else (1080,1920)
    with tempfile.TemporaryDirectory(prefix="farm-film-") as tmp:
        tmp = Path(tmp)
        parts = []
        for i,shot in enumerate(film.shots):
            platefile = tmp / f"plate-{i}.png"
            x,y,w,h = plate(film,shot,size,platefile)
            if shot.source.endswith(".mp4"):
                source = ["-ss", shot.start, "-i", SOURCE / shot.source]
            else:
                source = ["-loop", 1, "-framerate", FPS, "-i", SCREEN / shot.source]
            transform = f"scale={w}:{h}:force_original_aspect_ratio=increase:force_divisible_by=2"
            if shot.focus == "produce":
                offset = "ih-oh"
            elif shot.focus == "detail":
                offset = "min(ih-oh\\,ih*0.16)"
            else:
                offset = "0"
            transform += f",crop={w}:{h}:0:{offset}"
            if not film.preview and not shot.source.endswith(".mp4"):
                frames = round(shot.seconds * FPS)
                transform += (f",zoompan=z='1+0.035*on/{frames}':x='iw/2-iw/zoom/2':"
                              f"y='ih*0.18-ih/zoom*0.18':d=1:s={w}x{h}:fps={FPS}")
            path = tmp / f"shot-{i}.mp4"
            ff("-loop",1,"-framerate",FPS,"-i",platefile,*source,
               "-filter_complex_threads",1,"-filter_complex",
               f"[1:v]fps={FPS},{transform},setsar=1[screen];[0:v][screen]overlay={x}:{y}:shortest=1,format=yuv420p[v]",
               "-map","[v]","-an","-t",shot.seconds,"-c:v","libx264","-threads",2,"-preset","veryfast",
               "-profile:v","high","-level:v","4.0" if film.preview else "4.1",
               "-b:v","11M" if film.preview else "7M","-maxrate","11.5M" if film.preview else "12M",
               "-bufsize","2M" if film.preview else "24M",
               *(["-x264-params","nal-hrd=vbr:filler=1"] if film.preview else []),
               "-color_primaries","bt709","-color_trc","bt709","-colorspace","bt709",path)
            parts.append(path)
        manifest = tmp/"clips.txt"
        manifest.write_text("".join(f"file '{p}'\n" for p in parts))
        music = tmp/"score.wav"
        soundtrack(music,sum(s.seconds for s in film.shots),100 if film.preview else 110)
        ff("-f","concat","-safe",0,"-i",manifest,"-i",music,"-map","0:v:0","-map","1:a:0",
           "-c:v","copy","-c:a","aac","-b:a","256k","-ar",RATE,"-ac",2,"-shortest","-movflags","+faststart",
           HERE/(film.name+".mp4"))


def films(tour_time, butcher_time, explore_time, shop_time, filter_time, interaction, market_time):
    simulator = "iphone-simulator.mp4"
    meat = Shot("Choose what to buy", "Filter for meat, fruit, eggs and more.", "02-explore-meat.png", 4)
    if filter_time is not None:
        meat.source, meat.start = interaction, filter_time
    return [
        Film("farm-direct-hero", [
            Shot("Find a market near you", "Browse 151 places across Australia.", interaction,4,explore_time),
            Shot("Start in your suburb", "Set your area or use your location.", interaction,4,tour_time),
            meat,
            Shot("Meet your local butcher", "See the shop’s address and published hours.", interaction,5,butcher_time),
            Shot("Share your weekend stops", "Save favourites and share a list with friends.", "18-weekend-shortlist.png",4),
        ],"#F5F1E6","#153E2D","#B8C3AD",True),
        Film("reel-butcher", [
            Shot("A butcher for\nthe weekend", "45 independent butcher shops across Australia.", "14-butcher-browse.png",3.5),
            Shot("Look up the shop", "Feather and Bone · Marrickville, NSW", interaction,4,butcher_time),
            Shot("Check before\nyou go", "Find hours, directions and a number to call.", "08-place-butcher.png",4,focus="detail"),
        ],"#183F32","#FFF7E6","#87AA8F"),
        Film("reel-farm-shop", [
            Shot("Fruit from\na farm shop", "Explore farm shops and farm-gate stalls.", "03-place-farm-shop.png",3.5,focus="produce"),
            Shot("A stop in\nDromana", "Torello Farm · Mornington Peninsula", simulator,4,shop_time,focus="detail"),
            Shot("Save it for later", "Your saved list stays on your iPhone.", "03-place-farm-shop.png",3.5,focus="detail"),
        ],"#F7E4CC","#442F26","#B69A7E"),
        Film("reel-market", [
            Shot("When’s market\nday?", "See dates published by selected markets.", "16-market-dates.png",3.5),
            Shot("Find a market\nnearby", "Explore 67 farmers’ markets around Australia.", interaction,3.5,market_time),
            Shot("Plan a market\nmorning", "Check published hours before heading out.", "04-place-market.png",4,focus="detail"),
        ],"#E7EBD8","#243E28","#A4B08D"),
    ]


if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument("--tour-time", type=float, required=True)
    parser.add_argument("--butcher-time", type=float, required=True)
    parser.add_argument("--explore-time", type=float, required=True)
    parser.add_argument("--shop-time", type=float, required=True)
    parser.add_argument("--filter-time", type=float)
    parser.add_argument("--market-time", type=float, required=True)
    parser.add_argument("--interaction", default="iphone-simulator.mp4")
    parser.add_argument("--only")
    args = parser.parse_args()
    for film in films(args.tour_time, args.butcher_time, args.explore_time, args.shop_time, args.filter_time, args.interaction, args.market_time):
        if not args.only or args.only == film.name:
            render(film)
