import { challenges } from "./challenges.js";
import { examples } from "./examples.js";
import { format, label, bytes } from "../engine/types.js";
const $ = (s) => document.querySelector(s),
  esc = (s) =>
    String(s ?? "").replace(
      /[&<>"']/g,
      (c) =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#39;",
        })[c],
    );
let challengeIndex = 0;
let files = { "main.cpp": examples[0].code },
  activeFile = "main.cpp",
  events = [],
  cursor = 0,
  tab = "Execution",
  timer = null,
  worker = null,
  runId = 0,
  dirty = false,
  title = examples[0].title,
  follow = true,
  showWhy = false,
  virtualFiles = {};
const tabs = [
  "Execution",
  "Expressions",
  "Variables",
  "Arrays",
  "Stack",
  "Memory",
  "Console",
  "Files",
];
$("#app").innerHTML =
  `<header class="topbar"><a class="brand" href="./index.html" aria-label="C++ Execution Visualizer"><span class="brand-icon">C<span>++</span></span><span>Execution<span class="brand-muted"> Visualizer</span></span></a><span class="course">PROGRAMMING FUNDAMENTALS</span><button id="help" class="quiet">Supported C++ ↗</button><button id="challenge" class="quiet">◇ Challenge</button><button id="examples" class="quiet">▤ Examples</button></header><main><div class="workspace-heading"><div><span class="eyebrow">YOUR WORKSPACE</span><h1 id="project-title"></h1><p id="description">Explore what happens between one line and the next.</p></div><button id="run" class="primary">▶ Run program <kbd>⌘ ↵</kbd></button></div><section class="workspace"><section class="editor-panel" aria-label="Source editor"><div class="panel-top"><div id="file-tabs"></div><button id="add-file" class="icon-button" aria-label="Add source file">＋</button></div><div class="editor-wrap"><div id="line-numbers" aria-hidden="true"></div><div class="code-wrap"><pre id="highlight" aria-hidden="true"></pre><textarea id="editor" spellcheck="false" autocapitalize="off" autocomplete="off" aria-label="C++ source code" wrap="off"></textarea></div></div><div class="editor-footer"><span>C++17 · Educational subset</span><span id="source-position">main.cpp</span></div><label class="input-label" for="stdin">STANDARD INPUT <span>Values for cin, separated by spaces</span></label><textarea id="stdin" placeholder="e.g. 12 3" rows="2"></textarea></section><section class="visual-panel" aria-label="Execution visualization"><div class="visual-heading"><span>INSIDE THE PROGRAM</span><label class="follow"><input type="checkbox" id="follow" checked> Follow execution</label></div><nav id="view-tabs" aria-label="Visualization views"></nav><div id="visual-content"></div><div class="explanation"><div class="explanation-heading"><span id="event-label">READY</span><button id="why" class="quiet">Why?</button></div><p id="event-message" aria-live="polite"></p><p id="why-detail" hidden></p></div></section></section><section class="playback" aria-label="Playback controls"><button id="restart" class="icon-button" title="Restart" aria-label="Restart">↺</button><button id="previous" class="icon-button" title="Previous step" aria-label="Previous step">‹</button><button id="play" class="play-button" aria-label="Auto play">▶</button><button id="next" class="icon-button" title="Next step" aria-label="Next step">›</button><button id="statement" class="quiet">Next statement ⇥</button><div class="progress-wrap"><input id="timeline" aria-label="Execution timeline" type="range" min="0" max="0" value="0"><span id="step-label"></span></div><label class="speed-label">Speed <select id="speed"><option value="1400">0.5×</option><option value="700" selected>1×</option><option value="350">2×</option><option value="100">5×</option></select></label></section><section class="console-panel"><div class="console-heading"><span>CONSOLE <span class="muted">standard output</span></span><span id="run-status"></span></div><pre id="console-output" aria-live="polite"></pre></section><footer><span><span class="tiny-mark">{ }</span> See the code. Understand the execution.</span><span>Local execution · No AI guesses · Virtual memory</span></footer></main><dialog id="challenge-dialog"><div class="dialog-heading"><div><span class="eyebrow">PREDICT · THEN EXPLORE</span><h2 id="challenge-title"></h2></div><button id="close-challenge" class="icon-button" aria-label="Close challenge">×</button></div><p id="challenge-question"></p><pre id="challenge-code" class="large-console"></pre><label for="prediction">Your prediction</label><input id="prediction" autocomplete="off"><p id="challenge-feedback" aria-live="polite"></p><div class="dialog-actions"><button id="another-challenge">Another challenge</button><button id="check-prediction">Check answer</button><button id="reveal-challenge" class="primary">Reveal visualization</button></div></dialog><dialog id="library"><div class="dialog-heading"><div><span class="eyebrow">LEARN BY EXPLORING</span><h2>One concept at a time.</h2></div><button class="icon-button" id="close-library" aria-label="Close examples">×</button></div><div id="example-list"></div></dialog><dialog id="help-dialog"><div class="dialog-heading"><h2>A small, explicit C++ subset</h2><button class="icon-button" id="close-help" aria-label="Close help">×</button></div><div id="help-content"></div></dialog><dialog id="file-dialog"><form method="dialog"><h2>Add a source file</h2><label for="filename">File name (.cpp or .h)</label><input id="filename" pattern="[A-Za-z_][A-Za-z0-9_]*\.(cpp|h)" required placeholder="math.h"><p id="file-error"></p><div class="dialog-actions"><button value="cancel" formnovalidate>Cancel</button><button id="create-file" class="primary" value="create">Create file</button></div></form></dialog>`;
