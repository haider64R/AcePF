import { sourceCatalog, locationKey, statementText } from "./source.js";
import { emptyState, stateDelta, relevantValues, showValue } from "./state.js";
import { expressionDetails, describeStep } from "./explain.js";
const loopKinds = ["for", "while", "do"];
const frameId = (e) => e.state.frames.at(-1)?.id ?? 0;
const semanticKinds = new Set([
  "read",
  "expression",
  "short-circuit",
  "write",
  "declare",
  "array-access",
  "pointer",
  "allocate",
  "free",
  "input",
  "output",
  "file",
  "branch",
  "loop",
  "call",
  "return",
  "diagnostic",
  "leak",
  "end",
]);
export const rawCategory = (e) =>
  ["read", "expression", "short-circuit", "array-access", "pointer"].includes(
    e.kind,
  )
    ? "expression detail"
    : ["statement", "scope-enter", "scope-exit"].includes(e.kind)
      ? "runtime bookkeeping"
      : "reasoning";
function singleControl(node, loc) {
  if (!node) return false;
  if (node.kind === "block" && node.statements.length === 1)
    return singleControl(node.statements[0], loc);
  return (
    ["break", "continue"].includes(node.kind) &&
    locationKey(node.loc) === locationKey(loc)
  );
}
// Pure adapter: no mutation of events, no interpreter calls, no synthetic machine state.
export function deriveTrace(events, files) {
  const catalog = sourceCatalog(files),
    loops = new Map(),
    scopeSources = new Map(),
    setup = new Map();
  // Identify dynamic loop/call instances by their real scope/frame identities, not line text.
  for (let i = 0; i < events.length; i++) {
    const e = events[i];
    if (e.kind === "scope-enter") {
      const scope = e.state.scopes.at(-1);
      scopeSources.set(scope.id, catalog.context(e)?.node);
      if (scope.name === "Loop") {
        const node = catalog.nodeFor(e, loopKinds);
        loops.set(scope.id, {
          id: scope.id,
          node,
          loc: e.loc,
          kind: node?.kind ?? "loop",
          label: `${node?.kind ?? "loop"} at ${e.loc.file}:${e.loc.line}`,
          frame: frameId(e),
          iteration: 0,
        });
      }
      if (scope.functionBoundary) {
        let end = i;
        while (
          end < events.length &&
          !(events[end].kind === "call" && frameId(events[end]) === frameId(e))
        )
          end++;
        if (end < events.length)
          for (let j = i; j <= end; j++) setup.set(j, frameId(e));
      }
    }
  }
  const steps = [],
    rawToStep = Array(events.length),
    iterations = [],
    openIterations = new Map();
  let group = null;
  const activeLoops = (e) =>
    e.state.scopes
      .filter((s) => loops.has(s.id) && loops.get(s.id).frame === frameId(e))
      .map((s) => {
        const l = loops.get(s.id);
        return {
          id: l.id,
          iteration: l.iteration,
          label: l.label,
          kind: l.kind,
          loc: l.loc,
          values: Object.values(s.bindings).map((b) => {
            const o = e.state.memory.find((o) => o.id === b.ref.object);
            return {
              name: b.name,
              value: showValue(o?.cells[b.ref.offset], e.state),
            };
          }),
        };
      });
  const loopFor = (e, node) => {
    const key = locationKey(node?.loc ?? e.loc);
    return [...loops.values()].findLast(
      (l) =>
        l.frame === frameId(e) &&
        locationKey(l.loc) === key &&
        e.state.scopes.some((s) => s.id === l.id),
    );
  };
  const closeIteration = (id, end) => {
    const r = openIterations.get(id);
    if (r) {
      r.rawEnd = Math.max(r.rawStart, end);
      openIterations.delete(id);
    }
  };
  const finish = () => {
    if (!group) return;
    group.id = steps.length;
    group.snapshotRaw = group.rawEnd;
    group.state = events[group.snapshotRaw].state;
    group.before = group.rawStart
      ? events[group.rawStart - 1].state
      : emptyState();
    const raw = events.slice(group.rawStart, group.rawEnd + 1);
    group.delta = stateDelta(group.before, group.state);
    group.operands = relevantValues(
      raw,
      group.before,
      group.state,
      group.delta,
    );
    group.details = expressionDetails(raw, catalog, group.before);
    describeStep(group, raw, catalog);
    for (let j = group.rawStart; j <= group.rawEnd; j++)
      rawToStep[j] = group.id;
    steps.push(group);
    group = null;
  };
  for (let i = 0; i < events.length; i++) {
    const e = events[i],
      context = catalog.context(e),
      node = context?.owner;
    let descriptor = null;
    if (e.kind === "loop") {
      const l = loopFor(e, catalog.nodeFor(e, loopKinds));
      if (l && e.detail.phase === "body") {
        l.iteration = e.detail.iteration;
        const record = {
          id: `${l.id}:${l.iteration}`,
          loopId: l.id,
          iteration: l.iteration,
          loc: l.loc,
          label: l.label,
          kind: l.kind,
          rawStart: i,
          rawEnd: i,
          context: activeLoops(e),
          action: "body",
          parent: activeLoops(e).at(-2)?.id ?? null,
        };
        iterations.push(record);
        openIterations.set(l.id, record);
      }
    }
    const eventLoops = activeLoops(e);
    if (setup.has(i))
      descriptor = {
        key: `call:${setup.get(i)}`,
        kind: "call",
        node: catalog.functions.get(e.state.frames.at(-1)?.name),
        loc: e.loc,
      };
    else if (e.kind === "return")
      descriptor = {
        key: `return:${frameId(e)}`,
        kind: "return",
        node: catalog.nodeFor(e, ["return", "function"]),
        loc: e.loc,
      };
    else if (["diagnostic", "leak", "end"].includes(e.kind))
      descriptor = { key: `${e.kind}:${i}`, kind: e.kind, node, loc: e.loc };
    else if (e.kind === "scope-exit") {
      const prior = i ? events[i - 1].state.scopes : [],
        lost = prior.filter((s) => !e.state.scopes.some((t) => t.id === s.id));
      for (const s of lost) closeIteration(s.id, i - 1);
      if (
        group?.kind !== "return" &&
        lost.some(
          (s) =>
            !loops.has(s.id) &&
            (s.owned.length || Object.keys(s.bindings).length),
        )
      )
        descriptor = {
          key: `lifetime:${i}`,
          kind: "lifetime",
          node: scopeSources.get(lost.at(-1)?.id),
          loc: e.loc,
        };
    } else if (
      e.kind === "scope-enter" &&
      e.state.scopes.at(-1).name === "Loop"
    ) {
      const l = loops.get(e.state.scopes.at(-1).id);
      descriptor = {
        key: `loop:${l.id}:0`,
        kind: "loop",
        node: l.node,
        loc: l.loc,
      };
    } else if (
      e.kind === "loop" ||
      ["initialization", "condition", "update"].includes(context?.role)
    ) {
      const l = loopFor(e, node);
      if (l) {
        const phase = e.kind === "loop" ? e.detail.phase : context.role;
        if (phase !== "body") closeIteration(l.id, i - 1);
        const cycle = phase === "body" ? l.iteration - 1 : l.iteration;
        if (phase !== "body" || !group)
          descriptor = {
            key: `loop:${l.id}:${cycle}`,
            kind: "loop",
            node: l.node,
            loc:
              phase === "update"
                ? (l.node?.update?.loc ?? l.loc)
                : phase === "condition"
                  ? (l.node?.test?.loc ?? l.loc)
                  : l.loc,
          };
      }
    } else if (e.kind === "statement") {
      const statement = catalog
        .nodesAt(e.loc)
        .find(
          (n) =>
            !["function", "declare"].includes(n.kind) &&
            [
              "declarations",
              "expression",
              "if",
              "switch",
              "return",
              "break",
              "continue",
              "delete",
              "block",
              ...loopKinds,
            ].includes(n.kind),
        );
      if (statement && !["block", ...loopKinds].includes(statement.kind)) {
        let kind =
          statement.kind === "if" || statement.kind === "switch"
            ? "decision"
            : statement.kind === "return"
              ? "return"
              : "statement";
        descriptor = {
          key: kind === "return" ? `return:${frameId(e)}` : `statement:${e.id}`,
          kind,
          node: statement,
          loc: e.loc,
        };
        if (["break", "continue"].includes(statement.kind)) {
          const boundary = e.state.scopes.findLastIndex(
              (s) => s.functionBoundary,
            ),
            targetScope = e.state.scopes
              .slice(boundary)
              .findLast(
                (s) =>
                  s.name === "Loop" ||
                  (statement.kind === "break" && s.name === "Switch"),
              );
          const target = loops.get(targetScope?.id) ?? {
            id: targetScope?.id,
            kind: "switch",
            label: "switch",
          };
          descriptor.control = {
            action: statement.kind,
            target: { id: target.id, kind: target.kind, label: target.label },
          };
          const record = openIterations.get(target.id);
          if (record) record.action = statement.kind;
          const decision =
            group &&
            events
              .slice(group.rawStart, i)
              .findLast(
                (x) => x.kind === "branch" && Object.hasOwn(x.detail, "value"),
              );
          if (
            group?.kind === "decision" &&
            decision &&
            singleControl(
              decision.detail.value.value ? group.node?.yes : group.node?.no,
              e.loc,
            )
          ) {
            group.control = descriptor.control;
            descriptor = null;
          }
        }
      }
    } else if (e.kind === "branch" && Object.hasOwn(e.detail, "case")) {
      if (
        e.detail.fallthrough ||
        group?.kind !== "decision" ||
        group?.frame !== frameId(e)
      )
        descriptor = {
          key: `case:${i}`,
          kind: "decision",
          node: catalog.nodeFor(e, ["switch"]),
          loc: e.loc,
        };
    } else if (semanticKinds.has(e.kind)) {
      // The caller resumes after a nested call with a new segment of the original statement.
      const changedFrame = group && group.frame !== frameId(e);
      if (
        !group ||
        changedFrame ||
        ["call", "lifetime"].includes(group.kind) ||
        (group.kind === "return" &&
          events.slice(group.rawStart, i).some((x) => x.kind === "return"))
      )
        descriptor = {
          key: `resume:${i}`,
          kind: ["if", "switch"].includes(context?.node?.kind)
            ? "decision"
            : "statement",
          node: context?.node,
          loc: e.loc,
        };
    }
    if (
      descriptor?.kind === "call" &&
      ["statement", "return", "decision"].includes(group?.kind) &&
      events
        .slice(group.rawStart, i)
        .every((x) =>
          ["statement", "read", "expression", "short-circuit"].includes(x.kind),
        )
    ) {
      Object.assign(group, descriptor, { frame: frameId(e) });
      descriptor = null;
    }
    if (
      descriptor?.kind === "return" &&
      group?.frame === frameId(e) &&
      group?.node?.kind === "return"
    ) {
      Object.assign(group, { key: descriptor.key, kind: descriptor.kind });
      descriptor = null;
    }
    if (descriptor && (!group || descriptor.key !== group.key)) {
      finish();
      group = {
        ...descriptor,
        frame: frameId(e),
        rawStart: steps.length ? steps.at(-1).rawEnd + 1 : 0,
        rawEnd: i,
        loops: eventLoops,
      };
    }
    if (group) {
      group.rawEnd = i;
      if (e.kind !== "scope-exit" && e.kind !== "scope-enter")
        group.loops = eventLoops;
    }
  }
  finish();
  for (const [id] of openIterations) closeIteration(id, events.length - 1);
  for (const r of iterations) {
    r.stepIds = [...new Set(rawToStep.slice(r.rawStart, r.rawEnd + 1))];
    r.state = events[r.rawEnd].state;
    r.children = iterations
      .filter(
        (x) =>
          x.parent === r.loopId &&
          x.rawStart >= r.rawStart &&
          x.rawStart <= r.rawEnd,
      )
      .map((x) => x.id);
  }
  // Internal AST nodes are an authoring aid, not part of the public trace contract.
  for (const step of steps) {
    delete step.node;
    delete step.key;
    delete step.frame;
  }
  return {
    version: 1,
    steps,
    rawToStep,
    iterations,
    rawCount: events.length,
    categories: events.reduce((out, e) => {
      const k = rawCategory(e);
      out[k] = (out[k] ?? 0) + 1;
      return out;
    }, {}),
  };
}
export function containingStep(trace, rawIndex) {
  return (
    trace.rawToStep[Math.max(0, Math.min(trace.rawCount - 1, rawIndex))] ?? 0
  );
}
