import assert from "node:assert/strict";
import test from "node:test";

import {
  aggregateAlgebraTaskEntries,
  summarizeAlgebraTaskEntries,
  type RawAlgebraHistoryRow,
} from "./algebra-history.js";

test("aggregateAlgebraTaskEntries groups algebra steps into task-level history", () => {
  const rows: RawAlgebraHistoryRow[] = [
    {
      id: "a1",
      sessionId: "s1",
      taskId: "t1",
      taskData: {
        currentEquation: "3x + 15 = 21",
        proposedStep: "3x = 6",
        expectedFirstStep: "3x = 6",
        transformationType: "subtract_both_sides",
        correctAnswer: "x = 2",
        isTaskComplete: false,
      },
      userAnswer: "3x = 6",
      isCorrect: true,
      errorType: null,
      timeTaken: 1500,
      createdAt: new Date("2026-04-24T18:00:00.000Z"),
      session: {
        startedAt: new Date("2026-04-24T17:59:00.000Z"),
      },
    },
    {
      id: "a2",
      sessionId: "s1",
      taskId: "t1",
      taskData: {
        currentEquation: "3x = 6",
        proposedStep: "x = 2",
        expectedFirstStep: "3x = 6",
        transformationType: "divide_both_sides",
        correctAnswer: "x = 2",
        isTaskComplete: true,
      },
      userAnswer: "x = 2",
      isCorrect: true,
      errorType: null,
      timeTaken: 3000,
      createdAt: new Date("2026-04-24T18:00:05.000Z"),
      session: {
        startedAt: new Date("2026-04-24T17:59:00.000Z"),
      },
    },
  ];

  const entries = aggregateAlgebraTaskEntries(rows, 12);
  assert.equal(entries.length, 1);
  assert.equal(entries[0].prompt, "3x + 15 = 21");
  assert.equal(entries[0].response, "x = 2");
  assert.equal(entries[0].isTaskComplete, true);
  assert.equal(entries[0].isCorrect, true);
  assert.equal(entries[0].stepCount, 2);
  assert.equal(entries[0].correctStepCount, 2);
  assert.equal(entries[0].totalTimeMs, 4500);
  assert.equal(entries[0].taskAccuracy, 100);
});

test("summarizeAlgebraTaskEntries reports task-level accuracy", () => {
  const summary = summarizeAlgebraTaskEntries([
    {
      id: "s1:t1",
      sessionId: "s1",
      taskId: "t1",
      createdAt: "2026-04-24T18:00:05.000Z",
      sessionStartedAt: "2026-04-24T17:59:00.000Z",
      prompt: "3x + 15 = 21",
      response: "x = 2",
      expectedAnswer: "x = 2",
      currentEquation: "3x + 15 = 21",
      proposedStep: "x = 2",
      expectedFirstStep: "3x = 6",
      transformationType: "divide_both_sides",
      userAnswer: "x = 2",
      isCorrect: true,
      errorType: null,
      timeTakenMs: 4500,
      steps: [],
      stepCount: 2,
      correctStepCount: 2,
      taskAccuracy: 100,
      totalTimeMs: 4500,
      isTaskComplete: true,
    },
    {
      id: "s1:t2",
      sessionId: "s1",
      taskId: "t2",
      createdAt: "2026-04-24T18:01:05.000Z",
      sessionStartedAt: "2026-04-24T18:01:00.000Z",
      prompt: "4x + 9 = 37",
      response: "4x = 29",
      expectedAnswer: "x = 7",
      currentEquation: "4x + 9 = 37",
      proposedStep: "4x = 29",
      expectedFirstStep: "4x = 28",
      transformationType: "subtract_both_sides",
      userAnswer: "4x = 29",
      isCorrect: false,
      errorType: "INCORRECT_STEP",
      timeTakenMs: 2500,
      steps: [],
      stepCount: 1,
      correctStepCount: 0,
      taskAccuracy: 0,
      totalTimeMs: 2500,
      isTaskComplete: false,
    },
  ]);

  assert.equal(summary.totalSubmissions, 2);
  assert.equal(summary.correctSubmissions, 1);
  assert.equal(summary.accuracy, 50);
  assert.equal(summary.avgTimeMs, 3500);
});
