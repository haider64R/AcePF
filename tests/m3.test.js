import test from "node:test";
import assert from "node:assert/strict";
import { runProject } from "../src/engine/index.js";
const run = (s) =>
  runProject({ "main.cpp": "#include <iostream>\nusing namespace std;\n" + s });
function good(s, out) {
  const r = run(s);
  assert.equal(r.ok, true, r.events.at(-1).message);
  assert.equal(r.state.output, out);
  return r;
}
function bad(s, re) {
  const r = run(s);
  assert.equal(r.ok, false);
  assert.match(r.events.at(-1).message, re);
}
test("function definitions, prototypes, conversion and return", () =>
  good(
    "int add(int a,int b); int main(){cout<<add(2,3);}int add(int a,int b){return a+b;}",
    "5",
  ));
test("pass by value preserves caller, reference modifies it", () => {
  const r = good(
    "void copy(int x){x=9;}void edit(int& x){x=7;}int main(){int x=2;copy(x);cout<<x;edit(x);cout<<x;}",
    "27",
  );
  assert.ok(
    r.events.some((e) => e.kind === "call" && e.state.frames.length === 2),
  );
});
test("global vs local scope and shadowing", () =>
  good(
    "int x=5;int get(){return x;}int main(){int x=2;{int x=3;cout<<x;}cout<<x<<get();}",
    "325",
  ));
test("callee cannot see caller locals", () =>
  bad("int f(){return x;}int main(){int x=2;cout<<f();}", /not declared/));
test("recursive frames remain independent", () => {
  const r = good(
    "int fact(int n){if(n<=1)return 1;return n*fact(n-1);}int main(){cout<<fact(5);}",
    "120",
  );
  assert.equal(Math.max(...r.events.map((e) => e.state.frames.length)), 6);
});
test("local reference alias and const reference", () =>
  good(
    "void f(const int& y){cout<<y;}int main(){int x=1;int& y=x;y=3;f(x);cout<<x;}",
    "33",
  ));
test("function loop interaction and early returns", () =>
  good(
    "int sum(int n){int s=0;for(int i=0;i<n;i++){s+=i;}return s;}int main(){for(int j=1;j<4;j++)cout<<sum(j);}",
    "013",
  ));
test("type and call diagnostics", () => {
  bad("int f(){ } int main(){f();}", /return a value/);
  bad("int f(int a){return a;}int main(){f();}", /expects/);
  bad("void f(int& a){a=2;}int main(){const int x=1;f(x);}", /Reference/);
  bad("int f(int x);double f(int x){return x;}int main(){}", /Conflicting/);
});
