import test from "node:test";
import assert from "node:assert/strict";
import { good, bad } from "./helpers.js";
import { runProject } from "../src/engine/index.js";
test("array initialization, modification and traversal", () => {
  const r = good(
    "int a[4]={1,2,3,4};for(int i=0;i<4;i++)a[i]*=2;cout<<a[0]<<a[3];",
    "28",
  );
  assert.deepEqual(
    r.state.memory.find((o) => o.name === "a").cells.map((v) => v.value),
    [2, 4, 6, 8],
  );
  assert.ok(r.events.some((e) => e.kind === "array-access"));
});
test("partial initialization zero fills, inferred size", () =>
  good("int a[4]={1,2};int b[]={3,4};cout<<a[3]<<b[1];", "04"));
test("char arrays include null and print as strings", () => {
  const r = good('char name[]="Haider";cout<<name;', "Haider");
  assert.equal(
    r.state.memory.find((o) => o.name === "name").cells.at(-1).value,
    0,
  );
});
test("2D matrix traversal and row-major representation", () => {
  const r = good(
    "int m[2][3]={{1,2,3},{4,5,6}};for(int i=0;i<2;i++)for(int j=0;j<3;j++)cout<<m[i][j];",
    "123456",
  );
  assert.deepEqual(r.state.memory.find((o) => o.name === "m").shape, [2, 3]);
});
test("nested brace padding preserves rows", () =>
  good("int m[2][3]={{1},{2,3}};cout<<m[0][1]<<m[1][0]<<m[1][2];", "020"));
test("arrays passed to functions share elements", () => {
  const r = runProject({
    "main.cpp":
      "void change(int a[],int n){for(int i=0;i<n;i++)a[i]+=1;}int main(){int x[3]={1,2,3};change(x,3);cout<<x[2];}",
  });
  assert.equal(r.ok, true, r.events.at(-1).message);
  assert.equal(r.state.output, "4");
});
test("matrix function arguments", () => {
  const r = runProject({
    "main.cpp":
      "int get(int m[][3]){return m[1][2];}int main(){int a[2][3]={{1,2,3},{4,5,6}};cout<<get(a);}",
  });
  assert.equal(r.ok, true, r.events.at(-1).message);
  assert.equal(r.state.output, "6");
});
test("bounds, invalid dimension and uninitialized diagnostics", () => {
  bad("int a[2];cout<<a[2];", /outside/);
  bad("int a[2];cout<<a[0];", /uninitialized/);
  bad("int m[2][3]={{}};cout<<m[0][3];", /outside/);
  bad("int n=2;int a[n];", /constant/);
  bad("int a[0];", /positive/);
  bad('char a[2]="Hi";', /terminator/);
});
test("constant dimensions and const elements", () => {
  good("const int N=3;int a[N]={1};cout<<a[2];", "0");
  bad("const int a[2]={1,2};a[0]=3;", /const/);
  bad("int a[2]={1,2};a=3;", /entire array/);
});
