import test from "node:test";
import assert from "node:assert/strict";

import { generateTask, validateAnswer } from "./tasks.js";

function parseMentalMathQuestion(question: string) {
  const match = question.match(/^(-?\d+)\s([+\-*/])\s(-?\d+)\s=\s\?$/);
  assert.ok(match, `Unexpected mental math question format: ${question}`);

  return {
    a: Number(match[1]),
    operation: match[2] as "+" | "-" | "*" | "/",
    b: Number(match[3]),
  };
}

function parseFraction(value: string) {
  const [numerator, denominator] = value.split("/").map(Number);
  assert.ok(Number.isFinite(numerator), `Invalid numerator in ${value}`);
  assert.ok(Number.isFinite(denominator), `Invalid denominator in ${value}`);
  assert.notStrictEqual(
    denominator,
    0,
    `Denominator must not be zero in ${value}`,
  );
  return { numerator, denominator };
}

function evaluateMentalMath(a: number, operation: string, b: number) {
  switch (operation) {
    case "+":
      return (a + b).toString();
    case "-":
      return (a - b).toString();
    case "*":
      return (a * b).toString();
    case "/":
      return (a / b).toFixed(2);
    default:
      throw new Error(`Unsupported operation: ${operation}`);
  }
}

function evaluateFractionTask(task: ReturnType<typeof generateTask>) {
  switch (task.taskData.kind) {
    case "fraction-operation": {
      const { numerator1, denominator1, numerator2, denominator2, operation } =
        task.taskData;
      switch (operation) {
        case "+":
          return `${numerator1! * denominator2! + numerator2! * denominator1!}/${denominator1! * denominator2!}`;
        case "-":
          return `${numerator1! * denominator2! - numerator2! * denominator1!}/${denominator1! * denominator2!}`;
        case "*":
          return `${numerator1! * numerator2!}/${denominator1! * denominator2!}`;
        case "/":
          return `${numerator1! * denominator2!}/${denominator1! * numerator2!}`;
        default:
          throw new Error(`Unsupported fraction operation: ${operation}`);
      }
    }
    case "fraction-to-percent":
      return `${task.taskData.percent}%`;
    case "percent-of-quantity":
      return `${task.taskData.partValue}`;
    case "percentage-ratio":
      return `${task.taskData.percent}%`;
    default:
      throw new Error(`Unsupported fractions task kind: ${task.taskData.kind}`);
  }
}

test("mental math tasks generate valid questions and answers across all levels", () => {
  for (let level = 1; level <= 5; level++) {
    const task = generateTask("mental-math", level);

    assert.equal(task.module, "mental-math");
    assert.equal(task.level, level);
    assert.match(task.taskId, /^mental-/);

    const parsed = parseMentalMathQuestion(task.taskData.question);
    assert.equal(task.taskData.a, parsed.a);
    assert.equal(task.taskData.b, parsed.b);
    assert.equal(task.taskData.operation, parsed.operation);
    assert.equal(
      task.correctAnswer,
      evaluateMentalMath(parsed.a, parsed.operation, parsed.b),
    );

    if (level <= 2) {
      assert.ok(parsed.a >= 1 && parsed.a <= 10);
      assert.ok(parsed.b >= 1 && parsed.b <= 10);
      assert.ok(["+", "-", "*"].includes(parsed.operation));
    } else if (level <= 4) {
      assert.ok(parsed.a >= 10 && parsed.a <= 99);
      assert.ok(parsed.b >= 10 && parsed.b <= 99);
      assert.ok(["+", "-", "*"].includes(parsed.operation));
    } else {
      assert.ok(parsed.a >= 100 && parsed.a <= 1098);
      assert.ok(parsed.b >= 10 && parsed.b <= 108);
      assert.ok(["+", "-", "*", "/"].includes(parsed.operation));
    }
  }
});

