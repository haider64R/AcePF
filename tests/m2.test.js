import test from "node:test";
import assert from "node:assert/strict";
import { good, bad, run } from "./helpers.js";
test("while tests first, do executes once", () =>
  good(
    "int x=0;while(x<3){cout<<x;x++;}do{cout<<x;x++;}while(false);",
    "0123",
  ));
test("for phases and continue update", () => {
  const r = good("for(int i=0;i<4;i++){if(i==1)continue;cout<<i;}", "023");
  assert.deepEqual(
    r.events
      .filter((e) => e.kind === "loop")
      .slice(0, 4)
      .map((e) => e.detail.phase),
    ["initialization", "condition", "body", "update"],
  );
});
test("nested loops, break and switch continue", () =>
  good(
    "for(int i=0;i<3;i++){for(int j=0;j<3;j++){if(j==2)break;cout<<i<<j;}}",
    "000110112021",
  ));
test("do continue still evaluates condition", () =>
  good("int i=0;do{i++;if(i<3)continue;cout<<i;}while(i<4);", "34"));
test("for scope ends and body scope refreshes", () => {
  good("for(int i=0;i<2;i++){int x=i;cout<<x;}", "01");
  bad("for(int i=0;i<2;i++){}cout<<i;", /not declared/);
});
test("break outside loop and continue outside loop rejected", () => {
  bad("break;", /needs/);
  bad("continue;", /needs/);
});
test("infinite loop bounded", () => {
  const r = run("while(true){}", { maxEvents: 100 });
  assert.equal(r.ok, false);
  assert.equal(r.events.at(-1).detail.code, "limit");
});
test("empty for clauses, nested if and return", () =>
  good("int i=0;for(;;){i++;if(i==3){cout<<i;return 0;}}", "3"));
test("switch break does not break containing loop", () =>
  good(
    "for(int i=0;i<3;i++){switch(i){case 1:continue;default:cout<<i;break;}}",
    "02",
  ));
