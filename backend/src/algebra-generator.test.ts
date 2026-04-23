import test from "node:test";
import assert from "node:assert/strict";

import {
  generateAlgebraTask,
  generateL1Task,
  generateL2Task,
  generateL3Task,
  generateL4Task,
  generateL5Task,
  generateUniqueAlgebraTask,
  isTaskHashUsed,
} from "./algebra-generator.js";

function ensureSolutionMatchesMetadata(
  task: ReturnType<typeof generateL1Task>,
) {
  assert.equal(
    task.metadata.solution,
    String(task.metadata.coefficients.solution),
  );
}

test("level 1 algebra tasks keep positive coefficients and subtract both sides first", () => {
  const task = generateL1Task();

  assert.equal(task.level, 1);
  assert.equal(task.metadata.rule, "subtract_both_sides");
  assert.match(task.prompt, /^\d+x \+ \d+ = \d+$/);
  assert.equal(
    task.expectedFirstStep,
    `${task.metadata.coefficients.a}x = ${task.metadata.coefficients.c - task.metadata.coefficients.b}`,
  );
  ensureSolutionMatchesMetadata(task);
  assert.ok(
    task.metadata.coefficients.a >= 2 && task.metadata.coefficients.a <= 5,
  );
  assert.ok(
    task.metadata.coefficients.b >= 1 && task.metadata.coefficients.b <= 10,
  );
  assert.ok(task.metadata.coefficients.c <= 50);
});

test("level 2 algebra tasks support signed coefficients and keep the expected step consistent", () => {
  const task = generateL2Task();

  assert.equal(task.level, 2);
  assert.equal(task.metadata.rule, "subtract_both_sides");
  assert.match(task.prompt, /^-?\d+x \+ [+-]?\d+ = -?\d+$/);
  assert.equal(
    task.expectedFirstStep,
    `${task.metadata.coefficients.a}x = ${task.metadata.coefficients.c - task.metadata.coefficients.b}`,
  );
  ensureSolutionMatchesMetadata(task);
  assert.notStrictEqual(task.metadata.coefficients.a, 0);
  assert.ok(Math.abs(task.metadata.coefficients.c) <= 50);
});

test("level 3 algebra tasks combine like terms first", () => {
  const task = generateL3Task();

  assert.equal(task.level, 3);
  assert.equal(task.metadata.rule, "combine_like_terms");
  assert.match(task.prompt, /^\d+x \+ \d+x \+ \d+ = \d+$/);
  assert.equal(
    task.expectedFirstStep,
    `${task.metadata.coefficients.combined}x + ${task.metadata.coefficients.c} = ${task.metadata.coefficients.d}`,
  );
  ensureSolutionMatchesMetadata(task);
});

test("level 4 algebra tasks distribute over brackets first", () => {
  const task = generateL4Task();

  assert.equal(task.level, 4);
  assert.equal(task.metadata.rule, "distributive_law");
  assert.match(task.prompt, /^\d+\(x \+ \d+\) = \d+$/);
  assert.equal(
    task.expectedFirstStep,
    `${task.metadata.coefficients.a}x + ${task.metadata.coefficients.a * task.metadata.coefficients.b} = ${task.metadata.coefficients.c}`,
  );
  ensureSolutionMatchesMetadata(task);
});

test("level 5 algebra tasks distribute with terms on both sides", () => {
  const task = generateL5Task();

  assert.equal(task.level, 5);
  assert.equal(task.metadata.rule, "distributive_law");
  assert.match(task.prompt, /^\d+\(x \+ \d+\) = \d+x \+ -?\d+$/);
  assert.equal(
    task.expectedFirstStep,
    `${task.metadata.coefficients.a}x + ${task.metadata.coefficients.a * task.metadata.coefficients.b} = ${task.metadata.coefficients.c}x + ${task.metadata.coefficients.d}`,
  );
  ensureSolutionMatchesMetadata(task);
  assert.notStrictEqual(
    task.metadata.coefficients.a,
    task.metadata.coefficients.c,
  );
});

test("generateAlgebraTask clamps unsupported levels", () => {
  assert.equal(generateAlgebraTask(0).level, 1);
  assert.equal(generateAlgebraTask(6).level, 5);
});

test("isTaskHashUsed reflects session hash membership", () => {
  const task = generateL1Task();
  const hashes = new Set<string>([task.taskHash]);

  assert.equal(isTaskHashUsed(task.taskHash, hashes), true);
  assert.equal(isTaskHashUsed("missing-hash", hashes), false);
});

test("generateUniqueAlgebraTask avoids hashes already present in the session when possible", () => {
  const existingTask = generateL3Task();
  const hashes = new Set<string>([existingTask.taskHash]);

  const uniqueTask = generateUniqueAlgebraTask(3, hashes);

  assert.equal(uniqueTask.level, 3);
  assert.notEqual(uniqueTask.taskHash, existingTask.taskHash);
});
