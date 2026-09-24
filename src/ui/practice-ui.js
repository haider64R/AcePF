import { categories, coreScopes, questions } from "../content/index.js";
import {
  challengeCandidates,
  createSession,
  gradeQuestion,
  gradeSession,
  saveAnswer,
  selectQuestions,
  submitSession,
} from "../learning/assessment.js";
import {
  esc,
  questionBody,
  sourceDetail,
  visualizerLink,
} from "./assessment-render.js";

const app = document.querySelector("#app");
const params = new URLSearchParams(location.search);
let session = null;
let checked = false;
let result = null;
let filters = { scopeId: "full-pf", topicId: "", difficulty: "" };
let count = 5;
const header = `<header class="topbar"><a class="brand" href="./home.html"><span class="brand-icon">A<span>+</span></span><span>Ace<span class="brand-muted">PF</span></span></a><nav class="product-nav" aria-label="Primary"><a href="./home.html">Home</a><a href="./index.html">Visualizer</a><a href="./notes.html">Notes</a><a href="./practice.html" aria-current="page">Challenges</a><a href="./exam.html">Exam Mode</a><a href="./index.html?examples=1">Examples</a></nav></header>`;
function pool() {
  return challengeCandidates({
    scopeId: filters.scopeId,
    ...(filters.topicId ? { topicId: filters.topicId } : {}),
    ...(filters.difficulty ? { difficulty: filters.difficulty } : {}),
  });
}
function renderSetup(message = "") {
  const available = pool().length;
  const options = [1, 3, 5, 10, 15, 20].filter((n) => n <= available);
  if (!options.includes(count)) count = options[0] ?? 0;
  app.innerHTML = `${header}<main class="assessment-shell"><div class="assessment-intro"><span class="eyebrow">PRACTICE YOUR REASONING</span><h1>Challenges</h1><p>Choose a scope, predict each result, then inspect the explanation. Questions come from the shared AcePF bank; historical sources stay labelled.</p></div><section class="assessment-card setup-card"><h2>Configure a set</h2><div class="setup-grid"><label>Scope<select id="scope">${coreScopes.map((s) => `<option value="${s.id}" ${s.id === filters.scopeId ? "selected" : ""}>${esc(s.title)}</option>`).join("")}</select></label><label>Topic<select id="topic"><option value="">All topics</option>${categories.map((c) => `<option value="${c.id}" ${c.id === filters.topicId ? "selected" : ""}>${esc(c.title)}</option>`).join("")}</select></label><label>Difficulty<select id="difficulty"><option value="">Mixed</option>${["easy", "medium", "hard"].map((d) => `<option value="${d}" ${d === filters.difficulty ? "selected" : ""}>${d[0].toUpperCase() + d.slice(1)}</option>`).join("")}</select></label><label>Questions<select id="count">${options.map((n) => `<option value="${n}" ${n === count ? "selected" : ""}>${n}</option>`).join("")}</select></label></div><p class="availability">${available} eligible auto-gradable questions match these filters.${!options.length ? " Broaden the scope or topic to start a set." : ""}</p><button id="start" class="primary" ${options.length ? "" : "disabled"}>Start challenges →</button>${message ? `<p class="form-message" role="status">${esc(message)}</p>` : ""}</section></main>`;
  for (const key of ["scope", "topic", "difficulty", "count"])
    app.querySelector(`#${key}`)?.addEventListener("change", (event) => {
      if (key === "count") count = Number(event.target.value);
      else
        filters[
          key === "scope"
            ? "scopeId"
            : key === "topic"
              ? "topicId"
              : "difficulty"
        ] = event.target.value;
      renderSetup();
    });
  app.querySelector("#start")?.addEventListener("click", () => {
    const chosen = selectQuestions(pool(), count, Date.now());
    session = createSession({
      kind: "challenge",
      title: "Challenge practice",
      questionIds: chosen.map((q) => q.id),
    });
    checked = false;
    renderQuestion();
  });
}
function current() {
  return questions.find((q) => q.id === session.questionIds[session.index]);
}
function answerValue() {
  return (
    app.querySelector('input[name="answer"]:checked')?.value ??
    app.querySelector("#answer")?.value ??
    ""
  );
}
function renderQuestion() {
  const q = current(),
    value = session.answers[q.id] ?? "";
  app.innerHTML = `${header}<main class="assessment-shell"><div class="assessment-intro compact"><span class="eyebrow">CHALLENGE ${session.index + 1} OF ${session.questionIds.length}</span><h1>${esc(session.title)}</h1><p>Predict first. The explanation appears after you check.</p></div><section class="assessment-card question-card">${questionBody(q, value, { active: !checked })}${checked ? `<div class="feedback ${gradeQuestion(q, value) ? "correct" : "incorrect"}" role="status"><strong>${gradeQuestion(q, value) ? "Correct" : "Not quite"}</strong><p>Expected answer: <code>${esc(q.answer)}</code></p><p>${esc(q.explanation)}</p><small>${esc(sourceDetail(q))}</small><div>${visualizerLink(q)}</div></div>` : ""}<div class="assessment-actions">${checked ? `<button id="next" class="primary">${session.index + 1 === session.questionIds.length ? "View results" : "Next question →"}</button>` : `<button id="check" class="primary">Check answer</button><button id="skip" class="quiet">Skip</button>`}</div></section></main>`;
  app.querySelector("#check")?.addEventListener("click", () => {
    const response = answerValue();
    if (!response.trim()) {
      app
        .querySelector(".assessment-actions")
        .insertAdjacentHTML(
          "afterbegin",
          '<p class="form-message" role="alert">Enter an answer or choose Skip.</p>',
        );
      return;
    }
    session = saveAnswer(session, q.id, response);
    checked = true;
    renderQuestion();
  });
  app.querySelector("#skip")?.addEventListener("click", () => {
    session = saveAnswer(session, q.id, "");
    checked = true;
    renderQuestion();
  });
  app.querySelector("#next")?.addEventListener("click", () => {
    if (session.index + 1 === session.questionIds.length) {
      session = submitSession(session);
      result = gradeSession(session);
      renderResults();
    } else {
      session = { ...session, index: session.index + 1 };
      checked = false;
      renderQuestion();
    }
  });
}
function renderResults() {
  app.innerHTML = `${header}<main class="assessment-shell"><div class="assessment-intro"><span class="eyebrow">CHALLENGE REVIEW</span><h1>${result.correct} / ${result.graded} correct</h1><p>Review the questions you missed, then use the Visualizer to trace compatible programs.</p></div><section class="assessment-card"><h2>Topic breakdown</h2>${Object.entries(
    result.byCategory,
  )
    .map(
      ([id, value]) =>
        `<p>${esc(categories.find((category) => category.id === id)?.title ?? id)}: ${value.correct}/${value.total}</p>`,
    )
    .join(
      "",
    )}</section><div class="assessment-actions"><button id="again" class="primary">New set</button><a class="button-link" href="./notes.html">Review Notes</a></div><div class="review-list">${result.items.map((item, i) => `<article class="assessment-card"><div class="question-meta"><span>${i + 1} / ${result.items.length}</span><span>${item.correct ? "Correct" : "Incorrect or skipped"}</span><span>${esc(sourceDetail(item.question))}</span></div><h2>${esc(item.question.title)}</h2><p>Your answer: <code>${esc(item.response || "—")}</code></p><p>Expected: <code>${esc(item.question.answer)}</code></p><p>${esc(item.question.explanation)}</p>${visualizerLink(item.question)}</article>`).join("")}</div></main>`;
  app.querySelector("#again").addEventListener("click", () => {
    session = null;
    result = null;
    renderSetup();
  });
}
const requested = params.get("question");
const linked = questions.find((q) => q.id === requested);
if (
  linked?.autoGradable &&
  [
    "predict-output",
    "predict-value",
    "predict-array-state",
    "multiple-choice",
  ].includes(linked.type)
) {
  session = createSession({
    kind: "challenge",
    title: "Practice this question",
    questionIds: [linked.id],
  });
  renderQuestion();
} else
  renderSetup(
    requested
      ? "This question requires manual review; browse it in Exam Mode's Question Bank."
      : "",
  );
