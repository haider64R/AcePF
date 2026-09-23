export const challenges = [
  {
    title: "Postfix puzzle",
    question: "Predict the exact console output.",
    answer: "34",
    code: "int main() {\n    int y = 3;\n    int x = y++;\n    cout << x << y;\n    return 0;\n}",
  },
  {
    title: "Through the reference",
    question: "What is the final value of marks?",
    answer: "75",
    code: "void bonus(int& value) {\n    value += 5;\n}\n\nint main() {\n    int marks = 70;\n    bonus(marks);\n    cout << marks;\n    return 0;\n}",
  },
  {
    title: "Follow the array",
    question: "Predict the final array state, separated by spaces.",
    answer: "1 7 3",
    code: 'int main() {\n    int values[3] = {1, 2, 3};\n    int* p = values + 1;\n    *p += 5;\n    for (int i = 0; i < 3; i++) {\n        cout << values[i] << " ";\n    }\n    return 0;\n}',
  },
];
