import test from "node:test";
import assert from "node:assert/strict";
import { good, bad } from "./helpers.js";
import { runProject } from "../src/engine/index.js";
test("ofstream constructor, writes and close", () => {
  const r = good('ofstream file("marks.txt");file<<"Ali 90";file.close();');
  assert.equal(r.state.files["marks.txt"], "Ali 90");
  assert.equal(r.state.streams[0].open, false);
});
test("append preserves content and destructor closes streams", () => {
  const r = good(
    'ofstream file("marks.txt",ios::app);file<<" 95";',
    undefined,
    { files: { "marks.txt": "Ali 90" } },
  );
  assert.equal(r.state.files["marks.txt"], "Ali 90 95");
  assert.equal(r.state.streams[0].open, false);
});
test("file loops and EOF state", () => {
  const r = good(
    'ifstream input("numbers.txt");int x;int sum=0;while(input>>x){sum+=x;}cout<<sum<<input.eof();',
    "61",
    { files: { "numbers.txt": "1 2 3" } },
  );
  assert.ok(
    r.events.some((e) => e.kind === "file" && e.detail.success === false),
  );
});
test("open, truncate, read-write modes", () => {
  const r = good(
    'fstream file;file.open("data.txt",ios::out|ios::trunc);file<<123;file.close();file.open("data.txt",ios::in);int x;file>>x;cout<<x;',
    "123",
    { files: { "data.txt": "old" } },
  );
  assert.equal(r.state.files["data.txt"], "123");
});
test("missing file has failure state without inventing content", () =>
  good(
    'ifstream file("missing.txt");cout<<file.is_open()<<file.fail();',
    "01",
  ));
test("virtual paths cannot access real files", () =>
  bad('ofstream f("../secret.txt");', /simple virtual filename/));
test("project headers resolve prototypes and preserve source locations", () => {
  const r = runProject({
    "main.cpp": '#include "math.h"\nint main(){cout<<twice(6);}',
    "math.h": "#ifndef MATH_H\n#define MATH_H\nint twice(int x);\n#endif",
    "math.cpp": '#include "math.h"\nint twice(int x){return x*2;}',
  });
  assert.equal(r.ok, true, r.events.at(-1).message);
  assert.equal(r.state.output, "12");
  assert.ok(r.events.some((e) => e.loc?.file === "math.cpp"));
});
test("missing and circular headers and unsupported macros", () => {
  for (const files of [
    { "main.cpp": '#include "missing.h"\nint main(){}' },
    {
      "main.cpp": '#include "a.h"\nint main(){}',
      "a.h": '#include "b.h"',
      "b.h": '#include "a.h"',
    },
    { "main.cpp": "#define X 3\nint main(){}" },
  ])
    assert.equal(runProject(files).ok, false);
});
test("file snapshots are immutable during append", () => {
  const r = good('ofstream f("a.txt");f<<"A";f<<"B";');
  const writes = r.events.filter(
    (e) => e.kind === "file" && e.message.startsWith("Write"),
  );
  assert.equal(writes[0].state.files["a.txt"], "A");
  assert.equal(writes[1].state.files["a.txt"], "AB");
});
test("char extraction consumes one character, numeric extraction uses prefix", () =>
  good("char a,b;int n;cin>>a>>b>>n;cout<<a<<b<<n;", "AB12", {
    input: "AB12tail",
  }));
