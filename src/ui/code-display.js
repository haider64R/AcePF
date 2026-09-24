// Presentation only. No token text, canonical question code, or Visualizer
// source is changed. A cautious caller can request exact source layout.
const controlWords = new Set(['if', 'for', 'while', 'switch', 'catch']);
const tightBefore = new Set([',', ';', ')', ']', '.', '->', '::', '++', '--']);
const tightAfter = new Set(['(', '[', '.', '->', '::', '!', '~']);
const operators = ['<<=', '>>=', '...', '->*', '::', '++', '--', '->', '&&', '||', '==', '!=', '<=', '>=', '<<', '>>', '+=', '-=', '*=', '/=', '%=', '&=', '|=', '^='];

export function cppDisplayTokens(source) {
  const tokens = [];
  let i = 0;
  while (i < source.length) {
    const start = i;
    const ch = source[i];
    if (/\s/.test(ch)) { i++; continue; }
    if (ch === '#' && (start === 0 || source.slice(0, start).endsWith('\n') || /^\s*$/.test(source.slice(source.lastIndexOf('\n', start - 1) + 1, start)))) {
      i = source.indexOf('\n', i);
      if (i < 0) i = source.length;
      tokens.push({ kind: 'directive', text: source.slice(start, i).trimStart() });
      continue;
    }
    if (ch === '"' || ch === "'") {
      const quote = ch;
      i++;
      while (i < source.length) {
        if (source[i] === '\\') { i += 2; continue; }
        if (source[i++] === quote) break;
      }
      tokens.push({ kind: 'literal', text: source.slice(start, i) });
      continue;
    }
    if (source.startsWith('//', i)) {
      i = source.indexOf('\n', i);
      if (i < 0) i = source.length;
      tokens.push({ kind: 'comment', text: source.slice(start, i) });
      continue;
    }
    if (source.startsWith('/*', i)) {
      const end = source.indexOf('*/', i + 2);
      i = end < 0 ? source.length : end + 2;
      tokens.push({ kind: 'comment', text: source.slice(start, i) });
      continue;
    }
    if (/[A-Za-z_]/.test(ch)) {
      i++;
      while (i < source.length && /[A-Za-z_0-9]/.test(source[i])) i++;
      tokens.push({ kind: 'word', text: source.slice(start, i) });
      continue;
    }
    if (/\d/.test(ch) || (ch === '.' && /\d/.test(source[i + 1] ?? ''))) {
      const rest = source.slice(i);
      const number = rest.match(/^(?:0[xX][\da-fA-F']+|(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?)[uUlLfF]*/)?.[0];
      if (number) {
        i += number.length;
        tokens.push({ kind: 'number', text: number });
        continue;
      }
    }
    const op = operators.find((value) => source.startsWith(value, i));
    i += op?.length ?? 1;
    tokens.push({ kind: 'symbol', text: source.slice(start, i) });
  }
  return tokens;
}

function wantsSpace(previous, current) {
  if (!previous) return false;
  const a = previous.text, b = current.text;
  if (a === '++' || a === '--') return !/^[A-Za-z_0-9\])},;]/.test(b);
  if (b === '++' || b === '--') return !/^[A-Za-z_0-9\])]/.test(a.at(-1) ?? '');
  if (tightAfter.has(a) && !(a === '!' && b === '=')) return false;
  if (tightBefore.has(b)) return false;
  if (b === '(') return controlWords.has(a) || a === 'return' || /^(?:=|\+=|-=|\*=|\/=|%=|<<|>>|&&|\|\||\+|-|\*|\/)$/.test(a);
  if (b === '[') return false;
  if (b === ':' && a !== '?') return false;
  if (a === ':' && b !== ':') return true;
  if (a === '#' || b === '#') return false;
  return true;
}

// A few questions teach binding or layout itself. Their display can be
// authored explicitly while preserving token identity with the source.
const displayOverrides = new Map([
  ['ace-nested-decision', `int main() {
    int a = 5, b = 2;

    if (a > 0)
        if (b > 5)
            cout << "X";
        else
            cout << "Y";

    cout << "Z";
}`],
  ['ace-nested-count', `int main() {
    int count = 0;
    for (int row = 1; row <= 3; row++)
        for (int col = 1; col <= row; col++)
            count++;
    cout << count;
}`],
]);

export function formatCppForDisplay(source, { preserve = false } = {}) {
  if (preserve || !source?.trim()) return source;
  const tokens = cppDisplayTokens(source);
  let lines = [], line = '', indent = 0, parens = 0;
  const braces = [];
  const activeCases = new Set();
  let previous = null;
  const flush = () => { if (line.trim()) lines.push(`${'    '.repeat(Math.max(0, indent))}${line.trimEnd()}`); line = ''; };
  const add = (token) => {
    if (line && wantsSpace(previous, token)) line += ' ';
    line += token.text;
    previous = token;
  };
  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i], value = token.text;
    if ((value === 'case' || value === 'default') && !line.trim() && activeCases.has(braces.length)) {
      indent = Math.max(0, indent - 1);
      activeCases.delete(braces.length);
    }
    if (token.kind === 'directive') { flush(); lines.push(value); previous = null; continue; }
    if (token.kind === 'comment' && value.startsWith('//')) { add(token); flush(); previous = null; continue; }
    if (value === '(') parens++;
    if (value === ')') parens--;
    if (value === '{') {
      const initializer = braces.at(-1) === 'initializer' || previous?.text === '=';
      braces.push(initializer ? 'initializer' : 'block');
      add(token);
      if (!initializer) { flush(); indent++; previous = null; }
      continue;
    }
    if (value === '}') {
      if (activeCases.has(braces.length)) {
        indent = Math.max(0, indent - 1);
        activeCases.delete(braces.length);
      }
      const kind = braces.pop();
      if (kind === 'block') {
        flush(); indent = Math.max(0, indent - 1);
        add(token);
        if (!['else', 'while', ';'].includes(tokens[i + 1]?.text)) { flush(); previous = null; }
      } else add(token);
      continue;
    }
    if (value === ';') {
      add(token);
      if (parens === 0 && braces.at(-1) !== 'initializer') { flush(); previous = null; }
      continue;
    }
    if (value === ':' && ['case', 'default'].some((word) => line.trimStart().startsWith(word))) {
      add(token); flush(); indent++; activeCases.add(braces.length); previous = null; continue;
    }
    add(token);
  }
  flush();
  const formatted = lines.join('\n');
  const originalTokens = tokens.map((token) => token.text);
  const outputTokens = cppDisplayTokens(formatted).map((token) => token.text);
  return originalTokens.length === outputTokens.length && originalTokens.every((value, i) => value === outputTokens[i]) ? formatted : source;
}

export function displayQuestionCode(question) {
  if (!question.code) return '';
  if (question.displayFormat === 'preserve') return question.code;
  const override = displayOverrides.get(question.id);
  if (override) {
    const before = cppDisplayTokens(question.code).map((token) => token.text);
    const after = cppDisplayTokens(override).map((token) => token.text);
    if (before.length === after.length && before.every((value, i) => value === after[i])) return override;
  }
  // Authored multiline layout is usually intentional; only reflow a long,
  // dense line when the existing layout is already hard to read.
  if (question.code.includes('\n') && question.code.split('\n').every((line) => line.length <= 90))
    return question.code;
  return formatCppForDisplay(question.code);
}
