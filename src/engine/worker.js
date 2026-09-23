import { runProject } from "./index.js";
self.onmessage = ({ data }) => {
  try {
    self.postMessage({ id: data.id, ...runProject(data.files, data.options) });
  } catch (e) {
    self.postMessage({
      id: data.id,
      error: "Internal engine error: " + e.message,
    });
  }
};
