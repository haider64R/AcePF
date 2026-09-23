// Curated, page-checkable transcriptions from supplied PDFs. Formatting and
// surrounding boilerplate are normalized; question logic is not rewritten.
// These records are deliberately separate from authored Challenge items, but
// join the same canonical question bank in questions.js.
const docs = {
  mid18: "PF Mid-Exam Fall-2018.pdf",
  mid20: "mid-I.pdf",
  mid22: "AIDS 22F PF Mid1.pdf",
  s1cs22: "PF Sessional-I (Fall-22) (BS-CS) (Solution).pdf",
  s222ai: "PF Sessional-II (Fall-22) (BS-AI_DS).pdf",
  s222cs: "PF Sessional-II (Fall-22) (BS-CS).pdf",
  s220: "PF Sessional-II (Fall-20) (Solution).pdf",
  s124: "PF Sessional#1 (Fall-2024).pdf",
  final24: "PF Final Exam (Solution) (Spring-2024).pdf",
  worksheet: "PF_Workshop_Dry_Runs.pdf",
  practice1: "PF-Sessional1-Questions.pdf",
  datatype: "problem-sheet.docx.pdf",
};

const sourceDefaults = {
  mid18: { assessment: "Midterm", year: 2018 },
  mid20: { assessment: "Midterm", year: 2020 },
  mid22: { assessment: "Sessional 1", year: 2022 },
  s1cs22: { assessment: "Sessional 1", year: 2022 },
  s222ai: { assessment: "Sessional 2", year: 2022 },
  s222cs: { assessment: "Sessional 2", year: 2022 },
  s220: { assessment: "Sessional 2", year: 2020 },
  s124: { assessment: "Sessional 1", year: 2024 },
  final24: { assessment: "Final", year: 2024 },
};

function q(doc, number, page, data) {
  const exam = Boolean(sourceDefaults[doc]);
  const { marks, references, visualizerCompatible, ...rest } = data;
  return {
    ...rest,
    primaryTopic: rest.topics[0],
    status: ["manual-review", "source-only"].includes(rest.verification)
      ? "draft"
      : "verified",
    visualizer: { compatible: visualizerCompatible },
    source: {
      type: exam ? "past-paper" : "practice",
      name: exam
        ? "FAST-NUCES Programming Fundamentals"
        : docs[doc].replace(/\.pdf$/, ""),
      ...sourceDefaults[doc],
      ...(!exam ? { assessment: "Practice" } : {}),
      document: docs[doc],
      page,
      questionNumber: number,
      reference: `${docs[doc]}, PDF page ${page}, ${number}`,
      ...(marks === undefined ? {} : { marks }),
      ...(references ? { references } : {}),
    },
  };
}

