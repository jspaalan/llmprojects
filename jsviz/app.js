import { validateModel } from "./src/model.js";
import { renderDiagram } from "./src/renderer.js";

const host = document.querySelector("#diagram");
const error = document.querySelector("#error");
const toggle = document.querySelector("#grid-toggle");

async function start() {
  try {
    const response = await fetch("./diagram.json", { cache: "no-cache" });
    if (!response.ok) throw new Error(`Could not load diagram.json (HTTP ${response.status})`);
    let data;
    try { data = await response.json(); } catch (cause) { throw new Error(`diagram.json is not valid JSON: ${cause.message}`); }
    const svg = renderDiagram(validateModel(data));
    host.replaceChildren(svg);
    toggle.addEventListener("change", () => svg.classList.toggle("show-grid", toggle.checked));
  } catch (cause) {
    host.replaceChildren(); error.hidden = false;
    error.textContent = `Unable to render the architecture diagram.\n${cause.message}\n\nCheck diagram.json and reload the page.`;
  }
}
start();
