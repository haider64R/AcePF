import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { sampleHref, exampleHref, challengeHref } from '../src/ui/notes-render.js';
import { visualizerLink } from '../src/ui/assessment-render.js';
import { notes, examples, questions } from '../src/content/index.js';

const source = (name) => readFileSync(new URL(`../${name}`, import.meta.url), 'utf8');

test('the default static document is Home and Visualizer has its own stable route', () => {
  assert.match(source('index.html'), /See the code\./);
  assert.doesNotMatch(source('index.html'), /src\/ui\/app\.js/);
  assert.match(source('visualizer.html'), /src\/ui\/app\.js/);
  assert.match(source('index.html'), /href="\.\/visualizer\.html"/);
  assert.match(source('index.html'), /href="\.\/notes\.html"/);
  assert.match(source('index.html'), /href="\.\/practice\.html"/);
  assert.match(source('index.html'), /href="\.\/exam\.html"/);
});

test('Visualizer deep links point at the stable route', () => {
  const note = notes.find((item) => item.topicId === 'operators');
  const block = note.sections.flatMap((part) => part.blocks).find((item) => item.sampleId);
  for (const link of [sampleHref(note, block), exampleHref(examples[0]), challengeHref(questions[0])])
    assert.match(link, /^\.\/visualizer\.html\?/);
  assert.match(visualizerLink(questions.find((item) => item.visualizer.compatible)), /visualizer\.html\?question=/);
});
