// Neon Shores Cover Studio: the editor. A photo (yours, or a built-in sample) goes into the panels of
// a poster layout, a colour grade and a caption go over the top, and the cover comes out as a PNG in
// the three post sizes. Everything happens on this machine: photos are read as local files and drawn
// on a canvas, never uploaded. The same drawCover paints the preview and the export, so what you see
// is the poster you get.
import { drawCover } from './cover.js';
import { GRADES } from './grades.js';
import { LAYOUTS, layoutById, panelFrame, pointInPolygon } from './panels.js';
import { runShot, waitForFonts } from './shots.js';

const SAMPLES = [
  { id: 'neon-driver', label: 'Neon Driver' },
  { id: 'speedboat-wake', label: 'Speedboat' },
  { id: 'boardwalk-rider', label: 'Boardwalk' },
  { id: 'rooftop-pool', label: 'Rooftop Pool' },
  { id: 'boulevard', label: 'Boulevard' },
  { id: 'pier', label: 'The Pier' },
];

const SIZES = {
  '1080x1080': [1080, 1080],
  '1080x1350': [1080, 1350],
  '1920x1080': [1920, 1080],
};

// The scene each layout opens with: a spread of samples that already looks like a poster.
const OPENING = {
  classic: ['neon-driver', 'speedboat-wake', 'boardwalk-rider', 'rooftop-pool', 'pier'],
  grid: ['boardwalk-rider', 'neon-driver', 'boulevard', 'speedboat-wake', 'rooftop-pool', 'pier'],
  hero: ['boulevard', 'rooftop-pool', 'speedboat-wake', 'neon-driver'],
  slice: ['neon-driver', 'speedboat-wake', 'boardwalk-rider', 'rooftop-pool'],
};

const state = {
  layout: 'classic',
  grade: 'vice',
  caption: 'NEON SHORES',
  captionSize: 1,
  captionColor: '#ffffff',
  captionStroke: true,
  captionPos: 'bottom',
  vignette: true,
  halftone: false,
  size: '1080x1080',
  photos: new Map(), // id -> { img, label }
  panelPhotos: {}, // layout id -> [photo id per panel]
  framing: {}, // "layout:panel" -> { dx, dy, zoom }
  selected: 0,
  uploads: 0,
};

for (const layout of LAYOUTS) {
  state.panelPhotos[layout.id] = [...(OPENING[layout.id] ?? [])];
}

const stage = document.getElementById('stage');
const status = document.getElementById('status');

/** Loads an image from a URL, resolving once it can be drawn. */
export function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}

/** The framing (pan and zoom) of one panel, created at rest when first asked. */
function framingOf(layoutId, panel) {
  const key = `${layoutId}:${panel}`;
  if (!state.framing[key]) state.framing[key] = { dx: 0, dy: 0, zoom: 1 };
  return state.framing[key];
}

/** The scene for one panel of the current layout: its photo and framing. */
function panelScene(panel) {
  const photoId = state.panelPhotos[state.layout][panel];
  const photo = photoId ? state.photos.get(photoId) : null;
  const framing = framingOf(state.layout, panel);
  return { img: photo?.img ?? null, dx: framing.dx, dy: framing.dy, zoom: framing.zoom };
}

/** The whole cover as a scene for drawCover; `clean` drops the editor's selection marker. */
function coverScene(clean = false) {
  const layout = layoutById(state.layout);
  return {
    layout: state.layout,
    grade: state.grade,
    caption: state.caption,
    captionSize: state.captionSize,
    captionColor: state.captionColor,
    captionStroke: state.captionStroke,
    captionPos: state.captionPos,
    vignette: state.vignette,
    halftone: state.halftone,
    panels: layout.panels.map((_, panel) => panelScene(panel)),
    selected: clean ? null : state.selected,
  };
}

// True while the stage shows an exported cover alone (a screenshot scene): no selection marker.
let cleanView = false;

/** Repaints the preview canvas at the chosen export size (CSS scales it into the stage). */
export function redraw() {
  const [w, h] = SIZES[state.size];
  if (stage.width !== w || stage.height !== h) {
    stage.width = w;
    stage.height = h;
  }
  drawCover(stage.getContext('2d'), w, h, coverScene(cleanView));
}

