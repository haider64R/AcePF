import { format, label, integer, common } from "../engine/types.js";
import { expressionText, cleanExpression, statementText } from "./source.js";
import { cellName, showValue, pointerAliases } from "./state.js";
export function expressionDetails(raw, catalog, before) {
  const details = [];
  const add = (e, title, explanation, extra = {}) =>
    details.push({ rawId: e.id, title, explanation, ...extra });
  for (let i = 0; i < raw.length; i++) {
    const e = raw[i],
      d = e.detail,
      previous = i ? raw[i - 1].state : before;
    if (e.kind === "expression") {
      const node = catalog
        .nodesAt(e.loc)
        .find(
          (n) => (n.kind === "binary" || n.kind === "unary") && n.op === d.op,
        );
      let reason =
        "Use these operand values to obtain the intermediate result.";
      if (d.op === "/")
        reason = integer(d.result.type)
          ? "Integer division: both promoted operands are integers, so discard the fractional part (truncate toward zero)."
          : "Floating-point division: the common operand type is floating-point, so retain the fractional part.";
      if (d.op === "%")
        reason =
          "Remainder after integer division; division truncates toward zero.";
      if (["&", "|", "^", "~", "<<", ">>"].includes(d.op))
        reason =
          "Operate on the integer bits; shifts move bits by the right operand’s count.";
      if (["==", "!=", "<", ">", "<=", ">="].includes(d.op))
        reason =
          "Compare the actual operands; the result is a bool, not an assignment.";
      if (
        node?.kind === "binary" &&
        [node.left, node.right].some((x) => x.kind === "binary")
      )
        reason +=
          " Nested expressions are resolved according to parentheses, precedence and associativity before this operation.";
      if (node?.left?.kind === "binary" && node.left.op === node.op)
        reason += " Equal-precedence operators here associate to the left.";
      const conversion =
        d.right && !d.left.type.pointer && !d.right.type.pointer
          ? label(common(d.left.type, d.right.type))
          : null;
      if (
        conversion &&
        (label(d.left.type) !== conversion ||
          label(d.right.type) !== conversion)
      )
        reason += ` Promote/convert operands from ${label(d.left.type)} and ${label(d.right.type)} to ${conversion}.`;
      add(e, node ? cleanExpression(node) : e.message, reason, {
        calculation: e.message,
        result: d.result,
        bits: ["&", "|", "^", "~", "<<", ">>"].includes(d.op)
          ? {
              left: (d.left.value >>> 0).toString(2),
              right: d.right ? (d.right.value >>> 0).toString(2) : null,
              result: (d.result.value >>> 0).toString(2),
            }
          : null,
      });
    } else if (e.kind === "short-circuit") {
      const node = catalog
        .nodesAt(e.loc)
        .find(
          (n) => n.kind === "binary" && n.op === (d.result.value ? "||" : "&&"),
        );
      const skip = node ? cleanExpression(node.right) : "the right operand";
      add(
        e,
        node ? cleanExpression(node) : "Short-circuit",
        `${e.message} ${skip} is not evaluated; it has no side effects.`,
        { skipped: skip, result: d.result },
      );
    } else if (e.kind === "write") {
      const n =
        catalog
          .nodesAt(e.loc)
          .find((n) => n.kind === "unary" && ["++", "--"].includes(n.op)) ??
        catalog.nodeFor(e, ["assign"]);
      if (n?.kind === "unary" && d.before)
        add(
          e,
          cleanExpression(n),
          n.postfix
            ? `${cleanExpression(n)} uses the current value ${format(d.before)} in this expression, then changes the stored value to ${format(d.value)}.`
            : `${cleanExpression(n)} changes the stored value from ${format(d.before)} to ${format(d.value)} first, then uses ${format(d.result)}.`,
          { result: d.result },
        );
      else {
        const o = previous.memory.find((o) => o.id === d.ref?.object),
          old = o?.cells[d.ref?.offset],
          current = e.state.memory.find((o) => o.id === d.ref?.object);
        let reason =
          n?.op && n.op !== "="
            ? `Use the old ${cellName(current, d.ref.offset)} (${showValue(old, previous)}), apply ${n.op.slice(0, -1)} to the right-hand result, then store ${showValue(d.value, e.state)}.`
            : `Store ${showValue(d.value, e.state)} in ${cellName(current, d.ref?.offset)}.`;
        if (d.fromType !== d.toType)
          reason += ` Convert ${d.fromType} to ${d.toType} for the destination.`;
        add(
          e,
          n ? cleanExpression(n) : cellName(current, d.ref?.offset),
          reason,
          { result: d.value },
        );
      }
    } else if (["array-access", "pointer", "allocate", "free"].includes(e.kind))
      add(
        e,
        catalog.nodeFor(e, ["index", "unary", "new"])
          ? cleanExpression(catalog.nodeFor(e, ["index", "unary", "new"]))
          : e.kind,
        e.message,
      );
    else if (
      e.kind === "branch" &&
      !Object.hasOwn(d, "value") &&
      !Object.hasOwn(d, "case")
    ) {
      const n = catalog.nodeFor(e, ["ternary"]);
      if (n) add(e, cleanExpression(n), e.message);
    } else if (e.kind === "declare") {
      const n = catalog.nodeFor(e, ["declare"]);
      const o = e.state.memory.find((o) => o.id === d.ref?.object);
      const src =
        n?.init?.kind === "literal"
          ? n.init.type
          : raw.slice(0, i).findLast((x) => x.detail.result)?.detail.result
              ?.type;
      if (n && src && label(src) !== label(n.type))
        add(
          e,
          statementText(n),
          `Convert ${label(src)} to ${label(n.type)} for initialization; the stored value is ${showValue(o?.cells[0], e.state)}.`,
          { result: o?.cells[0] },
        );
    }
  }
  return details;
}
export function describeStep(step, raw, catalog) {
  const decisive = raw.findLast((e) =>
    ["branch", "loop", "call", "return", "diagnostic", "leak", "end"].includes(
      e.kind,
    ),
  );
  const node = step.node;
  let title = statementText(node) || catalog.fallback(step.loc),
    why = "Evaluate this statement, then record the changed values.";
  const branch = raw.find(
    (e) => e.kind === "branch" && Object.hasOwn(e.detail, "value"),
  );
  if (step.kind === "loop") {
    const phases = raw.filter((e) => e.kind === "loop"),
      check = phases.findLast((e) => e.detail.phase === "condition"),
      setup = phases.some((e) => e.detail.phase === "initialization"),
      update = phases.some((e) => e.detail.phase === "update");
    const test = cleanExpression(node?.test) || "true";
    title = setup
      ? `${statementText(node?.init)}; check ${test}`
      : update
        ? `${cleanExpression(node?.update)}; check ${test}`
        : node?.kind === "do" && !check
          ? "Begin do-while body"
          : `Check ${test}`;
    why = check
      ? `${test} is ${check.detail.value.value ? "true" : "false"}. ${check.detail.value.value ? "Enter the next iteration." : "Exit this loop; its body will not execute again."}`
      : "A do-while executes its body before testing the condition.";
    if (setup) why = "Initialize once, then test. " + why;
    if (update) why = "Run the update, then test again. " + why;
    step.phases = phases.map((e) => ({
      phase: e.detail.phase,
      iteration: e.detail.iteration,
      rawId: e.id,
      value: e.detail.value,
    }));
    step.decision = check ? !!check.detail.value.value : null;
  } else if (step.control) {
    const target = step.control.target;
    title = branch
      ? `${cleanExpression(node?.test)} → ${step.control.action}`
      : step.control.action;
    why =
      (branch
        ? `${cleanExpression(node?.test)} is ${branch.detail.value.value ? "true" : "false"}, so `
        : "") +
      (step.control.action === "continue"
        ? `continue skips the rest of this iteration of ${target?.label ?? "the current loop"}. ${target?.kind === "for" ? "Next: update → condition." : "Next: condition."}`
        : `break exits ${target?.label ?? "the nearest loop or switch"} only${target?.kind === "switch" ? "; an enclosing loop may continue" : "; an enclosing loop continues normally"}.`);
  } else if (step.kind === "decision") {
    if (branch) {
      step.decision = !!branch.detail.value.value;
      why = `${cleanExpression(node?.test)} is ${step.decision ? "true" : "false"}; ${step.decision ? "take the if branch" : node?.no ? "take the else branch" : "skip this body"}.`;
    } else {
      const choice = raw.find(
        (e) => e.kind === "branch" && Object.hasOwn(e.detail, "case"),
      );
      const testResult = raw.findLast(
        (e) =>
          e.loc?.file === node?.test?.loc?.file &&
          e.loc?.line === node?.test?.loc?.line &&
          e.loc?.column === node?.test?.loc?.column &&
          ((["binary", "unary"].includes(node?.test?.kind) &&
            e.detail.result &&
            e.detail.op === node.test.op) ||
            (node?.test?.kind === "name" &&
              e.kind === "read" &&
              e.detail.value)),
      );
      const evaluated = testResult
        ? showValue(
            testResult.detail.result ?? testResult.detail.value,
            testResult.state,
          )
        : node?.test?.kind === "literal"
          ? expressionText(node.test)
          : null;
      if (choice) {
        const c = node?.cases?.[choice.detail.case];
        title = `switch (${cleanExpression(node?.test)}) → ${c?.test ? "case " + expressionText(c.test) : "default"}`;
        why = choice.detail.fallthrough
          ? "Fall through into this label because no break stopped the previous case."
          : `${evaluated !== null ? "The switch value is " + evaluated + ". " : ""}${c?.test ? "Select the matching case " + expressionText(c.test) + "." : "No case matches; select default."}`;
        step.fallthrough = !!choice.detail.fallthrough;
      } else
        why =
          "Evaluate the switch value; no matching case or default body runs.";
    }
  } else if (step.kind === "call") {
    const call = raw.findLast((e) => e.kind === "call");
    const frame = call?.state.frames.at(-1);
    title = `Call ${frame?.name ?? "function"}()`;
    const f = catalog.functions.get(frame?.name);
    step.parameters = (f?.params ?? []).map((p) => {
      const b = call.state.scopes.at(-1).bindings[p.name],
        o = call.state.memory.find((o) => o.id === b?.ref.object);
      return {
        name: p.name,
        mode: p.type.reference
          ? "reference"
          : p.shape.length
            ? "shared array"
            : p.type.pointer
              ? "pointer copy"
              : "value copy",
        value: b ? showValue(o?.cells[b.ref.offset], call.state) : "?",
        target: p.type.reference && o ? o.name : null,
      };
    });
    why = frame?.caller
      ? `${frame.caller} calls ${frame.name}. Value parameters get independent copies; references share the caller’s storage.`
      : "main is the program’s entry point.";
  } else if (step.kind === "return") {
    const ret = raw.findLast((e) => e.kind === "return");
    title = ret ? `Return ${showValue(ret.detail.value, ret.state)}` : title;
    why = ret
      ? `${ret.detail.callee ?? ret.state.frames.at(-1)?.name ?? "Function"} returns this result. Its local lifetime ends as the call unwinds; the caller continues at the next step.`
      : "Evaluate the return expression.";
  } else if (step.kind === "lifetime") {
    const expired = step.delta.cells.filter((c) => c.kind === "release");
    title = "Leave local scope";
    why = expired.length
      ? `${expired.map((c) => c.name).join(", ")} ${expired.length === 1 ? "no longer exists" : "no longer exist"}. Outer bindings become visible again; pointers to ended storage are dangling.`
      : "Leave this local scope and restore the outer bindings.";
  } else if (["diagnostic", "leak", "end"].includes(step.kind)) {
    title =
      step.kind === "end"
        ? "Program complete"
        : step.kind === "leak"
          ? "Unreleased heap memory"
          : "Execution stopped";
    why = decisive?.message ?? raw.at(-1).message;
  } else if (step.delta.output)
    why = `Write ${JSON.stringify(step.delta.output)} to the console.`;
  else if (step.delta.files.length)
    why = `Update virtual ${step.delta.files.map((f) => f.name).join(", ")}; only the in-memory files change.`;
  else if (raw.some((e) => e.kind === "free"))
    why = raw.find((e) => e.kind === "free").message;
  else if (raw.some((e) => e.kind === "allocate"))
    why = raw.find((e) => e.kind === "allocate").message;
  const shorts = step.details.filter((d) => d.skipped);
  if (shorts.length)
    why +=
      " " +
      shorts.map((d) => d.explanation + ` ${d.skipped} is skipped.`).join(" ");
  step.title = title;
  step.why = why;
  const substitution = (n) => {
    if (!n) return "";
    if (n.kind === "name") {
      const r = raw.find(
        (e) =>
          e.kind === "read" &&
          e.detail.name === n.name &&
          e.loc?.line === n.loc.line &&
          e.loc?.column === n.loc.column,
      );
      return r ? showValue(r.detail.value, r.state) : n.name;
    }
    if (n.kind === "binary")
      return `(${substitution(n.left)} ${n.op === "*" ? "×" : n.op} ${substitution(n.right)})`;
    if (n.kind === "unary" && ["++", "--"].includes(n.op)) {
      const r = raw.find(
        (e) =>
          e.kind === "write" &&
          e.loc?.line === n.loc.line &&
          e.loc?.column === n.loc.column &&
          e.detail.result,
      );
      return r ? showValue(r.detail.result, r.state) : expressionText(n);
    }
    return expressionText(n);
  };
  const assignment =
    node?.kind === "expression" && node.expr?.kind === "assign"
      ? node.expr
      : null;
  if (assignment) {
    const write = raw.findLast((e) => e.kind === "write");
    const change = step.delta.cells.find(
      (c) =>
        c.ref.object === write?.detail.ref?.object &&
        c.ref.offset === write.detail.ref.offset &&
        c.kind === "write",
    );
    if (change)
      step.calculation = `${expressionText(assignment.left)} = ${assignment.op === "=" ? "" : change.beforeText + " " + assignment.op.slice(0, -1) + " "}${substitution(assignment.right)} → ${change.afterText}`;
  }
  if (node?.kind === "declarations") {
    const d = node.items.find((n) => n.init?.kind === "binary");
    if (d) {
      const change = step.delta.cells.find((c) => c.name === d.name);
      if (change)
        step.calculation = `${d.name} = ${substitution(d.init)} → ${change.afterText}`;
    }
  }

  step.shadowing = [];
  for (const e of raw.filter((e) => e.kind === "declare")) {
    const scope = e.state.scopes.at(-1),
      name = e.detail.name ?? catalog.nodeFor(e, ["declare"])?.name;
    if (!name) continue;
    const boundary = e.state.scopes.findLastIndex((s) => s.functionBoundary);
    const old = e.state.scopes
      .slice(0, -1)
      .filter((s, i) => i === 0 || i >= boundary)
      .findLast((s) => Object.hasOwn(s.bindings, name));
    if (
      old &&
      scope.bindings[name]?.ref.object !== old.bindings[name].ref.object
    )
      step.shadowing.push(
        `${name} in ${scope.name} shadows the outer ${name}; the outer value is unchanged.`,
      );
  }
  step.aliases = step.delta.cells
    .filter((c) => c.kind !== "release" && c.aliases.length)
    .map(
      (c) =>
        `${c.aliases.join(" and ")} ${c.aliases.length === 1 ? "points" : "point"} to ${c.name}; ${c.name} is now ${c.afterText}.`,
    );
  for (const c of step.delta.cells) {
    if (c.after?.type.pointer && c.after.value) {
      const aliases = pointerAliases(c.after.value, step.state);
      if (aliases.length > 1)
        step.aliases.push(
          `${aliases.join(" and ")} refer to the same storage (${showValue(c.after, step.state)}).`,
        );
    }
  }
  for (const c of step.delta.cells.filter((c) => c.kind === "write")) {
    const refs = c.bindings.filter((b) => b.reference).map((b) => b.name);
    if (refs.length)
      step.aliases.push(
        `${refs.join(" and ")} ${refs.length === 1 ? "is a reference" : "are references"} to ${c.name}; writing through the reference changes the same storage.`,
      );
  }
  const kinds = new Set(raw.map((e) => e.kind));
  step.suggestedView = ["call", "return"].includes(step.kind)
    ? "Stack"
    : kinds.has("file")
      ? "Files"
      : ["pointer", "allocate", "free", "leak"].some((k) => kinds.has(k)) ||
          step.delta.cells.some((c) => c.after?.type.pointer)
        ? "Memory"
        : kinds.has("array-access") ||
            step.delta.cells.some((c) => c.name.includes("["))
          ? "Arrays"
          : "Execution";
  step.expressionFocus =
    step.details.some((d) => d.skipped || d.bits) ||
    raw.some((e) => e.kind === "expression");
}
