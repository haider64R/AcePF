export const examples = [
  {
    topic: "Variables",
    title: "Your first variables",
    description: "Watch a value move from one variable to another.",
    code: '#include <iostream>\nusing namespace std;\n\nint main() {\n    int score = 12;\n    int bonus = 3;\n    int total = score + bonus;\n\n    cout << "Total: " << total << endl;\n    return 0;\n}',
  },
  {
    topic: "Operators",
    title: "Before or after?",
    description: "See exactly what postfix increment returns.",
    code: '#include <iostream>\nusing namespace std;\n\nint main() {\n    int y = 3;\n    int x = y++;\n    cout << "x = " << x << endl;\n    cout << "y = " << y << endl;\n    return 0;\n}',
  },
  {
    topic: "Conditions",
    title: "Take a different path",
    description: "Only one branch runs.",
    code: '#include <iostream>\nusing namespace std;\n\nint main() {\n    int marks = 78;\n    if (marks >= 80) {\n        cout << "Excellent";\n    } else if (marks >= 60) {\n        cout << "Well done";\n    } else {\n        cout << "Keep practicing";\n    }\n    return 0;\n}',
  },
  {
    topic: "Switch",
    title: "Follow the fall-through",
    description: "A case keeps running until break.",
    code: '#include <iostream>\nusing namespace std;\n\nint main() {\n    int choice = 2;\n    switch (choice) {\n        case 1: cout << "One "; break;\n        case 2: cout << "Two ";\n        case 3: cout << "Three"; break;\n        default: cout << "Unknown";\n    }\n    return 0;\n}',
  },
];
examples.push({
  topic: "Loops",
  title: "A loop, in four phases",
  description: "Initialization, condition, body, update. Repeat.",
  code: '#include <iostream>\nusing namespace std;\n\nint main() {\n    int total = 0;\n    for (int i = 1; i <= 4; i++) {\n        total += i;\n        cout << total << " ";\n    }\n    return 0;\n}',
});
examples.push(
  {
    topic: "Functions",
    title: "A new frame, a new scope",
    description: "Step into a function and follow its return value.",
    code: "#include <iostream>\nusing namespace std;\n\nint square(int n) {\n    int result = n * n;\n    return result;\n}\n\nint main() {\n    int answer = square(5);\n    cout << answer;\n    return 0;\n}",
  },
  {
    topic: "References",
    title: "Two names. One value.",
    description: "A reference changes the caller’s original variable.",
    code: "#include <iostream>\nusing namespace std;\n\nvoid addBonus(int& score) {\n    score += 5;\n}\n\nint main() {\n    int marks = 70;\n    addBonus(marks);\n    cout << marks;\n    return 0;\n}",
  },
);
examples.push(
  {
    topic: "Arrays",
    title: "An address for every element",
    description: "Traverse indexed cells and watch an array change.",
    code: '#include <iostream>\nusing namespace std;\n\nint main() {\n    int marks[4] = {72, 85, 63, 91};\n    for (int i = 0; i < 4; i++) {\n        marks[i] += 2;\n        cout << marks[i] << " ";\n    }\n    return 0;\n}',
  },
  {
    topic: "2D Arrays",
    title: "Rows on screen. Cells in memory.",
    description: "Explore row-major storage with nested loops.",
    code: '#include <iostream>\nusing namespace std;\n\nint main() {\n    int matrix[2][3] = {\n        {1, 2, 3},\n        {4, 5, 6}\n    };\n    for (int row = 0; row < 2; row++) {\n        for (int col = 0; col < 3; col++) {\n            cout << matrix[row][col] << " ";\n        }\n        cout << endl;\n    }\n    return 0;\n}',
  },
);
examples.push(
  {
    topic: "Pointers",
    title: "A value. An address. A connection.",
    description: "Follow a pointer to the variable it changes.",
    code: '#include <iostream>\nusing namespace std;\n\nint main() {\n    int score = 5;\n    int* pointer = &score;\n\n    *pointer = 10;\n    cout << "score = " << score << endl;\n\n    return 0;\n}',
  },
  {
    topic: "Dynamic Memory",
    title: "Make room on the heap.",
    description: "Allocate, fill, and release a dynamic array.",
    code: "#include <iostream>\nusing namespace std;\n\nint main() {\n    int* values = new int[3];\n    for (int i = 0; i < 3; i++) {\n        values[i] = (i + 1) * 10;\n    }\n    cout << values[2] << endl;\n    delete[] values;\n    values = nullptr;\n    return 0;\n}",
  },
);
examples.push(
  {
    topic: "Files",
    title: "Write it. Read it. Keep it virtual.",
    description: "Store marks in a file, then read them back safely.",
    code: '#include <iostream>\n#include <fstream>\nusing namespace std;\n\nint main() {\n    ofstream output("marks.txt");\n    output << 72 << " " << 85 << " " << 91;\n    output.close();\n\n    ifstream input("marks.txt");\n    int mark;\n    while (input >> mark) {\n        cout << mark << endl;\n    }\n    input.close();\n    return 0;\n}',
  },
  {
    topic: "Headers",
    title: "One program. Three files.",
    description: "A declaration connects a call to its definition.",
    files: {
      "main.cpp":
        '#include <iostream>\n#include "math.h"\nusing namespace std;\n\nint main() {\n    cout << twice(6);\n    return 0;\n}',
      "math.h": "#ifndef MATH_H\n#define MATH_H\n\nint twice(int x);\n\n#endif",
      "math.cpp":
        '#include "math.h"\n\nint twice(int x) {\n    return x * 2;\n}',
    },
  },
);
examples.push(
  {
    topic: "Bitwise",
    title: "Work with the individual bits",
    description: "Mask, combine, and shift integer values.",
    code: "#include <iostream>\nusing namespace std;\n\nint main() {\n    unsigned int flags = 5;\n    unsigned int mask = 3;\n    cout << (flags & mask) << endl;\n    cout << (flags | mask) << endl;\n    cout << (flags << 1) << endl;\n    return 0;\n}",
  },
  {
    topic: "Nested Loops",
    title: "A loop inside a loop",
    description: "The inner loop starts again for each outer iteration.",
    code: '#include <iostream>\nusing namespace std;\n\nint main() {\n    for (int row = 1; row <= 3; row++) {\n        for (int col = 1; col <= row; col++) {\n            cout << "* ";\n        }\n        cout << endl;\n    }\n    return 0;\n}',
  },
);