/** Registers a loaded image as a photo the panels can use, and returns its id. */
function registerPhoto(id, img, label) {
  state.photos.set(id, { img, label });
  return id;
}

/** Loads a built-in sample photo by id, once. */
async function loadSample(id) {
  if (!state.photos.has(id)) {
    const sample = SAMPLES.find((entry) => entry.id === id) ?? SAMPLES[0];
    const img = await loadImage(`samples/${sample.id}.jpg`);
    registerPhoto(sample.id, img, sample.label);
  }
  return id;
}

/** Puts a photo into the selected panel. */
function assignToSelected(photoId) {
  state.panelPhotos[state.layout][state.selected] = photoId;
  buildPanelStrip();
  redrawThumbs();
  redraw();
}

/** Puts the selected panel's photo into every panel of the layout. */
function fillEveryPanel() {
  const photoId = state.panelPhotos[state.layout][state.selected];
  if (!photoId) return;
  state.panelPhotos[state.layout] = layoutById(state.layout).panels.map(() => photoId);
  buildPanelStrip();
  redrawThumbs();
  redraw();
}

// --- The panel strip: one chip per panel, naming its photo; clicking selects the panel. ---

const panelStrip = document.getElementById('panel-strip');

function buildPanelStrip() {
  panelStrip.replaceChildren();
  layoutById(state.layout).panels.forEach((_, panel) => {
    const chip = document.createElement('button');
    chip.type = 'button';
    chip.className = 'panel-chip' + (panel === state.selected ? ' is-selected' : '');
    const photoId = state.panelPhotos[state.layout][panel];
    chip.textContent = `Panel ${panel + 1} · ${photoId ? state.photos.get(photoId)?.label ?? photoId : 'empty'}`;
    chip.addEventListener('click', () => {
      state.selected = panel;
      syncFramingControls();
      buildPanelStrip();
      redraw();
    });
    panelStrip.append(chip);
  });
}

// --- Photo picking: sample and upload thumbnails; a click fills the selected panel. ---

function photoButton(id, label, url) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'photo-thumb';
  const img = document.createElement('img');
  img.src = url;
  img.alt = '';
  const caption = document.createElement('span');
  caption.textContent = label;
  button.append(img, caption);
  button.addEventListener('click', () => assignToSelected(id));
  return button;
}

function buildSampleThumbs() {
  const row = document.getElementById('samples');
  row.replaceChildren();
  for (const sample of SAMPLES) {
    row.append(photoButton(sample.id, sample.label, `samples/${sample.id}.jpg`));
  }
}

/** Adds a person's own photo files: read locally, shown as thumbnails, first one fills the panel. */
async function addPhotoFiles(files) {
  let first = null;
  for (const file of files) {
    if (!file.type.startsWith('image/')) continue;
    const id = `upload-${++state.uploads}`;
    const url = URL.createObjectURL(file);
    const img = await loadImage(url);
    registerPhoto(id, img, file.name.replace(/\.[^.]+$/, '') || 'Your photo');
    document.getElementById('uploads').append(photoButton(id, state.photos.get(id).label, url));
    if (!first) first = id;
  }
  if (first) {
    assignToSelected(first);
    status.textContent = 'Photo added to the selected panel. Drag the cover to position it.';
  }
}

// --- Layout thumbnails: little live collages; a click swaps the layout. ---

function redrawThumbs() {
  document.querySelectorAll('canvas.layout-thumb').forEach((thumb) => {
    const layout = layoutById(thumb.dataset.layout);
    const [w, h] = SIZES[state.size];
    const scale = 132 / w;
    thumb.width = 132;
    thumb.height = Math.round(h * scale);
    const scene = {
      ...coverScene(true),
      layout: layout.id,
      caption: '',
      panels: layout.panels.map((_, panel) => {
        const photoId = state.panelPhotos[layout.id][panel];
        const framing = framingOf(layout.id, panel);
        return {
          img: photoId ? state.photos.get(photoId)?.img ?? null : null,
          dx: framing.dx, dy: framing.dy, zoom: framing.zoom,
        };
      }),
    };
    drawCover(thumb.getContext('2d'), thumb.width, thumb.height, scene);
  });
}

