// Fixed scenes for screenshots, driven by the query string so a capture is reproducible:
//   ?shot=cover&size=1920x1080&layout=classic&grade=vice&caption=NEON%20SHORES&photos=neon-driver,pier
//     shows one exported cover full-bleed at its export size;
//   ?shot=editor&layout=classic&grade=vice&caption=NEON%20SHORES
//     shows the editor with the default scene loaded.
// `photos` names samples (samples/<id>.jpg) in panel order. window.__shotReady is set once painted.

/** Waits until Anton is usable, so no screenshot ever catches a fallback font. */
export async function waitForFonts() {
  try {
    await document.fonts.load('100px Anton');
    await document.fonts.ready;
  } catch { /* the cover still draws, in a fallback face */ }
}

/** Runs the scene the query names, through the editor's own state and drawing code. */
export async function runShot(shot, query, api) {
  const scene = {
    layout: query.get('layout') ?? 'classic',
    grade: query.get('grade') ?? 'vice',
    caption: query.get('caption') ?? 'NEON SHORES',
    size: query.get('size') ?? '1080x1080',
    photos: (query.get('photos') ?? '').split(',').map((name) => name.trim()).filter(Boolean),
  };
  if (shot === 'cover') {
    document.body.classList.add('shot-cover');
    await api.showExportedCover(scene);
  } else {
    await api.showEditorScene(scene);
  }
  await waitForFonts();
  api.redraw();
  requestAnimationFrame(() => requestAnimationFrame(() => { window.__shotReady = true; }));
}
