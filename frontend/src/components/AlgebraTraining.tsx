import { useEffect, useRef, useState } from "react";
import { useTranslation } from "../i18n/useTranslation";
import api from "../lib/api";
import { resolveAlgebraStepFlowOutcome } from "./algebraStepFlow";
import {
  deriveCurrentRule,
  isLocallyAcceptedAlgebraStep,
} from "./algebraRules";

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
  const stepInputRef = useRef<HTMLInputElement | null>(null);
  const notificationTimeoutRef = useRef<number | null>(null);
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
  const [notification, setNotification] = useState<{
    type: "success" | null;
    message: string;
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

  const statsCards = (
    <>
      <div className="rounded-2xl border border-slate-200 bg-white p-2.5 shadow-sm">
        <p className="text-xs uppercase tracking-wide text-slate-500">
          {t("training.tasks_solved")}
        </p>
        <p className="mt-1 text-xl font-bold text-slate-900">{taskCount}</p>
      </div>
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-2.5 shadow-sm">
        <p className="text-xs uppercase tracking-wide text-emerald-700">
          {t("training.correct")}
        </p>
        <p className="mt-1 text-xl font-bold text-emerald-900">
          {taskCount > 0 ? Math.round((correctCount / taskCount) * 100) : 0}%
        </p>
      </div>
      <div className="rounded-2xl border border-indigo-200 bg-indigo-50 p-2.5 shadow-sm">
        <p className="text-xs uppercase tracking-wide text-indigo-700">
          {t("training.current_step")}
        </p>
        <p className="mt-1 text-xl font-bold text-indigo-900">{steps.length}</p>
      </div>
      <div className="rounded-2xl border border-cyan-200 bg-cyan-50 p-2.5 shadow-sm">
        <p className="text-xs uppercase tracking-wide text-cyan-700">
          {t("training.task_level")}
        </p>
        <p className="mt-1 text-xl font-bold text-cyan-900">L{level}</p>
      </div>
    </>
  );

  const focusStepInput = () => {
    window.requestAnimationFrame(() => {
      stepInputRef.current?.focus();
    });
  };

  const showSuccessNotification = (message: string) => {
    if (notificationTimeoutRef.current !== null) {
      window.clearTimeout(notificationTimeoutRef.current);
    }

    setNotification({ type: "success", message });
    notificationTimeoutRef.current = window.setTimeout(() => {
      setNotification({ type: null, message: "" });
      notificationTimeoutRef.current = null;
    }, 900);
  };

  useEffect(() => {
    setShowInstructions(
      localStorage.getItem("algebra-training-help-collapsed") !== "true",
    );
    setShowStepHistory(
      localStorage.getItem("algebra-training-history-expanded") === "true",
    );
  }, []);

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
      focusStepInput();
    } catch (error) {
      setFeedback({
        type: "error",
        message: t("errors.general.internal_error"),
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Load next task
  useEffect(() => {
    void loadTask();

    return () => {
      if (notificationTimeoutRef.current !== null) {
        window.clearTimeout(notificationTimeoutRef.current);
      }
    };
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
        correctAnswer: task.correctAnswer,
        timeTakenMs,
      });

      const isExpectedFirstStep = isLocallyAcceptedAlgebraStep(
        userStep,
        currentEquation,
        task.expectedFirstStep,
        task.metadata?.rule,
      );
      const effectiveValidation: StepValidation =
        !response.data.isValid && isExpectedFirstStep
          ? {
              ...response.data,
              isValid: true,
              isEquivalent: true,
              isExactMatch: true,
              errorType: undefined,
              errorDescription: undefined,
              errorSeverity: undefined,
            }
          : response.data;

      setStepValidation(effectiveValidation);

      const outcome = resolveAlgebraStepFlowOutcome(
        effectiveValidation,
        userStep,
        task.correctAnswer,
        t,
      );

      if (effectiveValidation.isValid && effectiveValidation.isEquivalent) {
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
          setFeedback({ type: null, message: "" });
          showSuccessNotification(outcome.feedbackMessage);
          void loadTask();
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
      focusStepInput();
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
    <div className="space-y-5">
      {notification.type ? (
        <div className="pointer-events-none fixed inset-x-0 top-4 z-50 flex justify-center px-4">
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800 shadow-lg backdrop-blur">
            {notification.message}
          </div>
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1.62fr_0.38fr]">
        <section className="training-hero relative overflow-hidden rounded-3xl border border-indigo-100 bg-[radial-gradient(circle_at_top_left,_rgba(165,180,252,0.32),_transparent_36%),linear-gradient(135deg,_#eef2ff_0%,_#f8fafc_48%,_#ecfeff_100%)] p-5 shadow-sm">
          <div className="flex flex-wrap items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-indigo-700">
            <span className="rounded-full bg-white/80 px-3 py-1 shadow-sm">
              {t("modules.algebra")}
            </span>
            <span className="rounded-full bg-slate-900 px-3 py-1 text-white shadow-sm">
              {currentRuleKey
                ? t(`rules.${currentRuleKey}`)
                : t("training.current_step")}
            </span>
          </div>

          <div className="mt-5 flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-slate-500">
                {t("training.current_equation")}
              </p>
              <h2 className="mt-2 font-mono text-3xl font-bold tracking-tight text-slate-900 md:text-4xl">
                {currentEquation}
              </h2>
            </div>
            <div className="rounded-2xl border border-white/60 bg-white/80 px-4 py-3 text-right shadow-sm backdrop-blur">
              <p className="text-xs uppercase tracking-wide text-slate-500">
                {t("training.level")}
              </p>
              <p className="mt-1 text-2xl font-bold text-slate-900">{level}</p>
            </div>
          </div>

          <div className="mt-5">
            {showInstructions ? (
              <div className="rounded-2xl border border-indigo-200 bg-white/75 p-4 shadow-sm backdrop-blur">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-indigo-700">
                      {t("training.how_to_solve")}
                    </p>
                    <p className="mt-2 text-sm text-slate-600">
                      {t("training.single_step_instruction")}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleToggleInstructions}
                    className="whitespace-nowrap text-xs font-semibold text-indigo-800 hover:text-indigo-950"
                  >
                    {t("training.hide_help")}
                  </button>
                </div>
                <div className="mt-3 grid gap-3 md:grid-cols-3">
                  <div className="rounded-2xl bg-white/90 p-4 shadow-sm ring-1 ring-indigo-100">
                    <p className="text-xs uppercase tracking-wide text-slate-500">
                      {t("training.current_goal")}
                    </p>
                    <p className="mt-2 text-sm font-semibold text-slate-900">
                      {t("training.apply_rule_instruction")}
                    </p>
                  </div>
                  <div className="rounded-2xl bg-white/90 p-4 shadow-sm ring-1 ring-slate-100">
                    <p className="text-xs uppercase tracking-wide text-slate-500">
                      {t("training.one_step_only")}
                    </p>
                    <p className="mt-2 text-sm font-semibold text-slate-900">
                      {t("training.one_step_only_description")}
                    </p>
                  </div>
                  <div className="rounded-2xl bg-white/90 p-4 shadow-sm ring-1 ring-cyan-100">
                    <p className="text-xs uppercase tracking-wide text-slate-500">
                      {t("training.level_focus")}
                    </p>
                    <p className="mt-2 text-sm font-semibold text-slate-900">
                      {t(levelFocusKey)}
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between gap-3 rounded-2xl border border-indigo-200 bg-white/75 px-4 py-3 shadow-sm backdrop-blur">
                <div className="flex min-w-0 items-center gap-2">
                  <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-indigo-100 text-sm font-bold text-indigo-900">
                    ?
                  </span>
                  <p className="truncate text-sm text-indigo-900">
                    {t("training.help_collapsed")}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleToggleInstructions}
                  className="whitespace-nowrap text-xs font-semibold text-indigo-800 hover:text-indigo-950"
                >
                  {t("training.show_help")}
                </button>
              </div>
            )}
          </div>
        </section>

        <section className="hidden grid-cols-2 gap-2.5 lg:grid lg:grid-cols-1">
          {statsCards}
        </section>
      </div>

      {/* Step Input Form */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleValidateStep();
        }}
        className="space-y-4 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"
      >
        <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_17rem] lg:items-start">
          <div className="max-w-2xl">
            <label className="block text-gray-700 font-semibold mb-2">
              {t("training.your_next_step")}
            </label>
            <input
              ref={stepInputRef}
              type="text"
              value={userStep}
              onChange={(e) => handleStepChange(e.target.value)}
              placeholder={t("training.example_next_step")}
              className="w-full rounded-2xl border border-gray-300 px-4 py-3 text-lg font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={isSubmitting}
              autoFocus
            />
            <p className="mt-2 text-xs text-gray-500">
              {t("training.sympy_syntax_hint")}
            </p>
          </div>

          <div className="space-y-3 lg:pt-8">
            {feedback.type ? (
              <div
                className={`rounded-2xl border p-4 text-sm font-medium shadow-sm ${
                  feedback.type === "success"
                    ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                    : feedback.type === "info"
                      ? "border-blue-200 bg-blue-50 text-blue-700"
                      : "border-rose-200 bg-rose-50 text-rose-700"
                }`}
              >
                {feedback.message}
              </div>
            ) : (
              <div className="hidden lg:block" />
            )}

            {stepValidation &&
              !stepValidation.isValid &&
              userStep.trim() &&
              stepValidation.errorSeverity === "warning" &&
              hintMessage &&
              hintMessage !== feedback.message && (
                <div className="rounded-2xl border border-yellow-200 bg-yellow-50 p-4 text-sm text-yellow-800 shadow-sm">
                  <strong>{t("training.hint")}:</strong> {hintMessage}
                </div>
              )}
          </div>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row">
          <button
            type="submit"
            disabled={isSubmitting || !userStep.trim()}
            className="flex-1 rounded-2xl bg-blue-500 px-4 py-3 font-bold text-white transition hover:bg-blue-600 disabled:bg-blue-300"
          >
            {isSubmitting ? t("common.checking") : t("common.check_step")}
          </button>
          <button
            type="button"
            onClick={handleEndSession}
            className="rounded-2xl bg-gray-300 px-5 py-3 font-bold text-gray-800 transition hover:bg-gray-400"
          >
            {t("training.end_session")}
          </button>
        </div>
      </form>

      <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        {showStepHistory ? (
          <div className="space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-lg font-bold text-slate-900">
                  {t("training.step_history")}
                </p>
                <p className="mt-1 text-sm text-slate-500">{historySummary}</p>
              </div>
              <button
                type="button"
                onClick={handleToggleStepHistory}
                className="whitespace-nowrap text-xs font-semibold text-slate-700 hover:text-slate-950"
              >
                {t("training.hide_history")}
              </button>
            </div>

            <div className="space-y-3">
              {steps.map((step, idx) => (
                <article
                  key={idx}
                  className="rounded-2xl border border-slate-100 bg-slate-50 p-4"
                >
                  <div className="flex items-start gap-3">
                    <span className="rounded-full bg-indigo-100 px-2.5 py-1 text-xs font-semibold text-indigo-800">
                      {idx + 1}
                    </span>
                    <p className="min-w-0 break-words font-mono text-sm text-slate-800">
                      {step}
                    </p>
                  </div>
                </article>
              ))}
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-between gap-3 rounded-2xl bg-slate-50 px-4 py-3">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-slate-800">
                {t("training.step_history")}
              </p>
              <p className="truncate text-sm text-slate-500">
                {historySummary}
              </p>
            </div>
            <button
              type="button"
              onClick={handleToggleStepHistory}
              className="whitespace-nowrap text-xs font-semibold text-slate-700 hover:text-slate-950"
            >
              {t("training.show_history")}
            </button>
          </div>
        )}
      </div>

      <section className="grid grid-cols-2 gap-2.5 lg:hidden">
        {statsCards}
      </section>
    </div>
  );
}