function saveProject() {
  try {
    localStorage.setItem(
      "cpp-visualizer-project-v1",
      JSON.stringify({
        files,
        activeFile,
        title,
        description: $("#description").textContent,
        input: $("#stdin").value,
        virtualFiles,
      }),
    );
  } catch {}
}
function invalidate() {
  dirty = true;
  runId++;
  worker?.terminate();
  $("#run").disabled = false;
  pause();
  saveProject();
}
function highlight() {
  const source = $("#editor").value;
  let out = "",
    last = 0;
  const re =
    /(\/\/[^\n]*|\/\*[\s\S]*?\*\/|"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|^\s*#.*$|\b(?:int|short|long|float|double|char|bool|void|const|unsigned|signed|if|else|for|while|do|switch|case|default|break|continue|return|new|delete|nullptr|true|false|using|namespace)\b|\b\d+(?:\.\d+)?\b|\b(?:cout|cin|endl|std|ifstream|ofstream|fstream)\b)/gm;
  for (const m of source.matchAll(re)) {
    out += esc(source.slice(last, m.index));
    const v = m[0],
      kind =
        v.startsWith("//") || v.startsWith("/*")
          ? "comment"
          : /^\s*#/.test(v)
            ? "directive"
            : /^['"]/.test(v)
              ? "string"
              : /^\d/.test(v)
                ? "number"
                : [
                      "cout",
                      "cin",
                      "endl",
                      "std",
                      "ifstream",
                      "ofstream",
                      "fstream",
                    ].includes(v)
                  ? "builtin"
                  : "keyword";
    out += `<span class="${kind}">${esc(v)}</span>`;
    last = m.index + v.length;
  }
  $("#highlight").innerHTML = out + esc(source.slice(last)) + "\n";
  updateLines();
}
function updateLines() {
  const e = events[cursor];
  $("#line-numbers").innerHTML = $("#editor")
    .value.split("\n")
    .map(
      (_, i) =>
        `<div class="${e?.loc?.file === activeFile && e.loc.line === i + 1 && !dirty ? "current" : ""}">${i + 1}</div>`,
    )
    .join("");
  const line = e?.loc?.file === activeFile && !dirty ? e.loc.line : 0;
  $(".code-wrap").style.setProperty("--current-line", line);
  $(".code-wrap").style.setProperty(
    "--scroll-top",
    $("#editor").scrollTop + "px",
  );
  $(".code-wrap").classList.toggle("has-current", line > 0);
}
function fileTabs() {
  $("#file-tabs").innerHTML = Object.keys(files)
    .map(
      (f) =>
        `<button class="file-tab ${f === activeFile ? "active" : ""}" data-file="${esc(f)}"><span class="file-icon">${f.endsWith(".h") ? "H" : "C++"}</span>${esc(f)}</button>`,
    )
    .join("");
  $("#editor").value = files[activeFile];
  $("#source-position").textContent = activeFile;
  highlight();
}
function address(ref, state) {
  if (!ref) return "nullptr";
  const o = state.memory.find((o) => o.id === ref.object);
  return o
    ? "0x" + (o.address + ref.offset * bytes(o.type)).toString(16)
    : "invalid";
}
function display(v, state) {
  return v?.type.pointer ? address(v.value, state) : format(v);
}
function pointerConnections(state) {
  return state.memory
    .filter((o) => o.alive)
    .flatMap((o) => o.cells.map((v, i) => ({ o, v, i })))
    .filter((x) => x.v?.type.pointer)
    .map(({ o, v, i }) => {
      const target = state.memory.find((m) => m.id === v.value?.object);
      return `<div class="pointer-connection"><div><code>${esc(o.name)}${o.array ? "[" + i + "]" : ""}</code><small>${esc(address(v.value, state))}</small></div><span class="connection-arrow" aria-label="points to">⟶</span><div><code>${target ? esc(target.name) + (target.array ? "[" + v.value.offset + "]" : "") : "nullptr"}</code><strong>${target ? (target.alive ? esc(display(target.cells[v.value.offset], state)) : "released") : "no target"}</strong></div><p>${v.type.pointerConst ? "Pointer fixed" : "Pointer can change"} · ${v.type.const ? "Target read-only" : "Target writable"}</p></div>`;
    })
    .join("");
}
function memoryCards(state, objects) {
  return objects
    .map(
      (o) =>
        `<div class="memory-object ${o.alive ? "" : "released"}"><div class="object-heading"><strong>${esc(o.name)}</strong><span>${esc(label(o.type))}${o.shape.length ? " [" + o.shape.join("][") + "]" : ""}</span><code>${address({ object: o.id, offset: 0 }, state)}</code></div><div class="cells ${o.shape.length === 2 ? "matrix" : ""}" ${o.shape.length === 2 ? 'style="grid-template-columns:repeat(' + Math.min(o.shape[1], 16) + ', minmax(48px,1fr))"' : ""}>${o.cells
          .slice(0, 128)
          .map(
            (v, i) =>
              `<div class="cell ${events[cursor]?.detail?.ref?.object === o.id && events[cursor]?.detail?.ref?.offset === i ? "accessed" : ""}"><small>${o.shape.length === 2 ? "[" + Math.floor(i / o.shape[1]) + "][" + (i % o.shape[1]) + "]" : o.cells.length > 1 ? "[" + i + "]" : ""}</small><strong>${esc(display(v, state))}</strong>${v?.type.base === "char" && !v.type.pointer ? `<span class="char-code">${v.value} · 0x${v.value.toString(16).padStart(2, "0")}</span>` : ""}${v?.type.pointer && v.value ? `<span class="pointer-target">↳ ${esc(state.memory.find((x) => x.id === v.value.object)?.name)}[${v.value.offset}]</span>` : ""}</div>`,
          )
          .join(
            "",
          )}</div>${!o.alive ? '<span class="released-label">Lifetime ended</span>' : ""}${o.cells.length > 128 ? "<p>Showing the first 128 cells.</p>" : ""}${
          o.shape.length === 2
            ? '<p class="muted">Contiguous memory · row-major order: ' +
              o.cells
                .slice(0, 32)
                .map((v) => esc(display(v, state)))
                .join(" · ") +
              "</p>"
            : ""
        }</div>`,
    )
    .join("");
}
function variables(state) {
  return state.scopes
    .map(
      (s) =>
        `<div class="scope-heading">${esc(s.name)} <span>scope ${s.id}</span></div><div class="variable-table">${
          Object.values(s.bindings)
            .map((b) => {
              const o = state.memory.find((o) => o.id === b.ref.object),
                v = o?.cells[b.ref.offset];
              return `<div class="variable-row"><code>${esc(b.name)}</code><span>${esc(label(b.type))}</span><strong>${b.shape.length ? "[" + o.cells.map((v) => esc(display(v, state))).join(", ") + "]" : esc(display(v, state))}</strong><small>${address(b.ref, state)}${b.type.reference ? " ↗ alias" : ""}</small></div>`;
            })
            .join("") ||
          '<p class="muted empty-scope">No variables in this scope.</p>'
        }</div>`,
    )
    .join("");
}
function empty(message) {
  return `<div class="empty-state"><span>{ }</span><p>${message}</p></div>`;
}
function render() {
  const e = events[cursor],
    state = e?.state ?? {
      scopes: [],
      memory: [],
      frames: [],
      output: "",
      files: {},
    };
  $("#project-title").textContent = title;
  $("#view-tabs").innerHTML = tabs
    .map(
      (t) =>
        `<button class="view-tab ${tab === t ? "active" : ""}" data-tab="${t}" aria-pressed="${tab === t}">${t}</button>`,
    )
    .join("");
  let html = "";
  if (tab === "Execution") {
    const alive = state.memory.filter((o) => o.alive && o.region !== "heap");
    html =
      `<div class="view-intro"><span class="eyebrow">${e?.kind === "end" ? "PROGRAM COMPLETE" : "LIVE STATE"}</span><h2>${e?.kind === "diagnostic" ? "Let’s look at this." : e?.kind === "end" ? "Every step tells a story." : "Follow the changing values."}</h2><p>${e?.loc ? esc(e.loc.file) + " · line " + e.loc.line : "Run your program to start exploring."}</p></div>` +
      (alive.length
        ? memoryCards(state, alive)
        : empty("Variables appear here as your program creates them."));
  }
  if (tab === "Variables")
    html =
      '<div class="view-intro"><h2>Variables & scope</h2><p>Bindings that exist at this point in the program.</p></div>' +
      variables(state);
  if (tab === "Arrays")
    html =
      '<div class="view-intro"><h2>One element at a time.</h2><p>Highlighted cells show the current access. Matrices use row-major storage.</p></div>' +
      (memoryCards(
        state,
        state.memory.filter((o) => o.array && o.alive),
      ) || empty("Declare an array to see its indexed cells."));
  if (tab === "Memory")
    html =
      '<div class="view-intro"><h2>Follow the address.</h2><p>Conceptual addresses · pointer targets are shown below their values.</p></div><div class="region-label">POINTER CONNECTIONS</div>' +
      pointerConnections(state) +
      '<div class="region-label">STACK & GLOBALS</div>' +
      memoryCards(
        state,
        state.memory.filter((o) => o.region !== "heap" && o.alive),
      ) +
      '<div class="region-label">HEAP</div>' +
      (memoryCards(
        state,
        state.memory.filter((o) => o.region === "heap"),
      ) || empty("Dynamic allocations will appear here."));
  if (tab === "Stack")
    html =
      '<div class="view-intro"><h2>Who called whom?</h2><p>Each call creates a frame. The newest is on top.</p></div>' +
      state.frames
        .toReversed()
        .map(
          (f, i) =>
            `<div class="frame"><span class="frame-index">${String(state.frames.length - i).padStart(2, "0")}</span><div><strong>${esc(f.name)}()</strong><p>${f.caller ? "Called by " + esc(f.caller) : "Program entry"}</p></div><span>${i === 0 ? "ACTIVE" : "WAITING"}</span></div>`,
        )
        .join("") +
      variables(state);
  if (tab === "Expressions") {
    const expressions = events
      .slice(0, cursor + 1)
      .filter((x) =>
        ["expression", "short-circuit", "read", "write"].includes(x.kind),
      )
      .slice(-8);
    html =
      '<div class="view-intro"><h2>Make the invisible visible.</h2><p>Operands, intermediate values, and the order they are evaluated.</p></div>' +
      expressions
        .map(
          (x, i) =>
            `<div class="expression-step ${x.id === e?.id ? "selected" : ""}"><span>${i + 1}</span><div><code>${esc(x.message)}</code>${x.detail.conversion ? "<small>" + esc(x.detail.conversion) + "</small>" : ""}</div></div>`,
        )
        .join("");
  }
  if (tab === "Console")
    html =
      '<div class="view-intro"><h2>Program output</h2><p>Only output written by the current step is shown.</p></div><pre class="large-console">' +
      esc(state.output || "No output yet.") +
      "</pre>";
  if (tab === "Files")
    html =
      '<div class="view-intro"><h2>A safe place for files.</h2><p>These are virtual files. Your computer’s files are never accessed.</p></div><button id="seed-file" class="quiet">＋ Add virtual input file</button>' +
      Object.entries(state.files)
        .map(
          ([name, content]) =>
            `<div class="virtual-file"><strong>${esc(name)}</strong><pre>${esc(content)}</pre></div>`,
        )
        .join("");
  const diagnostic = events.find((x) => x.kind === "diagnostic");
  $("#visual-content").innerHTML =
    (diagnostic && e?.kind !== "diagnostic"
      ? `<button id="jump-error" class="diagnostic-banner">Recording stopped: ${esc(diagnostic.message)} <span>Go to step ${diagnostic.id + 1} →</span></button>`
      : "") + html;
  $("#event-label").textContent = dirty
    ? "SOURCE CHANGED"
    : (e?.kind ?? "READY").replaceAll("-", " ").toUpperCase();
  $("#event-message").textContent = dirty
    ? "Run the program to update this recording."
    : (e?.message ?? "Use Run program to start a deterministic execution.");
  $(".explanation").classList.toggle("error", e?.kind === "diagnostic");
  $("#why-detail").hidden = !showWhy;
  $("#why-detail").textContent = why(e);
  $("#why").setAttribute("aria-expanded", showWhy);
  $("#console-output").textContent =
    state.output || "Output appears here when cout executes.";
  $("#console-output").classList.toggle("placeholder", !state.output);
  $("#timeline").max = Math.max(0, events.length - 1);
  $("#timeline").value = cursor;
  $("#step-label").textContent = events.length
    ? `${cursor + 1} / ${events.length} steps`
    : "No recording";
  $("#run-status").textContent = dirty
    ? "Changes not run"
    : e?.kind === "diagnostic"
      ? "Stopped · " + e.detail.code
      : e?.kind === "end"
        ? events.some((x) => x.kind === "leak")
          ? "Finished · memory leak detected"
          : "Finished"
        : events.length
          ? (timer ? "Playing at line " : "Paused at line ") +
            (e?.loc?.line ?? "—")
          : "Ready";
  $("#previous").disabled = dirty || cursor === 0;
  $("#next").disabled = dirty || cursor >= events.length - 1;
  $("#statement").disabled = dirty || cursor >= events.length - 1;
  $("#play").disabled = !events.length || dirty;
  updateLines();
}
function why(e) {
  if (!e)
    return "The interpreter records each operation before the visualizer plays it back.";
  const messages = {
    read: "A name refers to storage in a scope. Reading copies its current value into the expression. The stored value does not change.",
    write:
      "Assignment converts the result to the destination type. Prefix increment returns the new value; postfix returns the old value while also updating storage.",
    "scope-exit":
      "Local variables only exist while their scope is active. Pointers to that storage become dangling when the scope ends.",
    "short-circuit":
      "Logical AND needs its right operand only when the left is true. Logical OR needs it only when the left is false. Skipped operands have no side effects.",
    expression:
      "C++ precedence determines the structure of an expression. Integer division discards the fractional part. Types determine promotions and conversions.",
    diagnostic:
      "Execution stops here because the interpreter cannot give a valid supported result. Fix the indicated operation and run again.",
    call: "A call creates a separate frame. Value parameters get copies; reference parameters refer to the caller’s original storage.",
    branch:
      "Only the selected branch executes. An unselected branch cannot change variables or produce output.",
  };
  return (
    messages[e.kind] ??
    "This is a recorded state immediately after the described operation. Previous step restores an earlier snapshot without executing the program again."
  );
}
function pause() {
  clearInterval(timer);
  timer = null;
  $("#play").textContent = "▶";
  $("#play").setAttribute("aria-label", "Auto play");
  if ($("#run-status").textContent.startsWith("Playing"))
    $("#run-status").textContent = $("#run-status").textContent.replace(
      "Playing",
      "Paused",
    );
}
function move(next) {
  cursor = Math.max(0, Math.min(events.length - 1, next));
  const e = events[cursor];
  if (e?.loc && files[e.loc.file] !== undefined && activeFile !== e.loc.file) {
    activeFile = e.loc.file;
    fileTabs();
  }
  if (follow && e) {
    const map = {
      expression: "Expressions",
      "short-circuit": "Expressions",
      call: "Stack",
      return: "Stack",
      allocate: "Memory",
      free: "Memory",
      pointer: "Memory",
      "array-access": "Arrays",
      file: "Files",
    };
    if (map[e.kind]) tab = map[e.kind];
  }
  render();
}
function run() {
  saveProject();
  pause();
  worker?.terminate();
  worker = new Worker(new URL("../engine/worker.js", import.meta.url), {
    type: "module",
  });
  const id = ++runId;
  $("#run").disabled = true;
  $("#run-status").textContent = "Recording execution…";
  const timeout = setTimeout(() => {
    if (id !== runId) return;
    worker?.terminate();
    $("#run").disabled = false;
    $("#run-status").textContent =
      "Execution timed out. Reduce program complexity.";
  }, 10000);
  worker.onmessage = ({ data }) => {
    if (data.id !== runId) return;
    clearTimeout(timeout);
    $("#run").disabled = false;
    if (data.error) {
      $("#run-status").textContent = data.error;
      return;
    }
    events = data.events;
    cursor = 0;
    dirty = false;
    tab = "Execution";
    move(0);
  };
  worker.onerror = () => {
    clearTimeout(timeout);
    $("#run").disabled = false;
    $("#run-status").textContent = "Could not start the execution worker.";
  };
  worker.postMessage({
    id,
    files,
    options: { input: $("#stdin").value, files: virtualFiles },
  });
}
$("#run").onclick = run;
$("#editor").addEventListener("input", () => {
  files[activeFile] = $("#editor").value;
  invalidate();
  highlight();
  render();
});
$("#editor").addEventListener("scroll", () => {
  $("#highlight").scrollTop = $("#editor").scrollTop;
  $("#highlight").scrollLeft = $("#editor").scrollLeft;
  $("#line-numbers").scrollTop = $("#editor").scrollTop;
  $(".code-wrap").style.setProperty(
    "--scroll-top",
    $("#editor").scrollTop + "px",
  );
});
$("#editor").addEventListener("keydown", (e) => {
  if (e.key === "Tab") {
    e.preventDefault();
    const el = e.target;
    el.setRangeText("    ", el.selectionStart, el.selectionEnd, "end");
    el.dispatchEvent(new Event("input"));
  }
});
$("#stdin").oninput = () => {
  invalidate();
  render();
};
$("#file-tabs").onclick = (e) => {
  const b = e.target.closest("[data-file]");
  if (b) {
    activeFile = b.dataset.file;
    fileTabs();
  }
};
$("#view-tabs").onclick = (e) => {
  const b = e.target.closest("[data-tab]");
  if (b) {
    tab = b.dataset.tab;
    render();
  }
};
$("#follow").onchange = (e) => (follow = e.target.checked);
$("#next").onclick = () => {
  pause();
  move(cursor + 1);
};
$("#previous").onclick = () => {
  pause();
  move(cursor - 1);
};
$("#restart").onclick = () => {
  pause();
  move(0);
};
$("#timeline").oninput = (e) => {
  pause();
  move(Number(e.target.value));
};
$("#statement").onclick = () => {
  pause();
  let i = cursor + 1;
  while (i < events.length - 1 && events[i].kind !== "statement") i++;
  move(i);
};
$("#play").onclick = () => {
  if (timer) {
    pause();
    return;
  }
  if (cursor >= events.length - 1) move(0);
  $("#play").textContent = "Ⅱ";
  $("#play").setAttribute("aria-label", "Pause");
  timer = setInterval(
    () => {
      if (cursor >= events.length - 1) {
        pause();
        return;
      }
      move(cursor + 1);
    },
    Number($("#speed").value),
  );
};
$("#speed").onchange = () => {
  if (timer) {
    pause();
    $("#play").click();
  }
};
$("#why").onclick = () => {
  showWhy = !showWhy;
  render();
};
$("#examples").onclick = () => {
  $("#example-list").innerHTML = examples
    .map(
      (e, i) =>
        `<button class="example" data-example="${i}"><span>${esc(e.topic)}</span><strong>${esc(e.title)}</strong><p>${esc(e.description)}</p><span class="example-arrow">↗</span></button>`,
    )
    .join("");
  $("#library").showModal();
};
$("#close-library").onclick = () => $("#library").close();
$("#example-list").onclick = (e) => {
  const b = e.target.closest("[data-example]");
  if (!b) return;
  const example = examples[Number(b.dataset.example)];
  if (dirty && !confirm("Replace your edited source with this example?"))
    return;
  files = example.files ?? { "main.cpp": example.code };
  files = { ...files };
  activeFile = "main.cpp";
  title = example.title;
  $("#description").textContent = example.description;
  $("#stdin").value = example.input ?? "";
  virtualFiles = example.virtualFiles ?? {};
  $("#library").close();
  fileTabs();
  run();
};
$("#help").onclick = async () => {
  $("#help-dialog").showModal();
  $("#help-content").textContent = await fetch(
    new URL("../../SUPPORTED_CPP.md", import.meta.url),
  ).then((r) => r.text());
};
$("#close-help").onclick = () => $("#help-dialog").close();
$("#add-file").onclick = () => {
  $("#filename").value = "";
  $("#file-error").textContent = "";
  $("#file-dialog").showModal();
};
$("#create-file").onclick = (e) => {
  if (!$("#filename").checkValidity()) return;
  const name = $("#filename").value;
  if (Object.hasOwn(files, name)) {
    e.preventDefault();
    $("#file-error").textContent = "That file already exists.";
    return;
  }
  files[name] = "";
  activeFile = name;
  invalidate();
  fileTabs();
  render();
};
$("#visual-content").onclick = (e) => {
  if (e.target.closest("#jump-error")) {
    pause();
    move(events.length - 1);
  }
  if (e.target.id === "seed-file") {
    const name = prompt("Virtual file name:", "input.txt");
    if (!name) return;
    const content = prompt("Initial contents:", "");
    if (content === null) return;
    virtualFiles[name] = content;
    invalidate();
    render();
  }
};
document.addEventListener("keydown", (e) => {
  if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
    e.preventDefault();
    run();
  }
  if (
    ["TEXTAREA", "INPUT", "SELECT"].includes(e.target.tagName) ||
    $("dialog[open]")
  )
    return;
  if (e.key === "ArrowRight") {
    e.preventDefault();
    $("#next").click();
  }
  if (e.key === "ArrowLeft") {
    e.preventDefault();
    $("#previous").click();
  }
  if (e.code === "Space") {
    e.preventDefault();
    $("#play").click();
  }
});
function showChallenge() {
  const c = challenges[challengeIndex];
  $("#challenge-title").textContent = c.title;
  $("#challenge-question").textContent = c.question;
  $("#challenge-code").textContent = c.code;
  $("#prediction").value = "";
  $("#challenge-feedback").textContent = "";
}
$("#challenge").onclick = () => {
  showChallenge();
  $("#challenge-dialog").showModal();
};
$("#close-challenge").onclick = () => $("#challenge-dialog").close();
$("#another-challenge").onclick = () => {
  challengeIndex = (challengeIndex + 1) % challenges.length;
  showChallenge();
};
$("#check-prediction").onclick = () => {
  $("#challenge-feedback").textContent =
    $("#prediction").value.trim() === challenges[challengeIndex].answer
      ? "Correct. Now step through the reason."
      : "Not quite. Try again, or reveal the execution to explore why.";
};
$("#reveal-challenge").onclick = () => {
  if (dirty && !confirm("Replace your edited source with this challenge?"))
    return;
  const c = challenges[challengeIndex];
  files = { "main.cpp": c.code };
  activeFile = "main.cpp";
  title = c.title;
  virtualFiles = {};
  $("#stdin").value = "";
  $("#description").textContent = c.question;
  $("#challenge-dialog").close();
  fileTabs();
  run();
};
try {
  const saved = JSON.parse(localStorage.getItem("cpp-visualizer-project-v1"));
  if (
    saved?.files &&
    Object.hasOwn(saved.files, "main.cpp") &&
    Object.entries(saved.files).every(
      ([k, v]) => /^[A-Za-z_][\w]*\.(cpp|h)$/.test(k) && typeof v === "string",
    ) &&
    Object.values(saved.files).join("").length <= 100000
  ) {
    files = saved.files;
    activeFile = Object.hasOwn(files, saved.activeFile)
      ? saved.activeFile
      : "main.cpp";
    title = typeof saved.title === "string" ? saved.title : "Your program";
    if (typeof saved.description === "string")
      $("#description").textContent = saved.description;
    $("#stdin").value = saved.input ?? "";
    virtualFiles = saved.virtualFiles ?? {};
  }
} catch {}
fileTabs();
render();
run();
