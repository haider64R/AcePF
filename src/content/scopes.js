import { categories, getTopic, isWithinTopic, topics } from "./taxonomy.js";

// These are learning progression labels, not claims about any university exam.
export const coreScopes = Object.freeze(
  [
    ["fundamentals", "Fundamentals only", "fundamentals"],
    ["through-operators", "Through Operators", "operators"],
    ["through-selection", "Through Conditionals", "selection"],
    ["through-loops", "Through Loops", "loops"],
    ["through-functions", "Through Functions", "functions"],
    ["through-arrays", "Through Arrays", "arrays"],
    ["through-pointers", "Through Pointers", "pointers"],
    ["through-dynamic-memory", "Through Dynamic Memory", "dynamic-memory"],
    [
      "through-project-structure",
      "Through Project Structure",
      "project-structure",
    ],
    ["full-pf", "Full PF", "file-handling"],
  ].map(([id, title, throughCategoryId]) =>
    Object.freeze({ id, title, throughCategoryId }),
  ),
);

export const scopeById = new Map(coreScopes.map((scope) => [scope.id, scope]));

// Course presets may pass a rule object with an ordered ceiling plus explicit
// inclusions/exclusions. No institution-specific boundary is presumed here.
export function resolveScope(scopeOrId, presets = coreScopes) {
  const rule =
    typeof scopeOrId === "string"
      ? presets.find((scope) => scope.id === scopeOrId)
      : scopeOrId;
  if (
    !rule ||
    !getTopic(rule.throughCategoryId) ||
    getTopic(rule.throughCategoryId).kind !== "category"
  )
    throw new Error(
      `Unknown scope ceiling: ${typeof scopeOrId === "string" ? scopeOrId : scopeOrId?.throughCategoryId}`,
    );
  const ceiling = categories.findIndex((c) => c.id === rule.throughCategoryId);
  const allowed = new Set(
    topics
      .filter((topic) => {
        const category = topic.id.split(".")[0];
        return categories.findIndex((c) => c.id === category) <= ceiling;
      })
      .map((topic) => topic.id),
  );
  for (const id of rule.includeTopicIds ?? []) {
    if (!getTopic(id)) throw new Error(`Unknown included topic: ${id}`);
    for (const topic of topics)
      if (isWithinTopic(topic.id, id)) allowed.add(topic.id);
  }
  for (const id of rule.excludeTopicIds ?? []) {
    if (!getTopic(id)) throw new Error(`Unknown excluded topic: ${id}`);
    for (const topic of topics)
      if (isWithinTopic(topic.id, id)) allowed.delete(topic.id);
  }
  return allowed;
}

export function earliestCoreScope(topicIds) {
  if (!topicIds.length) throw new Error("At least one topic is required.");
  for (const id of topicIds)
    if (!getTopic(id)) throw new Error(`Unknown topic: ${id}`);
  return (
    coreScopes.find((scope) =>
      topicIds.every((id) => resolveScope(scope.id).has(id)),
    )?.id ?? null
  );
}
