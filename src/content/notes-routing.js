import { notes } from "./notes.js";
import { examples } from "./examples.js";
import { questions } from "./questions.js";

export function noteForTopic(topicId) {
  return notes.find((note) => note.topicId === topicId) ?? null;
}

export function noteSample(noteId, sampleId) {
  const note = notes.find((item) => item.id === noteId);
  if (!note) return null;
  for (const section of note.sections)
    for (const block of section.blocks)
      if (block.type === "code" && block.sampleId === sampleId)
        return { note, block };
  return null;
}

export function visualizerTarget(search) {
  const params = new URLSearchParams(search);
  if (params.has("note") || params.has("sample")) {
    const match = noteSample(params.get("note"), params.get("sample"));
    return match
      ? {
          title: match.note.title,
          description: match.block.caption ?? match.note.lead,
          code: match.block.text,
        }
      : null;
  }
  if (params.has("example")) {
    const match = examples.find((item) => item.id === params.get("example"));
    return match
      ? {
          title: match.title,
          description: match.description,
          code: match.code,
          files: match.files,
          input: match.input,
          virtualFiles: match.virtualFiles,
        }
      : null;
  }
  if (params.has("question")) {
    const match = questions.find((item) => item.id === params.get("question"));
    return match?.visualizer.compatible
      ? {
          title: match.title,
          description: match.question,
          code: match.code,
          files: match.files,
          input: match.standardInput,
          virtualFiles: match.virtualFiles,
        }
      : null;
  }
  return null;
}
