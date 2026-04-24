import { describe, expect, it } from "vitest";

import {
  deriveCurrentRule,
  deriveExpectedEquationForRule,
  isLocallyAcceptedAlgebraStep,
} from "../src/components/algebraRules";

describe("algebraRules", () => {
  it("derives subtract-both-sides for simple linear equations", () => {
    expect(deriveCurrentRule("7x + 7 = 49")).toBe("subtract_both_sides");
    expect(
      deriveExpectedEquationForRule("7x + 7 = 49", "subtract_both_sides"),
    ).toBe("7x=42");
  });

  it("derives divide-both-sides for isolated coefficients", () => {
    expect(deriveCurrentRule("2x = 8")).toBe("divide_both_sides");
    expect(deriveExpectedEquationForRule("2x = 8", "divide_both_sides")).toBe(
      "x=4",
    );
  });

  it("accepts the generated distributive-law first step directly", () => {
    expect(
      isLocallyAcceptedAlgebraStep(
        "3x + 15 = 2x + 22",
        "3(x + 5) = 2x + 22",
        "3x + 15 = 2x + 22",
        "distributive_law",
      ),
    ).toBe(true);
  });

  it("accepts simple subtract and divide follow-up steps locally", () => {
    expect(isLocallyAcceptedAlgebraStep("4x = 28", "4x + 9 = 37")).toBe(true);
    expect(isLocallyAcceptedAlgebraStep("x = 4", "2x = 8")).toBe(true);
  });

  it("rejects locally incorrect steps", () => {
    expect(isLocallyAcceptedAlgebraStep("4x = 29", "4x + 9 = 37")).toBe(false);
    expect(isLocallyAcceptedAlgebraStep("x = 5", "2x = 8")).toBe(false);
  });
});
