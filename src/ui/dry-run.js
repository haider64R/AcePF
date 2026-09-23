import { stateDelta } from "../trace/state.js";
const esc = (value) =>
  String(value ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
export function expressionPanel(step, rawIndex) {
  const details = step.details.filter((d) => d.rawId <= rawIndex);
  return `<div class="expression-details"><p class="muted">Recorded evaluation order. Precedence determines grouping; C++ does not guarantee left-to-right evaluation for every operator.</p>${details.map((d, i) => `<article class="reason-detail"><span>${i + 1}</span><div><code>${esc(d.title)}</code>${d.calculation ? `<pre>${esc(d.calculation)}</pre>` : ""}<p>${esc(d.explanation)}</p>${d.bits ? `<small>Bits: ${esc(d.bits.left)} ${d.bits.right ? "· " + esc(d.bits.right) : ""} → ${esc(d.bits.result)}</small>` : ""}</div></article>`).join("") || "<p>No intermediate expression operations at this boundary.</p>"}</div>`;
}
export function reasoningPanel(playback, expanded = false) {
  const s = playback.step;
  if (!s) return "";
  const location = s.loc ? `${s.loc.file} · line ${s.loc.line}` : "";
  if (playback.partial)
    return `<div class="reasoning-card"><span class="eyebrow">INSIDE A REASONING STEP</span><h2>${esc(s.title)}</h2><p>Detailed Trace paused partway through this step. State is unchanged. Next step completes the reasoning step.</p><small>${esc(location)}</small>${expressionPanel(s, playback.rawIndex)}</div>`;
  return `<article class="reasoning-card"><span class="eyebrow">${esc(s.kind.toUpperCase())} · ${esc(location)}</span><h2><code>${esc(s.title)}</code></h2><p class="reason-why">${esc(s.why)}</p>${s.loops?.length ? `<div class="context-chips">${s.loops.map((l) => `<span>${esc(l.label)} · iteration ${l.iteration}${l.values?.length ? " · " + esc(l.values.map((v) => `${v.name} = ${v.value}`).join(", ")) : ""}</span>`).join("")}</div>` : ""}${s.phases?.length ? `<p class="phase-path">${s.phases.map((p) => esc(p.phase)).join(" → ")}</p>` : ""}${s.operands.length ? `<div class="operand-values">${s.operands.map((o) => `<code>${esc(o.name)} = ${esc(o.value)}</code>`).join("")}</div>` : ""}${s.calculation ? `<pre class="calculation">${esc(s.calculation)}</pre>` : ""}${s.delta.cells.length ? `<div class="delta-table" aria-label="Changed values"><div class="delta-row delta-heading"><span>Changed storage</span><span>Before</span><span>After</span></div>${s.delta.cells.map((c) => `<div class="delta-row"><code>${esc(c.name)}</code><span>${esc(c.beforeText)}</span><strong>${esc(c.afterText)}</strong></div>`).join("")}</div>` : ""}${s.parameters?.length ? `<div class="parameter-list">${s.parameters.map((p) => `<p><code>${esc(p.name)} = ${esc(p.value)}</code> · ${esc(p.mode)}${p.target ? " of " + esc(p.target) : ""}</p>`).join("")}</div>` : ""}${[...s.shadowing, ...s.aliases].map((t) => `<p class="reason-note">${esc(t)}</p>`).join("")}${s.delta.output ? `<p>Added to output: <code>${esc(JSON.stringify(s.delta.output))}</code></p>` : ""}${s.details.length ? `<details class="details-toggle" ${expanded ? "open" : ""}><summary>Expression Details · ${s.details.length} explanations</summary>${expressionPanel(s, playback.rawIndex)}</details>` : ""}<small class="raw-boundary">Raw events ${s.rawStart + 1}–${s.rawEnd + 1} · snapshot after event ${s.snapshotRaw + 1}</small></article>`;
}
export function rawPanel(playback) {
  const s = playback.step;
  if (!s) return "";
  return `<div class="view-intro"><span class="eyebrow">DETAILED TRACE</span><h2>${esc(playback.event.message)}</h2><p>Every raw event is available. This reasoning step covers events ${s.rawStart + 1}–${s.rawEnd + 1}.</p></div><div class="raw-events">${playback.events
    .slice(s.rawStart, s.rawEnd + 1)
    .map(
      (e) =>
        `<button class="raw-event ${e.id === playback.rawIndex ? "selected" : ""}" data-raw="${e.id}" aria-current="${e.id === playback.rawIndex ? "step" : "false"}"><span>${e.id + 1} · ${esc(e.kind)}</span><code>${esc(e.message)}</code></button>`,
    )
    .join("")}</div>`;
}
export function loopHistory(playback) {
  const rows = playback.trace.iterations.filter(
    (i) => i.rawStart <= playback.rawIndex,
  );
  if (!rows.length) return "";
  return `<details class="loop-history"><summary>Loop dry-run table · ${rows.length} iterations entered</summary><p class="muted">Only reached steps are shown. Expand an iteration to revisit its decisions and changes.</p>${rows
    .map((r) => {
      const steps = r.stepIds
        .map((id) => playback.trace.steps[id])
        .filter((s) => s.snapshotRaw <= playback.rawIndex);
      const snapshot =
        playback.events[Math.min(r.rawEnd, playback.rawIndex)].state;
      const changes = stateDelta(
        playback.events[r.rawStart].state,
        snapshot,
      ).cells.filter(
        (c) =>
          c.kind !== "release" &&
          snapshot.memory.find((o) => o.id === c.ref.object)?.alive,
      );
      const counters = r.context
        .flatMap((l) => l.values.map((v) => `${v.name} = ${v.value}`))
        .join(" · ");
      const action =
        steps.findLast((s) => s.control?.target?.id === r.loopId)?.control
          ?.action ??
        (r.rawEnd <= playback.rawIndex ? "body completed" : "in progress");
      return `<details class="iteration-row"><summary><strong>${esc(r.label)} · #${r.iteration}</strong><span>${esc(r.context.map((l) => `${l.label} #${l.iteration}`).join(" › "))}</span><span class="iteration-values">${esc(counters)} · ${r.kind === "do" ? "body before condition" : "condition true"}</span><em>${esc(action)}</em><span>${esc(changes.map((c) => `${c.name}: ${c.beforeText} → ${c.afterText}`).join("; ")) || "No surviving body mutations"}</span></summary><div class="iteration-steps">${
        steps
          .map(
            (s) =>
              `<button data-reasoning="${s.id}"><code>${esc(s.title)}</code><span>${
                esc(
                  s.delta.cells
                    .filter((c) => c.kind !== "release")
                    .map((c) => `${c.name}: ${c.beforeText} → ${c.afterText}`)
                    .join("; "),
                ) || esc(s.why)
              }</span></button>`,
          )
          .join("") || "<p>This iteration has just begun.</p>"
      }</div></details>`;
    })
    .join("")}</details>`;
}
