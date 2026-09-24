import {
  categories,
  topics,
  notes,
  queryExamples,
  queryQuestions,
  getTopic,
} from "../content/index.js";
import { isWithinTopic } from "../content/taxonomy.js";
import { noteForTopic } from "../content/notes-routing.js";

export const esc = (value) =>
  String(value ?? "").replace(
    /[&<>"']/g,
    (char) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        char
      ],
  );
const href = (path, params) => `${path}?${new URLSearchParams(params)}`;

export function noteHref(topicId) {
  return href("./notes.html", { topic: topicId });
}
export function sampleHref(note, block) {
  return href("./index.html", { note: note.id, sample: block.sampleId });
}
export function exampleHref(example) {
  return href("./index.html", { example: example.id });
}
export function challengeHref(question) {
  return href("./index.html", { challenge: question.id });
}
export function questionHref(question) {
  return question.tags?.includes("challenge") && question.source.type === "authored"
    ? challengeHref(question)
    : href(question.autoGradable ? "./practice.html" : "./exam.html", { question: question.id });
}

export function renderBlock(block, note) {
  switch (block.type) {
    case "paragraph":
      return `<p>${esc(block.text)}</p>`;
    case "list":
      return `<ul class="note-list">${block.items.map((item) => `<li>${esc(item)}</li>`).join("")}</ul>`;
    case "steps":
      return `<ol class="note-steps">${block.items.map((item) => `<li>${esc(item)}</li>`).join("")}</ol>`;
    case "callout":
      return `<aside class="note-callout ${esc(block.tone)}"><strong>${block.tone === "trap" ? "Watch out" : "Trace tip"}</strong><p>${esc(block.text)}</p></aside>`;
    case "code":
      return `<figure class="note-code"><div class="note-code-head"><span>C++</span>${block.sampleId ? `<a href="${sampleHref(note, block)}">Open in Visualizer ↗</a>` : ""}</div><pre><code>${esc(block.text)}</code></pre>${block.caption ? `<figcaption>${esc(block.caption)}</figcaption>` : ""}</figure>`;
    case "table":
      return `<figure class="note-table"><div class="note-table-scroll"><table><thead><tr>${block.headers.map((cell) => `<th scope="col">${esc(cell)}</th>`).join("")}</tr></thead><tbody>${block.rows.map((row) => `<tr>${row.map((cell) => `<td>${esc(cell)}</td>`).join("")}</tr>`).join("")}</tbody></table></div>${block.caption ? `<figcaption>${esc(block.caption)}</figcaption>` : ""}</figure>`;
    case "comparison":
      return `<div class="note-comparison">${[block.left, block.right].map((side) => `<div><strong>${esc(side.label)}</strong><p>${esc(side.text)}</p></div>`).join("")}</div>`;
    case "memory":
      return `<figure class="note-memory"><div class="memory-sources">${block.pointers.map((name) => `<span>${esc(name)} <small>pointer</small></span>`).join("")}</div><div class="memory-arrows" aria-hidden="true">${block.pointers.map(() => `<span>→</span>`).join("")}</div><div class="memory-target"><strong>${esc(block.target.name)}</strong><span>${esc(block.target.value)}</span></div>${block.caption ? `<figcaption>${esc(block.caption)}</figcaption>` : ""}</figure>`;
    default:
      throw new Error(`Unknown note block ${block.type}`);
  }
}

export function relatedForNote(note) {
  const rank = (item) =>
    isWithinTopic(item.primaryTopic, note.topicId) ? 0 : 1;
  const matchedQuestions = queryQuestions({
    topicId: note.topicId,
    status: "verified",
  }).filter((item) => item.verification !== "manual-review" && item.verification !== "source-only");
  const directQuestions = matchedQuestions.filter((item) => rank(item) === 0);
  return {
    examples: queryExamples({ topicId: note.topicId })
      .filter((item) => item.visualizerCompatible)
      .sort((a, b) => rank(a) - rank(b))
      .slice(0, 3),
    questions: (directQuestions.length
      ? directQuestions
      : matchedQuestions
    ).slice(0, 3),
  };
}