test("fraction tasks generate consistent answers across all levels", () => {
  for (let level = 1; level <= 5; level++) {
    const task = generateTask("fractions", level);

    assert.equal(task.module, "fractions");
    assert.equal(task.level, level);
    assert.match(task.taskId, /^fractions-/);

    switch (task.taskData.kind) {
      case "fraction-operation":
        assert.match(
          task.taskData.question,
          /^\d+\/\d+\s[+\-*/]\s\d+\/\d+\s=\s\?$/,
        );
        parseFraction(
          `${task.taskData.numerator1}/${task.taskData.denominator1}`,
        );
        parseFraction(
          `${task.taskData.numerator2}/${task.taskData.denominator2}`,
        );
        if (task.taskData.operation === "/") {
          assert.notStrictEqual(task.taskData.numerator2, 0);
        }
        if (level <= 2) {
          assert.ok(["+", "-"].includes(task.taskData.operation!));
          assert.equal(task.taskData.denominator1, task.taskData.denominator2);
        } else if (level <= 4) {
          assert.ok(["+", "-", "*"].includes(task.taskData.operation!));
        } else {
          assert.ok(["+", "-", "*", "/"].includes(task.taskData.operation!));
        }
        break;
      case "fraction-to-percent":
        assert.match(task.taskData.question, /^\d+\/\d+\s=\s\?\s%$/);
        parseFraction(
          `${task.taskData.numerator1}/${task.taskData.denominator1}`,
        );
        assert.ok(typeof task.taskData.percent === "number");
        assert.match(task.correctAnswer, /^\d+%$/);
        break;
      case "percent-of-quantity":
        assert.match(task.taskData.question, /^\d+% von \d+ = \?$/);
        assert.ok(typeof task.taskData.percent === "number");
        assert.ok(typeof task.taskData.baseValue === "number");
        assert.ok(typeof task.taskData.partValue === "number");
        assert.match(task.correctAnswer, /^\d+$/);
        assert.ok(level >= 3);
        break;
      case "percentage-ratio":
        assert.match(task.taskData.question, /^\d+ ist wie viel % von \d+\?$/);
        assert.ok(typeof task.taskData.percent === "number");
        assert.ok(typeof task.taskData.baseValue === "number");
        assert.ok(typeof task.taskData.partValue === "number");
        assert.match(task.correctAnswer, /^\d+%$/);
        assert.ok(level === 5);
        break;
      default:
        throw new Error(
          `Unsupported fractions task kind: ${task.taskData.kind}`,
        );
    }

    assert.equal(task.correctAnswer, evaluateFractionTask(task));
  }
});

test("algebra tasks are dispatched with step-by-step metadata for all levels", () => {
  const expectedRules = new Map([
    [1, "subtract_both_sides"],
    [2, "subtract_both_sides"],
    [3, "combine_like_terms"],
    [4, "distributive_law"],
    [5, "distributive_law"],
  ]);

  for (let level = 1; level <= 5; level++) {
    const task = generateTask("algebra", level);

    assert.equal(task.module, "algebra");
    assert.equal(task.level, level);
    assert.match(task.taskId, /^algebra-l\d-/);
    assert.equal(task.taskData.type, "step_by_step");
    assert.equal(task.taskData.equation, task.prompt);
    assert.equal(task.metadata?.rule, expectedRules.get(level));
    assert.ok(typeof task.prompt === "string" && task.prompt.includes("="));
    assert.ok(
      typeof task.expectedFirstStep === "string" &&
        task.expectedFirstStep.includes("="),
    );
    assert.match(task.correctAnswer, /^x\s=\s.+$/);
  }
});

test("generateTask clamps invalid levels into supported range", () => {
  const tooLow = generateTask("mental-math", 0);
  const tooHigh = generateTask("fractions", 99);

  assert.equal(tooLow.level, 1);
  assert.equal(tooHigh.level, 5);
});

test("validateAnswer ignores whitespace and casing", () => {
  assert.equal(validateAnswer("  X = 5 ", "x=5"), true);
  assert.equal(validateAnswer("3/4", " 3 / 4 "), true);
  assert.equal(validateAnswer("5", "6"), false);
});

test("validateAnswer accepts equivalent fractions and whole-number forms", () => {
  assert.equal(validateAnswer("1/2", "2/4"), true);
  assert.equal(validateAnswer("6/3", "2"), true);
  assert.equal(validateAnswer("75", "75%"), true);
  assert.equal(validateAnswer("75%", "75%"), true);
  assert.equal(validateAnswer("-3/6", "1/2"), false);
  assert.equal(validateAnswer("3/0", "1/2"), false);
});
