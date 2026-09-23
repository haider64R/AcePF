import test from "node:test";
import assert from "node:assert/strict";
import { runProject } from "../src/engine/index.js";
import { deriveTrace } from "../src/trace/educational.js";
import { TracePlayback } from "../src/trace/playback.js";
import { acceptance } from "./acceptance-programs.js";
function trace(body, options = {}, whole = false) {
  const files = { "main.cpp": whole ? body : `int main(){\n${body}\n}` };
  const run = runProject(files, options);
  assert.equal(run.ok, true, run.events.at(-1).message);
  const baseline = structuredClone(run);
  const educational = deriveTrace(run.events, files);
  assert.deepEqual(
    run,
    baseline,
    "Derivation must not alter a raw event or its snapshots",
  );
  assert.equal(educational.steps.at(-1).state, run.events.at(-1).state);
  assert.deepEqual(educational.steps.at(-1).state, run.state);
  for (let i = 0; i < run.events.length; i++) {
    const s = educational.steps[educational.rawToStep[i]];
    assert.ok(s && i >= s.rawStart && i <= s.rawEnd);
    assert.equal(s.state, run.events[s.snapshotRaw].state);
  }
  for (let i = 1; i < educational.steps.length; i++)
    assert.equal(
      educational.steps[i].rawStart,
      educational.steps[i - 1].rawEnd + 1,
    );
  return { run, t: educational, steps: educational.steps, files };
}
const mutation = (steps, name) =>
  steps.find((s) =>
    s.delta.cells.some((c) => c.name === name && c.kind === "write"),
  );