function buildLayoutThumbs() {
  const row = document.getElementById('layouts');
  row.replaceChildren();
  for (const layout of LAYOUTS) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'layout-pick' + (layout.id === state.layout ? ' is-selected' : '');
    const thumb = document.createElement('canvas');
    thumb.className = 'layout-thumb';
    thumb.dataset.layout = layout.id;
    const name = document.createElement('span');
    name.textContent = layout.name;
    button.append(thumb, name);
    button.addEventListener('click', () => {
      state.layout = layout.id;
      state.selected = 0;
      buildLayoutThumbs();
      buildPanelStrip();
      syncFramingControls();
      redraw();
    });
    row.append(button);
  }
  redrawThumbs();
}

// --- Grade swatches. ---

function buildGradeSwatches() {
  const row = document.getElementById('grades');
  row.replaceChildren();
  for (const grade of GRADES) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'grade-swatch' + (grade.id === state.grade ? ' is-selected' : '');
    button.style.background = `linear-gradient(160deg, ${grade.swatch[0]}, ${grade.swatch[1]})`;
    const name = document.createElement('span');
    name.textContent = grade.name;
    button.append(name);
    button.addEventListener('click', () => {
      state.grade = grade.id;
      buildGradeSwatches();
      redrawThumbs();
      redraw();
    });
    row.append(button);
  }
}

// --- Framing controls for the selected panel. ---

const zoomSlider = document.getElementById('zoom');

function syncFramingControls() {
  zoomSlider.value = String(framingOf(state.layout, state.selected).zoom);
}

zoomSlider.addEventListener('input', () => {
  framingOf(state.layout, state.selected).zoom = Number(zoomSlider.value);
  redraw();
});

document.getElementById('reset-framing').addEventListener('click', () => {
  state.framing[`${state.layout}:${state.selected}`] = { dx: 0, dy: 0, zoom: 1 };
  syncFramingControls();
  redraw();
});

// --- Dragging on the cover pans the selected panel's photo; the wheel zooms it. ---

let drag = null;

function stagePoint(event) {
  const rect = stage.getBoundingClientRect();
  return [
    (event.clientX - rect.left) / rect.width,
    (event.clientY - rect.top) / rect.height,
  ];
}

stage.addEventListener('pointerdown', (event) => {
  const [ux, uy] = stagePoint(event);
  const layout = layoutById(state.layout);
  const hit = layout.panels.findIndex((polygon) => pointInPolygon(polygon, ux, uy));
  if (hit !== -1) {
    state.selected = hit;
    buildPanelStrip();
    syncFramingControls();
  }
  const framing = framingOf(state.layout, state.selected);
  drag = { x: event.clientX, y: event.clientY, dx: framing.dx, dy: framing.dy };
  stage.setPointerCapture(event.pointerId);
  redraw();
});

stage.addEventListener('pointermove', (event) => {
  if (!drag) return;
  const rect = stage.getBoundingClientRect();
  const frame = panelFrame(layoutById(state.layout).panels[state.selected]);
  const framing = framingOf(state.layout, state.selected);
  framing.dx = clamp(drag.dx + (event.clientX - drag.x) / rect.width / frame.width, -0.6, 0.6);
  framing.dy = clamp(drag.dy + (event.clientY - drag.y) / rect.height / frame.height, -0.6, 0.6);
  redraw();
});

stage.addEventListener('pointerup', () => { drag = null; });
stage.addEventListener('pointercancel', () => { drag = null; });

stage.addEventListener('wheel', (event) => {
  event.preventDefault();
  const framing = framingOf(state.layout, state.selected);
  framing.zoom = clamp(framing.zoom * Math.exp(-event.deltaY * 0.0012), 1, 4);
  syncFramingControls();
  redraw();
}, { passive: false });

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

// --- The rest of the controls. ---

document.getElementById('photo-file').addEventListener('change', (event) => {
  addPhotoFiles([...event.target.files]);
  event.target.value = '';
});

