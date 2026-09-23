import { examples } from "./examples.js";
import { notes } from "./notes.js";
import { questions } from "./questions.js";
import { assessmentQuestions } from "./assessment-corpus.js";
import { assessmentSources, assessmentProfiles } from "./assessment-sources.js";
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
  validateAssessmentCorpus,
} from "./validate.js";

// Importing this public domain entry point fails early if checked-in content
// has broken IDs, references or source claims.
validateTaxonomy();
validateScopes();
validateQuestions(questions);
validateAssessmentCorpus(
  assessmentSources,
  assessmentProfiles,
  assessmentQuestions,
);
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
  assessmentQuestions,
  assessmentSources,
  assessmentProfiles,
  examples,
  notes,
  queryQuestions,
  queryExamples,
  queryNotes,
  relatedContent,
};
