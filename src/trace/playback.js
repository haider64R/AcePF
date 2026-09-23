import { containingStep } from "./educational.js";
export const MODES = ["dry", "expression", "raw"];
// One raw boundary is authoritative even when a raw event lies inside a group.
// Changing detail mode never jumps forward to that group's completed snapshot.
export class TracePlayback {
  constructor(events, trace) {
    this.events = events;
    this.trace = trace;
    this.mode = "dry";
    this.rawIndex = trace.steps[0]?.snapshotRaw ?? 0;
  }
  get stepIndex() {
    return containingStep(this.trace, this.rawIndex);
  }
  get step() {
    return this.trace.steps[this.stepIndex];
  }
  get event() {
    return this.events[this.rawIndex];
  }
  get index() {
    return this.mode === "raw" ? this.rawIndex : this.stepIndex;
  }
  get length() {
    return this.mode === "raw" ? this.events.length : this.trace.steps.length;
  }
  get partial() {
    return (
      this.mode !== "raw" &&
      this.rawIndex !== (this.step?.snapshotRaw ?? this.rawIndex)
    );
  }
  setMode(mode) {
    if (!MODES.includes(mode)) throw Error("Unknown detail mode");
    this.mode = mode;
    return this;
  }
  seek(index) {
    index = Math.max(0, Math.min(this.length - 1, index));
    this.rawIndex =
      this.mode === "raw" ? index : (this.trace.steps[index]?.snapshotRaw ?? 0);
    return this;
  }
  next() {
    if (this.partial) {
      this.rawIndex = this.step.snapshotRaw;
      return this;
    }
    return this.seek(this.index + 1);
  }
  previous() {
    return this.seek(this.index - 1);
  }
  restart() {
    return this.seek(0);
  }
  rawRange() {
    return this.events.slice(this.step?.rawStart ?? 0, this.rawIndex + 1);
  }
}
