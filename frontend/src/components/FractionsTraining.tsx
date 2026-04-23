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
  taskData: Record<string, any>;
  correctAnswer: string;
}

interface FractionsTrainingProps {
  session: SessionData;
  level: number;
  onSessionEnd: () => void;
}

export default function FractionsTraining({
  session,
  level,
  onSessionEnd,
}: FractionsTrainingProps) {
  const { t } = useTranslation();
  const [task, setTask] = useState<Task | null>(null);
  const [userAnswer, setUserAnswer] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [taskCount, setTaskCount] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [startTime, setStartTime] = useState(Date.now());
  const [timeTaken, setTimeTaken] = useState(0);
  const [feedback, setFeedback] = useState<{
    type: "success" | "error" | null;
    message: string;
  }>({ type: null, message: "" });

  // Load next task
  useEffect(() => {
    const loadTask = async () => {
      try {
        setIsLoading(true);
        const response = await api.post("/tasks/next", {
          module: "fractions",
          level,
        });
        setTask(response.data);
        setStartTime(Date.now());
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
  }, [level, t]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!task || !userAnswer.trim()) {
      setFeedback({ type: "error", message: t("errors.general.bad_request") });
      return;
    }

    setIsSubmitting(true);
    const timeTakenMs = Date.now() - startTime;

    try {
      const response = await api.post("/answers/submit", {
        sessionId: session.sessionId,
        taskId: task.taskId,
        userAnswer,
        correctAnswer: task.correctAnswer,
        timeTakenMs,
        module: "fractions",
        taskData: {
          ...task.taskData,
          correctAnswer: task.correctAnswer,
          response: userAnswer,
        },
      });

      const isCorrect = response.data.isCorrect;
      setTaskCount((prev) => prev + 1);
      if (isCorrect) {
        setCorrectCount((prev) => prev + 1);
        setFeedback({
          type: "success",
          message: t("training.correct"),
        });
      } else {
        setFeedback({
          type: "error",
          message: `${t("training.incorrect")} ${t("training.correct_answer")}: ${task.correctAnswer}`,
        });
      }

      setTimeTaken(timeTakenMs);
      setUserAnswer("");

      // Load next task after 2 seconds
      setTimeout(() => {
        const loadNextTask = async () => {
          try {
            const response = await api.post("/tasks/next", {
              module: "fractions",
              level,
            });
            setTask(response.data);
            setStartTime(Date.now());
            setFeedback({ type: null, message: "" });
          } catch (error) {
            setFeedback({
              type: "error",
              message: t("errors.general.internal_error"),
            });
          }
        };
        loadNextTask();
      }, 2000);
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
        avgTimeMs: taskCount > 0 ? timeTaken : 0,
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
          <p className="text-gray-600 text-sm">{t("training.avg_time")}</p>
          <p className="text-2xl font-bold text-purple-600">
            {timeTaken ? Math.round(timeTaken / 1000) : 0}s
          </p>
        </div>
      </div>

      {/* Task */}
      <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 rounded-lg p-8 text-center">
        <p className="text-gray-600 mb-4 text-sm uppercase tracking-wide">
          {t("training.question")}
        </p>
        <p className="text-4xl font-bold text-gray-800 font-mono">
          {task.taskData.question}
        </p>
      </div>

      {/* Feedback */}
      {feedback.type && (
        <div
          className={`rounded p-4 ${
            feedback.type === "success"
              ? "bg-green-50 text-green-700 border border-green-200"
              : "bg-red-50 text-red-700 border border-red-200"
          }`}
        >
          {feedback.message}
        </div>
      )}

      {/* Answer Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-gray-700 font-semibold mb-2">
            {t("training.your_answer")} {t("training.format_fraction")}
          </label>
          <input
            type="text"
            value={userAnswer}
            onChange={(e) => setUserAnswer(e.target.value)}
            placeholder={t("training.example_fraction")}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-lg font-mono"
            disabled={isSubmitting}
            autoFocus
          />
        </div>

        <div className="flex gap-4">
          <button
            type="submit"
            disabled={isSubmitting}
            className="flex-1 bg-blue-500 hover:bg-blue-600 disabled:bg-blue-300 text-white font-bold py-3 px-4 rounded-lg transition"
          >
            {isSubmitting ? t("common.submitting") : t("common.submit")}
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
