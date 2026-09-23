// Inventory of every supplied PDF. `pages` counts PDF pages, not page labels
// printed on a paper. Missing fields are genuinely unknown from the document.
export const assessmentSources = Object.freeze([
  {
    document: "AIDS 22F PF Mid1.pdf",
    kind: "exam",
    assessment: "Sessional 1",
    year: 2022,
    semester: "Fall",
    campus: "Islamabad",
    course: "CS-1002 Programming Fundamentals",
    durationMinutes: 60,
    totalMarks: 30,
    pages: 5,
    structure:
      "3 questions: six output/error snippets, four error snippets, one ticket-booking program",
    topics: ["operators", "selection", "fundamentals"],
    review: "Question 3 age brackets overlap at boundaries.",
  },
  {
    document: "mid-I.pdf",
    kind: "exam",
    assessment: "Midterm",
    year: 2020,
    semester: "Fall",
    campus: "Lahore",
    course: "Programming Fundamentals",
    pages: 10,
    structure:
      "Short questions plus two program-writing problems (7 and 13 points)",
    topics: ["fundamentals", "operators", "selection"],
    review:
      "Several code segments are broken across layout columns; only clear ones imported.",
  },
  {
    document: "PF Final Exam (Fall-2023).pdf",
    kind: "exam",
    assessment: "Final",
    year: 2023,
    semester: "Fall",
    campus: "Islamabad",
    course: "CS-1002 Programming Fundamentals (CS)",
    durationMinutes: 180,
    totalMarks: 170,
    pages: 17,
    structure:
      "Cover says 6 questions and 18 printed pages; supplied PDF has 17 image-only pages",
    topics: ["functions", "arrays", "pointers", "dynamic-memory"],
    review:
      "Page images show tracing, pointers, arrays and longer code tasks; individual questions not imported without reliable transcription. One printed page appears absent.",
  },
  {
    document: "PF Final Exam (Solution) (Spring-2024) (1).pdf",
    kind: "duplicate-file",
    assessment: "Final",
    year: 2024,
    semester: "Spring",
    campus: "Islamabad",
    course: "CS-1002 Programming Fundamentals",
    durationMinutes: 180,
    totalMarks: 100,
    pages: 12,
    duplicateOf: "PF Final Exam (Solution) (Spring-2024).pdf",
    structure:
      "Byte-identical duplicate of the other supplied Spring 2024 solution",
    topics: ["functions", "arrays", "pointers", "dynamic-memory", "loops"],
  },
  {
    document: "PF Final Exam (Solution) (Spring-2024).pdf",
    kind: "exam",
    assessment: "Final",
    year: 2024,
    semester: "Spring",
    campus: "Islamabad",
    course: "CS-1002 Programming Fundamentals",
    durationMinutes: 180,
    totalMarks: 100,
    pages: 12,
    structure:
      "6 questions: one-line statements, output/error tracing, and four larger coding problems",
    topics: ["functions", "arrays", "pointers", "dynamic-memory", "loops"],
    review:
      "Solution PDF mixes questions and answers; some supplied answers are not portable C++17.",
  },
  {
    document: "PF Mid-Exam Fall-2018.pdf",
    kind: "exam",
    assessment: "Midterm",
    year: 2018,
    semester: "Fall",
    campus: "Islamabad",
    course: "CS118 Programming Fundamentals",
    durationMinutes: 120,
    totalMarks: 75,
    pages: 12,
    structure:
      "6 questions: output/bug tracing, salary/loop programs, conversions, patterns, change-making",
    topics: ["operators", "selection", "loops", "fundamentals"],
    review:
      "Some snippets use curly quotes; unsequenced increment question has no portable output.",
  },
  {
    document: "PF Sessional-I (Fall-22) (BS-CS) (Solution).pdf",
    kind: "exam",
    assessment: "Sessional 1",
    year: 2022,
    semester: "Fall",
    campus: "Islamabad",
    course: "CS-1002 Programming Fundamentals (CS)",
    durationMinutes: 60,
    totalMarks: 60,
    pages: 10,
    structure:
      "4 questions: expression values, logic construction, code completion, output, correction",
    topics: ["operators", "fundamentals", "selection"],
    review: "Some solution annotations are interleaved with source code.",
  },
  {
    document: "PF Sessional-II (Fall-20) (Solution).pdf",
    kind: "exam",
    assessment: "Sessional 2",
    year: 2020,
    semester: "Fall",
    pages: 4,
    structure:
      "Question 01: seven output-tracing snippets; later questions not supplied",
    topics: ["functions", "loops", "selection", "operators"],
    review:
      "Source lacks a cover with campus, duration, course code, or paper total.",
  },
  {
    document: "PF Sessional-II (Fall-22) (BS-AI_DS).pdf",
    kind: "exam",
    assessment: "Sessional 2",
    year: 2022,
    semester: "Fall",
    campus: "Islamabad",
    course: "CS-1002 Programming Fundamentals (BS DS/AI)",
    durationMinutes: 60,
    totalMarks: 60,
    pages: 8,
    structure:
      "4 questions: 36 marks output/error/decision tracing; three 8-mark programming questions",
    topics: ["operators", "selection", "loops", "functions"],
  },
  {
    document: "PF Sessional-II (Fall-22) (BS-CS).pdf",
    kind: "exam",
    assessment: "Sessional 2",
    year: 2022,
    semester: "Fall",
    campus: "Islamabad",
    course: "CS-1002 Programming Fundamentals (CS)",
    durationMinutes: 60,
    totalMarks: 60,
    pages: 10,
    structure:
      "3 questions: array-state tracing (10), output tracing (35), code completion (15)",
    topics: ["arrays", "loops", "functions", "selection"],
  },
  {
    document: "PF Sessional#1 (Fall-2024).pdf",
    kind: "exam",
    assessment: "Sessional 1",
    year: 2024,
    semester: "Fall",
    campus: "Islamabad",
    course: "CS1002 Programming Fundamentals",
    durationMinutes: 60,
    totalMarks: 50,
    pages: 2,
    structure:
      "Cover says 4 questions; supplied scan contains printed pages 1 and 4 only",
    topics: ["operators", "selection"],
    review: "Image-only partial scan; printed pages 2 and 3 are missing.",
  },
  {
    document: "PF_Workshop_Dry_Runs.pdf",
    kind: "practice",
    assessment: "Practice",
    pages: 7,
    structure:
      "PF workshop worksheet: 25 core diagnostic/loop dry runs and 20 midterm traps",
    topics: ["operators", "selection", "loops", "arrays", "fundamentals"],
    review: "Workshop material, not evidence of an administered exam.",
  },
  {
    document: "PF-Sessional1-Questions.pdf",
    kind: "practice",
    assessment: "Practice",
    pages: 8,
    structure:
      "Question 1 has literals, statements, output/error segments and code completion; Question 2 flowchart; Question 3 blanks",
    topics: ["fundamentals", "operators", "selection"],
    review:
      "No visible university/course cover or date; treat as supplied practice, not a verified exam. Some pages lack text.",
  },
  {
    document: "problem-sheet.docx.pdf",
    kind: "practice",
    assessment: "Practice",
    pages: 2,
    structure: "19 datatype/range/overflow output problems",
    topics: ["fundamentals", "operators", "loops"],
    review:
      "Assumed type sizes are stated; signed overflow still cannot have a portable exact output.",
  },
]);

