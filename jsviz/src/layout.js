export function createLayout(model) {
  const root = createGridSpace({ x: 0, y: 0, width: model.canvas.width, height: model.canvas.height }, model.grid);

  function resolveBoxes(elements, elementMap) {
    const boxes = new Map();
    const spaces = new Map([[null, root]]);
    const unresolved = [...elements].filter(element => element.kind !== "badge");

    while (unresolved.length) {
      let progress = false;
      for (let i = unresolved.length - 1; i >= 0; i--) {
        const element = unresolved[i];
        const parentId = element.parent || null;
        const parentSpace = spaces.get(parentId);
        if (!parentSpace) continue;

        const rect = parentSpace.box(element.position);
        boxes.set(element.id, rect);
        if (element.grid) spaces.set(element.id, createGridSpace(rect, element.grid));
        unresolved.splice(i, 1);
        progress = true;
      }
      if (!progress) {
        throw new Error(`Could not resolve nested layout for: ${unresolved.map(element => element.id).join(", ")}`);
      }
    }
    return { boxes, spaces };
  }

  return {
    ...root,
    resolveBoxes,
    port: (rect, side) => ({
      top: { x: rect.x + rect.width / 2, y: rect.y },
      right: { x: rect.x + rect.width, y: rect.y + rect.height / 2 },
      bottom: { x: rect.x + rect.width / 2, y: rect.y + rect.height },
      left: { x: rect.x, y: rect.y + rect.height / 2 }
    })[side]
  };
}

function createGridSpace(frame, grid) {
  const padding = Number(grid.padding || 0);
  const gap = Number(grid.gap || 0);
  const innerX = frame.x + padding;
  const innerY = frame.y + padding;
  const innerWidth = frame.width - padding * 2;
  const innerHeight = frame.height - padding * 2;
  const cellWidth = (innerWidth - gap * (grid.columns - 1)) / grid.columns;
  const cellHeight = (innerHeight - gap * (grid.rows - 1)) / grid.rows;
  if (cellWidth <= 0 || cellHeight <= 0) throw new Error("Grid padding and gaps do not fit inside the available frame");

  const point = ({ c, r }) => ({
    x: innerX + c * (cellWidth + gap),
    y: innerY + r * (cellHeight + gap)
  });
  const box = ({ c, r, w, h }) => ({
    ...point({ c, r }),
    width: w * cellWidth + (w - 1) * gap,
    height: h * cellHeight + (h - 1) * gap
  });

  return { frame, grid, padding, gap, cellWidth, cellHeight, point, box };
}