document.getElementById('fill-all').addEventListener('click', fillEveryPanel);

const stageWrap = document.getElementById('stage-wrap');
stageWrap.addEventListener('dragover', (event) => {
  event.preventDefault();
  stageWrap.classList.add('is-dropping');
});
stageWrap.addEventListener('dragleave', () => stageWrap.classList.remove('is-dropping'));
stageWrap.addEventListener('drop', (event) => {
  event.preventDefault();
  stageWrap.classList.remove('is-dropping');
  addPhotoFiles([...event.dataTransfer.files]);
});

const captionInput = document.getElementById('caption');
captionInput.addEventListener('input', () => {
  state.caption = captionInput.value;
  redraw();
});

document.getElementById('caption-size').addEventListener('input', (event) => {
  state.captionSize = Number(event.target.value);
  redraw();
});

document.getElementById('caption-color').addEventListener('input', (event) => {
  state.captionColor = event.target.value;
  redraw();
});

document.getElementById('caption-stroke').addEventListener('change', (event) => {
  state.captionStroke = event.target.checked;
  redraw();
});

document.getElementById('caption-pos').addEventListener('change', (event) => {
  state.captionPos = event.target.value;
  redraw();
});

document.getElementById('vignette').addEventListener('change', (event) => {
  state.vignette = event.target.checked;
  redraw();
});

document.getElementById('halftone').addEventListener('change', (event) => {
  state.halftone = event.target.checked;
  redraw();
});

document.querySelectorAll('input[name="size"]').forEach((radio) => {
  radio.addEventListener('change', () => {
    state.size = radio.value;
    redrawThumbs();
    redraw();
  });
});

document.getElementById('export').addEventListener('click', () => {
  const [w, h] = SIZES[state.size];
  const out = document.createElement('canvas');
  out.width = w;
  out.height = h;
  drawCover(out.getContext('2d'), w, h, coverScene(true));
  out.toBlob((blob) => {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `neon-shores-cover-${state.size}.png`;
    a.click();
    status.textContent = `Saved neon-shores-cover-${state.size}.png — post it anywhere.`;
  }, 'image/png');
});

// --- Scenes: the default opening, an exported cover alone, or a screenshot's editor. ---

/** Loads every sample the opening scenes use, so the editor opens on a finished-looking poster. */
async function loadOpeningSamples() {
  const wanted = new Set(Object.values(OPENING).flat());
  await Promise.all([...wanted].map((id) => loadSample(id)));
}

/** Applies a scene description (from a screenshot query) to the editor's state. */
async function applyScene(scene, { editor }) {
  state.layout = layoutById(scene.layout).id;
  state.grade = scene.grade;
  state.caption = scene.caption;
  captionInput.value = scene.caption;
  if (scene.size && SIZES[scene.size]) {
    state.size = scene.size;
    document.querySelectorAll('input[name="size"]').forEach((radio) => {
      radio.checked = radio.value === scene.size;
    });
  }
  if (scene.photos.length) {
    await Promise.all(scene.photos.map((id) => loadSample(id)));
    state.panelPhotos[state.layout] = layoutById(state.layout).panels.map(
      (_, panel) => scene.photos[panel] ?? scene.photos[scene.photos.length - 1],
    );
  } else {
    await loadOpeningSamples();
  }
  state.selected = 0;
  cleanView = !editor;
  buildLayoutThumbs();
  buildPanelStrip();
  buildGradeSwatches();
  syncFramingControls();
  if (!editor) stage.classList.add('cover-alone');
}

const shotApi = {
  async showExportedCover(scene) {
    await applyScene(scene, { editor: false });
  },
  async showEditorScene(scene) {
    await applyScene(scene, { editor: true });
  },
  redraw,
};

async function start() {
  buildSampleThumbs();
  buildGradeSwatches();
  const query = new URLSearchParams(location.search);
  const shot = query.get('shot');
  if (shot) {
    await runShot(shot, query, shotApi);
    return;
  }
  await loadOpeningSamples();
  await waitForFonts();
  buildLayoutThumbs();
  buildPanelStrip();
  syncFramingControls();
  redraw();
}

start();
