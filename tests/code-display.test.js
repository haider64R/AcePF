import test from 'node:test';
import assert from 'node:assert/strict';
import { questions } from '../src/content/index.js';
import { visualizerTarget } from '../src/content/notes-routing.js';
import { cppDisplayTokens, displayQuestionCode, formatCppForDisplay } from '../src/ui/code-display.js';
import { questionBody, questionCodeBlock } from '../src/ui/assessment-render.js';

const texts = (source) => cppDisplayTokens(source).map((token) => token.text);

test('display formatting preserves every C++ token and canonical source', () => {
  const baseline = new Map(questions.map((question) => [question.id, question.code]));
  let formatted = 0;
  for (const question of questions.filter((item) => item.code)) {
    const display = displayQuestionCode(question);
    assert.deepEqual(texts(display), texts(question.code), question.id);
    assert.equal(question.code, baseline.get(question.id), question.id);
    if (display !== question.code) formatted++;
    if (question.visualizer.compatible)
      assert.equal(visualizerTarget(`?question=${question.id}`).code, question.code);
  }
  assert.ok(formatted >= 40);
});

test('dense programs become readable without changing dangling-else binding', () => {
  const nested = questions.find((q) => q.id === 'ace-nested-decision');
  assert.match(displayQuestionCode(nested), /if \(a > 0\)\n        if \(b > 5\)\n            cout << "X";\n        else\n            cout << "Y";/);
  const loop = questions.find((q) => q.id === 'ace-for-update-continue');
  assert.match(displayQuestionCode(loop), /for \(int i = 1; i <= 5; i\+\+\)/);
  const switchQuestion = questions.find((q) => q.id === 'fast-2022-s1-aids-q1-switch');
  assert.match(displayQuestionCode(switchQuestion), /case 0:\n\s+b = a \+ c;/);
  assert.match(questionBody(nested), /class="question-code"/);
  assert.match(questionCodeBlock(nested), /aria-label="C\+\+ question code"/);
});

test('source-sensitive content can opt out of layout formatting', () => {
  const question = questions.find((q) => q.id === 'ace-nested-decision');
  assert.equal(displayQuestionCode({ ...question, displayFormat: 'preserve' }), question.code);
  assert.equal(formatCppForDisplay(question.code, { preserve: true }), question.code);
  assert.equal(formatCppForDisplay('int main(){cout<<"a;b";}').includes('"a;b"'), true);
  assert.equal(formatCppForDisplay('int main(){char x=\'\\n\';cout<<x;}').includes("'\\n'"), true);
});