test("simple assignment becomes one operation with a before/after delta", () => {
  const { steps } = trace("int a=2; a=5;");
  const s = mutation(steps, "a");
  assert.equal(s.delta.cells[0].beforeText, "2");
  assert.equal(s.delta.cells[0].afterText, "5");
  assert.equal(s.title, "a = 5");
});
test("arithmetic precedence is expanded inside one statement, not a click per read", () => {
  const { steps } = trace("int a=2,b=3,c=4; int x=a+b*c;");
  const s = steps.find((s) => s.title.startsWith("int x"));
  assert.equal(s.details.filter((d) => d.result).length, 2);
  assert.match(s.calculation, /2.*3 × 4.*14/);
  assert.match(s.details.at(-1).explanation, /precedence/);
});
test("equal-precedence associativity appears in expression details", () => {
  const { steps } = trace("int x=10-3-2;");
  assert.ok(
    steps.some((s) =>
      s.details.some((d) => /associate to the left/.test(d.explanation)),
    ),
  );
});
test("integer versus floating division and remainder explanations", () => {
  const { steps } = trace("int a=7/2;double b=7.0/2;int r=7%2;");
  const why = steps
    .flatMap((s) => s.details)
    .map((d) => d.explanation)
    .join(" ");
  assert.match(why, /Integer division/);
  assert.match(why, /Floating-point division/);
  assert.match(why, /Remainder/);
});
test("prefix/postfix increment and decrement preserve returned values and mutations", () => {
  const { steps } = trace("int a=5,b=3,c=2;int x=a++ + ++b*c;int y=a-- + --b;");
  const s = steps.find((s) => s.title.startsWith("int x"));
  assert.deepEqual(
    s.delta.cells
      .filter((c) => c.kind === "write")
      .map((c) => [c.name, c.beforeText, c.afterText]),
    [
      ["a", "5", "6"],
      ["b", "3", "4"],
    ],
  );
  assert.ok(
    s.details.some((d) => /uses the current value 5/.test(d.explanation)),
  );
  assert.ok(s.details.some((d) => /first/.test(d.explanation)));
  assert.ok(steps.find((s) => s.title.startsWith("int y")).details.length >= 3);
});
test("compound assignment gives substituted calculation and delta", () => {
  const { steps } = trace("int total=4,i=2,j=3;total+=i*j;");
  const s = mutation(steps, "total");
  assert.equal(s.calculation, "total = 4 + (2 × 3) → 10");
  assert.deepEqual(
    s.operands.map((x) => x.name),
    ["i", "j"],
  );
});
test("short-circuit AND explicitly identifies skipped operand and unchanged b", () => {
  const { steps, run } = trace("int a=1,b=2;bool x=(a++>5)&&(++b>2);");
  const s = steps.find((s) => s.title.startsWith("bool x"));
  assert.match(s.details.find((d) => d.skipped).skipped, /\+\+b/);
  assert.ok(!s.delta.cells.some((c) => c.name === "b"));
  assert.equal(run.state.memory.find((o) => o.name === "b").cells[0].value, 2);
});
test("short-circuit OR explicitly identifies skipped operand", () => {
  const { steps } = trace("int a=1,c=3;bool y=(++a>1)||(++c>3);");
  const s = steps.find((s) => s.title.startsWith("bool y"));
  assert.match(s.why, /\+\+c.*skipped/);
  assert.ok(!s.delta.cells.some((c) => c.name === "c"));
});
test("if/else and nested decisions have actual truth values", () => {
  const { steps, run } = trace("int x=2;if(x>3)cout<<0;else{if(x==2)cout<<1;}");
  assert.equal(run.state.output, "1");
  assert.deepEqual(
    steps.filter((s) => s.kind === "decision").map((s) => s.decision),
    [false, true],
  );
});
test("switch matches labels and preserves fall-through and target of break", () => {
  const { steps, run } = trace(
    "switch(2){case 1:cout<<1;break;case 2:cout<<2;case 3:cout<<3;break;default:cout<<4;}",
  );
  assert.equal(run.state.output, "23");
  assert.ok(steps.some((s) => s.fallthrough));
  assert.equal(steps.find((s) => s.control)?.control.target.kind, "switch");
});
test("while conditions and mutations remain separate reasoning steps", () => {
  const { t, steps } = trace("int i=0;while(i<2){i++;}");
  assert.equal(t.iterations.length, 2);
  assert.deepEqual(
    steps.filter((s) => s.kind === "loop").map((s) => s.decision),
    [true, true, false],
  );
});
test("do-while begins body before condition", () => {
  const { t, steps } = trace("int i=0;do{i++;}while(i<2);");
  assert.equal(t.iterations.length, 2);
  assert.match(steps.find((s) => s.kind === "loop").why, /before testing/);
});
test("for setup and update/check grouped with ordered phases", () => {
  const { steps } = trace("for(int i=0;i<2;i++){cout<<i;}");
  const loop = steps.filter((s) => s.kind === "loop");
  assert.deepEqual(
    loop[0].phases.map((x) => x.phase),
    ["initialization", "condition", "body"],
  );
  assert.deepEqual(
    loop[1].phases.map((x) => x.phase),
    ["update", "condition", "body"],
  );
  assert.equal(loop.at(-1).decision, false);
});
test("continue explains update then condition; skipped assignment never appears", () => {
  const { steps, t } = trace(
    "int x=0;for(int i=0;i<3;i++){if(i==1)continue;x+=i;}",
  );
  const c = steps.find((s) => s.control?.action === "continue");
  assert.match(c.why, /update → condition/);
  assert.ok(steps[c.id + 1].phases.some((x) => x.phase === "update"));
  assert.equal(t.iterations.find((r) => r.iteration === 2).action, "continue");
});
test("break identifies innermost loop, leaves outer iterations active", () => {
  const { steps, t } = trace(
    "for(int i=0;i<2;i++){for(int j=0;j<3;j++){if(j==1)break;cout<<i;}}",
  );
  const breaks = steps.filter((s) => s.control?.action === "break");
  assert.equal(breaks.length, 2);
  assert.ok(breaks.every((s) => s.loops.length === 2));
  assert.ok(breaks.every((s) => s.control.target.id === s.loops.at(-1).id));
  assert.equal(t.iterations.filter((r) => !r.parent).length, 2);
});
test("function calls show value and reference parameters with correct return boundaries", () => {
  const { steps, run } = trace(
    "int f(int x,int& y){x+=2;y+=x;return y;}int main(){int a=1,b=2;int z=f(a,b);cout<<z;}",
    {},
    true,
  );
  const call = steps.find((s) => s.parameters?.length);
  assert.deepEqual(
    call.parameters.map((p) => p.mode),
    ["value copy", "reference"],
  );
  assert.equal(run.state.output, "5");
  assert.ok(steps.some((s) => s.kind === "return" && s.title === "Return 5"));
  assert.equal(run.state.memory.find((o) => o.name === "a").cells[0].value, 1);
});
test("shadowing has distinct storage and an educational lifetime step", () => {
  const { steps } = trace(acceptance.references, {}, true);
  assert.ok(steps.some((s) => s.shadowing.some((x) => x.includes("shadows"))));
  assert.ok(
    steps.some(
      (s) => s.kind === "lifetime" && s.delta.cells.some((c) => c.name === "y"),
    ),
  );
});
test("1D array mutation groups reads/index calculation and writes into one step", () => {
  const { steps } = trace("int a[3]={1,2,3};int i=2;a[i]=10;");
  const s = mutation(steps, "a[2]");
  assert.equal(s.delta.cells.find((c) => c.name === "a[2]").beforeText, "3");
  assert.equal(s.suggestedView, "Arrays");
  assert.ok(s.details.some((d) => d.title === "a[i]"));
});
test("2D array delta uses row and column", () => {
  const { steps } = trace("int m[2][2]={{1,2},{3,4}};m[1][0]+=5;");
  assert.equal(mutation(steps, "m[1][0]").delta.cells[0].afterText, "8");
});
test("pointer aliasing explains shared target rather than treating pointers as copies of x", () => {
  const { steps } = trace(acceptance.pointers, {}, true);
  const s = mutation(steps, "x");
  assert.deepEqual(s.delta.cells[0].aliases, ["p", "q"]);
  assert.ok(s.aliases.some((x) => /p and q/.test(x)));
  assert.equal(s.suggestedView, "Memory");
});
test("heap allocation/deletion and dangling diagnostic are preserved", () => {
  const { steps } = trace("int* p=new int(5);delete p;");
  assert.ok(
    steps.some((s) =>
      s.delta.cells.some((c) => c.region === "heap" && c.kind === "create"),
    ),
  );
  assert.ok(
    steps.some((s) =>
      s.delta.cells.some((c) => c.region === "heap" && c.kind === "release"),
    ),
  );
  const files = {
    "main.cpp": "int main(){int* p=new int(5);delete p;cout<<*p;}",
  };
  const run = runProject(files),
    t = deriveTrace(run.events, files);
  assert.equal(t.steps.at(-1).kind, "diagnostic");
  assert.equal(t.steps.at(-1).state, run.events.at(-1).state);
});
test("bitwise operators and type conversion explanations are available without raw stepping", () => {
  const { steps } = trace("int x=3.5;unsigned int mask=5u;cout<<(mask&3u);");
  assert.ok(
    steps.some((s) =>
      s.details.some((d) => /Convert double to int/.test(d.explanation)),
    ),
  );
  assert.ok(steps.some((s) => s.details.some((d) => d.bits)));
});
test("ternary details show only selected branch", () => {
  const { steps } = trace("int a=1;int x=a>0?7:9;");
  assert.ok(
    steps.some((s) =>
      s.details.some((d) => /only the first/.test(d.explanation)),
    ),
  );
});
test("virtual-file and console deltas never lose earlier text when playing backward", () => {
  const { steps } = trace('ofstream f("x.txt");f<<"A";f<<"B";cout<<1;cout<<2;');
  const writes = steps.filter((s) => s.delta.files.some((f) => f.after));
  assert.equal(writes[0].state.files["x.txt"], "A");
  assert.equal(writes[1].state.files["x.txt"], "AB");
  const outputs = steps.filter((s) => s.delta.output);
  assert.deepEqual(
    outputs.map((s) => s.state.output),
    ["1", "12"],
  );
});
test("multi-file source synchronization uses original locations", () => {
  const files = {
    "main.cpp": '#include "f.h"\nint main(){cout<<f(3);}',
    "f.h": "int f(int n);",
    "f.cpp": '#include "f.h"\nint f(int n){return n+1;}',
  };
  const r = runProject(files);
  assert.equal(r.ok, true);
  const t = deriveTrace(r.events, files);
  assert.ok(t.steps.some((s) => s.loc.file === "f.cpp"));
  assert.equal(t.steps.at(-1).state.output, "4");
});
test("changing modes preserves exact snapshot, even halfway through a raw group", () => {
  const { run, t } = trace("int x=2; x+=3*4;cout<<x;");
  const p = new TracePlayback(run.events, t);
  p.setMode("raw").seek(run.events.findIndex((e) => e.kind === "expression"));
  const state = p.event.state,
    index = p.rawIndex;
  p.setMode("expression");
  assert.equal(p.rawIndex, index);
  assert.equal(p.event.state, state);
  assert.equal(p.partial, true);
  p.setMode("dry");
  assert.equal(p.event.state, state);
  p.next();
  assert.equal(p.rawIndex, p.step.snapshotRaw);
  p.previous();
  assert.equal(p.event.state, t.steps[p.stepIndex].state);
  p.restart();
  assert.equal(p.index, 0);
});
for (const [name, output] of [
  ["nested", "68"],
  ["shortCircuit", "3 2 3 0 1"],
  ["references", "5 17"],
  ["pointers", "30 30 30"],
])
  test("acceptance: " + name, () => {
    const { run, t, steps } = trace(acceptance[name], {}, true);
    assert.equal(run.state.output, output);
    assert.ok(steps.length < run.events.length);
    if (name === "nested") {
      assert.equal(run.events.length, 430);
      assert.equal(t.iterations.length, 20);
      assert.equal(t.iterations.filter((r) => !r.children.length).length, 16);
      assert.equal(
        steps.filter((s) => s.control?.action === "continue").length,
        4,
      );
      assert.equal(
        steps.filter((s) => s.control?.action === "break").length,
        1,
      );
    }
  });

