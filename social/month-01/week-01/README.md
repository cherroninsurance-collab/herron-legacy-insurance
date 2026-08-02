# Month 1 · Week 1 — Fixed Indexed Annuities & Income Riders
### 25 finished pieces · Herron & Co. Legacy Agency · NPN 21556594

Everything in this folder is **rendered and ready to post**. Nothing here touches the website.

| What | Where | Specs |
| --- | --- | --- |
| 7 reels | `reels/reel-N-*.mp4` | 1080×1920, 45s, H.264, 30fps |
| 7 reel covers | `reels/reel-N-*-cover.png` | 1080×1920 — use as the Reel cover frame |
| 6 feed graphics | `images/image-NN-*.png` | 1080×1350 |
| 6 carousels × 8 slides | `carousels/carousel-N-*/slide-1…8.png` | 1080×1350 |
| Every caption + full reel script | `captions.md` | paste-ready |

**The reels are motion-graphics videos with the spoken line burned in.** Two ways to use them:

1. **Post as-is** with a trending sound. The on-screen text carries the whole argument.
2. **Better:** film yourself saying the script (it's in `captions.md`, timed 3s per line) and cut
   your talking-head over the top, dropping to the graphic on the money beats — the numbers, the
   floor, the cap, the CTA. The graphic already holds those beats at the right moment.

Either way, the caption goes in the post body and the keyword CTA is the last line.

---

## The keyword map — set this up before you post

Each piece ends with "comment KEYWORD." Have the reply asset ready before it goes live.

| Keyword | Piece | What you send back |
| --- | --- | --- |
| `FLOOR` | Reel 1, Carousel 1, Image 1 | Zero-floor side-by-side sheet |
| `RIDER` | Reel 2, Carousel 2, Images 3 & 4 | Fixed vs. income-rider one-pager |
| `DROP` | Reel 3, Carousel 3 | The 20% drawdown recovery table |
| `LUMP` | Reel 4, Carousel 4 | Lump-vs-income split worksheet |
| `FEES` | Reel 5, Carousel 5, Image 2 | "What this actually costs" checklist |
| `PENSION` | Reel 6, Post 4 | Personal pension build sheet |
| `TRAP` | Reel 7, Carousel 6, Image 6 | IRA transfer pre-flight checklist |

Reply in the comment, then take it to DM. **Never quote a rate in a public comment.**

---

## Posting cadence — 7 days

| Day | Reel | Feed | Story |
| --- | --- | --- | --- |
| Mon | Reel 1 · FLOOR | Carousel 1 | Image 1 + poll: "Would you take a cap for a floor?" |
| Tue | Reel 3 · DROP | Text post 3 | Image 5 + question sticker |
| Wed | Reel 2 · RIDER | Carousel 2 | Image 4 + "ask me anything" box |
| Thu | Reel 5 · FEES | Text post 5 | Image 2 |
| Fri | Reel 4 · LUMP | Carousel 4 | Image 3 + poll: "Lump or paycheck?" |
| Sat | Reel 6 · PENSION | Text post 4 | Carousel 5, slides 4–6 |
| Sun | Reel 7 · TRAP | Text post 6 + Carousel 6 | Image 6 |

Text posts 1 and 2 are flex slots — drop either in wherever engagement dips. Carousel 3 is the
Sunday-night re-share.

---

## Compliance — already baked into every piece, keep it there

Every rendered graphic carries **NPN 21556594** in the footer, and every closing slide carries the
disclosure line. When you crop, re-cut, or repurpose anything, the following has to survive:

- Figures are **illustrative — not offers of coverage or quoted rates**, and not guarantees of
  future performance.
- FIAs don't invest directly in an index or the market and **don't receive dividends**. Index
  credits are limited by **caps, participation rates and/or spreads set by the carrier, which can
  change**.
- Income riders are **optional and typically carry an annual charge**. A **benefit base is
  generally not available** as a cash value, withdrawal, or death benefit.
- Withdrawals may trigger **surrender charges and market value adjustments**, and withdrawals
  before 59½ may carry a **10% IRS penalty** on top of ordinary income tax.
- Guarantees are backed solely by the **issuing carrier's claims-paying ability**. **Not FDIC
  insured. Not bank guaranteed.**
- This is general education, **not individualized financial, legal, or tax advice**.
- Licensed in 12 states: **PA, NJ, VA, WI, IA, IN, FL, TX, MA, NC, OH, MN.** Never imply another.

The 45-second reel scripts compress the IRA rules for time. The exact distinctions — **20%
mandatory withholding applies to employer plans like a 401(k), not IRA-to-IRA moves**, and the
**once-per-12-months limit applies to indirect IRA-to-IRA rollovers only** — are stated correctly
in the captions and on Carousel 6. Read those two lines back before Reel 7 goes up.

---

## Re-rendering / editing

The whole batch is generated, so a copy change is a one-line edit and a re-run:

```bash
pip install playwright                       # once
python3 tools/social/render.py stills        # 61 PNGs, ~90s
python3 tools/social/render.py reels         # 7 MP4s
python3 tools/social/render.py reels 3       # just reel 3
```

- `tools/social/content.py` — every headline, slide line, spoken beat and label. Edit here.
- `tools/social/scene.js` — the render engine (frosted glass, liquid gold, brass, the 3D scenes).
- `tools/social/frame.html` — typography and layout; `fonts/` holds Sora, Inter, IBM Plex Mono.
- Wrap a phrase in `*asterisks*` in any headline or spoken line to render it in the gold gradient.
