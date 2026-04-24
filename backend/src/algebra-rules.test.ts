import assert from "node:assert/strict";
import test from "node:test";

import {
  deriveCurrentRule,
  deriveExpectedEquationForRule,
  isLocallyAcceptedAlgebraStep,
} from "./algebra-rules.js";

test("deriveCurrentRule detects subtract-both-sides for simple linear equations", () => {
  assert.equal(deriveCurrentRule("7x + 7 = 49"), "subtract_both_sides");
  assert.equal(
    deriveExpectedEquationForRule("7x + 7 = 49", "subtract_both_sides"),
    "7x=42",
  );
});

test("deriveCurrentRule detects divide-both-sides for isolated coefficients", () => {
  assert.equal(deriveCurrentRule("2x = 8"), "divide_both_sides");
  assert.equal(
    deriveExpectedEquationForRule("2x = 8", "divide_both_sides"),
    "x=4",
  );
});

test("isLocallyAcceptedAlgebraStep accepts distributive, subtract and divide steps", () => {
  assert.equal(
    isLocallyAcceptedAlgebraStep(
      "3x + 15 = 2x + 22",
      "3(x + 5) = 2x + 22",
      "3x + 15 = 2x + 22",
      "distributive_law",
    ),
    true,
  );
  assert.equal(isLocallyAcceptedAlgebraStep("4x = 28", "4x + 9 = 37"), true);
  assert.equal(isLocallyAcceptedAlgebraStep("x = 4", "2x = 8"), true);
  assert.equal(isLocallyAcceptedAlgebraStep("x = 5", "2x = 8"), false);
});