import { examples } from "../src/ui/examples.js";
import {
  reasoningPanel,
  expressionPanel,
  rawPanel,
  loopHistory,
} from "../src/ui/dry-run.js";
test("every built-in example derives and renders every step without changing execution", () => {
  for (const example of examples) {
    const files = example.files ?? { "main.cpp": example.code };
    const r = runProject(files, {
      input: example.input ?? "",
      files: example.virtualFiles ?? {},
    });
    const t = deriveTrace(r.events, files),
      p = new TracePlayback(r.events, t);
    for (let i = 0; i < p.length; i++) {
      p.seek(i);
      assert.ok(reasoningPanel(p));
      assert.ok(expressionPanel(p.step, p.rawIndex));
      assert.ok(rawPanel(p));
      loopHistory(p);
    }
    assert.equal(p.event.state, r.events.at(-1).state);
  }
});
test("rendered partial step and loop history cannot reveal future mutations", () => {
  const { run, t } = trace("int x=2;for(int i=0;i<2;i++){x+=5;cout<<x;}");
  const p = new TracePlayback(run.events, t);
  const write = run.events.findIndex(
    (e) => e.kind === "write" && e.detail.value?.value === 7,
  );
  p.setMode("raw")
    .seek(write - 1)
    .setMode("dry");
  assert.ok(p.partial);
  assert.match(reasoningPanel(p), /partway/);
  assert.ok(!reasoningPanel(p).includes("→ 7"));
  assert.ok(!loopHistory(p).includes("→ 7"));
  p.next();
  assert.match(reasoningPanel(p), /→ 7/);
});
test("nested mixed short-circuit operators identify the actual skipped operand", () => {
  const { steps, run } = trace(
    "int a=0,b=1,c=2;bool x=(a && ++b)||++c;bool y=(1||++b)&&c;cout<<b<<c;",
  );
  assert.equal(run.state.output, "13");
  const skipped = steps
    .flatMap((s) => s.details)
    .filter((d) => d.skipped)
    .map((d) => d.skipped);
  assert.deepEqual(skipped, ["++b", "++b"]);
});
test("recursive calls retain separate frames and return groups", () => {
  const { steps, run } = trace(
    "int f(int n){if(n==0)return 1;return n*f(n-1);}int main(){cout<<f(3);}",
    {},
    true,
  );
  assert.equal(run.state.output, "6");
  assert.equal(steps.filter((s) => s.kind === "call").length, 5);
  assert.equal(steps.filter((s) => s.kind === "return").length, 5);
});
test("while and do-while continue go to condition rather than inventing an update", () => {
  for (const body of [
    "int i=0;while(i<3){i++;if(i==2)continue;cout<<i;}",
    "int i=0;do{i++;if(i==2)continue;cout<<i;}while(i<3);",
  ]) {
    const { steps, run } = trace(body);
    assert.equal(run.state.output, "13");
    assert.match(
      steps.find((s) => s.control?.action === "continue").why,
      /Next: condition/,
    );
  }
});
test("caller locals are not incorrectly described as shadowed in a callee", () => {
  const { steps } = trace(
    "void f(int x){x++;}int main(){int x=3;f(x);}",
    {},
    true,
  );
  assert.deepEqual(
    steps.flatMap((s) => s.shadowing),
    [],
  );
});
test("displayed stream operands retain parentheses around nested shifts", () => {
  const { steps, run } = trace("int x=2;cout<<(x<<2);");
  assert.equal(run.state.output, "8");
  assert.ok(steps.some((s) => s.title === "cout << (x << 2)"));
});
test("function calls inside if and switch resume with a decision rather than a generic statement", () => {
  const { steps, run } = trace(
    "int f(){return 2;}int main(){if(f()==2)cout<<1;switch(f()){case 2:cout<<2;break;default:cout<<0;}}",
    {},
    true,
  );
  assert.equal(run.state.output, "12");
  assert.ok(steps.some((s) => s.kind === "decision" && s.decision === true));
  assert.ok(
    steps.some((s) => s.kind === "decision" && s.title.includes("case 2")),
  );
});
test("switch explanation reports the recorded value and matching/default decision", () => {
  const { steps } = trace(
    "int x=2;switch(x+1){case 3:break;}switch(9){case 2:break;default:break;}",
  );
  assert.ok(steps.some((s) => s.why.includes("switch value is 3")));
  assert.ok(
    steps.some((s) => s.why.includes("No case matches; select default")),
  );
});
