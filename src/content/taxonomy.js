// The slugs below are durable content IDs. Titles are presentation labels.
const syllabus = [
  [
    "fundamentals",
    "Fundamentals",
    [
      [
        "variables",
        "Variables",
        [
          ["declarations", "Declarations"],
          ["initialization", "Initialization"],
          ["assignment", "Assignment"],
        ],
      ],
      ["constants", "Constants", [["const", "Const storage"]]],
      [
        "types",
        "Primitive data types",
        [
          ["integers", "Integer types"],
          ["floating", "Floating-point types"],
          ["characters", "Characters"],
          ["booleans", "Booleans"],
          ["signed-unsigned", "Signed and unsigned types"],
        ],
      ],
      [
        "input-output",
        "Input and output",
        [
          ["cin", "Standard input"],
          ["cout", "Standard output"],
        ],
      ],
      [
        "conversions",
        "Type conversion",
        [
          ["implicit", "Implicit conversion"],
          ["promotion", "Promotion"],
        ],
      ],
    ],
  ],
  [
    "operators",
    "Operators and expressions",
    [
      [
        "arithmetic",
        "Arithmetic",
        [
          ["add-subtract", "Addition and subtraction"],
          ["multiply-divide", "Multiplication and division"],
          ["modulo", "Modulo"],
        ],
      ],
      [
        "assignment",
        "Assignment operators",
        [
          ["simple", "Simple assignment"],
          ["compound", "Compound assignment"],
        ],
      ],
      [
        "precedence",
        "Expression grouping",
        [
          ["precedence", "Precedence"],
          ["associativity", "Associativity"],
        ],
      ],
      [
        "increment",
        "Increment and decrement",
        [
          ["prefix", "Prefix form"],
          ["postfix", "Postfix form"],
        ],
      ],
      [
        "comparison",
        "Comparison",
        [
          ["equality", "Equality"],
          ["ordering", "Ordering"],
        ],
      ],
      [
        "logical",
        "Logical operators",
        [
          ["and-or-not", "AND, OR and NOT"],
          ["short-circuit", "Short-circuit evaluation"],
        ],
      ],
      [
        "bitwise",
        "Bitwise operators",
        [
          ["masking", "Bitwise AND, OR, XOR and NOT"],
          ["shifts", "Shifts"],
        ],
      ],
      [
        "ternary",
        "Ternary operator",
        [["selection", "Conditional expression"]],
      ],
    ],
  ],
  [
    "selection",
    "Selection",
    [
      [
        "if",
        "If statements",
        [
          ["if", "If"],
          ["if-else", "If and else"],
          ["else-if", "Else-if chains"],
          ["nested", "Nested conditions"],
        ],
      ],
      [
        "switch",
        "Switch statements",
        [
          ["cases", "Case and default"],
          ["break", "Break in switch"],
          ["fall-through", "Fall-through"],
        ],
      ],
    ],
  ],
  [
    "loops",
    "Loops",
    [
      ["while", "While loops", [["condition", "Condition and body"]]],
      ["do-while", "Do-while loops", [["body-first", "Body before condition"]]],
      [
        "for",
        "For loops",
        [
          ["phases", "Initialization, condition, body and update"],
          ["iterations", "Iterations"],
        ],
      ],
      [
        "nested",
        "Nested loops",
        [["inner-outer", "Inner and outer iterations"]],
      ],
      [
        "control",
        "Loop control",
        [
          ["break", "Break in a loop"],
          ["continue", "Continue"],
        ],
      ],
    ],
  ],
  [
    "functions",
    "Functions",
    [
      [
        "structure",
        "Function structure",
        [
          ["prototypes", "Prototypes"],
          ["definitions", "Definitions"],
          ["void", "Void functions"],
        ],
      ],
      [
        "calls",
        "Calls and returns",
        [
          ["arguments", "Arguments"],
          ["return-values", "Return values"],
          ["call-order", "Call order"],
        ],
      ],
      [
        "parameters",
        "Parameters",
        [
          ["by-value", "Pass by value"],
          ["by-reference", "Pass by reference"],
        ],
      ],
      [
        "scope",
        "Scope",
        [
          ["local", "Local scope"],
          ["global", "Global scope"],
          ["block", "Block scope"],
          ["shadowing", "Shadowing"],
        ],
      ],
      ["recursion", "Recursion", [["frames", "Recursive call frames"]]],
    ],
  ],
  [
    "arrays",
    "Arrays",
    [
      [
        "one-dimensional",
        "One-dimensional arrays",
        [
          ["initialization", "Initialization"],
          ["indexing", "Indexing"],
          ["traversal", "Traversal"],
        ],
      ],
      [
        "characters",
        "Character arrays",
        [["terminator", "Null-terminated text"]],
      ],
      [
        "two-dimensional",
        "Two-dimensional arrays",
        [
          ["indexing", "Row and column indexing"],
          ["row-major", "Row-major representation"],
        ],
      ],
      [
        "parameters",
        "Array parameters",
        [["shared-storage", "Arrays passed to functions"]],
      ],
    ],
  ],
  [
    "pointers",
    "Pointers",
    [
      [
        "basics",
        "Pointer basics",
        [
          ["declaration", "Declaration and assignment"],
          ["address-of", "Address-of"],
          ["dereference", "Dereference"],
          ["nullptr", "Null pointer"],
        ],
      ],
      ["aliasing", "Aliasing", [["shared-storage", "Shared storage"]]],
      [
        "arithmetic",
        "Pointer arithmetic",
        [
          ["offsets", "Element offsets"],
          ["arrays", "Pointers and arrays"],
        ],
      ],
      [
        "parameters",
        "Pointer parameters",
        [["by-pointer", "Passing a pointer"]],
      ],
      [
        "const",
        "Const pointer forms",
        [
          ["target", "Pointer to const"],
          ["pointer", "Const pointer"],
        ],
      ],
      [
        "arrays-of-pointers",
        "Arrays of pointers",
        [["elements", "Pointer elements"]],
      ],
    ],
  ],
  [
    "dynamic-memory",
    "Dynamic memory",
    [
      [
        "allocation",
        "Heap allocation",
        [
          ["new", "New scalar"],
          ["new-array", "New array"],
          ["heap", "Heap storage"],
        ],
      ],
      [
        "release",
        "Deallocation",
        [
          ["delete", "Delete scalar"],
          ["delete-array", "Delete array"],
          ["mismatch", "Mismatched deallocation"],
        ],
      ],
      [
        "lifetime",
        "Dynamic lifetime",
        [
          ["dangling", "Dangling pointers"],
          ["leaks", "Memory leaks"],
          ["use-after-free", "Use-after-free"],
        ],
      ],
    ],
  ],
  [
    "project-structure",
    "Project structure",
    [
      ["headers", "Header files", [["declarations", "Shared declarations"]]],
      [
        "sources",
        "Source files",
        [["definitions", "Definitions in source files"]],
      ],
      [
        "prototypes",
        "Cross-file prototypes",
        [["signatures", "Matching declarations"]],
      ],
      [
        "multi-file",
        "Simple multi-file programs",
        [["includes", "Includes and source mapping"]],
      ],
    ],
  ],
  [
    "file-handling",
    "File handling",
    [
      [
        "streams",
        "File streams",
        [
          ["ifstream", "Input streams"],
          ["ofstream", "Output streams"],
          ["fstream", "Bidirectional streams"],
        ],
      ],
      [
        "lifecycle",
        "Stream lifecycle",
        [
          ["open", "Open"],
          ["close", "Close"],
        ],
      ],
      [
        "operations",
        "File operations",
        [
          ["read", "Read"],
          ["write", "Write"],
          ["append", "Append"],
        ],
      ],
      ["state", "Stream state", [["flags", "Good, fail and EOF state"]]],
    ],
  ],
];

