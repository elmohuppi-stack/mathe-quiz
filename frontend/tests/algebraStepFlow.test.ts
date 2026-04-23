import { describe, expect, it } from "vitest";

import { resolveAlgebraStepFlowOutcome } from "../src/components/algebraStepFlow";

const translations: Record<string, string> = {
  "training.task_complete": "Aufgabe abgeschlossen!",
  "training.continue_steps": "Fahren Sie mit den nächsten Schritten fort.",
  "training.incorrect": "Falsch.",
  "errors.training.too_big_step":
    "Der Schritt ist zu groß. Bitte mache einen Schritt nach dem anderen.",
};

const t = (key: string) => translations[key] ?? key;

describe("resolveAlgebraStepFlowOutcome", () => {
  it("treats a valid final divide step as task completion", () => {
    const outcome = resolveAlgebraStepFlowOutcome(
      {
        isValid: true,
        isEquivalent: true,
      },
      "x = 6",
      "x = 6",
      t,
    );

    expect(outcome).toEqual({
      feedbackType: "success",
      feedbackMessage: "🎉 Aufgabe abgeschlossen!",
      isTaskComplete: true,
      shouldAdvanceEquation: false,
      shouldIncrementTaskCount: true,
      shouldIncrementCorrectCount: true,
    });
  });

  it("treats a valid intermediate step as continue", () => {
    const outcome = resolveAlgebraStepFlowOutcome(
      {
        isValid: true,
        isEquivalent: true,
      },
      "4x = 12",
      "x = 3",
      t,
    );

    expect(outcome).toEqual({
      feedbackType: "info",
      feedbackMessage: "Fahren Sie mit den nächsten Schritten fort.",
      isTaskComplete: false,
      shouldAdvanceEquation: true,
      shouldIncrementTaskCount: false,
      shouldIncrementCorrectCount: false,
    });
  });

  it("surfaces a too-big-step warning as an error feedback state", () => {
    const outcome = resolveAlgebraStepFlowOutcome(
      {
        isValid: false,
        isEquivalent: true,
        errorDescription: "errors.training.too_big_step",
      },
      "x = 6",
      "x = 6",
      t,
    );

    expect(outcome).toEqual({
      feedbackType: "error",
      feedbackMessage:
        "Der Schritt ist zu groß. Bitte mache einen Schritt nach dem anderen.",
      isTaskComplete: false,
      shouldAdvanceEquation: false,
      shouldIncrementTaskCount: true,
      shouldIncrementCorrectCount: false,
    });
  });
});
