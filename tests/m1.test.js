import test from "node:test";
import assert from "node:assert/strict";
import { lex } from "../src/engine/lexer.js";
import { good, bad, run } from "./helpers.js";
test("tokens carry source locations and escapes", () => {
  const t = lex('// hi\nint x=2; cout << "a\\n";');
  assert.equal(t[0].loc.line, 2);
  assert.equal(t.at(-3).value, "a\n");
});
test("precedence, integer division, conversions", () =>
  good(
    'int x=2+3*4; double y=5.0/2; cout << x << " " << 5/2 << " " << y;',
    "14 2 2.5",
  ));
test("declarations, assignment and compound operations", () =>
  good("int a=10,b=3; a+=b; a*=2; a-=1; a/=5; a%=3; cout<<a;", "2"));
test("prefix and postfix effects", () => {
  const r = good("int y=3; int x=y++; cout<<x<<y<<++y;", "345");
  assert.ok(r.events.some((e) => e.message.includes("Postfix")));
});
test("comparison, bool, short circuit", () => {
  const r = good(
    "int x=1; bool a=false && ++x; bool b=true || ++x; cout<<x<<a<<b;",
    "101",
  );
  assert.equal(r.events.filter((e) => e.kind === "short-circuit").length, 2);
});
test("nested selection and ternary", () =>
  good(
    "int x=3; if(x<2) cout<<0; else if(x==3){if(true)cout<<(x>0?4:5);}else cout<<6;",
    "4",
  ));
test("switch fallthrough and break", () =>
  good(
    "int x=2; switch(x){case 1:cout<<1;break;case 2:cout<<2;case 3:cout<<3;break;default:cout<<4;}",
    "23",
  ));
test("switch default and duplicate rejection", () => {
  good("switch(9){case 1:break;default:cout<<5;}", "5");
  bad("switch(1){case 1:break;case 1:break;}", /Duplicate/);
});
test("bitwise precedence and shifts", () =>
  good(
    "cout << (5 & 3) << (5 | 2) << (5 ^ 1) << (2 << 3) << (16 >> 2);",
    "174164",
  ));
test("all primitive forms", () =>
  good(
    "short a=2; long b=3; unsigned int c=4; float d=1.5f; double e=2.5; char f='A'; bool g=true; signed int h=-2; cout<<a<<b<<c<<d<<e<<f<<g<<h;",
    "2341.52.5A1-2",
  ));
test("const and scope errors", () => {
  bad("const int x=2; x=3;", /const/);
  bad("{int x=2;}cout<<x;", /not declared/);
  bad("int x=1;int x=2;", /already declared/);
});
test("undefined arithmetic and uninitialized reads", () => {
  bad("int x;cout<<x;", /uninitialized/);
  bad("cout<<1/0;", /zero/);
  bad("int x=2147483647;x++;", /overflow/);
  bad("cout<<(1<<32);", /Shift/);
  bad("int x=1;cout<<(x++ + x);", /sequenc/);
});
test("input and invalid input", () => {
  good("int x; double y; cin>>x>>y;cout<<x+y;", "5.5", { input: "2 3.5" });
  bad("int x;cin>>x;", /Input needed/);
});
test("snapshots are detached and store scope lifetimes", () => {
  const r = good("int x=1;x=2;");
  const a = r.events.find((e) => e.kind === "declare");
  assert.equal(a.state.memory.at(-1).cells[0].value, 1);
  assert.equal(r.state.memory.at(-1).alive, false);
});
test("unsupported syntax fails closed", () => {
  bad("auto x=3;", /Expected/);
  bad('cout<<"unterminated;', /Unterminated/);
});