export const assessmentQuestions = [
  q("mid18", "Question I, code 1", 2, {
    id: "fast-2018-mid-q1-loop-break",
    title: "Break in a while loop",
    type: "predict-output",
    question:
      "Write the output produced by executing the following code. Explain any bug.",
    code: `int main() { int x = 8, y = 0, z;
  while (x >= 0 && y <= 5) {
    if (x == y) break;
    else cout << x << y;
    x--; y += 2;
  }
  return 0;
}`,
    answer: "807264",
    explanation:
      "The printed (x,y) pairs are (8,0), (7,2), and (6,4); y then exceeds 5.",
    topics: [
      "loops.while.condition",
      "loops.control.break",
      "selection.if.if-else",
    ],
    difficulty: "medium",
    marks: 2,
    autoGradable: true,
    visualizerCompatible: true,
    verification: "execution-verified",
  }),
  q("mid18", "Question I, code 4", 3, {
    id: "fast-2018-mid-q1-unsequenced",
    title: "Unsequenced increments",
    type: "code-reasoning",
    question:
      "Write the output produced by the code and explain any bug. The first expression is `y = ++x * ++x`; the second is `y = x++ * ++x` after resetting x to 5.",
    code: `int main() { int x, y; x = 5; y = ++x * ++x; cout << x << y; x = 5; y = x++ * ++x; cout << x << y; return 0; }`,
    answer:
      "No portable output: both expressions modify x without a guaranteed sequencing relationship in C++17.",
    explanation:
      "Do not assign a deterministic numeric answer to unsequenced modifications of the same scalar.",
    topics: [
      "operators.increment.prefix",
      "operators.increment.postfix",
      "operators.precedence.associativity",
    ],
    difficulty: "hard",
    marks: 2,
    autoGradable: false,
    visualizerCompatible: false,
    verification: "answer-reviewed",
  }),
  q("mid20", "Short Question 2, segment 1", 2, {
    id: "fast-2020-mid-q2-integer-division",
    title: "Integer division",
    type: "predict-output",
    question: "Specify the output produced by the program segment.",
    code: `int main() { int z = 0; z = 27 / 4; cout << "z =  " << endl << z; }`,
    answer: "z =  \n6",
    explanation: "Both operands are integers, so 27 / 4 truncates to 6.",
    topics: [
      "operators.arithmetic.multiply-divide",
      "fundamentals.input-output.cout",
    ],
    difficulty: "easy",
    marks: 1,
    autoGradable: true,
    visualizerCompatible: true,
    verification: "execution-verified",
  }),
  q("mid20", "Short Question 3", 4, {
    id: "fast-2020-mid-q3-average-error",
    title: "Average precedence error",
    type: "identify-error",
    question:
      "Suggest a simple change in a single line that corrects the average calculation; rewrite the corrected line only.",
    code: `#include <iostream>\nusing namespace std;\nint main() { double num1, num2, num3, avg; cin >> num1 >> num2 >> num3; avg = num1 + num2 + num3 / 3; cout << "The average of three numbers is " << avg; return 0; }`,
    standardInput: "1 2 3",
    answer: "avg = (num1 + num2 + num3) / 3;",
    explanation: "Without parentheses, division applies only to num3.",
    topics: [
      "operators.precedence.precedence",
      "operators.arithmetic.multiply-divide",
    ],
    difficulty: "easy",
    marks: 3,
    autoGradable: false,
    visualizerCompatible: true,
    verification: "answer-reviewed",
  }),
  q("mid20", "Writing Program, Problem 2", 7, {
    id: "fast-2020-mid-bmi",
    title: "Body mass index calculator",
    type: "code-writing",
    question:
      "Write a C++ program that inputs weight in kilograms and height in centimeters, converts height to meters, computes BMI = weight / height², and reports underweight (<18.5), normal (18.5–24.9), or overweight (≥25).",
    answer:
      "Open-ended program; check unit conversion, floating-point arithmetic, boundary conditions, and messages.",
    explanation:
      "The paper awards marks for variable types, conversions/calculations, output, and indentation; a single output string cannot grade all valid solutions.",
    topics: [
      "fundamentals.types.floating",
      "selection.if.else-if",
      "operators.arithmetic.multiply-divide",
    ],
    difficulty: "medium",
    marks: 13,
    autoGradable: false,
    visualizerCompatible: false,
    verification: "answer-reviewed",
  }),
  q("mid22", "Question 1, code 2", 2, {
    id: "fast-2022-s1-aids-q1-conversion",
    title: "Float-to-int assignment",
    type: "predict-output",
    question: "What is the output? If there is an error, mention it.",
    code: `int main() { int a = 8; float b = 4.5; a = b + 3; cout << a + b; return 0; }`,
    answer: "11.5",
    explanation:
      "b + 3 is 7.5, assignment to int a truncates it to 7, and 7 + 4.5 is 11.5.",
    topics: [
      "fundamentals.conversions.implicit",
      "operators.arithmetic.add-subtract",
    ],
    difficulty: "easy",
    autoGradable: true,
    visualizerCompatible: true,
    verification: "execution-verified",
  }),
  q("mid22", "Question 1, code 6", 3, {
    id: "fast-2022-s1-aids-q1-switch",
    title: "Switch fall-through",
    type: "predict-output",
    question: "What is the output? If there is an error, mention it.",
    code: `int main() { int a=7,b=6,c=0; switch(0) { case 1: a=6; b=8; cout<<a<<endl; case 0: b=a+c; cout<<b<<endl; default: c=b+3; cout<<c<<endl; } cout<<a<<" "<<b<<" "<<c; }`,
    answer: "7\n10\n7 7 10",
    explanation:
      "Execution enters case 0, prints 7, falls through to default and prints 10, then prints the final variables.",
    topics: ["selection.switch.fall-through", "selection.switch.cases"],
    difficulty: "medium",
    autoGradable: true,
    visualizerCompatible: true,
    verification: "execution-verified",
  }),
  q("mid22", "Question 3", 4, {
    id: "fast-2022-s1-aids-q3-tickets",
    title: "Parade ticket booking",
    type: "code-writing",
    question:
      "Create a Parade ticket-booking program that inputs age and park hours and displays the total bill. Park tickets cost PKR 10 per hour: under 10 not permitted, ages 10–15 get 10% off, ages 15–20 get 5% off, over 20 not allowed. Swing tickets cost PKR 10: ages 1–5 get 50% off, ages 5–10 get 25% off, over 10 not allowed.",
    answer:
      "Open-ended code; age-boundary interpretation requires review against the original paper.",
    explanation:
      "The paper's 10–15 and 15–20 ranges overlap at 15, and swing ranges overlap at 5, so a single deterministic reference answer would invent a boundary rule.",
    topics: [
      "selection.if.else-if",
      "fundamentals.input-output.cin",
      "operators.arithmetic.multiply-divide",
    ],
    difficulty: "medium",
    marks: 10,
    autoGradable: false,
    visualizerCompatible: false,
    verification: "manual-review",
  }),
  q("s1cs22", "Question 1(a), expression 2", 2, {
    id: "fast-2022-s1-cs-q1-logical",
    title: "Logical expression value",
    type: "short-answer",
    question: "Indicate the value of `(3 != 10 || 6 <= 10 * -200)`.",
    answer: "true",
    explanation:
      "3 != 10 is true, so the OR expression is true without needing the right operand.",
    topics: [
      "operators.logical.short-circuit",
      "operators.comparison.ordering",
    ],
    difficulty: "easy",
    marks: 1,
    autoGradable: false,
    visualizerCompatible: false,
    verification: "answer-reviewed",
  }),
  q("s1cs22", "Question 3(c)", 6, {
    id: "fast-2022-s1-cs-q3-compound",
    title: "Compound assignment chain",
    type: "predict-output",
    question:
      "Write the output; assume required libraries and main are included.",
    code: `int main() { short int unus, duo, tres; unus = duo = tres = 5.5; unus += 4; duo *= 2; tres -= 4; unus /= 3; duo += tres; cout << unus << endl << duo << endl << tres << endl; }`,
    answer: "3\n11\n1",
    explanation:
      "The initial 5.5 converts to 5 in each short; the later compound assignments give 3, 11, and 1.",
    topics: [
      "operators.assignment.compound",
      "fundamentals.conversions.implicit",
    ],
    difficulty: "medium",
    marks: 3,
    autoGradable: true,
    visualizerCompatible: true,
    verification: "execution-verified",
  }),
  q("s222ai", "Question I(a)", 2, {
    id: "fast-2022-s2-ai-q1-chained-comparison",
    title: "Chained comparison trap",
    type: "predict-output",
    question: "What will the program display? Explain any error or bug.",
    code: `int main() { int a,b,c; a=6,b=4,c=2; int max=(a>b>c)*(a+b+c); cout<<max; }`,
    answer: "0",
    explanation:
      "a>b yields 1; 1>c is false, so the product is zero. This does not test whether a>b and b>c.",
    topics: [
      "operators.comparison.ordering",
      "operators.precedence.associativity",
    ],
    difficulty: "medium",
    marks: 2,
    autoGradable: true,
    visualizerCompatible: false,
    verification: "answer-reviewed",
  }),
  q("s222ai", "Question I(e)", 2, {
    id: "fast-2022-s2-ai-q1-shadowing",
    title: "Block shadowing and postfix",
    type: "predict-output",
    question: "What is the output? Identify errors, if any.",
    code: `int main() { int x=10; { cout<<x<<"\t"; int x=20; cout<<(x++)<<"\t"; } cout<<(--x); }`,
    answer: "10\t20\t9",
    explanation:
      "The inner x starts at 20 and is printed before increment; the outer x remains 10 until --x makes it 9.",
    topics: [
      "functions.scope.shadowing",
      "operators.increment.postfix",
      "operators.increment.prefix",
    ],
    difficulty: "medium",
    marks: 2,
    autoGradable: true,
    visualizerCompatible: true,
    verification: "execution-verified",
  }),
  q("s222ai", "Question I(k)", 4, {
    id: "fast-2022-s2-ai-q1-short-circuit",
    title: "Short-circuit with increment",
    type: "predict-output",
    question: "What is the output? Identify errors, if any.",
    code: `int main() { int i=0,n=0; if ((i<1) && (++i<n)) { cout<<"Condition True!"; } else cout<<"Not True"; }`,
    answer: "Not True",
    explanation:
      "The left side is true, so ++i runs; 1<0 is false and the else branch prints.",
    topics: [
      "operators.logical.short-circuit",
      "operators.increment.prefix",
      "selection.if.if-else",
    ],
    difficulty: "medium",
    marks: 1,
    autoGradable: true,
    visualizerCompatible: true,
    verification: "execution-verified",
  }),
  q("s222ai", "Question I(p) / Sessional-II 2020 Question 01(A)", 5, {
    id: "fast-shared-mystery-conversion",
    title: "Argument conversion and mixed division",
    type: "predict-output",
    question: "What is the output of the function call?",
    code: `float Mystery(int y, int x) { return (y + x + 7.0 / 2); } int main() { float i=9.5; int j=4; cout<<Mystery(i,j)<<endl; }`,
    answer: "16.5",
    explanation:
      "Passing i to an int parameter truncates 9.5 to 9; 7.0/2 is 3.5, giving 16.5.",
    topics: [
      "functions.parameters.by-value",
      "fundamentals.conversions.implicit",
      "operators.arithmetic.multiply-divide",
    ],
    difficulty: "medium",
    marks: 2,
    autoGradable: true,
    visualizerCompatible: true,
    verification: "execution-verified",
    references: [
      { document: docs.s220, page: 1, questionNumber: "Question 01(A)" },
    ],
  }),
  q("s222ai", "Question I(q) / Sessional-II 2020 Question 01(C)", 5, {
    id: "fast-shared-nested-function",
    title: "Nested function calls",
    type: "predict-output",
    question: "What is the output of the nested calls?",
    code: `int fun(int x) { return x % 3 + 1; } int main() { int b=5; int y=2+fun(3*b+1); int z=fun(fun(y)); cout<<y<<"-"<<z; }`,
    answer: "4-3",
    explanation: "fun(16)=2, so y=4; fun(4)=2 and fun(2)=3.",
    topics: ["functions.calls.call-order", "operators.arithmetic.modulo"],
    difficulty: "medium",
    marks: 2,
    autoGradable: true,
    visualizerCompatible: false,
    verification: "answer-reviewed",
    references: [
      { document: docs.s220, page: 2, questionNumber: "Question 01(C)" },
    ],
  }),
  q("s220", "Question 01(D)", 2, {
    id: "fast-2020-s2-q1-do-continue",
    title: "Continue in a do-while",
    type: "predict-output",
    question: "What output is produced by the code?",
    code: `void PRINT(int i,int limit) { do { if (i++ < limit) { cout<<"MID"<<i; continue; } } while(i==limit); } int main() { int i=1; PRINT(i,3); return 0; }`,
    answer: "MID2",
    explanation:
      "The first test prints MID2; continue reaches the do-while condition, which is false because i is 2, not 3.",
    topics: [
      "loops.do-while.body-first",
      "loops.control.continue",
      "operators.increment.postfix",
    ],
    difficulty: "hard",
    marks: 4,
    autoGradable: true,
    visualizerCompatible: true,
    verification: "execution-verified",
  }),
  q("s222cs", "Question 1.1(c)", 2, {
    id: "fast-2022-s2-cs-q1-array-iterations",
    title: "Array after three iterations",
    type: "predict-array-state",
    question:
      "What are the contents of array B when the third iteration of the for loop terminates?",
    code: `int main() { const int N=3; int A[N]={3,2,1}; int B[N]={0}; for(int i=0;i<N;++i) { int length=1; while(A[i]!=1) { if(A[i]%2) A[i]=A[i]*3+1; else A[i]/=2; ++length; } B[i]=length; } }`,
    answer: "8 2 1",
    explanation:
      "The Collatz paths from 3, 2, and 1 have lengths 8, 2, and 1 under the paper's counting rule.",
    topics: [
      "arrays.one-dimensional.indexing",
      "loops.nested.inner-outer",
      "selection.if.if-else",
    ],
    difficulty: "hard",
    marks: 5,
    autoGradable: true,
    visualizerCompatible: true,
    verification: "execution-verified",
  }),
  q("s222cs", "Question 2, program 3", 5, {
    id: "fast-2022-s2-cs-q2-shadow-infinite",
    title: "Shadowed loop control",
    type: "code-reasoning",
    question: "Write the output; if there is no output, give the reason.",
    code: `float x=10; while (x<100) { int x=20; x*=5; x-=10; } cout<<x<<endl;`,
    answer: "No output: the outer x remains 10, so the loop is infinite.",
    explanation:
      "Only the inner x changes; the condition repeatedly reads the unchanged outer x.",
    topics: ["functions.scope.shadowing", "loops.while.condition"],
    difficulty: "medium",
    marks: 2,
    autoGradable: false,
    visualizerCompatible: false,
    verification: "answer-reviewed",
  }),
  q("s124", "Question 3", 2, {
    id: "fast-2024-s1-horse-age",
    title: "Horse age conversion",
    type: "code-writing",
    question:
      "Write a C++ program that converts input human years to horse years: each of the first three human years equals 7.5 horse years; each later human year equals 3.5 horse years. The paper gives input 7 → output 36.5.",
    answer: "Open-ended program; for input 7, output 36.5.",
    explanation:
      "A correct solution must handle years through 3 separately from later years; no single code string is required.",
    topics: [
      "selection.if.if-else",
      "operators.arithmetic.multiply-divide",
      "fundamentals.input-output.cin",
    ],
    difficulty: "medium",
    marks: 10,
    autoGradable: false,
    visualizerCompatible: false,
    verification: "answer-reviewed",
  }),
  q("final24", "Question 1(7)", 2, {
    id: "fast-2024-final-q1-dangling",
    title: "Make p1 dangling",
    type: "short-answer",
    question:
      "Given `char *p1 = new char; char *p2 = new char;`, write a statement to make p1 a dangling pointer.",
    answer: "delete p1;",
    explanation:
      "Deleting the allocation ends its lifetime while p1 retains the old address.",
    topics: [
      "dynamic-memory.release.delete",
      "dynamic-memory.lifetime.dangling",
    ],
    difficulty: "easy",
    marks: 2,
    autoGradable: false,
    visualizerCompatible: false,
    verification: "answer-reviewed",
  }),
  q("final24", "Question 2(12)", 3, {
    id: "fast-2024-final-q2-pointer-char",
    title: "Pointer and character mutation",
    type: "predict-output",
    question:
      "Write the output if the code is correct; otherwise identify the error. ASCII of A is 65.",
    code: `#include <iostream>\nusing namespace std;\nint main() { int a=32,*ptr=&a; char ch='A',*cho=&ch; *cho+=3; *ptr+=ch; cout<<a<<", "<<ch<<endl; return 0; }`,
    answer: "100, D",
    explanation:
      "*cho changes ch from A to D (ASCII 68), and *ptr adds 68 to a=32.",
    topics: [
      "pointers.aliasing.shared-storage",
      "pointers.basics.dereference",
      "fundamentals.types.characters",
    ],
    difficulty: "medium",
    marks: 2,
    autoGradable: true,
    visualizerCompatible: true,
    verification: "execution-verified",
  }),
  q("final24", "Question 2(13)", 3, {
    id: "fast-2024-final-q2-call-order",
    title: "Nested call output",
    type: "predict-output",
    question:
      "Write the output if the code is correct; otherwise identify the error.",
    code: `int my_func(int num) { cout<<num<<endl; return num*-2; } int main() { cout<<my_func(my_func(4)*2); return 0; }`,
    answer: "4\n-16\n32",
    explanation:
      "The inner call prints 4 and returns -8; the outer call receives -16, prints it, then returns 32.",
    topics: ["functions.calls.call-order", "functions.calls.return-values"],
    difficulty: "medium",
    marks: 2,
    autoGradable: true,
    visualizerCompatible: true,
    verification: "execution-verified",
  }),
  q("final24", "Question 2(16)", 4, {
    id: "fast-2024-final-q2-const-pointer-error",
    title: "Uninitialized const pointer",
    type: "identify-error",
    question:
      "Write the output if the code is correct; otherwise identify and explain the errors.",
    code: `int x=100,y=200; int *const p; p=&x; cout<<*p<<endl; p=&y; cout<<*p<<endl;`,
    answer:
      "Compilation error: a const pointer must be initialized, and p cannot later be reassigned.",
    explanation:
      "The pointer itself is const, so both the missing initializer and later assignments are invalid.",
    topics: ["pointers.const.pointer", "pointers.basics.declaration"],
    difficulty: "medium",
    marks: 2,
    autoGradable: false,
    visualizerCompatible: false,
    verification: "answer-reviewed",
  }),
  q("final24", "Question 6", 11, {
    id: "fast-2024-final-q6-matrix-pairs",
    title: "Pairs in a 6×6 array",
    type: "code-writing",
    question:
      "Write a function that accepts an integer 2D array of size 6×6 to find pairs and indexes of elements that have the maximum and minimum difference among all element pairs. The paper gives a 6×6 example and requires both pairs and their indexes.",
    answer:
      "Open-ended function; compare the reported minimum and maximum element differences and their indexes against the source example.",
    explanation:
      "Many correct implementations exist, so the source solution is a reference rather than a unique text answer.",
    topics: [
      "arrays.two-dimensional.indexing",
      "functions.parameters.by-value",
      "loops.nested.inner-outer",
    ],
    difficulty: "hard",
    marks: 15,
    autoGradable: false,
    visualizerCompatible: false,
    verification: "source-only",
  }),
  q("worksheet", "Part I, Problem 2", 1, {
    id: "practice-workshop-switch-default",
    title: "Default-case fall-through",
    type: "predict-output",
    question: "Write the exact console output; explain any error or bug.",
    code: String.raw`int main() { int choice=5; switch(choice) { default: cout<<"\nI am in Default"; case 1: cout<<"\nI am in case 1"; break; case 2: cout<<"\nI am in case 2"; break; case 3: cout<<"\nI am in case 3"; break; } return 0; }`,
    answer: "\nI am in Default\nI am in case 1",
    explanation:
      "No case matches 5, so default runs and falls through to case 1 until break.",
    topics: ["selection.switch.fall-through", "selection.switch.break"],
    difficulty: "medium",
    autoGradable: true,
    visualizerCompatible: true,
    verification: "execution-verified",
  }),
  q("worksheet", "Part I, Problem 7", 2, {
    id: "practice-workshop-unsequenced",
    title: "Unsequenced decrement/increment",
    type: "code-reasoning",
    question:
      "Write the exact output, or identify the bug and explain why it occurs, for a loop whose body prints `--n * n++`.",
    code: `int main() { int n=5; while(n>=0) { cout<<--n*n++<<endl; n--; } while(n>0) cout<<(n/2)<<endl; return 0; }`,
    answer:
      "Undefined behavior: the same n is modified more than once without guaranteed sequencing in the multiplication expression.",
    explanation: "There is no portable numeric dry run for `--n * n++`.",
    topics: [
      "operators.increment.prefix",
      "operators.increment.postfix",
      "loops.while.condition",
    ],
    difficulty: "hard",
    autoGradable: false,
    visualizerCompatible: false,
    verification: "answer-reviewed",
  }),
  q("practice1", "Question 1(5), segment 2", 2, {
    id: "practice-s1-division-modulo",
    title: "Division and remainder",
    type: "predict-output",
    question: "Write the output; if there is an error or bug, explain it.",
    code: `int main() { int x=50,y=7,z=3; cout<<(x/y)%z+(x%y)*z<<endl; }`,
    answer: "4",
    explanation: "50/7 is 7; 7%3 is 1. Also 50%7 is 1, so the result is 1+3=4.",
    topics: [
      "operators.arithmetic.modulo",
      "operators.arithmetic.multiply-divide",
    ],
    difficulty: "medium",
    marks: 1,
    autoGradable: true,
    visualizerCompatible: true,
    verification: "execution-verified",
  }),
  q("datatype", "Datatypes, problem 3", 1, {
    id: "practice-datatypes-divisions",
    title: "Integer versus floating division",
    type: "predict-output",
    question:
      'Write the exact output of `cout << 7/2 << " " << 7/2.0 << " " << 7.0/2;`.',
    code: `int main() { cout<<7/2<<" "<<7/2.0<<" "<<7.0/2; }`,
    answer: "3 3.5 3.5",
    explanation:
      "Only 7/2 uses two integer operands; the other divisions are floating-point.",
    topics: [
      "operators.arithmetic.multiply-divide",
      "fundamentals.conversions.promotion",
    ],
    difficulty: "easy",
    autoGradable: true,
    visualizerCompatible: true,
    verification: "execution-verified",
  }),
  q("datatype", "Overflow, problem 7", 1, {
    id: "practice-datatypes-signed-overflow",
    title: "Signed integer overflow",
    type: "code-reasoning",
    question:
      "Write the exact output, or identify a bug, for `int x = 2147483647; x = x + 1; cout << x;`.",
    code: `int main() { int x=2147483647; x=x+1; cout<<x; }`,
    answer:
      "Undefined behavior: signed int overflow has no portable output in C++17.",
    explanation:
      "The worksheet supplies an assumed int size, but signed overflow is still undefined by C++.",
    topics: [
      "fundamentals.types.integers",
      "operators.arithmetic.add-subtract",
    ],
    difficulty: "medium",
    autoGradable: false,
    visualizerCompatible: false,
    verification: "answer-reviewed",
  }),
];