const records = [];
for (const [categoryId, title, topics] of syllabus) {
  records.push({
    id: categoryId,
    title,
    kind: "category",
    parentId: null,
    order: records.length,
  });
  for (const [slug, topicTitle, children] of topics) {
    const topicId = `${categoryId}.${slug}`;
    records.push({
      id: topicId,
      title: topicTitle,
      kind: "topic",
      parentId: categoryId,
      order: records.length,
    });
    for (const [childSlug, childTitle] of children)
      records.push({
        id: `${topicId}.${childSlug}`,
        title: childTitle,
        kind: "subtopic",
        parentId: topicId,
        order: records.length,
      });
  }
}

export const topics = Object.freeze(
  records.map((record) => Object.freeze(record)),
);
export const categories = Object.freeze(
  topics.filter((topic) => topic.kind === "category"),
);
const topicById = new Map(topics.map((topic) => [topic.id, topic]));

export function getTopic(id) {
  return topicById.get(id) ?? null;
}
export function categoryOf(id) {
  let topic = getTopic(id);
  while (topic?.parentId) topic = getTopic(topic.parentId);
  return topic?.kind === "category" ? topic : null;
}
export function isWithinTopic(id, ancestorId) {
  let topic = getTopic(id);
  while (topic) {
    if (topic.id === ancestorId) return true;
    topic = getTopic(topic.parentId);
  }
  return false;
}
