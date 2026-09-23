import { runProject } from "./index.js";
import { deriveTrace } from "../trace/educational.js";
self.onmessage = ({ data }) => {
  try {
    const result = runProject(data.files, data.options);
    self.postMessage({
      id: data.id,
      ...result,
      trace: deriveTrace(result.events, data.files),
    });
  } catch (e) {
    self.postMessage({
      id: data.id,
      error: "Internal engine error: " + e.message,
    });
  }
};
