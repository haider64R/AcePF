export class Diagnostic extends Error {
  constructor(message, loc = null, code = "unsupported") {
    super(message);
    this.name = "Diagnostic";
    this.loc = loc;
    this.code = code;
  }
}
export function fail(message, node, code) {
  throw new Diagnostic(message, node?.loc ?? node, code);
}
