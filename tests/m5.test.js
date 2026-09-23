import test from "node:test";
import assert from "node:assert/strict";
import { good, bad } from "./helpers.js";
import { runProject } from "../src/engine/index.js";
test("address, dereference, mutation and null pointers", () => {
  const r = good(
    "int x=5;int* p=&x;*p=10;cout<<x; p=nullptr;cout<<(p==nullptr);",
    "101",
  );
  assert.ok(r.events.some((e) => e.kind === "pointer"));
});
test("pointer arithmetic scales by elements and supports one-past", () =>
  good(
    "int a[3]={2,4,6};int* p=a;cout<<*p; p++;cout<<*p<<*(p+1);int* end=a+3;cout<<(end-p);",
    "2462",
  ));
test("const pointer variants", () => {
  good(
    "int x=1,y=2;const int* p=&x;p=&y;int* const q=&x;*q=3;cout<<*p<<x;",
    "23",
  );
  bad("int x=1;const int* p=&x;*p=2;", /const/);
  bad("int x=1;int* const p=&x;p=nullptr;", /const/);
  bad("const int x=1;int* p=&x;", /Cannot convert/);
  bad("int x=1;const int* const p=&x;*p=3;", /const/);
});
test("dynamic scalar lifetime", () => {
  const r = good("int* p=new int;*p=5;cout<<*p;delete p;p=nullptr;", "5");
  assert.equal(r.state.memory.find((o) => o.region === "heap").alive, false);
  assert.ok(r.events.some((e) => e.kind === "free"));
});
test("dynamic arrays + loops + functions", () => {
  const r = runProject({
    "main.cpp":
      "void fill(int* p,int n){for(int i=0;i<n;i++)p[i]=i*2;}int main(){int* p=new int[3];fill(p,3);cout<<p[2];delete[] p;}",
  });
  assert.equal(r.ok, true, r.events.at(-1).message);
  assert.equal(r.state.output, "4");
});
test("array of pointers", () =>
  good("int a=1,b=2;int* ptrs[2]={&a,&b};*ptrs[1]=8;cout<<*ptrs[0]<<b;", "18"));
test("null, dangling, mismatch, double free and non-heap diagnostics", () => {
  bad("int* p=nullptr;cout<<*p;", /null|invalid/);
  bad("int* p=new int(3);delete p;cout<<*p;", /no longer/);
  bad("int* p=new int[2];delete p;", /delete\[\]/);
  bad("int* p=new int;delete p;delete p;", /no longer/);
  bad("int x=1;delete &x;", /original pointer/);
});
test("one-past is not dereferenceable and arithmetic is bounded", () => {
  bad("int a[2]={1,2};int* p=a+2;cout<<*p;", /outside/);
  bad("int a[2]={1,2};int* p=a+3;", /outside/);
  bad("int* p=nullptr;p++;", /nullptr/);
});
test("expired locals and returned dangling pointers", () => {
  const r = runProject({
    "main.cpp": "int* f(){int x=2;return &x;}int main(){int* p=f();cout<<*p;}",
  });
  assert.equal(r.ok, false);
  assert.match(r.events.at(-1).message, /no longer/);
});
test("leaks are reported, delete null is harmless", () => {
  const r = good("int* p=new int(5);delete nullptr;");
  assert.ok(r.events.some((e) => e.kind === "leak"));
});
test("const array arguments cannot be mutated", () => {
  const r = runProject({
    "main.cpp":
      "void f(const int a[]){a[0]=3;}int main(){int a[2]={1,2};f(a);}",
  });
  assert.equal(r.ok, false);
  assert.match(r.events.at(-1).message, /const/);
});
