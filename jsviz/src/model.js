const KINDS = new Set(["container", "outline", "shape", "node", "badge"]);
const PORTS = new Set(["top", "right", "bottom", "left"]);

function object(value, name) {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error(`${name} must be an object`);
}

function validateGrid(grid, name) {
  object(grid, name);
  for (const key of ["columns", "rows"]) {
    if (!Number.isInteger(grid[key]) || grid[key] < 1) throw new Error(`${name}.${key} must be a positive integer`);
  }
  for (const key of ["gap", "padding"]) {
    if (grid[key] != null && (!(grid[key] >= 0) || typeof grid[key] !== "number")) throw new Error(`${name}.${key} must be a non-negative number`);
  }
}

export function validateModel(model) {
  object(model, "Diagram"); object(model.canvas, "canvas"); validateGrid(model.grid, "grid");
  for (const key of ["width", "height"]) if (!(model.canvas[key] > 0)) throw new Error(`canvas.${key} must be a positive number`);
  if (!Array.isArray(model.layers)) throw new Error("layers must be an array");

  const elements = model.layers.flatMap((layer, li) => {
    object(layer, `layers[${li}]`);
    if (!Array.isArray(layer.elements)) throw new Error(`layers[${li}].elements must be an array`);
    return layer.elements;
  });
  const ids = new Set();
  elements.forEach((element, index) => {
    object(element, `element ${index}`);
    if (!element.id || ids.has(element.id)) throw new Error(`Element IDs must be present and unique (found "${element.id || ""}")`);
    ids.add(element.id);
    if (!KINDS.has(element.kind)) throw new Error(`Element "${element.id}" has unsupported kind "${element.kind}"`);
    if (element.kind === "badge") {
      if (!element.target) throw new Error(`Badge "${element.id}" needs a target`);
    } else {
      object(element.position, `position for "${element.id}"`);
      for (const key of ["c", "r", "w", "h"]) if (typeof element.position[key] !== "number") throw new Error(`position.${key} for "${element.id}" must be a number`);
      if (element.grid) validateGrid(element.grid, `grid for "${element.id}"`);
    }
  });

  const elementMap = new Map(elements.map(e => [e.id, e]));
  elements.forEach(element => {
    if (element.parent) {
      const parent = elementMap.get(element.parent);
      if (!parent) throw new Error(`Element "${element.id}" references missing parent "${element.parent}"`);
      if (!parent.grid) throw new Error(`Parent "${element.parent}" needs a grid for child "${element.id}"`);
      let cursor = parent;
      while (cursor?.parent) {
        if (cursor.parent === element.id) throw new Error(`Parent cycle detected at "${element.id}"`);
        cursor = elementMap.get(cursor.parent);
      }
    }
  });

  elements.filter(e => e.kind === "badge").forEach(e => {
    const target = typeof e.target === "string" ? e.target : e.target.id;
    if (!ids.has(target)) throw new Error(`Badge "${e.id}" references missing target "${target}"`);
  });

  const connections = model.connections || [];
  if (!Array.isArray(connections)) throw new Error("connections must be an array");
  connections.forEach((connection, index) => {
    for (const end of ["from", "to"]) {
      object(connection[end], `connections[${index}].${end}`);
      if (!ids.has(connection[end].element)) throw new Error(`Connection ${index + 1} references missing element "${connection[end].element}"`);
      if (!PORTS.has(connection[end].port)) throw new Error(`Connection ${index + 1} has invalid ${end} port "${connection[end].port}"`);
    }
  });
  return { ...model, connections, elements, elementMap };
}
