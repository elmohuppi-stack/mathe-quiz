import { useEffect, useState } from "react";
import { useTranslation } from "../i18n/useTranslation";
import api from "../lib/api";
import { resolveAlgebraStepFlowOutcome } from "./algebraStepFlow";

function normalizeAlgebraSide(side: string): string {
  return side
    .replace(/\s+/g, "")
    .replace(/\+\+/g, "+")
    .replace(/\+-/g, "-")
    .replace(/-\+/g, "-")
    .replace(/--/g, "+");
}

function countVariableOccurrences(side: string): number {
  return (side.match(/x/g) || []).length;
}

function parseLinearSide(side: string): {
  coefficient: number;
  constant: number;
} | null {
  const normalized = normalizeAlgebraSide(side);
  const match = normalized.match(/^([+-]?\d*)x([+-]\d+)?$/);

  if (!match) {
    return null;
  }

  const coefficientToken = match[1];
  const coefficient =
    coefficientToken === "" || coefficientToken === "+"
      ? 1
      : coefficientToken === "-"
        ? -1
        : Number(coefficientToken);

  return {
    coefficient,
    constant: match[2] ? Number(match[2]) : 0,
  };
}

function isFractionVariableSide(side: string): boolean {
  const normalized = normalizeAlgebraSide(side);
  return /^[+-]?(?:\d+)?x\/\d+$/.test(normalized);
}

function deriveCurrentRule(
  equation: string,
  fallbackRule?: string,
): string | undefined {
  const parts = equation.split("=");
  if (parts.length !== 2) {
    return fallbackRule;
  }

  const left = parts[0].trim();
  const right = parts[1].trim();

  if (equation.includes("(")) {
    return "distributive_law";
  }

  if (
    countVariableOccurrences(left) > 1 ||
    countVariableOccurrences(right) > 1
  ) {
    return "combine_like_terms";
  }

  const leftLinear = parseLinearSide(left);
  const rightLinear = parseLinearSide(right);
  const leftHasVariable = left.includes("x");
  const rightHasVariable = right.includes("x");

  if (leftLinear && !rightHasVariable) {
    if (leftLinear.constant !== 0) {
      return leftLinear.constant > 0 ? "subtract_both_sides" : "add_both_sides";
    }
    if (Math.abs(leftLinear.coefficient) !== 1) {
      return "divide_both_sides";
    }
  }

  if (leftHasVariable && !rightHasVariable && isFractionVariableSide(left)) {
    return "multiply_both_sides";
  }

  if (rightLinear && !leftHasVariable) {
    if (rightLinear.constant !== 0) {
      return rightLinear.constant > 0
        ? "subtract_both_sides"
        : "add_both_sides";
    }
    if (Math.abs(rightLinear.coefficient) !== 1) {
      return "divide_both_sides";
    }
  }

  if (rightHasVariable && !leftHasVariable && isFractionVariableSide(right)) {
    return "multiply_both_sides";
  }

  if (leftHasVariable && rightHasVariable) {
    return "subtract_both_sides";
  }

  return fallbackRule;
}

interface SessionData {
  sessionId: string;
  userId: string;
  module: string;
  startedAt: string;
}

interface Task {
  taskId: string;
  module: string;
  level: number;
  prompt: string;
  expectedFirstStep: string;
  taskData: Record<string, any>;
  correctAnswer: string;
  metadata?: Record<string, any>;
}

interface StepValidation {
  isValid: boolean;
  isEquivalent: boolean;
  isExactMatch: boolean;
  errorType?: string;
  errorDescription?: string;
  errorSeverity?: "critical" | "warning";
  transformationType?: string;
}

interface AlgebraTrainingProps {
  session: SessionData;
  level: number;
  onSessionEnd: () => void;
}

