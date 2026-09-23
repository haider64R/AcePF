import test from "node:test";
import assert from "node:assert/strict";
import { good, bad } from "./helpers.js";
import { runProject } from "../src/engine/index.js";
test("ternary applies common type even when integer arm selected", () =>
  good("cout << ((true ? 1 : 2.0) / 2);", "0.5"));
test("exact unsigned multiplication beyond JS safe integer product", () =>
  good('unsigned int x=4294967295u;cout<<x*x<<" "<<(x+1);', "1 0"));
test("signed division and remainder overflow rejected", () => {
  bad("int x=-2147483647-1;cout<<x/-1;", /overflow/);
  bad("int x=-2147483647-1;cout<<x%-1;", /overflow/);
});
test("const write in untaken branch is rejected before execution", () => {
  const r = bad("const int x=1;if(false)x=2;", /const/);
  assert.equal(r.events.length, 1);
});
test("unknown name in untaken branch is rejected", () =>
  bad("if(false)cout<<missing;", /not declared/));
test("reference and pointer aliases cannot hide unsequenced mutations", () => {
  bad("int x=1;int& y=x;cout<<(x++ + y);", /sequenc/);
  bad("int x=1;int* p=&x;cout<<((*p)++ + x);", /sequenc/);
});
test("sequence points allow chained output and comma-free separate statements", () =>
  good("int x=1;cout<<x++<<x; x=x++;cout<<x;", "122"));
test("order-sensitive argument calls fail instead of choosing a result", () => {
  const r = runProject({
    "main.cpp":
      "int x=0;int inc(){x++;return x;}int use(int a,int b){return a*10+b;}int main(){cout<<use(inc(),inc());}",
  });
  assert.equal(r.ok, false);
  assert.match(r.events.at(-1).message, /sequenc|order/);
});
test("matrix row bounds survive pointer decay", () => {
  bad("int m[2][2]={{1,2},{3,4}};int* p=m[0];cout<<p[2];", /row|outside/);
  bad("int m[2][2]={{1,2},{3,4}};int* p=m[0];cout<<*(p+2);", /outside/);
});
test("invalid float operators, conditions and unsigned conversion", () => {
  bad("double x=2.5;cout<<(x%2);", /integer/);
  bad('if("hello")cout<<1;', /condition/);
  bad("unsigned int x=-1.5;", /range/);
});
test("duplicate parameter, missing declaration, return type rejected", () => {
  for (const s of [
    "int f(int x,int x){return x;}int main(){}",
    "int main(){f();}void f(){}",
    "int main(){return;}",
  ])
    assert.equal(runProject({ "main.cpp": s }).ok, false);
});
test("array init excess and released pointer offset", () => {
  bad("int a[2]={1,2,3};", /Too many/);
  bad("int* p=new int[2];delete[] p;p++;", /no longer/);
});
test("snapshot resource budget bounded for large arrays", () => {
  const r = runProject({
    "main.cpp": "int main(){int a[1024]={};for(int i=0;i<1000;i++)a[i]=i;}",
  });
  assert.equal(r.ok, false);
  assert.equal(r.events.at(-1).detail.code, "limit");
  assert.ok(r.events.length < 1000);
});
test("hex integer literal uses unsigned when int cannot represent it", () =>
  good('cout<<0xffffffff<<" "<<(0xffffffff+1);', "4294967295 0"));
test("global initialization calls a later prototyped definition", () => {
  const r = runProject({
    "main.cpp": "int f();int x=f();int f(){return 9;}int main(){cout<<x;}",
  });
  assert.equal(r.ok, true, r.events.at(-1).message);
  assert.equal(r.state.output, "9");
});
test("qualified stream type and built-in names", () =>
  good('std::ofstream f("a.txt");f<<"ok";std::cout<<3;', "3"));
test("array invalid initializer checked in untaken branch", () =>
  bad("if(false){int a[1]={nullptr};}", /convert/));
test("JavaScript object property names do not escape scope bindings", () =>
  good("int constructor=7;int toString=9;cout<<constructor<<toString;", "79"));
test("large virtual file inputs rejected", () => {
  const r = runProject(
    { "main.cpp": "int main(){}" },
    { files: { "a.txt": "x".repeat(70000) } },
  );
  assert.equal(r.ok, false);
  assert.match(r.events[0].message, /resource limit/);
});
test("pointer-to-row and pointer-to-pointer decay cannot masquerade as int*", () => {
  bad("int m[2][2]={{}};int* p=m;", /pointer-to/);
  bad("int x=1;int* a[1]={&x};int* p=a;", /pointer-to/);
});
test("nullptr compares to nullptr", () =>
  good("cout<<(nullptr==nullptr)<<(nullptr!=nullptr);", "10"));
test("character array input is null terminated and bounded", () => {
  good("char name[8];int mark;cin>>name>>mark;cout<<name<<mark;", "Ali90", {
    input: "Ali 90",
  });
  const r = runProject(
    { "main.cpp": "int main(){char name[3];cin>>name;}" },
    { input: "Haider" },
  );
  assert.equal(r.ok, false);
  assert.match(r.events.at(-1).message, /terminator/);
});
test("same-type character ternary retains char output", () =>
  good("cout<<(true?'A':'B');", "A"));
test("floating output uses C++ default scientific thresholds", () =>
  good('cout<<0.00001<<" "<<0.0001<<" "<<1000000.0;', "1e-05 0.0001 1e+06"));
test("local aggregate initialization cannot read later uninitialized cells", () => {
  bad("int a[2]={a[1],1};cout<<a[0];", /uninitialized/);
  good("int a[2]={1,a[0]+1};cout<<a[1];", "2");
});
test("array list floating-to-integer narrowing is rejected", () =>
  bad("int a[1]={1.5};", /narrowing/));
