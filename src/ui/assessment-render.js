import { getTopic } from "../content/index.js";

export const esc = (value) =>
  String(value ?? "").replace(
    /[&<>"']/g,
    (char) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        char
      ],
  );

export function sourceLabel(question) {
  if (question.source.type === "past-paper")
    return `FAST past paper · ${question.source.assessment}${question.source.year ? ` ${question.source.year}` : ""}`;
  if (question.source.type === "practice") return "Supplied course practice";
  return question.tags?.includes("assessment-style")
    ? "AcePF assessment-style practice"
    : "AcePF original practice";
}

export function sourceDetail(question) {
  if (question.source.type === "authored") return sourceLabel(question);
  const repeated = question.source.references
    ?.map(
      (ref) =>
        `also ${ref.document}, PDF p. ${ref.page}, ${ref.questionNumber}`,
    )
    .join("; ");
  return `${sourceLabel(question)} · ${question.source.document}, PDF p. ${question.source.page}, ${question.source.questionNumber}${question.source.marks ? ` · ${question.source.marks} ${question.source.marks === 1 ? "mark" : "marks"}` : ""}${repeated ? ` · ${repeated}` : ""}`;
}

export function questionBody(question, value = "", { active = false } = {}) {
  const options =
    question.type === "multiple-choice"
      ? `<fieldset class="answer-options"><legend>${active ? "Your answer" : "Choices"}</legend>${question.options.map((option) => `<label><input type="radio" name="answer" value="${esc(option.id)}" ${value === option.id ? "checked" : ""} ${active ? "" : "disabled"}><span>${esc(option.text)}</span></label>`).join("")}</fieldset>`
      : `<label for="answer">Your answer</label><textarea id="answer" name="answer" rows="${question.type === "code-writing" ? 8 : 3}" ${active ? "" : "readonly"} placeholder="${question.type === "code-writing" ? "Write or outline your solution" : "Enter your answer"}">${esc(value)}</textarea>`;
  return `<div class="question-meta"><span>${esc(sourceLabel(question))}</span><span>${esc(getTopic(question.primaryTopic)?.title ?? question.primaryTopic)}</span><span>${esc(question.difficulty)}</span><span>${esc(question.type.replaceAll("-", " "))}</span></div><h2>${esc(question.title)}</h2><p class="question-text">${esc(question.question)}</p>${question.code ? `<pre class="question-code"><code>${esc(question.code)}</code></pre>` : ""}${active || question.type === "multiple-choice" ? options : ""}`;
}

export function visualizerLink(question, text = "Open in Visualizer ↗") {
  return question.visualizer.compatible
    ? `<a class="button-link" href="./index.html?question=${encodeURIComponent(question.id)}">${esc(text)}</a>`
    : "";
}
