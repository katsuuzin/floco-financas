"""Gera as variantes do ícone (S10) recolorindo o disco amarelo do desenho do Floco.

Uso: python scripts/icon-variants.py
Lê mipmap-*/ic_launcher_foreground.webp e grava ic_launcher_foreground_<nome>.webp ao lado.
Só pixels amarelos saturados mudam; o cachorro (creme, preto) fica igual.
"""
import colorsys
from pathlib import Path
from PIL import Image

RES = Path(__file__).resolve().parent.parent / "android" / "app" / "src" / "main" / "res"
VARIANTS = {"grafite": (0x2A, 0x2A, 0x2E), "creme": (0xF0, 0xE3, 0xD4), "ceu": (0x7F, 0xB3, 0xFF)}
REF_V = 0.98  # brilho do amarelo de referência (#FBB202)


def recolor(im, target):
    px = im.load()
    tr, tg, tb = (c / 255 for c in target)
    th, ts, tv = colorsys.rgb_to_hsv(tr, tg, tb)
    for y in range(im.size[1]):
        for x in range(im.size[0]):
            r, g, b, a = px[x, y]
            if a == 0:
                continue
            h, s, v = colorsys.rgb_to_hsv(r / 255, g / 255, b / 255)
            if 0.08 <= h <= 0.16 and s >= 0.55 and v >= 0.45:
                nv = max(0.0, min(1.0, tv * (v / REF_V)))
                nr, ng, nb = colorsys.hsv_to_rgb(th, ts, nv)
                px[x, y] = (round(nr * 255), round(ng * 255), round(nb * 255), a)
    return im


for folder in sorted(RES.glob("mipmap-*dpi")):
    src = folder / "ic_launcher_foreground.webp"
    if not src.exists():
        continue
    for name, color in VARIANTS.items():
        out = folder / f"ic_launcher_foreground_{name}.webp"
        recolor(Image.open(src).convert("RGBA"), color).save(out, "WEBP", lossless=True)
        print(out.relative_to(RES))
