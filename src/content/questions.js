import { validateQuestions } from "./validate.js";
import { assessmentQuestions } from "./assessment-corpus.js";
import { authoredQuestions } from "./authored-questions.js";

// This is the single canonical question bank. Challenge Mode selects its
// authored records; later assessment products can select sourced records too.
export const questions = [
  {
    id: "postfix-puzzle",
    title: "Postfix puzzle",
    type: "predict-output",
    question: "Predict the exact console output.",
    code: "int main() {\n    int y = 3;\n    int x = y++;\n    cout << x << y;\n    return 0;\n}",
    answer: "34",
    explanation:
      "y++ contributes its old value 3 to x, then y becomes 4; cout prints x followed by y.",
    topics: ["operators.increment.postfix", "fundamentals.input-output.cout"],
    primaryTopic: "operators.increment.postfix",
    difficulty: "easy",
    source: { type: "authored", name: "Built-in Challenge" },
    status: "verified",
    visualizer: { compatible: true },
    autoGradable: true,
    verification: "execution-verified",
    tags: ["challenge"],
  },
  {
    id: "through-the-reference",
    title: "Through the reference",
    type: "predict-value",
    question: "What is the final value of marks?",
    code: "void bonus(int& value) {\n    value += 5;\n}\n\nint main() {\n    int marks = 70;\n    bonus(marks);\n    cout << marks;\n    return 0;\n}",
    answer: "75",
    explanation:
      "value is a reference to marks, so adding 5 changes the caller's marks from 70 to 75.",
    topics: [
      "functions.parameters.by-reference",
      "operators.assignment.compound",
    ],
    primaryTopic: "functions.parameters.by-reference",
    difficulty: "medium",
    source: { type: "authored", name: "Built-in Challenge" },
    status: "verified",
    visualizer: { compatible: true },
    autoGradable: true,
    verification: "execution-verified",
    tags: ["challenge"],
  },
  {
    id: "follow-the-array",
    title: "Follow the array",
    type: "predict-array-state",
    question: "Predict the final array state, separated by spaces.",
    code: 'int main() {\n    int values[3] = {1, 2, 3};\n    int* p = values + 1;\n    *p += 5;\n    for (int i = 0; i < 3; i++) {\n        cout << values[i] << " ";\n    }\n    return 0;\n}',
    answer: "1 7 3",
    explanation:
      "p points at values[1]. Adding 5 changes the second element from 2 to 7; the other elements stay 1 and 3.",
    topics: [
      "arrays.one-dimensional.indexing",
      "pointers.arithmetic.arrays",
      "pointers.basics.dereference",
      "loops.for.iterations",
    ],
    primaryTopic: "pointers.arithmetic.arrays",
    difficulty: "hard",
    source: { type: "authored", name: "Built-in Challenge" },
    status: "verified",
    visualizer: { compatible: true },
    autoGradable: true,
    verification: "execution-verified",
    tags: ["challenge"],
  },
  ...assessmentQuestions,
  ...authoredQuestions,
];

validateQuestions(questions);
