// Poster layouts for the cover studio: each layout is a set of panels, and each panel is a polygon in
// unit space (x and y run 0 to 1 across the cover). The polygons share slanted edges, so a layout tiles
// the whole frame with the angled cuts of a game-poster collage; the renderer expands each polygon a
// touch about its own centre before painting, so no gap of bare background can open along a seam.

export const LAYOUTS = [
  {
    id: 'classic',
    name: 'Classic Five',
    panels: [
      // The hero panel: big, top left, its right edge leaning as it drops.
      [[0, 0], [0.63, 0], [0.57, 0.56], [0, 0.56]],
      [[0.63, 0], [1, 0], [1, 0.31], [0.6, 0.39], [0.57, 0.56]],
      [[0.6, 0.39], [1, 0.31], [1, 0.68], [0.58, 0.62], [0.57, 0.56]],
      [[0, 0.56], [0.57, 0.56], [0.58, 0.62], [0.55, 1], [0, 1]],
      [[0.58, 0.62], [1, 0.68], [1, 1], [0.55, 1]],
    ],
  },
  {
    id: 'grid',
    name: 'Six Pack',
    panels: [
      [[0, 0], [0.36, 0], [0.33, 0.5], [0, 0.5]],
      [[0.36, 0], [0.68, 0], [0.7, 0.5], [0.33, 0.5]],
      [[0.68, 0], [1, 0], [1, 0.5], [0.7, 0.5]],
      [[0, 0.5], [0.33, 0.5], [0.36, 1], [0, 1]],
      [[0.33, 0.5], [0.7, 0.5], [0.67, 1], [0.36, 1]],
      [[0.7, 0.5], [1, 0.5], [1, 1], [0.67, 1]],
    ],
  },
  {
    id: 'hero',
    name: 'Hero & Strips',
    panels: [
      // One tall hero down the left, three strips stacked down the right.
      [[0, 0], [0.58, 0], [0.52, 1], [0, 1]],
      [[0.58, 0], [1, 0], [1, 0.34], [0.56, 0.34]],
      [[0.56, 0.34], [1, 0.34], [1, 0.67], [0.54, 0.67]],
      [[0.54, 0.67], [1, 0.67], [1, 1], [0.52, 1]],
    ],
  },
  {
    id: 'slice',
    name: 'Vice Slice',
    panels: [
      // Three leaning bands across the frame, the middle one cut in two.
      [[0, 0], [0.42, 0], [0.18, 1], [0, 1]],
      [[0.42, 0], [0.72, 0], [0.615, 0.5], [0.315, 0.5]],
      [[0.315, 0.5], [0.615, 0.5], [0.48, 1], [0.18, 1]],
      [[0.72, 0], [1, 0], [1, 1], [0.48, 1]],
    ],
  },
];

/** The layout with this id, or the first layout when the id names none. */
export function layoutById(id) {
  return LAYOUTS.find((layout) => layout.id === id) ?? LAYOUTS[0];
}

/** The centre and bounding box of a unit-space polygon, in unit space. */
export function panelFrame(polygon) {
  let minX = 1, minY = 1, maxX = 0, maxY = 0, cx = 0, cy = 0;
  for (const [x, y] of polygon) {
    minX = Math.min(minX, x); maxX = Math.max(maxX, x);
    minY = Math.min(minY, y); maxY = Math.max(maxY, y);
    cx += x; cy += y;
  }
  return {
    minX, minY, maxX, maxY,
    width: maxX - minX, height: maxY - minY,
    cx: cx / polygon.length, cy: cy / polygon.length,
  };
}

/** The polygon grown a little about its own centre, so painted panels overlap their seams slightly. */
export function grownPolygon(polygon, amount = 0.012) {
  const { cx, cy } = panelFrame(polygon);
  return polygon.map(([x, y]) => [cx + (x - cx) * (1 + amount), cy + (y - cy) * (1 + amount)]);
}

/** True when the unit-space point falls inside the polygon (ray casting). */
export function pointInPolygon(polygon, px, py) {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const [xi, yi] = polygon[i];
    const [xj, yj] = polygon[j];
    if ((yi > py) !== (yj > py) && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}
