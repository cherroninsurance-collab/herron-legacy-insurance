#!/usr/bin/env python3
"""Render the Herron social batch: feed stills, carousel slides, and reel MP4s.

  python3 tools/social/render.py smoke      # a few probe frames
  python3 tools/social/render.py stills     # images + carousels + reel covers
  python3 tools/social/render.py reels      # 9:16 MP4s (frames -> ffmpeg)
  python3 tools/social/render.py all
"""
import json, os, subprocess, sys, time, shutil
from playwright.sync_api import sync_playwright

ROOT = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.abspath(os.path.join(ROOT, '..', '..'))
OUT = os.path.join(REPO, 'social', 'month-01', 'week-01')
CHROME = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome'
FFMPEG = '/opt/pw-browsers/ffmpeg-1011/ffmpeg-linux'
FEED = (1080, 1350)
REEL = (1080, 1920)
FPS = 15

sys.path.insert(0, ROOT)
from content import IMAGES, CAROUSELS, REELS, REEL_COVERS  # noqa: E402


def page_ctx(pw, size):
    b = pw.chromium.launch(executable_path=CHROME, args=[
        '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader',
        '--disable-lcd-text', '--force-color-profile=srgb', '--hide-scrollbars'])
    c = b.new_context(viewport={'width': size[0], 'height': size[1]}, device_scale_factor=1)
    p = c.new_page()
    p.goto('file://' + os.path.join(ROOT, 'frame.html'), wait_until='load')
    p.wait_for_function('window.__ready === true')
    p.evaluate("() => document.fonts.ready")
    p.wait_for_timeout(700)
    return b, p


ZONE_FEED = [0.055, 0.52]     # artwork band above the headline block
ZONE_REEL = [0.13, 0.42]      # between the IG top chrome and the caption
ZONE_COVER = [0.33, 0.40]


def shot(page, spec, t, path, quality=None):
    page.evaluate('([s,t]) => window.renderFrame(s,t)', [spec, t])
    os.makedirs(os.path.dirname(path), exist_ok=True)
    if quality:
        page.screenshot(path=path, type='jpeg', quality=quality)
    else:
        page.locator('#stage').screenshot(path=path)


def do_smoke():
    d = os.path.join(REPO, 'tools', 'social', '_smoke')
    os.makedirs(d, exist_ok=True)
    with sync_playwright() as pw:
        b, p = page_ctx(pw, FEED)
        probes = [
            (IMAGES[0], 'img1'), (IMAGES[1], 'img2'), (IMAGES[3], 'img4'),
            (CAROUSELS[0]['slides'][0], 'c1s1'), (CAROUSELS[0]['slides'][7], 'c1s8'),
            (CAROUSELS[2]['slides'][2], 'c3s3'),
        ]
        for spec, name in probes:
            s = dict(spec); s.setdefault('w', FEED[0]); s.setdefault('h', FEED[1])
            s.setdefault('zone', ZONE_FEED)
            shot(p, s, 2.0, os.path.join(d, name + '.png'))
        b.close()
        b, p = page_ctx(pw, REEL)
        s = dict(REEL_COVERS[0]); s.update(w=REEL[0], h=REEL[1], kind='reel'); s.setdefault('zone', ZONE_COVER)
        shot(p, s, 2.0, os.path.join(d, 'reel1-cover.png'))
        beat = REELS[0]['beats'][4]
        s = dict(beat); s.update(w=REEL[0], h=REEL[1], kind='reel', progress=.4); s.setdefault('zone', ZONE_REEL)
        shot(p, s, 3.0, os.path.join(d, 'reel1-beat.png'))
        b.close()
    print('smoke ->', d)


def do_stills():
    t0 = time.time()
    with sync_playwright() as pw:
        b, p = page_ctx(pw, FEED)
        for i, spec in enumerate(IMAGES, 1):
            s = dict(spec); s.update(w=FEED[0], h=FEED[1]); s.setdefault('zone', ZONE_FEED)
            shot(p, s, 2.0, os.path.join(OUT, 'images', f'image-{i:02d}-{spec["slug"]}.png'))
            print('image', i)
        for ci, car in enumerate(CAROUSELS, 1):
            for si, spec in enumerate(car['slides'], 1):
                s = dict(spec); s.update(w=FEED[0], h=FEED[1], dots=si / 8.0,
                                         badge=f'{si:02d}/08')
                s.setdefault('zone', ZONE_FEED)
                shot(p, s, 2.0, os.path.join(
                    OUT, 'carousels', f'carousel-{ci}-{car["slug"]}', f'slide-{si}.png'))
            print('carousel', ci)
        b.close()
        b, p = page_ctx(pw, REEL)
        for i, spec in enumerate(REEL_COVERS, 1):
            s = dict(spec); s.update(w=REEL[0], h=REEL[1], kind='reel')
            s.setdefault('zone', ZONE_COVER)
            shot(p, s, 2.0, os.path.join(OUT, 'reels', f'reel-{i}-{spec["slug"]}-cover.png'))
            print('cover', i)
        b.close()
    print('stills done in %.1fs' % (time.time() - t0))


def do_reels(only=None):
    tmp = os.path.join(REPO, 'tools', 'social', '_frames')
    with sync_playwright() as pw:
        b, p = page_ctx(pw, REEL)
        for i, reel in enumerate(REELS, 1):
            if only and i != only:
                continue
            t0 = time.time()
            shutil.rmtree(tmp, ignore_errors=True); os.makedirs(tmp)
            beats = reel['beats']
            total = sum(x['dur'] for x in beats)
            n = int(total * FPS)
            fi = 0
            for bi, beat in enumerate(beats):
                nb = int(round(beat['dur'] * FPS))
                for k in range(nb):
                    lt = k / max(1, nb - 1)
                    s = dict(beat); s.pop('dur', None)
                    s.update(w=REEL[0], h=REEL[1], kind='reel',
                             progress=(fi / max(1, n - 1)))
                    s.setdefault('zone', ZONE_REEL)
                    # per-beat entrance: text lifts + fades in over the first 6 frames
                    s['enter'] = min(1.0, k / 5.0)
                    shot(p, s, fi / FPS, os.path.join(tmp, f'{fi:05d}.jpg'), quality=94)
                    fi += 1
            out = os.path.join(OUT, 'reels', f'reel-{i}-{reel["slug"]}.mp4')
            os.makedirs(os.path.dirname(out), exist_ok=True)
            subprocess.run([FFMPEG, '-y', '-loglevel', 'error', '-framerate', str(FPS),
                            '-i', os.path.join(tmp, '%05d.jpg'),
                            '-c:v', 'libx264', '-preset', 'slow', '-crf', '19',
                            '-pix_fmt', 'yuv420p', '-r', '30',
                            '-movflags', '+faststart', out], check=True)
            print('reel %d -> %s  (%d frames, %.0fs)' % (i, os.path.basename(out), fi, time.time() - t0))
        b.close()
    shutil.rmtree(tmp, ignore_errors=True)


if __name__ == '__main__':
    cmd = sys.argv[1] if len(sys.argv) > 1 else 'smoke'
    if cmd == 'smoke':
        do_smoke()
    elif cmd == 'stills':
        do_stills()
    elif cmd == 'reels':
        do_reels(int(sys.argv[2]) if len(sys.argv) > 2 else None)
    elif cmd == 'all':
        do_stills(); do_reels()
    else:
        print(__doc__)
