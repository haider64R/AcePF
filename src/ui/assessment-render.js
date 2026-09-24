import { getTopic } from "../content/index.js";
import { categoryOf } from "../content/taxonomy.js";
import { displayQuestionCode } from "./code-display.js";

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

const questionStyle = {
  "predict-output": "output tracing",
  "predict-value": "value tracing",
  "predict-array-state": "array-state tracing",
  "identify-error": "error spotting",
  "code-reasoning": "code reasoning",
  "code-completion": "code completion",
  "code-writing": "program writing",
  "short-answer": "short answers",
  "multiple-choice": "concept checks",
  flowchart: "flowcharts",
  pseudocode: "pseudocode",
};

function naturalList(values) {
  if (values.length < 2) return values[0] ?? "";
  if (values.length === 2) return values.join(" and ");
  return `${values.slice(0, -1).join(", ")} and ${values.at(-1)}`;
}

export function paperSummary(set) {
  const areas = [
    ...new Set(
      set.questions
        .map((q) => categoryOf(q.primaryTopic)?.title)
        .filter(Boolean),
    ),
  ];
  const styles = [
    ...new Set(
      set.questions.map(
        (q) => questionStyle[q.type] ?? q.type.replaceAll("-", " "),
      ),
    ),
  ];
  return `Available topics: ${areas.join(", ")}. Question styles: ${naturalList(styles)}.`;
}

export function questionBody(question, value = "", { active = false } = {}) {
  const options =
    question.type === "multiple-choice"
      ? `<fieldset class="answer-options"><legend>${active ? "Your answer" : "Choices"}</legend>${question.options.map((option) => `<label><input type="radio" name="answer" value="${esc(option.id)}" ${value === option.id ? "checked" : ""} ${active ? "" : "disabled"}><span>${esc(option.text)}</span></label>`).join("")}</fieldset>`
      : `<label for="answer">Your answer</label><textarea id="answer" name="answer" rows="${question.type === "code-writing" ? 8 : 3}" ${active ? "" : "readonly"} placeholder="${question.type === "code-writing" ? "Write or outline your solution" : "Enter your answer"}">${esc(value)}</textarea>`;
  return `<div class="question-meta"><span>${esc(sourceLabel(question))}</span><span>${esc(getTopic(question.primaryTopic)?.title ?? question.primaryTopic)}</span><span>${esc(question.difficulty)}</span><span>${esc(question.type.replaceAll("-", " "))}</span></div><h2>${esc(question.title)}</h2><p class="question-text">${esc(question.question)}</p>${questionCodeBlock(question)}${active || question.type === "multiple-choice" ? options : ""}`;
}

export function questionCodeBlock(question) {
  return question.code
    ? `<pre class="question-code" aria-label="C++ question code"><code>${esc(displayQuestionCode(question))}</code></pre>`
    : "";
}

export function visualizerLink(question, text = "Open in Visualizer ↗") {
  return question.visualizer.compatible
    ? `<a class="button-link" href="./visualizer.html?question=${encodeURIComponent(question.id)}">${esc(text)}</a>`
    : "";
}
