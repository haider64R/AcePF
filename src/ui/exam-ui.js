import {
  assessmentProfiles,
  categories,
  coreScopes,
  questions,
  queryQuestions,
  topics,
} from "../content/index.js";
import {
  createSession,
  gradeSession,
  mockCandidates,
  moveTo,
  pastPaperSets,
  saveAnswer,
  secondsLeft,
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
const key = "acepf-exam-session-v1";
let view = params.get("question") ? "bank" : "papers";
let filters = {
  category: "",
  subtopic: "",
  difficulty: "",
  type: "",
  sourceType: "",
  assessment: "",
  year: "",
  semester: "",
  auto: "",
  visualizer: "",
};
let mock = { profile: "sessional-1", scope: "through-selection", count: 5 };
let session = restore();
let reveal = false;
let visibleCount = 12;
let message = "";
const header = `<header class="topbar"><a class="brand" href="./home.html"><span class="brand-icon">A<span>+</span></span><span>Ace<span class="brand-muted">PF</span></span></a><nav class="product-nav" aria-label="Primary"><a href="./home.html">Home</a><a href="./index.html">Visualizer</a><a href="./notes.html">Notes</a><a href="./practice.html">Challenges</a><a href="./exam.html" aria-current="page">Exam Mode</a><a href="./index.html?examples=1">Examples</a></nav></header>`;
const activeHeader = `<header class="topbar"><span class="brand"><span class="brand-icon">A<span>+</span></span><span>Ace<span class="brand-muted">PF</span></span></span><span class="course">INDEPENDENT ATTEMPT</span></header>`;
function persist() {
  try {
    if (session) localStorage.setItem(key, JSON.stringify(session));
    else localStorage.removeItem(key);
  } catch {}
}
function restore() {
  try {
    const value = JSON.parse(localStorage.getItem(key));
    if (
      value &&
      ["mock", "past-paper"].includes(value.kind) &&
      Array.isArray(value.questionIds) &&
      value.questionIds.length &&
      value.questionIds.every((id) => questions.some((q) => q.id === id)) &&
      value.answers &&
      Number.isInteger(value.index) &&
      value.index >= 0 &&
      value.index < value.questionIds.length
    )
      return value;
  } catch {}
  return null;
}
function opt(items, selected, all = "All") {
  return `<option value="">${esc(all)}</option>${items.map(([id, title]) => `<option value="${esc(id)}" ${String(id) === String(selected) ? "selected" : ""}>${esc(title)}</option>`).join("")}`;
}
function tabbar() {
  return `<div class="exam-tabs" role="tablist" aria-label="Exam Mode sections">${[
    ["bank", "Question Bank"],
    ["papers", "Past Papers"],
    ["mocks", "Mock Exams"],
  ]
    .map(
      ([id, label]) =>
        `<button type="button" data-view="${id}" aria-current="${view === id ? "page" : "false"}">${label}</button>`,
    )
    .join("")}</div>`;
}
function shell(title, intro, body) {
  app.innerHTML = `${header}<main class="assessment-shell"><div class="assessment-intro"><span class="eyebrow">EXAM MODE</span><h1>${esc(title)}</h1><p>${esc(intro)}</p></div>${tabbar()}${body}</main>`;
  app.querySelectorAll("[data-view]").forEach((button) =>
    button.addEventListener("click", () => {
      view = button.dataset.view;
      reveal = false;
      visibleCount = 12;
      params.delete("question");
      history.replaceState(null, "", "./exam.html");
      render();
    }),
  );
}
function browsePool() {
  let pool = queryQuestions({
    ...(filters.category
      ? { topicId: filters.subtopic || filters.category }
      : {}),
    ...(filters.difficulty ? { difficulty: filters.difficulty } : {}),
    ...(filters.type ? { type: filters.type } : {}),
    ...(filters.sourceType ? { sourceType: filters.sourceType } : {}),
    ...(filters.assessment ? { assessment: filters.assessment } : {}),
    ...(filters.year ? { year: Number(filters.year) } : {}),
    ...(filters.auto ? { autoGradable: filters.auto === "yes" } : {}),
    ...(filters.visualizer
      ? { visualizerCompatible: filters.visualizer === "yes" }
      : {}),
  });
  if (filters.semester)
    pool = pool.filter((q) => q.source.semester === filters.semester);
  return pool;
}
function renderBank() {
  const selected = questions.find((q) => q.id === params.get("question"));
  if (selected) {
    shell(
      "Question Bank",
      "Inspect this question, then reveal its reference answer when you are ready.",
      `<article class="assessment-card question-card"><p><a href="./exam.html">← All questions</a></p>${questionBody(selected)}<p class="muted">${esc(sourceDetail(selected))}</p>${selected.status !== "verified" ? '<p class="form-message">This imported source record has not been answer-verified. Use its reference for discussion, not automatic scoring.</p>' : ""}<button id="reveal" class="quiet">${reveal ? "Hide answer" : "Reveal answer"}</button>${reveal ? `<div class="feedback"><p>Reference answer: <code>${esc(selected.answer ?? "Not supplied")}</code></p><p>${esc(selected.explanation ?? "")}</p>${visualizerLink(selected)}</div>` : ""}</article>`,
    );
    app.querySelector("#reveal").addEventListener("click", () => {
      reveal = !reveal;
      renderBank();
    });
    return;
  }
  const subtopics = topics.filter(
    (t) =>
      filters.category &&
      t.id.startsWith(`${filters.category}.`) &&
      t.kind !== "category",
  );
  const years = [
    ...new Set(questions.map((q) => q.source.year).filter(Boolean)),
  ].sort((a, b) => b - a);
  const keys = [
    ["category", "Major topic", categories.map((c) => [c.id, c.title])],
    ["subtopic", "Subtopic", subtopics.map((t) => [t.id, t.title])],
    ["difficulty", "Difficulty", ["easy", "medium", "hard"].map((x) => [x, x])],
    [
      "type",
      "Question type",
      [...new Set(questions.map((q) => q.type))].map((x) => [
        x,
        x.replaceAll("-", " "),
      ]),
    ],
    [
      "sourceType",
      "Source class",
      [
        ["past-paper", "Genuine FAST exam"],
        ["practice", "Supplied practice"],
        ["authored", "AcePF authored"],
      ],
    ],
    [
      "assessment",
      "Assessment",
      [
        ...new Set(questions.map((q) => q.source.assessment).filter(Boolean)),
      ].map((x) => [x, x]),
    ],
    ["year", "Year", years.map((x) => [x, x])],
    [
      "semester",
      "Semester",
      [
        ["Fall", "Fall"],
        ["Spring", "Spring"],
      ],
    ],
    [
      "auto",
      "Automatic scoring",
      [
        ["yes", "Yes"],
        ["no", "Manual review"],
      ],
    ],
    [
      "visualizer",
      "Visualizer",
      [
        ["yes", "Compatible"],
        ["no", "Not compatible"],
      ],
    ],
  ];
  const pool = browsePool();
  shell(
    "Question Bank",
    "Browse the shared bank. Genuine exam questions, supplied practice and AcePF originals are labelled separately.",
    `<section class="assessment-card"><div class="filter-grid">${keys.map(([id, label, items]) => `<label>${label}<select data-filter="${id}" ${id === "subtopic" && !filters.category ? "disabled" : ""}>${opt(items, filters[id])}</select></label>`).join("")}</div><p class="availability">${pool.length} questions match. Filter the bank or inspect a question to reveal its reference answer.</p></section><div class="question-list">${pool
      .slice(0, visibleCount)
      .map(
        (q) =>
          `<article class="assessment-card"><div class="question-meta"><span>${esc(sourceDetail(q))}</span><span>${esc(q.difficulty)}</span><span>${q.autoGradable ? "Auto-gradable" : "Manual review"}</span><span>${q.status === "verified" ? "Verified" : "Source record · unverified answer"}</span></div><h2>${esc(q.title)}</h2><p class="question-text">${esc(q.question)}</p><a class="button-link" href="./exam.html?question=${encodeURIComponent(q.id)}">Inspect question →</a></article>`,
      )
      .join(
        "",
      )}</div>${pool.length > visibleCount ? `<button id="more-questions" class="quiet">Show more questions (${Math.min(visibleCount, pool.length)} of ${pool.length})</button>` : ""}`,
  );
  app.querySelectorAll("[data-filter]").forEach((el) =>
    el.addEventListener("change", () => {
      filters[el.dataset.filter] = el.value;
      if (el.dataset.filter === "category") filters.subtopic = "";
      visibleCount = 12;
      params.delete("question");
      history.replaceState(null, "", "./exam.html");
      renderBank();
    }),
  );
  app.querySelector("#more-questions")?.addEventListener("click", () => {
    const nextCard = visibleCount;
    visibleCount += 12;
    renderBank();
    app.querySelectorAll(".question-list article")[nextCard]?.scrollIntoView();
  });
}
function renderPapers() {
  const sets = pastPaperSets();
  shell(
    "Past Papers",
    "Verified questions from supplied FAST exams. Every set is partial; missing questions are never reconstructed.",
    `<div class="paper-grid">${sets.map((set, i) => `<article class="assessment-card"><div class="question-meta"><span>GENUINE FAST EXAM</span><span>Partial question set</span></div><h2>${esc(set.source.assessment)} · ${esc(set.source.semester ?? "")} ${esc(set.source.year ?? "")}</h2><p>${esc(set.source.document)}</p><p class="muted">${set.questions.length} verified imported question${set.questions.length === 1 ? "" : "s"} · ${esc(set.source.structure)}</p>${set.source.review ? `<p class="muted">${esc(set.source.review)}</p>` : ""}${set.questions.length ? `<button class="primary" data-paper="${i}">Attempt available questions →</button>` : '<p class="availability">No individual questions imported from this document.</p>'}</article>`).join("")}</div>`,
  );
  app.querySelectorAll("[data-paper]").forEach((b) =>
    b.addEventListener("click", () => {
      const set = sets[Number(b.dataset.paper)];
      session = createSession({
        kind: "past-paper",
        title: `${set.source.assessment} · ${set.source.semester ?? ""} ${set.source.year ?? ""} (partial)`,
        questionIds: set.questions.map((q) => q.id),
        durationSeconds: null,
      });
      persist();
      render();
    }),
  );
}
function renderMocks() {
  const { profile, pool } = mockCandidates(mock.profile, mock.scope);
  const counts = [5, 10, 15].filter((n) => n <= pool.length);
  if (!counts.includes(mock.count)) mock.count = counts[0] ?? 0;
  shell(
    "Mock Exams",
    "AcePF-authored practice informed by the supplied assessment profiles. These are not historical FAST papers or a fixed prediction of any exam.",
    `<section class="assessment-card"><h2>Configure a practice mock</h2><div class="setup-grid"><label>Assessment profile<select id="profile">${assessmentProfiles.map((p) => `<option value="${p.id}" ${p.id === mock.profile ? "selected" : ""}>${esc(p.assessment)} style</option>`).join("")}</select></label><label>Curriculum ceiling<select id="scope">${coreScopes.map((s) => `<option value="${s.id}" ${s.id === mock.scope ? "selected" : ""}>${esc(s.title)}</option>`).join("")}</select></label><label>Questions<select id="count">${counts.map((n) => `<option value="${n}" ${n === mock.count ? "selected" : ""}>${n}</option>`).join("")}</select></label><label>Time limit<select id="duration"><option value="30">30 minutes</option><option value="45">45 minutes</option><option value="60">60 minutes</option><option value="90">90 minutes</option></select></label></div><p class="muted">${pool.length} eligible AcePF authored, auto-gradable questions. Profile evidence: ${esc(profile.marks)}.</p><p class="muted">Observed formats: ${esc(profile.formats.join(", "))}. Actual supplied papers vary. This V1 mock samples auto-gradable questions; open coding formats are available in the Question Bank and partial past-paper sets.</p><button id="start" class="primary" ${counts.length ? "" : "disabled"}>Start mock →</button></section>`,
  );
  app.querySelector("#profile").addEventListener("change", (e) => {
    mock.profile = e.target.value;
    mock.scope =
      mock.profile === "sessional-1"
        ? "through-selection"
        : mock.profile === "sessional-2"
          ? "through-arrays"
          : "full-pf";
    renderMocks();
  });
  app.querySelector("#scope").addEventListener("change", (e) => {
    mock.scope = e.target.value;
    renderMocks();
  });
  app.querySelector("#count")?.addEventListener("change", (e) => {
    mock.count = Number(e.target.value);
  });
  app.querySelector("#start")?.addEventListener("click", () => {
    const chosen = selectQuestions(
      mockCandidates(mock.profile, mock.scope).pool,
      mock.count,
      Date.now(),
    );
    session = createSession({
      kind: "mock",
      title: `${profile.assessment} style · AcePF practice mock`,
      questionIds: chosen.map((q) => q.id),
      durationSeconds: Number(app.querySelector("#duration").value) * 60,
    });
    persist();
    render();
  });
}
function current() {
  return questions.find((q) => q.id === session.questionIds[session.index]);
}
function capture() {
  const q = current();
  const value =
    app.querySelector('input[name="answer"]:checked')?.value ??
    app.querySelector("#answer")?.value ??
    "";
  session = saveAnswer(session, q.id, value);
  persist();
}
function renderActive() {
  if (secondsLeft(session) === 0) {
    session = submitSession(session);
    persist();
    render();
    return;
  }
  const q = current(),
    answered = Object.values(session.answers).filter((x) =>
      String(x).trim(),
    ).length;
  app.innerHTML = `${activeHeader}<main class="assessment-shell"><div class="assessment-intro compact"><span class="eyebrow">ACTIVE ${session.kind === "mock" ? "PRACTICE MOCK" : "PAST PAPER QUESTION SET"}</span><h1>${esc(session.title)}</h1><p>Work independently. Answers, explanations and the Visualizer become available after submission.</p></div><div class="session-bar"><strong>Question ${session.index + 1} of ${session.questionIds.length} · ${answered} answered</strong><span id="timer" role="timer"></span></div><nav class="session-nav" aria-label="Questions">${session.questionIds.map((id, i) => `<button data-go="${i}" class="${i === session.index ? "current" : ""} ${session.answers[id]?.trim() ? "answered" : ""}" aria-label="Question ${i + 1}${session.answers[id]?.trim() ? ", answered" : ""}">${i + 1}</button>`).join("")}</nav><section class="assessment-card question-card">${questionBody(q, session.answers[q.id] ?? "", { active: true })}<p class="muted">${q.autoGradable ? "Automatically scored after submission" : "Requires manual review; excluded from automatic score."}</p><div class="assessment-actions"><button id="previous" ${session.index === 0 ? "disabled" : ""}>← Previous</button><button id="next" ${session.index === session.questionIds.length - 1 ? "disabled" : ""}>Next →</button><button id="submit" class="primary">Submit ${session.kind === "mock" ? "mock" : "set"}</button></div>${message ? `<p class="form-message" role="status">${esc(message)}</p>` : ""}</section></main>`;
  const timer = app.querySelector("#timer");
  const tick = () => {
    if (!session || session.submittedAt !== null) return;
    const left = secondsLeft(session);
    timer.textContent =
      left === null
        ? "Untimed"
        : `Time left ${Math.floor(left / 60)}:${String(left % 60).padStart(2, "0")}`;
    if (left === 0) {
      session = submitSession(session);
      persist();
      render();
    }
  };
  tick();
  app.querySelectorAll("[data-go]").forEach((b) =>
    b.addEventListener("click", () => {
      capture();
      session = moveTo(session, Number(b.dataset.go));
      persist();
      message = "";
      render();
    }),
  );
  for (const [id, delta] of [
    ["previous", -1],
    ["next", 1],
  ])
    app.querySelector(`#${id}`)?.addEventListener("click", () => {
      capture();
      session = moveTo(session, session.index + delta);
      persist();
      message = "";
      render();
    });
  app.querySelector("#answer")?.addEventListener("input", capture);
  app
    .querySelectorAll('input[name="answer"]')
    .forEach((input) => input.addEventListener("change", capture));
  app.querySelector("#submit").addEventListener("click", () => {
    capture();
    const unanswered = session.questionIds.filter(
      (id) => !session.answers[id]?.trim(),
    ).length;
    if (unanswered && !message) {
      message = `${unanswered} unanswered question${unanswered === 1 ? "" : "s"}. Select Submit again to finish.`;
      render();
      return;
    }
    session = submitSession(session);
    persist();
    render();
  });
}
function renderResults() {
  const result = gradeSession(session);
  app.innerHTML = `${header}<main class="assessment-shell"><div class="assessment-intro"><span class="eyebrow">SUBMITTED · ${session.kind === "mock" ? "PRACTICE MOCK" : "PARTIAL PAST PAPER"}</span><h1>${esc(session.title)}</h1><p>${result.graded ? `${result.correct} of ${result.graded} automatically graded questions correct (${result.percentage}%).` : "No questions could be graded automatically."} ${result.manual ? `${result.manual} require manual review and are excluded from that score.` : ""}</p></div><div class="result-stat"><span>Correct: ${result.correct}</span><span>Auto-graded: ${result.graded}</span><span>Manual review: ${result.manual}</span></div><section class="assessment-card"><h2>Topic breakdown</h2>${
    Object.entries(result.byCategory)
      .map(
        ([id, x]) =>
          `<p>${esc(categories.find((c) => c.id === id)?.title ?? id)}: ${x.correct}/${x.total}</p>`,
      )
      .join("") || "<p>No automatically graded questions.</p>"
  }</section><button id="new" class="primary">Return to Exam Mode</button><div class="review-list">${result.items.map((item, i) => `<article class="assessment-card"><div class="question-meta"><span>${i + 1} / ${result.items.length}</span><span>${item.correct === null ? "Manual review" : item.correct ? "Correct" : "Incorrect or unanswered"}</span><span>${esc(sourceDetail(item.question))}</span></div><h2>${esc(item.question.title)}</h2><p>${esc(item.question.question)}</p>${item.question.code ? `<pre class="question-code"><code>${esc(item.question.code)}</code></pre>` : ""}<p>Your answer: <code>${esc(item.response || "—")}</code></p><p>Reference answer: <code>${esc(item.question.answer ?? "Not supplied")}</code></p><p>${esc(item.question.explanation ?? "")}</p>${visualizerLink(item.question)}</article>`).join("")}</div></main>`;
  app.querySelector("#new").addEventListener("click", () => {
    session = null;
    persist();
    message = "";
    render();
  });
}
function render() {
  if (session) {
    session.submittedAt === null ? renderActive() : renderResults();
    return;
  }
  if (view === "bank") renderBank();
  else if (view === "mocks") renderMocks();
  else renderPapers();
}
setInterval(() => {
  if (session?.submittedAt === null) {
    const el = app.querySelector("#timer");
    if (el) {
      const left = secondsLeft(session);
      el.textContent =
        left === null
          ? "Untimed"
          : `Time left ${Math.floor(left / 60)}:${String(left % 60).padStart(2, "0")}`;
      if (left === 0) {
        session = submitSession(session);
        persist();
        render();
      }
    }
  }
}, 1000);
render();
