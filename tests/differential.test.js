import test from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { runProject } from "../src/engine/index.js";
const cases = [
  "cout<<(true?'A':'B')<<\" \"<<0.00001<<\" \"<<1000000.0;",
  'int a=17,b=5;cout<<a/b<<" "<<a%b<<" "<<a+b*2;',
  "int x=2;int y=x++;cout<<x<<y<<++x;",
  'unsigned int x=4294967295u;cout<<x*x<<" "<<(x+1);',
  'cout<<((true?1:2.0)/2)<<" "<<(-17/5)<<" "<<(-17%5);',
  "int a[4]={1,2};for(int i=0;i<4;i++)cout<<a[i];",
  "int m[2][3]={{1},{2,3}};for(int i=0;i<2;i++)for(int j=0;j<3;j++)cout<<m[i][j];",
  "int a[3]={3,4,5};int* p=a;cout<<*p++<<*p<<*(a+2)<<((a+3)-p);",
  "int x=2;int& ref=x;ref*=3;cout<<x;",
  "int x=1,y=3;const int* p=&x;p=&y;int* const q=&x;*q=4;cout<<*p<<*q;",
  "int* p=new int[3]();for(int i=0;i<3;i++)p[i]+=i;cout<<p[0]<<p[1]<<p[2];delete[] p;",
  "int x=1;bool b=false&&++x;bool c=true||++x;cout<<x<<b<<c;",
  "for(int i=0;i<5;i++){if(i==2)continue;if(i==4)break;cout<<i;}",
  "int i=0;do{i++;if(i<2)continue;cout<<i;}while(i<3);",
  "int x=2;switch(x){case 1:cout<<1;break;case 2:cout<<2;case 3:cout<<3;break;default:cout<<4;}",
  'char name[]="Haider";cout<<name<<" "<<name[2];',
  'int x=10;cout<<(x<<2)<<" "<<(x>>1)<<" "<<(x&3)<<" "<<(x|3)<<" "<<(x^3)<<" "<<~x;',
  'float x=1.0f/3;double y=1.0/3;cout<<x<<" "<<y;',
  'ofstream out("numbers.txt");out<<1<<" "<<2<<" "<<3;out.close();ifstream in("numbers.txt");int x;while(in>>x)cout<<x;cout<<in.eof();',
];
// Generated, deterministic, defined integer expressions cover precedence combinations.
for (let i = 1; i <= 16; i++)
  cases.push(
    `int a=${i * 7},b=${i + 1};cout<<((a+b)*3-a/b)<<" "<<((a^b)&31)<<" "<<(a>b? a-b:b-a);`,
  );
let compiler = true;
try {
  execFileSync("clang++", ["--version"], { stdio: "ignore" });
} catch {
  compiler = false;
}
test(
  "35 curated/generated programs agree with native C++17",
  { skip: !compiler },
  () => {
    const dir = mkdtempSync(join(tmpdir(), "cpp-visualizer-native-"));
    try {
      const source =
        "#include <iostream>\n#include <fstream>\nusing namespace std;\n" +
        cases.map((s, i) => `void example${i}(){${s}}`).join("\n") +
        "\nint main(){" +
        cases.map((_, i) => `example${i}();cout<<"\\n--CASE--\\n";`).join("") +
        "}";
      writeFileSync(join(dir, "oracle.cpp"), source);
      execFileSync(
        "clang++",
        [
          "-std=c++17",
          "-O0",
          join(dir, "oracle.cpp"),
          "-o",
          join(dir, "oracle"),
        ],
        { timeout: 30000, stdio: "pipe" },
      );
      const expected = execFileSync(join(dir, "oracle"), [], {
        cwd: dir,
        timeout: 5000,
        encoding: "utf8",
      }).split("\n--CASE--\n");
      cases.forEach((body, i) => {
        const r = runProject({ "main.cpp": `int main(){${body}}` });
        assert.equal(r.ok, true, `Case ${i}: ${r.events.at(-1).message}`);
        assert.equal(r.state.output, expected[i], `Case ${i}: ${body}`);
      });
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  },
);
