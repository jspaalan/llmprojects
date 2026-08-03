export function orthogonalPath(start, end, waypoints = []) {
  const points = [start, ...waypoints, end];
  const routed = [points[0]];
  for (let i = 1; i < points.length; i++) {
    const previous = routed.at(-1), next = points[i];
    if (previous.x !== next.x && previous.y !== next.y) routed.push({ x: next.x, y: previous.y });
    routed.push(next);
  }
  return routed.map((point, index) => `${index ? "L" : "M"} ${round(point.x)} ${round(point.y)}`).join(" ");
}
const round = number => Math.round(number * 100) / 100;
