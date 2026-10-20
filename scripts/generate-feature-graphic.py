"""Renders the Google Play feature graphic (1024x500, no alpha) from the app's own icon and fonts.

Run: python scripts/generate-feature-graphic.py   (needs Pillow; run gen:icons first)
"""
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter, ImageFont

ROOT = Path(__file__).resolve().parent.parent
FONTS = ROOT / "node_modules" / "@expo-google-fonts"
OUT = ROOT / "assets" / "store" / "feature-graphic.png"

W, H = 1024, 500
BG = (6, 6, 11)
CYAN = (60, 240, 255)
TEXT = (236, 238, 255)
MUTED = (138, 140, 168)

title_font = ImageFont.truetype(str(FONTS / "orbitron/900Black/Orbitron_900Black.ttf"), 78)
tag_font = ImageFont.truetype(str(FONTS / "chakra-petch/500Medium/ChakraPetch_500Medium.ttf"), 31)

img = Image.new("RGB", (W, H), BG)

# Soft purple/cyan vignette behind the mark, matching the in-game backdrop.
glow = Image.new("RGB", (W, H), BG)
gd = ImageDraw.Draw(glow)
gd.ellipse((40, 20, 500, 480), fill=(40, 22, 70))
gd.ellipse((560, 150, 1000, 360), fill=(10, 40, 50))
img = Image.blend(img, glow.filter(ImageFilter.GaussianBlur(90)), 0.9)

# Faint grid, like the game background.
grid = ImageDraw.Draw(img)
for x in range(0, W, 36):
    grid.line([(x, 0), (x, H)], fill=(12, 20, 26))
for y in range(0, H, 36):
    grid.line([(0, y), (W, y)], fill=(12, 20, 26))

# The real app mark (transparent foreground render) on the left.
mark = Image.open(ROOT / "assets/images/android-icon-foreground.png").convert("RGBA").resize((620, 620), Image.LANCZOS)
img.paste(mark, (-40, -60), mark)

# Title with a cyan glow.
tx, ty = 478, 178
text_layer = Image.new("RGBA", (W, H), (0, 0, 0, 0))
ImageDraw.Draw(text_layer).text((tx, ty), "VOLTRING", font=title_font, fill=CYAN + (255,))
img.paste(text_layer.filter(ImageFilter.GaussianBlur(14)), (0, 0), text_layer.filter(ImageFilter.GaussianBlur(14)))
d = ImageDraw.Draw(img)
d.text((tx, ty), "VOLTRING", font=title_font, fill=TEXT)
d.text((tx + 3, ty + 108), "One tap. One ring. Beat the world.", font=tag_font, fill=MUTED)

OUT.parent.mkdir(parents=True, exist_ok=True)
img.save(OUT, "PNG", optimize=True)
print("wrote", OUT, img.size, img.mode)
