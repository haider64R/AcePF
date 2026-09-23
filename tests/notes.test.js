import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { runProject } from "../src/engine/index.js";
import { notes, questions, examples } from "../src/content/index.js";
import { validateNotes } from "../src/content/validate.js";
import {
  noteForTopic,
  noteSample,
  visualizerTarget,
} from "../src/content/notes-routing.js";
import {
  renderLanding,
  renderNote,
  renderBlock,
  relatedForNote,
  noteHref,
  sampleHref,
  exampleHref,
  challengeHref,
} from "../src/ui/notes-render.js";

const clone = (value) => structuredClone(value);

test("three authored guides use canonical topics and valid structured blocks", () => {
  assert.deepEqual(
    notes.map((note) => note.topicId),
    ["operators", "loops", "pointers"],
  );
  assert.equal(validateNotes(notes, { questions, examples }), true);
  for (const note of notes) {
    assert.ok(
      note.sections.some((section) => section.kind === "dry-run-rules"),
    );
    assert.ok(
      note.sections.some((section) => section.kind === "quick-revision"),
    );
    assert.ok(
      note.sections.some((section) =>
        section.blocks.some((block) => block.sampleId),
      ),
    );
  }
});

test("note and sample routes resolve exactly; unknown IDs do not load code", () => {
  for (const note of notes) {
    assert.equal(noteForTopic(note.topicId), note);
    assert.match(noteHref(note.topicId), /topic=/);
    for (const section of note.sections)
      for (const block of section.blocks)
        if (block.sampleId) {
          assert.equal(noteSample(note.id, block.sampleId)?.block, block);
          const target = visualizerTarget(
            new URL(sampleHref(note, block), "http://test").search,
          );
          assert.equal(target.code, block.text);
        }
  }
  assert.equal(noteForTopic("missing"), null);
  assert.equal(noteSample("loops", "missing"), null);
  assert.equal(visualizerTarget("?note=loops&sample=missing"), null);
});

test("every runnable note sample executes and matches its authored output", () => {
  let count = 0;
  for (const note of notes)
    for (const section of note.sections)
      for (const block of section.blocks)
        if (block.sampleId) {
          const result = runProject({ "main.cpp": block.text });
          assert.equal(
            result.ok,
            true,
            `${note.id}/${block.sampleId}: ${result.events.at(-1).message}`,
          );
          const expected =
            block.sampleId === "do-while"
              ? "3 "
              : block.caption.match(/^Output: (.*?)(?: \(|$)/)?.[1];
          assert.equal(result.state.output, expected);
          count++;
        }
  assert.equal(count, 11);
});

test("related examples and verified questions are derived from shared tags", () => {
  const operators = relatedForNote(notes[0]);
  const loops = relatedForNote(notes[1]);
  const pointers = relatedForNote(notes[2]);
  assert.ok(operators.examples.some((item) => item.id === "postfix-order"));
  assert.ok(operators.questions.some((item) => item.id === "postfix-puzzle"));
  assert.ok(loops.examples.some((item) => item.id === "for-phases"));
  assert.ok(pointers.examples.some((item) => item.id === "pointer-connection"));
  assert.ok(pointers.questions.some((item) => item.id === "follow-the-array"));
  assert.equal(operators.examples[0].id, "postfix-order");
  assert.equal(operators.questions[0].id, "postfix-puzzle");
  assert.deepEqual(
    operators.questions.map((item) => item.id),
    ["postfix-puzzle"],
  );
  assert.equal(loops.examples[0].id, "for-phases");
  assert.equal(pointers.examples[0].id, "pointer-connection");
  for (const related of [operators, loops, pointers]) {
    assert.ok(related.examples.length <= 3);
    assert.ok(related.questions.length <= 3);
    assert.equal(
      new Set(related.examples.map((item) => item.id)).size,
      related.examples.length,
    );
    assert.equal(
      new Set(related.questions.map((item) => item.id)).size,
      related.questions.length,
    );
  }
  assert.equal(
    visualizerTarget(new URL(exampleHref(examples[0]), "http://test").search)
      .code,
    examples[0].code,
  );
  assert.match(challengeHref(questions[0]), /challenge=postfix-puzzle/);
});

test("sparse related content renders a useful empty state", () => {
  const sparse = { ...notes[0], topicId: "fundamentals.constants" };
  const html = renderNote(sparse);
  assert.match(html, /No matching examples yet/);
  assert.match(html, /No verified Challenge/);
});

test("landing, navigation and specialized blocks render escaped native HTML", () => {
  const landing = renderLanding();
  for (const note of notes) {
    assert.match(
      landing,
      new RegExp(noteHref(note.topicId).replaceAll("?", "\\?")),
    );
    const html = renderNote(note);
    assert.match(html, /Open in Visualizer/);
    assert.match(html, /note-section/);
    assert.match(html, /aria-label="On this page"/);
  }
  assert.match(renderNote(notes[2]), /memory-target/);
  assert.match(renderNote(notes[1]), /note-table-scroll/);
  assert.match(
    renderBlock(
      { type: "paragraph", text: '<script>alert("x")</script>' },
      notes[0],
    ),
    /&lt;script&gt;/,
  );
  assert.doesNotMatch(
    renderBlock({ type: "paragraph", text: "<b>x</b>" }, notes[0]),
    /<b>/,
  );
  assert.match(
    readFileSync(new URL("../notes.html", import.meta.url), "utf8"),
    /notes-ui\.js/,
  );
});

test("invalid block forms, duplicate samples and broken references fail validation", () => {
  const bad = clone(notes);
  bad[0].sections[0].blocks.push({
    type: "table",
    headers: ["a", "b"],
    rows: [["one"]],
  });
  assert.throws(
    () => validateNotes(bad, { questions, examples }),
    /Invalid content block/,
  );
  const duplicate = clone(notes);
  duplicate[0].sections[0].blocks.push(
    clone(duplicate[0].sections[0].blocks.find((item) => item.sampleId)),
  );
  assert.throws(
    () => validateNotes(duplicate, { questions, examples }),
    /Duplicate Visualizer sample/,
  );
  const broken = clone(notes);
  broken[0].relatedTopics = ["missing"];
  assert.throws(
    () => validateNotes(broken, { questions, examples }),
    /unknown relatedTopics/,
  );
});
