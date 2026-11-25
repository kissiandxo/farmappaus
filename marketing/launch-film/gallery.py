"""Make 6.9-inch App Store gallery images from the original iPhone captures."""
from PIL import Image, ImageDraw

from render import SCREEN, font


COVERS = [
    ("13-explore.png", "store-01-discover.png", "Find good food\nnear you.",
     "151 markets, butchers, farm shops and more.", "#F4F0E3", "#183C2E", "#B1C2AB"),
    ("14-butcher-browse.png", "store-02-butchers.png", "Find your\nlocal butcher.",
     "Look up 45 independent shops across Australia.", "#173C31", "#FFF5E4", "#86A68B"),
    ("16-market-dates.png", "store-03-market-dates.png", "When’s the\nnext market?",
     "Check published dates and special market days.", "#F4DECC", "#422C24", "#BA9B82"),
    ("18-weekend-shortlist.png", "store-05-weekend.png", "Share your\nweekend stops.",
     "Save favourites and check their weekend hours.", "#E7EBD8", "#203B2A", "#A4B08D"),
    ("04-place-market.png", "store-03-market.png", "Plan a market\nmorning.",
     "Check published hours before heading out.", "#F5DDC6", "#462B24", "#B79174"),
]


def make_cover(source, name, headline, subtitle, background, ink, border):
    canvas = Image.new("RGB", (1320, 2868), background)
    draw = ImageDraw.Draw(canvas)
    left = 84
    title = font(174, serif=True)
    y = 115
    for line in headline.splitlines():
        if draw.textlength(line, font=title) > canvas.width - 2 * left:
            raise ValueError(line)
        draw.text((left, y), line, fill=ink, font=title, anchor="lt")
        y += 170
    draw.text((left + 2, y + 24), subtitle, fill=ink, font=font(45, 530), anchor="lt")
    top = y + 146
    screen_width = 1160
    native = Image.open(SCREEN / source).convert("RGB")
    native = native.resize((screen_width, round(native.height * screen_width / native.width)), Image.Resampling.LANCZOS)
    x = (canvas.width-screen_width)//2
    mask = Image.new("L", native.size, 0)
    ImageDraw.Draw(mask).rounded_rectangle((0, 0, native.width-1, native.height-1), radius=61, fill=255)
    draw.rounded_rectangle((x-3, top-3, x+native.width+2, top+native.height+2), radius=64, fill=border)
    canvas.paste(native, (x, top), mask)
    canvas.save(SCREEN / name, optimize=True)


if __name__ == "__main__":
    for cover in COVERS:
        make_cover(*cover)
