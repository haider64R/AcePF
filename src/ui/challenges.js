import { queryQuestions } from "../content/selectors.js";

// Existing dialog consumes canonical authored questions in their bank order.
// Its title, question, answer and code contract remains unchanged.
export const challenges = queryQuestions({
  tag: "challenge",
  sourceType: "authored",
  status: "verified",
  visualizerCompatible: true,
  types: ["predict-output", "predict-value", "predict-array-state"],
});
