# Neon Shores Cover Studio

[![bounty](https://make.fun/badge/gta6-cover-art-01.svg)](https://make.fun/bounty/gta6-cover-art-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)
[![rank](https://make.fun/badge/gta6-cover-art-01/rivan122/makefun-gta6-cover-art/rank.svg)](https://make.fun/bounty/gta6-cover-art-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)
[![reward](https://make.fun/badge/gta6-cover-art-01/rivan122/makefun-gta6-cover-art/reward.svg)](https://make.fun/bounty/gta6-cover-art-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)

Neon Shores Cover Studio turns your own photos into multi-panel, GTA-style poster covers — the kind of key art you'd expect on a game case, built entirely in the browser. Pick a layout, drop in your pictures, frame each panel the way you like, add a bold caption, and export a finished cover as a PNG. Everything runs locally and fully offline: no uploads, no accounts, no build step.

## Features

- **Four angled-panel layouts** — Classic Five, Six Pack, Hero & Strips, and Vice Slice, all drawn as clipped polygons with keylined seams on a single canvas.
- **Your photos, your framing** — load images by file picker or drag-and-drop, assign a different photo to each panel or fill every panel with one shot, then drag to pan and use the zoom slider or mouse wheel to crop each panel exactly how you want it.
- **Four colour grades** — Vice Sunset, Neon Nights, Golden Hour, and Teal Noir, with optional vignette and halftone print finishes for that sun-bleached poster look.
- **Poster lettering** — captions set in Anton, with controls for text, size, fill colour, dark outline, and top or bottom placement.
- **Three export sizes** — download your cover as a PNG at 1080×1080, 1080×1350, or 1920×1080, rendered offscreen at full resolution from the same drawing code as the live preview.
- **Sample photos included** — six built-in shots (a pier, a boulevard, a neon-lit driver, a boardwalk rider, a speedboat wake, and a rooftop pool) so you can make a cover before loading any of your own.

## How to run

From the repository root:

```
node serve.ts
```

That serves the `app/` folder locally — open the address it prints and start making covers. Any static file server pointed at `app/` works just as well, and once loaded the app needs no network connection at all.

## About this entry

Neon Shores Cover Studio was built for the [Make GTA 6 Cover Art](https://make.fun/bounty/gta6-cover-art-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01) bounty on [make.fun](https://make.fun).

## Licence

The code in this repository is released under the MIT licence (see `LICENSE`). The Anton typeface used for cover captions is licensed under the SIL Open Font License — see `app/fonts/OFL.txt`.
