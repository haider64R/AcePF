import { categories, notes } from "../content/index.js";
import { noteForTopic } from "../content/notes-routing.js";
import { esc, noteHref, renderLanding, renderNote } from "./notes-render.js";

const requested = new URLSearchParams(location.search).get("topic");
const note = noteForTopic(requested);
const sidebar = categories
  .map((category) => {
    const item = noteForTopic(category.id);
    return item
      ? `<a href="${noteHref(category.id)}" ${note?.id === item.id ? 'aria-current="page"' : ""}>${esc(category.title)}</a>`
      : `<span class="notes-pending">${esc(category.title)} <small>planned</small></span>`;
  })
  .join("");
document.querySelector("#app").innerHTML =
  `<header class="topbar"><a class="brand" href="./index.html" aria-label="C++ Execution Visualizer"><span class="brand-icon">C<span>++</span></span><span>Execution<span class="brand-muted"> Visualizer</span></span></a><span class="course">PROGRAMMING FUNDAMENTALS</span><a class="quiet" href="./notes.html" aria-current="${note ? "false" : "page"}">▤ Notes</a><a class="quiet" href="./index.html">↗ Visualizer</a></header><div class="notes-shell"><aside class="notes-sidebar" aria-label="Notes categories"><a class="sidebar-home" href="./notes.html">All notes</a><h2>Topics</h2><nav>${sidebar}</nav><p>${notes.length} field guides available</p></aside><main class="notes-main">${note ? renderNote(note) : requested ? `<div class="notes-missing"><h1>Guide not available yet</h1><p>This category is mapped, but its notes have not been authored.</p><a href="./notes.html">← All notes</a></div>` : renderLanding()}</main></div>`;
document.querySelector("#notes-search")?.addEventListener("input", (event) => {
  const value = event.target.value.trim().toLowerCase();
  let count = 0;
  for (const card of document.querySelectorAll(".note-card")) {
    const visible = card.dataset.search.includes(value);
    card.hidden = !visible;
    if (visible) count++;
  }
  document.querySelector("#notes-no-results").hidden = count !== 0;
});
