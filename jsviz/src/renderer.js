import { createLayout } from "./layout.js";
import { orthogonalPath } from "./router.js";

const NS = "http://www.w3.org/2000/svg";
const svgNode = (name, attrs = {}) => { const node = document.createElementNS(NS, name); Object.entries(attrs).forEach(([k, v]) => { if (v != null) node.setAttribute(k, v); }); return node; };
const style = (value, fallback) => value == null ? fallback : value;

export function renderDiagram(model) {
  const layout = createLayout(model), boxes = new Map();
  model.elements.filter(e => e.kind !== "badge").forEach(e => boxes.set(e.id, layout.box(e.position)));
  const svg = svgNode("svg", { viewBox: `0 0 ${model.canvas.width} ${model.canvas.height}`, role: "img", "aria-label": model.title || "Architecture diagram" });
  const defs = svgNode("defs");
  defs.innerHTML = `<marker id="arrow-end" markerWidth="9" markerHeight="9" refX="8" refY="4.5" orient="auto" markerUnits="strokeWidth"><path d="M0,0 L9,4.5 L0,9 z" fill="context-stroke"/></marker><marker id="arrow-start" markerWidth="9" markerHeight="9" refX="1" refY="4.5" orient="auto-start-reverse" markerUnits="strokeWidth"><path d="M9,0 L0,4.5 L9,9 z" fill="context-stroke"/></marker>`;
  svg.append(defs, drawGrid(model, layout));

  [...model.layers].sort((a, b) => (a.zIndex || 0) - (b.zIndex || 0)).forEach(layer => {
    const group = svgNode("g", { "data-layer": layer.id || "", opacity: layer.opacity });
    layer.elements.forEach(element => group.append(drawElement(element, boxes, layout)));
    svg.append(group);
  });

  const connections = svgNode("g", { "data-layer": "connections" });
  model.connections.forEach((connection, index) => {
    const start = layout.port(boxes.get(connection.from.element), connection.from.port);
    const end = layout.port(boxes.get(connection.to.element), connection.to.port);
    const waypoints = (connection.waypoints || []).map(layout.point);
    const s = connection.style || {};
    const path = svgNode("path", {
      d: orthogonalPath(start, end, waypoints), class: "connection",
      stroke: style(s.stroke, "#7dd3fc"), "stroke-width": style(s.strokeWidth, 2.5),
      "stroke-dasharray": s.dash, opacity: s.opacity,
      "marker-end": s.arrow === "none" ? null : "url(#arrow-end)",
      "data-connection": connection.id || index
    });
    if (s.arrow === "both") path.setAttribute("marker-start", "url(#arrow-start)");
    connections.append(path);
  });
  svg.append(connections);
  return svg;
}

function drawGrid(model, layout) {
  const group = svgNode("g", { class: "grid-lines", stroke: "#5f7898", "stroke-width": 1 });
  for (let c = 0; c <= model.grid.columns; c++) { const x = c === model.grid.columns ? model.canvas.width - layout.padding : layout.point({ c, r: 0 }).x; group.append(svgNode("line", { x1: x, y1: layout.padding, x2: x, y2: model.canvas.height - layout.padding })); }
  for (let r = 0; r <= model.grid.rows; r++) { const y = r === model.grid.rows ? model.canvas.height - layout.padding : layout.point({ c: 0, r }).y; group.append(svgNode("line", { x1: layout.padding, y1: y, x2: model.canvas.width - layout.padding, y2: y })); }
  return group;
}

function drawElement(element, boxes, layout) {
  if (element.kind === "badge") return drawBadge(element, boxes, layout);
  const b = boxes.get(element.id), s = element.style || {}, group = svgNode("g", { "data-element-id": element.id, "data-kind": element.kind, opacity: s.opacity });
  const isNode = element.kind === "node", dashed = element.kind === "outline";
  group.append(svgNode("rect", {
    x: b.x, y: b.y, width: b.width, height: b.height,
    rx: style(s.radius, isNode ? 12 : 12),
    fill: style(s.fill, isNode ? "#172b46" : "#0f2034"),
    stroke: style(s.stroke, isNode ? "#4f89bd" : "#385879"),
    "stroke-width": style(s.strokeWidth, 2),
    "stroke-dasharray": style(s.dash, dashed ? "8 6" : null)
  }));
  if (isNode && element.icon) {
    const size = Math.min(style(s.iconSize, 42), b.height * .34), cx = b.x + b.width / 2, cy = b.y + b.height * .34;
    const icon = svgNode("rect", { x: cx - size / 2, y: cy - size / 2, width: size, height: size, rx: style(s.iconRadius, 9), class: "icon-placeholder", color: style(s.accent, "#67e8f9") });
    const text = svgNode("text", { x: cx, y: cy + 1, class: "icon-text", "font-size": Math.max(8, size * .26) }); text.textContent = String(element.icon).slice(0, 6).toUpperCase(); group.append(icon, text);
  }
  const titleAtTop = element.kind === "container" || dashed;
  const labelY = isNode && element.icon ? b.y + b.height * .72 : titleAtTop ? b.y + style(s.labelOffsetY, 20) : b.y + b.height / 2;
  const labelX = titleAtTop && s.labelAlign === "left" ? b.x + style(s.labelOffsetX, 14) : b.x + b.width / 2;
  addLabel(group, element.label || element.id, labelX, labelY, element.kind, s);
  return group;
}

function addLabel(group, label, x, y, kind, s) {
  const lines = Array.isArray(label) ? label : String(label).split("\n");
  const anchor = s.labelAlign === "left" ? "start" : "middle";
  const text = svgNode("text", { x, y: y - ((lines.length - 1) * 8), class: kind === "node" ? "element-label" : `${kind}-label`, "font-size": style(s.fontSize, kind === "node" ? 14 : 13), fill: s.labelColor, "text-anchor": anchor });
  lines.forEach((line, i) => { const span = svgNode("tspan", { x, dy: i ? "1.2em" : 0 }); span.textContent = line; text.append(span); }); group.append(text);
}

function drawBadge(element, boxes, layout) {
  const target = typeof element.target === "string" ? { id: element.target } : element.target;
  const b = boxes.get(target.id), corner = target.corner || element.corner || "top-right", offset = element.offset || target.offset || { c: 0, r: 0 };
  const anchors = { "top-left": [b.x, b.y], "top-right": [b.x + b.width, b.y], "bottom-left": [b.x, b.y + b.height], "bottom-right": [b.x + b.width, b.y + b.height] };
  const [ax, ay] = anchors[corner] || anchors["top-right"], x = ax + (offset.c || 0) * (layout.cellWidth + layout.gap), y = ay + (offset.r || 0) * (layout.cellHeight + layout.gap);
  const width = element.width || Math.max(28, String(element.label || "").length * 7 + 16), height = element.height || 24, group = svgNode("g", { "data-element-id": element.id, "data-kind": "badge" });
  group.append(svgNode("rect", { x: x - width / 2, y: y - height / 2, width, height, rx: height / 2, fill: style(element.style?.fill, "#e11d48"), stroke: style(element.style?.stroke, "#fecdd3"), "stroke-width": style(element.style?.strokeWidth, 1.5) }));
  const text = svgNode("text", { x, y, class: "badge-text" }); text.textContent = element.label || ""; group.append(text); return group;
}
