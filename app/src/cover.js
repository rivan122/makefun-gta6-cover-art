// The cover renderer: paints a whole poster onto any 2D context at any size, so the editor's preview
// and the exported PNG are the same drawing. Panels are clipped to their layout polygons and filled
// with their photos (cover-fit, panned and zoomed per panel), the grade is laid over the collage, the
// seams are keylined, and the caption is set in Anton with a heavy outline, like poster lettering.
import { gradeById } from './grades.js';
import { grownPolygon, layoutById, panelFrame } from './panels.js';

/** Traces a unit-space polygon on ctx, scaled to the w by h cover. */
function tracePolygon(ctx, polygon, w, h) {
  ctx.beginPath();
  polygon.forEach(([x, y], i) => {
    if (i === 0) ctx.moveTo(x * w, y * h);
    else ctx.lineTo(x * w, y * h);
  });
  ctx.closePath();
}

/** Paints one panel: the photo cover-fitted into the panel's bounding box, clipped to its polygon. */
function paintPanel(ctx, w, h, polygon, panel, filter) {
  const frame = panelFrame(polygon);
  const bx = frame.minX * w, by = frame.minY * h;
  const bw = frame.width * w, bh = frame.height * h;
  ctx.save();
  tracePolygon(ctx, grownPolygon(polygon), w, h);
  ctx.clip();
  ctx.fillStyle = '#1c1030';
  ctx.fillRect(bx - 2, by - 2, bw + 4, bh + 4);
  const img = panel?.img;
  if (img) {
    // Cover-fit: the photo fills the box at zoom 1; zoom grows it, dx and dy slide it within the box.
    const scale = Math.max(bw / img.naturalWidth, bh / img.naturalHeight) * (panel.zoom ?? 1);
    const dw = img.naturalWidth * scale;
    const dh = img.naturalHeight * scale;
    // The crop window sits a little above centre (0.35 of the overflow, not 0.5): in a wide panel a
    // centred crop beheads people, and faces live in the upper part of a photo.
    const dx = bx + (bw - dw) / 2 + (panel.dx ?? 0) * bw;
    const dy = by + (bh - dh) * 0.35 + (panel.dy ?? 0) * bh;
    ctx.filter = filter;
    ctx.drawImage(img, dx, dy, dw, dh);
    ctx.filter = 'none';
  }
  ctx.restore();
}

/** The keylines between panels: a dark seam with a pale thread down its middle. */
function strokeSeams(ctx, w, h, layout) {
  ctx.lineJoin = 'round';
  for (const polygon of layout.panels) {
    tracePolygon(ctx, polygon, w, h);
    ctx.strokeStyle = 'rgba(8, 6, 14, 0.92)';
    ctx.lineWidth = Math.max(5, w * 0.007);
    ctx.stroke();
  }
  for (const polygon of layout.panels) {
    tracePolygon(ctx, polygon, w, h);
    ctx.strokeStyle = 'rgba(255, 246, 230, 0.9)';
    ctx.lineWidth = Math.max(1.5, w * 0.0018);
    ctx.stroke();
  }
}

/** A vertical gradient coat from a grade's stop list. */
function paintGradient(ctx, w, h, stops, composite, alpha) {
  const gradient = ctx.createLinearGradient(0, 0, 0, h);
  for (const [at, colour] of stops) gradient.addColorStop(at, colour);
  ctx.save();
  ctx.globalCompositeOperation = composite;
  ctx.globalAlpha = alpha;
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, w, h);
  ctx.restore();
}

