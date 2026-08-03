export function createLayout(model) {
  const padding = Number(model.grid.padding || 0);
  const gap = Number(model.grid.gap || 0);
  const cellWidth = (model.canvas.width - padding * 2 - gap * (model.grid.columns - 1)) / model.grid.columns;
  const cellHeight = (model.canvas.height - padding * 2 - gap * (model.grid.rows - 1)) / model.grid.rows;
  if (cellWidth <= 0 || cellHeight <= 0) throw new Error("Grid padding and gaps do not fit inside the canvas");
  const point = ({ c, r }) => ({ x: padding + c * (cellWidth + gap), y: padding + r * (cellHeight + gap) });
  const box = ({ c, r, w, h }) => ({ ...point({ c, r }), width: w * cellWidth + (w - 1) * gap, height: h * cellHeight + (h - 1) * gap });
  const port = (rect, side) => ({
    top: { x: rect.x + rect.width / 2, y: rect.y }, right: { x: rect.x + rect.width, y: rect.y + rect.height / 2 },
    bottom: { x: rect.x + rect.width / 2, y: rect.y + rect.height }, left: { x: rect.x, y: rect.y + rect.height / 2 }
  })[side];
  return { padding, gap, cellWidth, cellHeight, point, box, port };
}
