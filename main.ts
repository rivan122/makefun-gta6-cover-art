// Neon Shores Cover Studio, handed in for gta6-cover-art-01 (Node 22, standard library only).
// The app itself is this directory's app/ folder: plain static files a desktop browser loads fully
// offline — a multi-panel poster maker that fills angled panels with a person's own photos, lays a
// Vice City colour grade over the collage, sets a caption in Anton and exports the cover as a PNG in
// the three post sizes. This program is only the courier: it copies app/ and screenshots/ from beside
// this file to /output and writes /output/dossier.json, the summary the judge reads, with the vendored
// make.fun library. The sample photos under app/samples/ were made with an image model and are free
// to use; the caption face is Anton, shipped under the SIL Open Font License (app/fonts/OFL.txt).
//
// Serve it locally with `node serve.ts`, then open http://localhost:8080.
// Outside the grader's container, MAKEFUN_OUTPUT_DIR stands in for /output:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { cpSync, existsSync, mkdirSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-app.ts';

const here = fileURLToPath(new URL('.', import.meta.url));
const out = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

mkdirSync(out, { recursive: true });
cpSync(join(here, 'app'), join(out, 'app'), { recursive: true });
mkdirSync(join(out, 'screenshots'), { recursive: true });
if (existsSync(join(here, 'screenshots'))) cpSync(join(here, 'screenshots'), join(out, 'screenshots'), { recursive: true });

// The scorer's own caps (reference/gate.json): only text_max_bytes shapes the bytes; the others refuse an entry the
// scorer would refuse (more than 4 screenshots or one over 256 KiB; more than 993 files in app/ or 48 MiB of app
// files, in all, or a path under app/ over 1000 bytes: app/ counts beside /output's own 1000-entry cap, its
// screenshots/ and dossier.json).
const dossier = buildDossier(out, {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  app_max_files: 993,
  app_max_bytes: 50331648,
  app_path_max_bytes: 1000,
});
writeFileSync(join(out, 'dossier.json'), dossier);

// A courier's receipt, so a local run shows what was handed in without opening the dossier:
// the screenshots by name (the first is the cover the judge sees on top) and the dossier's size.
const shots = existsSync(join(out, 'screenshots')) ? readdirSync(join(out, 'screenshots')).sort() : [];
console.log(`handed in ${shots.length} screenshots (${shots.join(', ')}) and a ${dossier.length}-byte dossier.json`);