/** Darkens the corners so the middle of the poster glows. */
function paintVignette(ctx, w, h) {
  const radius = Math.hypot(w, h) * 0.62;
  const gradient = ctx.createRadialGradient(w / 2, h / 2, radius * 0.42, w / 2, h / 2, radius);
  gradient.addColorStop(0, 'rgba(0, 0, 0, 0)');
  gradient.addColorStop(1, 'rgba(5, 2, 10, 0.44)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, w, h);
}

/** A print-shop dot screen over the whole cover, drawn from a small repeating pattern tile. */
function paintHalftone(ctx, w, h) {
  const tile = document.createElement('canvas');
  tile.width = 7; tile.height = 7;
  const tctx = tile.getContext('2d');
  tctx.fillStyle = '#000';
  tctx.beginPath();
  tctx.arc(3.5, 3.5, 1.7, 0, Math.PI * 2);
  tctx.fill();
  ctx.save();
  ctx.globalCompositeOperation = 'overlay';
  ctx.globalAlpha = 0.16;
  ctx.fillStyle = ctx.createPattern(tile, 'repeat');
  ctx.fillRect(0, 0, w, h);
  ctx.restore();
}

/** A soft scrim behind the caption so the lettering reads over any photo. */
function paintCaptionScrim(ctx, w, h, position) {
  const depth = h * 0.34;
  const gradient = position === 'top'
    ? ctx.createLinearGradient(0, 0, 0, depth)
    : ctx.createLinearGradient(0, h - depth, 0, h);
  const near = position === 'top' ? 0 : 1;
  gradient.addColorStop(near, 'rgba(6, 2, 12, 0.52)');
  gradient.addColorStop(1 - near, 'rgba(6, 2, 12, 0)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, position === 'top' ? 0 : h - depth, w, depth);
}

/** The caption itself: Anton capitals, shrunk to fit, outlined and shadowed like poster lettering. */
function paintCaption(ctx, w, h, scene) {
  const text = (scene.caption ?? '').trim().toUpperCase();
  if (!text) return;
  let size = h * 0.115 * (scene.captionSize ?? 1);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  const setFont = () => { ctx.font = `${size}px Anton, 'Arial Narrow', sans-serif`; };
  setFont();
  try { ctx.letterSpacing = `${Math.max(1, size * 0.015)}px`; } catch { /* older engines */ }
  while (ctx.measureText(text).width > w * 0.92 && size > 14) {
    size -= 2;
    setFont();
  }
  const x = w / 2;
  const y = scene.captionPos === 'top' ? size + h * 0.045 : h - h * 0.055;
  ctx.lineJoin = 'round';
  ctx.miterLimit = 2;
  if (scene.captionStroke) {
    ctx.strokeStyle = '#0d0a14';
    ctx.lineWidth = size * 0.17;
    ctx.strokeText(text, x, y);
  }
  ctx.save();
  ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
  ctx.shadowBlur = size * 0.1;
  ctx.shadowOffsetY = size * 0.045;
  ctx.fillStyle = scene.captionColor || '#ffffff';
  ctx.fillText(text, x, y);
  ctx.restore();
  try { ctx.letterSpacing = '0px'; } catch { /* older engines */ }
}

/**
 * Draws the whole cover described by `scene` onto ctx at w by h.
 * scene: { layout, panels: [{img, dx, dy, zoom}], grade, caption, captionSize, captionColor,
 *          captionStroke, captionPos, vignette, halftone, selected }
 * When scene.selected names a panel, that panel's seam is lit so the editor can show the selection;
 * exports pass no selection and get the clean poster.
 */
export function drawCover(ctx, w, h, scene) {
  const layout = layoutById(scene.layout);
  const grade = gradeById(scene.grade);
  ctx.fillStyle = '#14091f';
  ctx.fillRect(0, 0, w, h);
  layout.panels.forEach((polygon, i) => {
    paintPanel(ctx, w, h, polygon, scene.panels[i] ?? {}, grade.filter);
  });
  paintGradient(ctx, w, h, grade.blend, 'soft-light', 0.85);
  paintGradient(ctx, w, h, grade.wash, 'source-over', 1);
  strokeSeams(ctx, w, h, layout);
  if (scene.halftone) paintHalftone(ctx, w, h);
  if (scene.vignette) paintVignette(ctx, w, h);
  if (scene.selected != null && layout.panels[scene.selected]) {
    tracePolygon(ctx, layout.panels[scene.selected], w, h);
    ctx.strokeStyle = '#22d3ee';
    ctx.lineWidth = Math.max(3, w * 0.004);
    ctx.stroke();
  }
  paintCaptionScrim(ctx, w, h, scene.captionPos);
  paintCaption(ctx, w, h, scene);
}
