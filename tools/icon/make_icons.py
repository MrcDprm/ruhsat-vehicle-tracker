"""Ruhsat uygulama ikonu ve açılış görseli üretici.

İkon, uygulamadaki silindirli kilometre sayacıdır (src/components/Odometer.tsx): üç kâğıt silindir ve amber son hane.
iOS'un üç görünümü için ayrı görüntü üretilir (app.json > ios.icon):
  - açık: kâğıt zemin, grafit çerçeve (tam arka planlı)
  - koyu: şeffaf arka plan; koyu zemini iOS koyar, silindirler parlak kalır
  - renklendirilmiş: gri tonlu, şeffaf; iOS kullanıcının seçtiği renge boyar (amber silindir en parlak)
Ayrıca açılış ekranı görseli (açık ve koyu) ve genel icon.png / favicon.png.

Çalıştırma (proje kökünden; Edge ya da Chromium gerekir):
  python tools/icon/make_icons.py
"""
from pathlib import Path

from PIL import Image
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / 'assets' / 'icon'
FONT = ROOT / 'node_modules' / '@expo-google-fonts' / 'azeret-mono' / '700Bold' / 'AzeretMono_700Bold.ttf'

# Kimlik renkleri (src/theme/colors.ts)
PAPER = '#F2EEE5'
CARD = '#FBF9F4'
INK = '#23262B'
DARK_BG = '#15171A'
AMBER = '#C9821B'


def odometer(frame: str, frame_stroke: str, drum: str, digit: str, ghost: str, last: str, last_digit: str) -> str:
    """1024×1024 içinde ortalanmış sayaç. Silindirlerin üstünde bir önceki rakam yarım görünür (yuvarlanma hissi)."""
    drums = []
    x0, w, gap, top, h = 172, 152, 18, 352, 320
    for i, (d, prev) in enumerate([('0', '9'), ('8', '7'), ('7', '6'), ('4', '3')]):
        x = x0 + i * (w + gap)
        is_last = i == 3
        face = last if is_last else drum
        ink = last_digit if is_last else digit
        drums.append(f'''
          <rect x="{x}" y="{top}" width="{w}" height="{h}" rx="26" fill="{face}"/>
          <text x="{x + w / 2}" y="{top + 72}" class="d" font-size="104" fill="{ghost if not is_last else last_digit}"
                fill-opacity="{0.35 if not is_last else 0.35}" text-anchor="middle">{prev}</text>
          <rect x="{x}" y="{top}" width="{w}" height="86" rx="26" fill="#000" fill-opacity="0.10"/>
          <rect x="{x}" y="{top + h - 74}" width="{w}" height="74" rx="26" fill="#000" fill-opacity="0.12"/>
          <text x="{x + w / 2}" y="{top + 228}" class="d" font-size="196" fill="{ink}" text-anchor="middle">{d}</text>''')
    # Ana ekran boyutunda okunsun diye sayaç ikonun ortasında %14 büyütülür.
    return f'''
      <g transform="translate(512 512) scale(1.14) translate(-512 -512)">
        <rect x="136" y="314" width="752" height="396" rx="58" fill="{frame}" stroke="{frame_stroke}" stroke-width="8"/>
        {''.join(drums)}
      </g>'''


def page(bg: str | None, body: str, size: int = 1024) -> str:
    background = f'<rect width="1024" height="1024" fill="{bg}"/>' if bg else ''
    return f'''<!doctype html><html><head><meta charset="utf-8"><style>
      @font-face {{ font-family: Azeret; src: url("{FONT.as_uri()}"); }}
      html, body {{ margin: 0; background: transparent; }}
      .d {{ font-family: Azeret; font-weight: 700; }}
    </style></head><body>
    <svg xmlns="http://www.w3.org/2000/svg" width="{size}" height="{size}" viewBox="0 0 1024 1024">
      {background}{body}
    </svg></body></html>'''


VARIANTS = {
    # Açık: kâğıt zemin, grafit çerçeve, kâğıt silindirler, amber son hane.
    'icon-light.png': page(PAPER, odometer(INK, INK, CARD, INK, '#6E6A62', AMBER, INK)),
    # Koyu: şeffaf zemin; çerçeve hafif açık grafit ki koyu zeminde seçilsin.
    'icon-dark.png': page(None, odometer('#2E3238', '#4A4F57', '#ECE7DD', INK, '#6E6A62', '#E0A040', INK)),
    # Renklendirilmiş: gri tonlar; iOS renge boyar. Son silindir en parlak.
    'icon-tinted.png': page(None, odometer('#3A3A3A', '#5A5A5A', '#BDBDBD', '#2A2A2A', '#6A6A6A', '#FFFFFF', '#2A2A2A')),
    # Açılış: şeffaf zeminde açık sürümün sayacı (zemin rengini app.json verir).
    'splash.png': page(None, odometer(INK, INK, CARD, INK, '#6E6A62', AMBER, INK)),
    'splash-dark.png': page(None, odometer('#2E3238', '#4A4F57', '#ECE7DD', INK, '#6E6A62', '#E0A040', INK)),
}


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    with sync_playwright() as p:
        try:
            browser = p.chromium.launch(channel='msedge')
        except Exception:
            browser = p.chromium.launch()
        pg = browser.new_page(viewport={'width': 1024, 'height': 1024})
        for name, html in VARIANTS.items():
            tmp = OUT / '_render.html'
            tmp.write_text(html, encoding='utf-8')
            pg.goto(tmp.as_uri())
            # Sabit bekleme yetmiyor: rakamların yazı tipi gerçekten yüklenene kadar beklenir.
            pg.wait_for_function("document.fonts.check('700 196px Azeret')")
            pg.evaluate('document.fonts.ready')
            transparent = name != 'icon-light.png'
            pg.screenshot(path=str(OUT / name), omit_background=transparent,
                          clip={'x': 0, 'y': 0, 'width': 1024, 'height': 1024})
            tmp.unlink()
        browser.close()

    # App Store, tam arka planlı ikonda saydamlık kanalı (alfa) kabul etmez: açık ikon RGB kaydedilir.
    light = Image.open(OUT / 'icon-light.png').convert('RGB')
    light.save(OUT / 'icon-light.png')
    light.save(ROOT / 'assets' / 'images' / 'icon.png')  # genel ikon (web, Expo araçları)
    light.resize((48, 48), Image.LANCZOS).save(ROOT / 'assets' / 'images' / 'favicon.png')
    print('ikonlar:', ', '.join(sorted(VARIANTS)), '+ images/icon.png, images/favicon.png')


if __name__ == '__main__':
    main()
