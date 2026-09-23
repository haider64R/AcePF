import { examples } from "./examples.js";
import { notes } from "./notes.js";
import { questions } from "./questions.js";
import { categories, topics, getTopic } from "./taxonomy.js";
import { coreScopes, resolveScope, earliestCoreScope } from "./scopes.js";
import {
  queryQuestions,
  queryExamples,
  queryNotes,
  relatedContent,
} from "./selectors.js";
import {
  validateTaxonomy,
  validateScopes,
  validateQuestions,
  validateExamples,
  validateNotes,
} from "./validate.js";

// Importing this public domain entry point fails early if checked-in content
// has broken IDs, references or source claims.
validateTaxonomy();
validateScopes();
validateQuestions(questions);
validateExamples(examples);
validateNotes(notes, { questions, examples });

export {
  categories,
  topics,
  getTopic,
  coreScopes,
  resolveScope,
  earliestCoreScope,
  questions,
  examples,
  notes,
  queryQuestions,
  queryExamples,
  queryNotes,
  relatedContent,
};