// Profiles summarize only the documents above, never the institution at large.
export const assessmentProfiles = Object.freeze([
  {
    id: "sessional-1",
    assessment: "Sessional 1",
    sourceCount: 3,
    observedScope: ["fundamentals", "operators", "selection"],
    formats: [
      "short output/error",
      "expression value",
      "condition/code completion",
      "open programming",
    ],
    marks: "30, 50, or 60 on the three supplied covers; 1 hour each",
    observedDifficulty: ["easy", "medium"],
    commonCombinations: [
      "conversion + arithmetic",
      "precedence + logical conditions",
      "conditional boundaries + input",
    ],
    paperEvidence: [
      {
        document: "AIDS 22F PF Mid1.pdf",
        marks: { outputOrError: 20, openCoding: 10 },
        note: "Q1 is 12 output/error marks; Q2 is 8 error marks; Q3 is 10 coding marks.",
      },
      {
        document: "PF Sessional-I (Fall-22) (BS-CS) (Solution).pdf",
        marks: {
          mixedExpressionLogic: 20,
          completion: 9,
          output: 17,
          correction: 14,
        },
        note: "Four question headers sum to the declared 60 marks.",
      },
      {
        document: "PF Sessional#1 (Fall-2024).pdf",
        marks: { visibleOutput: 25, visibleCoding: 18 },
        note: "Only printed pages 1 and 4 are present; other question content is unknown.",
      },
    ],
    variation:
      "Fall 2024 is a partial image-only scan; Fall 2022 papers differ in total marks and code-writing weight.",
  },
  {
    id: "sessional-2",
    assessment: "Sessional 2",
    sourceCount: 3,
    observedScope: ["operators", "selection", "loops", "functions", "arrays"],
    formats: [
      "output/error dry run",
      "array-state checkpoints",
      "code completion",
      "open programming",
    ],
    marks:
      "The two complete Fall 2022 papers are 60 marks/1 hour; the Fall 2020 solution excerpt exposes a 20-mark Question 01 only",
    observedDifficulty: ["medium", "hard"],
    commonCombinations: [
      "loop updates + continue",
      "nested loops + arrays",
      "function calls + conversion",
      "shadowing + loop termination",
    ],
    paperEvidence: [
      {
        document: "PF Sessional-II (Fall-22) (BS-AI_DS).pdf",
        marks: { outputOrError: 36, openCoding: 24 },
        note: "Q1 is 36 marks; Q2–Q4 are 8 marks each.",
      },
      {
        document: "PF Sessional-II (Fall-22) (BS-CS).pdf",
        marks: { arrayState: 10, output: 35, completion: 15 },
        note: "Question headers sum to 60 marks.",
      },
      {
        document: "PF Sessional-II (Fall-20) (Solution).pdf",
        marks: { visibleOutput: 20 },
        note: "Only Question 01 is supplied; paper total is unknown.",
      },
    ],
    variation:
      "BS-CS gives 35 of 60 marks to output tracing; BS DS/AI gives 36 of 60 to short traces and three 8-mark programming tasks.",
  },
  {
    id: "final",
    assessment: "Final",
    sourceCount: 2,
    observedScope: [
      "functions",
      "arrays",
      "pointers",
      "dynamic-memory",
      "loops",
    ],
    formats: ["one-line statements", "output/error", "larger program design"],
    marks: "Spring 2024: 100 marks/3 hours; Fall 2023 cover: 170 marks/3 hours",
    observedDifficulty: ["easy", "medium", "hard"],
    commonCombinations: [
      "pointer aliasing + character arithmetic",
      "function call order + return values",
      "dynamic lifetime + const pointers",
      "2D arrays + nested loops",
    ],
    paperEvidence: [
      {
        document: "PF Final Exam (Solution) (Spring-2024).pdf",
        marks: {
          oneLineStatements: 18,
          outputOrError: 39,
          openCodingHeaders: 45,
        },
        note: "Six printed question headers sum to 102 although the cover declares 100; do not silently repair either figure.",
      },
      {
        document: "PF Final Exam (Fall-2023).pdf",
        marks: {},
        note: "Cover declares 170 marks; image-only question pages were not reliably transcribed.",
      },
    ],
    variation:
      "Fall 2023 question pages are image-only and not reliably transcribed; detailed pattern claims rely chiefly on Spring 2024.",
  },
]);