export function renderNote(note) {
  const related = relatedForNote(note);
  const subtopics = topics.filter(
    (item) => item.parentId === note.topicId && item.kind === "topic",
  );
  const sections = note.sections
    .map(
      (part) =>
        `<section class="note-section" id="${esc(part.kind)}"><div class="note-section-head"><span>${esc(part.kind.replaceAll("-", " "))}</span><h2>${esc(part.title)}</h2></div>${part.blocks.map((block) => renderBlock(block, note)).join("")}</section>`,
    )
    .join("");
  const examplesHtml = related.examples.length
    ? related.examples
        .map(
          (item) =>
            `<a class="related-card" href="${exampleHref(item)}"><span>${esc(item.topic)} · ${esc(item.difficulty)}</span><strong>${esc(item.title)}</strong><small>View in Visualizer ↗</small></a>`,
        )
        .join("")
    : `<p class="muted">No matching examples yet.</p>`;
  const questionsHtml = related.questions.length
    ? related.questions
        .map(
          (item) =>
            `<a class="related-card" href="${questionHref(item)}"><span>${esc(item.source.type === "past-paper" ? "Past paper" : item.source.type === "practice" ? "Supplied practice" : "AcePF practice")} · ${esc(item.difficulty)}</span><strong>${esc(item.title)}</strong><small>Practice this topic ↗</small></a>`,
        )
        .join("")
    : `<p class="muted">No verified question for this area yet. Try a worked example above.</p>`;
  const concepts = note.relatedTopics
    .map((id) => `<span class="concept-chip">${esc(getTopic(id).title)}</span>`)
    .join("");
  return `<article class="note-article"><div class="note-breadcrumb"><a href="./notes.html">Notes</a><span>›</span>${esc(note.title)}</div><div class="note-intro"><span class="eyebrow">PROGRAMMING FUNDAMENTALS · FIELD GUIDE</span><h1>${esc(note.title)}</h1><p>${esc(note.lead)}</p></div><div class="note-concept-strip"><strong>In this area</strong><div>${subtopics.map((item) => `<span>${esc(item.title)}</span>`).join("")}</div></div><nav class="note-on-page" aria-label="On this page"><strong>Jump to</strong>${note.sections.map((part) => `<a href="#${esc(part.kind)}">${esc(part.kind.replaceAll("-", " "))}</a>`).join("")}</nav>${sections}<section class="note-related"><h2>Keep going</h2><h3>Related concepts</h3><div class="concepts">${concepts}</div><h3>Explore an example</h3><div class="related-grid">${examplesHtml}</div><h3>Practice with a Challenge</h3><div class="related-grid">${questionsHtml}</div></section></article>`;
}

export function renderLanding() {
  return `<div class="notes-landing"><span class="eyebrow">PROGRAMMING FUNDAMENTALS</span><h1>Notes for tracing code yourself.</h1><p class="landing-lead">Learn the rule, work through the state change, then test your reasoning in the Visualizer. Ten focused guides cover the current Programming Fundamentals curriculum.</p><label class="notes-search-label" for="notes-search">Find a field guide</label><input id="notes-search" type="search" placeholder="Search a topic…" autocomplete="off"><div class="note-card-grid" id="note-card-grid">${notes
    .map(
      (note, i) =>
        `<a class="note-card" data-search="${esc(
          `${note.title} ${note.lead} ${topics
            .filter((topic) => topic.id.startsWith(`${note.topicId}.`))
            .map((topic) => topic.title)
            .join(" ")}`.toLowerCase(),
        )}" href="${noteHref(note.topicId)}"><span>${String(i + 1).padStart(2, "0")} / FIELD GUIDE</span><h2>${esc(note.title)}</h2><p>${esc(note.lead)}</p><strong>Read notes →</strong></a>`,
    )
    .join(
      "",
    )}</div><p id="notes-no-results" hidden>No matching field guide. Try a broader topic.</p><h2 class="curriculum-heading">Curriculum map</h2><div class="curriculum-grid">${categories
    .map((category, index) => {
      const note = noteForTopic(category.id);
      return note
        ? `<a href="${noteHref(category.id)}"><span>${String(index + 1).padStart(2, "0")}</span><strong>${esc(category.title)}</strong><small>Read guide →</small></a>`
        : `<div class="pending"><span>${String(index + 1).padStart(2, "0")}</span><strong>${esc(category.title)}</strong><small>Guide unavailable</small></div>`;
    })
    .join("")}</div></div>`;
}
