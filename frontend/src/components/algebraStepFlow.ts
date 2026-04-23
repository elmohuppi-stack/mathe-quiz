export interface AlgebraStepValidationResult {
  isValid: boolean;
  isEquivalent: boolean;
  errorDescription?: string;
}

export interface AlgebraStepFlowOutcome {
  feedbackType: "success" | "error" | "info";
  feedbackMessage: string;
  isTaskComplete: boolean;
  shouldAdvanceEquation: boolean;
  shouldIncrementTaskCount: boolean;
  shouldIncrementCorrectCount: boolean;
}

type Translate = (key: string) => string;

function normalizeStep(step: string): string {
  return step.trim().replace(/\s/g, "");
}

export function resolveAlgebraStepFlowOutcome(
  validation: AlgebraStepValidationResult,
  userStep: string,
  correctAnswer: string,
  translate: Translate,
): AlgebraStepFlowOutcome {
  if (validation.isValid && validation.isEquivalent) {
    if (normalizeStep(userStep) === normalizeStep(correctAnswer)) {
      return {
        feedbackType: "success",
        feedbackMessage: `🎉 ${translate("training.task_complete")}`,
        isTaskComplete: true,
        shouldAdvanceEquation: false,
        shouldIncrementTaskCount: true,
        shouldIncrementCorrectCount: true,
      };
    }

    return {
      feedbackType: "info",
      feedbackMessage: translate("training.continue_steps"),
      isTaskComplete: false,
      shouldAdvanceEquation: true,
      shouldIncrementTaskCount: false,
      shouldIncrementCorrectCount: false,
    };
  }

  return {
    feedbackType: "error",
    feedbackMessage: validation.errorDescription
      ? translate(validation.errorDescription)
      : translate("training.incorrect"),
    isTaskComplete: false,
    shouldAdvanceEquation: false,
    shouldIncrementTaskCount: true,
    shouldIncrementCorrectCount: false,
  };
}
