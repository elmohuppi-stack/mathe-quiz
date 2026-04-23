import { useEffect, useState } from "react";
import { useTranslation } from "../i18n/useTranslation";
import api from "../lib/api";

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
  const [stepValidation, setStepValidation] = useState<StepValidation | null>(
    null,
  );

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
  }, [level, session.sessionId, t]);

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

      if (response.data.isValid && response.data.isEquivalent) {
        // Step is correct
        setFeedback({
          type: "success",
          message: "✓ " + t("training.correct"),
        });

        // Add step to history
        const newSteps = [...steps, userStep];
        setSteps(newSteps);

        // Check if we reached the final answer
        if (userStep.trim().replace(/\s/g, "") === task.correctAnswer.replace(/\s/g, "")) {
          // Task complete
          setCorrectCount((prev) => prev + 1);
          setTaskCount((prev) => prev + 1);
          setFeedback({
            type: "success",
            message: "🎉 " + t("training.task_complete"),
          });

          // Load next task after 2 seconds
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
                setCurrentEquation(
                  newTask.prompt || newTask.taskData.equation,
                );
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
        } else {
          // More steps needed
          setCurrentEquation(userStep);
          setUserStep("");
          setStepStartTime(Date.now());
          setFeedback({
            type: "info",
            message: t("training.continue_steps"),
          });
        }
      } else {
        // Step is invalid - show error classification
        setTaskCount((prev) => prev + 1);
        setFeedback({
          type: "error",
          message: response.data.errorDescription || t("training.incorrect"),
          details: response.data.message,
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
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-blue-50 rounded p-4">
          <p className="text-gray-600 text-sm">{t("training.tasks_solved")}</p>
          <p className="text-2xl font-bold text-blue-600">{taskCount}</p>
        </div>
        <div className="bg-green-50 rounded p-4">
          <p className="text-gray-600 text-sm">{t("training.correct")}</p>
          <p className="text-2xl font-bold text-green-600">
            {taskCount > 0 ? Math.round((correctCount / taskCount) * 100) : 0}%
          </p>
        </div>
        <div className="bg-purple-50 rounded p-4">
          <p className="text-gray-600 text-sm">{t("training.task_level")}</p>
          <p className="text-2xl font-bold text-purple-600">L{level}</p>
        </div>
      </div>

      {/* Step History */}
      <div className="bg-gray-50 rounded-lg p-6">
        <p className="text-gray-700 font-semibold mb-3">
          {t("training.step_history")}
        </p>
        <div className="space-y-2 font-mono text-sm">
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

      {/* Current Equation & Hint */}
      <div className="bg-gradient-to-br from-indigo-50 to-indigo-100 rounded-lg p-8">
        <p className="text-gray-600 mb-2 text-sm uppercase tracking-wide">
          {t("training.current_equation")}
        </p>
        <p className="text-4xl font-bold text-gray-800 font-mono mb-6">
          {currentEquation}
        </p>

        <div className="bg-white bg-opacity-70 rounded p-4 border-l-4 border-blue-500">
          <p className="text-sm text-gray-700 font-semibold mb-1">
            💡 {t("training.expected_next_step")}
          </p>
          <p className="text-lg font-mono text-blue-700">
            {task.expectedFirstStep}
          </p>
          {task.metadata?.rule && (
            <p className="text-xs text-gray-600 mt-2">
              {t("training.rule")}: <span className="font-semibold">{task.metadata.rule}</span>
            </p>
          )}
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
          {feedback.details && (
            <p className="text-sm mt-1 opacity-80">{feedback.details}</p>
          )}
          {stepValidation?.errorType && (
            <div className="mt-2 text-xs bg-opacity-50 bg-gray-600 text-gray-100 p-2 rounded">
              {t("training.error_type")}: <strong>{stepValidation.errorType}</strong>
            </div>
          )}
        </div>
      )}

      {/* Step Validation Hint */}
      {stepValidation && !stepValidation.isValid && userStep.trim() && (
        <div className="bg-yellow-50 rounded-lg p-4 border border-yellow-200">
          <p className="text-sm text-yellow-800">
            <strong>{t("training.hint")}:</strong>{" "}
            {stepValidation.errorDescription ||
              "Überprüfe dein Schritt nochmal."}
          </p>
        </div>
      )}

      {/* Step Input Form */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleValidateStep();
        }}
        className="space-y-4"
      >
        <div>
          <label className="block text-gray-700 font-semibold mb-2">
            {t("training.your_next_step")}
          </label>
          <input
            type="text"
            value={userStep}
            onChange={(e) => handleStepChange(e.target.value)}
            placeholder="z.B.: 2*x = 8"
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-lg font-mono"
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
            className="flex-1 bg-blue-500 hover:bg-blue-600 disabled:bg-blue-300 text-white font-bold py-3 px-4 rounded-lg transition"
          >
            {isSubmitting ? t("common.checking") : t("common.check_step")}
          </button>
          <button
            type="button"
            onClick={handleEndSession}
            className="bg-gray-400 hover:bg-gray-500 text-white font-bold py-3 px-6 rounded-lg transition"
          >
            {t("training.end_session")}
          </button>
        </div>
      </form>
    </div>
  );
}