export default function AlgebraTraining({
  session,
  level,
  onSessionEnd,
}: AlgebraTrainingProps) {
  const { t } = useTranslation();
  const [task, setTask] = useState<Task | null>(null);
  const [currentEquation, setCurrentEquation] = useState<string>("");
  const [steps, setSteps] = useState<string[]>([]);
  const [userStep, setUserStep] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [taskCount, setTaskCount] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [stepStartTime, setStepStartTime] = useState(Date.now());
  const [feedback, setFeedback] = useState<{
    type: "success" | "error" | "info" | null;
    message: string;
    details?: string;
  }>({ type: null, message: "" });
  const [showInstructions, setShowInstructions] = useState(true);
  const [showStepHistory, setShowStepHistory] = useState(false);
  const [stepValidation, setStepValidation] = useState<StepValidation | null>(
    null,
  );

  const levelFocusKey = `training.algebra_level_focus_${level}`;
  const hintMessage = stepValidation?.errorDescription
    ? t(stepValidation.errorDescription)
    : "";
  const currentRuleKey = deriveCurrentRule(
    currentEquation,
    task?.metadata?.rule,
  );
  const historySummary = `${steps.length} ${t("training.history_steps_so_far")}`;

  useEffect(() => {
    setShowInstructions(
      localStorage.getItem("algebra-training-help-collapsed") !== "true",
    );
    setShowStepHistory(
      localStorage.getItem("algebra-training-history-expanded") === "true",
    );
  }, []);

  // Load next task
  useEffect(() => {
    const loadTask = async () => {
      try {
        setIsLoading(true);
        const response = await api.post("/tasks/next", {
          module: "algebra",
          level,
          sessionId: session.sessionId,
        });
        const newTask = response.data;
        setTask(newTask);
        setCurrentEquation(newTask.prompt || newTask.taskData.equation);
        setSteps([newTask.prompt || newTask.taskData.equation]);
        setUserStep("");
        setStepStartTime(Date.now());
        setFeedback({ type: null, message: "" });
        setStepValidation(null);
      } catch (error) {
        setFeedback({
          type: "error",
          message: t("errors.general.internal_error"),
        });
      } finally {
        setIsLoading(false);
      }
    };

    loadTask();
  }, [level, session.sessionId]);

  // Validate step as user types
  const handleStepChange = (value: string) => {
    setUserStep(value);
    setFeedback({ type: null, message: "" });
    setStepValidation(null);
  };

  const handleValidateStep = async () => {
    if (!task || !userStep.trim()) {
      setFeedback({
        type: "error",
        message: t("errors.general.bad_request"),
      });
      return;
    }

    setIsSubmitting(true);
    const timeTakenMs = Date.now() - stepStartTime;

    try {
      const response = await api.post("/algebra/validate-step", {
        sessionId: session.sessionId,
        taskId: task.taskId,
        currentEquation,
        proposedStep: userStep,
        expectedFirstStep: task.expectedFirstStep,
        timeTakenMs,
      });

      setStepValidation(response.data);

      const outcome = resolveAlgebraStepFlowOutcome(
        response.data,
        userStep,
        task.correctAnswer,
        t,
      );

      if (response.data.isValid && response.data.isEquivalent) {
        const newSteps = [...steps, userStep];
        setSteps(newSteps);

        if (outcome.shouldIncrementCorrectCount) {
          setCorrectCount((prev) => prev + 1);
        }

        if (outcome.shouldIncrementTaskCount) {
          setTaskCount((prev) => prev + 1);
        }

        setFeedback({
          type: outcome.feedbackType,
          message: outcome.feedbackMessage,
        });

        if (outcome.isTaskComplete) {
          setFeedback({
            type: outcome.feedbackType,
            message: outcome.feedbackMessage,
          });

          setTimeout(() => {
            const loadNextTask = async () => {
              try {
                const response = await api.post("/tasks/next", {
                  module: "algebra",
                  level,
                  sessionId: session.sessionId,
                });
                const newTask = response.data;
                setTask(newTask);
                setCurrentEquation(newTask.prompt || newTask.taskData.equation);
                setSteps([newTask.prompt || newTask.taskData.equation]);
                setUserStep("");
                setStepStartTime(Date.now());
                setFeedback({ type: null, message: "" });
                setStepValidation(null);
              } catch (error) {
                setFeedback({
                  type: "error",
                  message: t("errors.general.internal_error"),
                });
              }
            };
            loadNextTask();
          }, 2000);
        } else if (outcome.shouldAdvanceEquation) {
          setCurrentEquation(userStep);
          setUserStep("");
          setStepStartTime(Date.now());
        }
      } else {
        if (outcome.shouldIncrementTaskCount) {
          setTaskCount((prev) => prev + 1);
        }

        setFeedback({
          type: outcome.feedbackType,
          message: outcome.feedbackMessage,
        });
      }
    } catch (error: any) {
      setFeedback({
        type: "error",
        message:
          error.response?.data?.error || t("errors.general.internal_error"),
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleInstructions = () => {
    setShowInstructions((prev) => {
      const next = !prev;
      localStorage.setItem("algebra-training-help-collapsed", String(!next));
      return next;
    });
  };

  const handleToggleStepHistory = () => {
    setShowStepHistory((prev) => {
      const next = !prev;
      localStorage.setItem("algebra-training-history-expanded", String(next));
      return next;
    });
  };

  const handleEndSession = async () => {
    try {
      await api.post("/sessions/end", {
        sessionId: session.sessionId,
        correctAnswers: correctCount,
        totalTasks: taskCount,
        avgTimeMs: 0,
      });
      onSessionEnd();
    } catch (error) {
      console.error("Error ending session:", error);
      onSessionEnd();
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!task) {
    return (
      <div className="text-red-500">{t("errors.general.internal_error")}</div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-blue-50 rounded p-3">
          <p className="text-gray-600 text-sm">{t("training.tasks_solved")}</p>
          <p className="text-xl font-bold text-blue-600">{taskCount}</p>
        </div>
        <div className="bg-green-50 rounded p-3">
          <p className="text-gray-600 text-sm">{t("training.correct")}</p>
          <p className="text-xl font-bold text-green-600">
            {taskCount > 0 ? Math.round((correctCount / taskCount) * 100) : 0}%
          </p>
        </div>
        <div className="bg-purple-50 rounded p-3">
          <p className="text-gray-600 text-sm">{t("training.task_level")}</p>
          <p className="text-xl font-bold text-purple-600">L{level}</p>
        </div>
      </div>

      {/* Step History */}
      {showStepHistory ? (
        <div className="bg-gray-50 rounded-lg p-4 space-y-2">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-gray-700 font-semibold">
                {t("training.step_history")}
              </p>
              <p className="text-sm text-gray-500 mt-1">{historySummary}</p>
            </div>
            <button
              type="button"
              onClick={handleToggleStepHistory}
              className="text-xs font-semibold text-gray-700 hover:text-gray-900 whitespace-nowrap"
            >
              {t("training.hide_history")}
            </button>
          </div>
          <div className="space-y-1.5 font-mono text-sm max-h-28 overflow-auto pr-1">
            {steps.map((step, idx) => (
              <div key={idx} className="flex items-start gap-3">
                <span className="text-blue-600 font-bold flex-shrink-0">
                  {idx + 1}.
                </span>
                <span className="text-gray-800 break-words">{step}</span>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="bg-gray-50 rounded-lg px-4 py-2.5 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-gray-800">
              {t("training.step_history")}
            </p>
            <p className="text-sm text-gray-500 truncate">{historySummary}</p>
          </div>
          <button
            type="button"
            onClick={handleToggleStepHistory}
            className="text-xs font-semibold text-gray-700 hover:text-gray-900 whitespace-nowrap"
          >
            {t("training.show_history")}
          </button>
        </div>
      )}

      {showInstructions ? (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-semibold uppercase tracking-wide text-amber-800">
                {t("training.how_to_solve")}
              </p>
              <p className="text-sm text-amber-900 mt-1.5">
                {t("training.single_step_instruction")}
              </p>
            </div>
            <button
              type="button"
              onClick={handleToggleInstructions}
              className="text-xs font-semibold text-amber-900 hover:text-amber-950 whitespace-nowrap"
            >
              {t("training.hide_help")}
            </button>
          </div>
          <div className="grid gap-2 md:grid-cols-3 text-sm">
            <div className="bg-white rounded-md p-3 border border-amber-100">
              <p className="font-semibold text-gray-800">
                {t("training.current_goal")}
              </p>
              <p className="text-gray-600 mt-1">
                {t("training.apply_rule_instruction")}
              </p>
            </div>
            <div className="bg-white rounded-md p-3 border border-amber-100">
              <p className="font-semibold text-gray-800">
                {t("training.one_step_only")}
              </p>
              <p className="text-gray-600 mt-1">
                {t("training.one_step_only_description")}
              </p>
            </div>
            <div className="bg-white rounded-md p-3 border border-amber-100">
              <p className="font-semibold text-gray-800">
                {t("training.completion_title")}
              </p>
              <p className="text-gray-600 mt-1">
                {t("training.completion_instruction")}
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-2.5 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <span className="w-6 h-6 rounded-full bg-amber-200 text-amber-900 flex items-center justify-center text-sm font-bold flex-shrink-0">
              ?
            </span>
            <p className="text-sm text-amber-900 truncate">
              {t("training.help_collapsed")}
            </p>
          </div>
          <button
            type="button"
            onClick={handleToggleInstructions}
            className="text-xs font-semibold text-amber-900 hover:text-amber-950 whitespace-nowrap"
          >
            {t("training.show_help")}
          </button>
        </div>
      )}

      {/* Current Equation & Guidance */}
      <div className="bg-gradient-to-br from-indigo-50 to-indigo-100 rounded-lg p-6">
        <p className="text-gray-600 mb-2 text-sm uppercase tracking-wide">
          {t("training.current_equation")}
        </p>
        <p className="text-3xl font-bold text-gray-800 font-mono mb-4">
          {currentEquation}
        </p>
        <div className="grid gap-2 md:grid-cols-3">
          <div className="bg-white bg-opacity-70 rounded p-3 border-l-4 border-blue-500">
            <p className="text-sm text-gray-700 font-semibold mb-1">
              {t("training.current_step")}
            </p>
            <p className="text-lg font-mono text-blue-700">{steps.length}</p>
          </div>
          <div className="bg-white bg-opacity-70 rounded p-3 border-l-4 border-blue-500">
            <p className="text-sm text-gray-700 font-semibold mb-1">
              {t("training.rule")}
            </p>
            <p className="text-sm text-blue-700 font-semibold">
              {currentRuleKey
                ? t(`rules.${currentRuleKey}`)
                : t("common.loading")}
            </p>
          </div>
          <div className="bg-white bg-opacity-70 rounded p-3 border-l-4 border-blue-500">
            <p className="text-sm text-gray-700 font-semibold mb-1">
              {t("training.level_focus")}
            </p>
            <p className="text-sm text-blue-700 font-semibold">
              {t(levelFocusKey)}
            </p>
          </div>
        </div>
      </div>

      {/* Feedback */}
      {feedback.type && (
        <div
          className={`rounded-lg p-4 border-l-4 ${
            feedback.type === "success"
              ? "bg-green-50 text-green-800 border-green-500"
              : feedback.type === "info"
                ? "bg-blue-50 text-blue-800 border-blue-500"
                : "bg-red-50 text-red-800 border-red-500"
          }`}
        >
          <p className="font-semibold">{feedback.message}</p>
        </div>
      )}

      {/* Step Validation Hint */}
      {stepValidation &&
        !stepValidation.isValid &&
        userStep.trim() &&
        stepValidation.errorSeverity === "warning" &&
        hintMessage &&
        hintMessage !== feedback.message && (
          <div className="bg-yellow-50 rounded-lg p-4 border border-yellow-200">
            <p className="text-sm text-yellow-800">
              <strong>{t("training.hint")}:</strong> {hintMessage}
            </p>
          </div>
        )}

      {/* Step Input Form */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleValidateStep();
        }}
        className="space-y-3"
      >
        <div>
          <label className="block text-gray-700 font-semibold mb-2">
            {t("training.your_next_step")}
          </label>
          <input
            type="text"
            value={userStep}
            onChange={(e) => handleStepChange(e.target.value)}
            placeholder={t("training.example_next_step")}
            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-lg font-mono"
            disabled={isSubmitting}
            autoFocus
          />
          <p className="text-xs text-gray-500 mt-1">
            {t("training.sympy_syntax_hint")}
          </p>
        </div>

        <div className="flex gap-3">
          <button
            type="submit"
            disabled={isSubmitting || !userStep.trim()}
            className="flex-1 bg-blue-500 hover:bg-blue-600 disabled:bg-blue-300 text-white font-bold py-2.5 px-4 rounded-lg transition"
          >
            {isSubmitting ? t("common.checking") : t("common.check_step")}
          </button>
          <button
            type="button"
            onClick={handleEndSession}
            className="bg-gray-400 hover:bg-gray-500 text-white font-bold py-2.5 px-5 rounded-lg transition"
          >
            {t("training.end_session")}
          </button>
        </div>
      </form>
    </div>
  );
}
