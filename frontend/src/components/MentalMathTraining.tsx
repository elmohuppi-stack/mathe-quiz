import { useEffect, useRef, useState } from "react";
import { useTranslation } from "../i18n/useTranslation";
import api from "../lib/api";

interface SessionData {
  sessionId: string;
  userId: string;
  module: string;
  startedAt: string;
}

interface TaskData {
  question: string;
  a: number;
  b: number;
  operation: "+" | "-" | "*" | "/";
}

interface Task {
  taskId: string;
  module: string;
  level: number;
  taskData: TaskData;
  correctAnswer: string;
}

interface AttemptEntry {
  id: string;
  question: string;
  userAnswer: string;
  correctAnswer: string;
  isCorrect: boolean;
  timeTakenMs: number;
}

interface MentalMathTrainingProps {
  session: SessionData;
  level: number;
  onSessionEnd: () => void;
}

const LEVEL_DESCRIPTIONS: Record<
  number,
  { rangeKey: string; focusKey: string }
> = {
  1: {
    rangeKey: "training.mental_math_range_1",
    focusKey: "training.mental_math_focus_1",
  },
  2: {
    rangeKey: "training.mental_math_range_2",
    focusKey: "training.mental_math_focus_2",
  },
  3: {
    rangeKey: "training.mental_math_range_3",
    focusKey: "training.mental_math_focus_3",
  },
  4: {
    rangeKey: "training.mental_math_range_4",
    focusKey: "training.mental_math_focus_4",
  },
  5: {
    rangeKey: "training.mental_math_range_5",
    focusKey: "training.mental_math_focus_5",
  },
};

function formatSeconds(timeTakenMs: number): string {
  return `${(timeTakenMs / 1000).toFixed(1)}s`;
}

function calculateStreak(attempts: AttemptEntry[]): number {
  let streak = 0;

  for (const attempt of attempts) {
    if (!attempt.isCorrect) {
      break;
    }

    streak += 1;
  }

  return streak;
}

export default function MentalMathTraining({
  session,
  level,
  onSessionEnd,
}: MentalMathTrainingProps) {
  const { t } = useTranslation();
  const nextTaskTimeoutRef = useRef<number | null>(null);
  const [task, setTask] = useState<Task | null>(null);
  const [userAnswer, setUserAnswer] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [taskCount, setTaskCount] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [startTime, setStartTime] = useState(Date.now());
  const [lastTimeTaken, setLastTimeTaken] = useState(0);
  const [attempts, setAttempts] = useState<AttemptEntry[]>([]);
  const [feedback, setFeedback] = useState<{
    type: "success" | "error" | null;
    message: string;
  }>({ type: null, message: "" });

  const totalTimeTaken = attempts.reduce(
    (sum, attempt) => sum + attempt.timeTakenMs,
    0,
  );
  const averageTimeTaken =
    attempts.length > 0 ? totalTimeTaken / attempts.length : 0;
  const streak = calculateStreak(attempts);
  const levelDescription = LEVEL_DESCRIPTIONS[level] || LEVEL_DESCRIPTIONS[1];

  const loadTask = async () => {
    try {
      setIsLoading(true);
      const response = await api.post<Task>("/tasks/next", {
        module: "mental-math",
        level,
        sessionId: session.sessionId,
      });

      setTask(response.data);
      setStartTime(Date.now());
      setFeedback({ type: null, message: "" });
    } catch (error) {
      setFeedback({
        type: "error",
        message: t("errors.general.internal_error"),
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadTask();

    return () => {
      if (nextTaskTimeoutRef.current !== null) {
        window.clearTimeout(nextTaskTimeoutRef.current);
      }
    };
  }, [level, session.sessionId]);

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
        module: "mental-math",
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

      setLastTimeTaken(timeTakenMs);
      setAttempts((prev) =>
        [
          {
            id: task.taskId,
            question: task.taskData.question,
            userAnswer,
            correctAnswer: task.correctAnswer,
            isCorrect,
            timeTakenMs,
          },
          ...prev,
        ].slice(0, 6),
      );
      setUserAnswer("");

      if (nextTaskTimeoutRef.current !== null) {
        window.clearTimeout(nextTaskTimeoutRef.current);
      }

      nextTaskTimeoutRef.current = window.setTimeout(() => {
        void loadTask();
      }, 1200);
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
        avgTimeMs: taskCount > 0 ? Math.round(averageTimeTaken) : 0,
      });
      onSessionEnd();
    } catch (error) {
      console.error("Error ending session:", error);
      onSessionEnd();
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-blue-500"></div>
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
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.3fr_0.7fr]">
        <section className="relative overflow-hidden rounded-3xl border border-sky-100 bg-[radial-gradient(circle_at_top_left,_rgba(125,211,252,0.32),_transparent_36%),linear-gradient(135deg,_#eff6ff_0%,_#f8fafc_48%,_#ecfeff_100%)] p-6 shadow-sm">
          <div className="flex flex-wrap items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-sky-700">
            <span className="rounded-full bg-white/80 px-3 py-1 shadow-sm">
              {t("modules.mental-math")}
            </span>
            <span className="rounded-full bg-slate-900 px-3 py-1 text-white shadow-sm">
              {task.taskData.operation}
            </span>
          </div>

          <div className="mt-6 flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-slate-500">
                {t("training.current_goal")}
              </p>
              <h2 className="mt-2 font-mono text-3xl font-bold tracking-tight text-slate-900 md:text-5xl">
                {task.taskData.question}
              </h2>
            </div>
            <div className="rounded-2xl border border-white/60 bg-white/80 px-4 py-3 text-right shadow-sm backdrop-blur">
              <p className="text-xs uppercase tracking-wide text-slate-500">
                {t("training.level")}
              </p>
              <p className="mt-1 text-2xl font-bold text-slate-900">{level}</p>
            </div>
          </div>

          <div className="mt-8 grid gap-3 md:grid-cols-3">
            <div className="rounded-2xl bg-white/80 p-4 shadow-sm ring-1 ring-slate-100">
              <p className="text-xs uppercase tracking-wide text-slate-500">
                {t("training.level_focus")}
              </p>
              <p className="mt-2 text-sm font-semibold text-slate-900">
                {t(levelDescription.focusKey)}
              </p>
            </div>
            <div className="rounded-2xl bg-white/80 p-4 shadow-sm ring-1 ring-slate-100">
              <p className="text-xs uppercase tracking-wide text-slate-500">
                {t("training.mental_math_number_range")}
              </p>
              <p className="mt-2 text-sm font-semibold text-slate-900">
                {t(levelDescription.rangeKey)}
              </p>
            </div>
            <div className="rounded-2xl bg-slate-900 p-4 text-white shadow-sm">
              <p className="text-xs uppercase tracking-wide text-sky-100">
                {t("training.mental_math_streak")}
              </p>
              <p className="mt-2 text-3xl font-bold">{streak}</p>
              <p className="mt-1 text-xs text-sky-100/80">
                {t("training.mental_math_streak_desc")}
              </p>
            </div>
          </div>
        </section>

        <section className="grid grid-cols-2 gap-4 lg:grid-cols-1">
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-xs uppercase tracking-wide text-slate-500">
              {t("training.tasks_solved")}
            </p>
            <p className="mt-2 text-3xl font-bold text-slate-900">
              {taskCount}
            </p>
          </div>
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 shadow-sm">
            <p className="text-xs uppercase tracking-wide text-emerald-700">
              {t("training.mental_math_accuracy")}
            </p>
            <p className="mt-2 text-3xl font-bold text-emerald-900">
              {taskCount > 0 ? Math.round((correctCount / taskCount) * 100) : 0}
              %
            </p>
          </div>
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 shadow-sm">
            <p className="text-xs uppercase tracking-wide text-amber-700">
              {t("training.avg_time")}
            </p>
            <p className="mt-2 text-3xl font-bold text-amber-900">
              {averageTimeTaken > 0 ? formatSeconds(averageTimeTaken) : "0.0s"}
            </p>
          </div>
          <div className="rounded-2xl border border-sky-200 bg-sky-50 p-4 shadow-sm">
            <p className="text-xs uppercase tracking-wide text-sky-700">
              {t("training.mental_math_last_answer")}
            </p>
            <p className="mt-2 text-3xl font-bold text-sky-900">
              {lastTimeTaken > 0 ? formatSeconds(lastTimeTaken) : "-"}
            </p>
          </div>
        </section>
      </div>

      {feedback.type && (
        <div
          className={`rounded-2xl border p-4 text-sm font-medium shadow-sm ${
            feedback.type === "success"
              ? "border-emerald-200 bg-emerald-50 text-emerald-700"
              : "border-rose-200 bg-rose-50 text-rose-700"
          }`}
        >
          {feedback.message}
        </div>
      )}

      <div className="grid gap-6 xl:grid-cols-[1fr_0.72fr]">
        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <div className="flex items-center justify-between gap-3">
                <label className="block text-sm font-semibold text-slate-800">
                  {t("training.your_answer")}
                </label>
                <span className="text-xs text-slate-500">
                  {t("training.mental_math_answer_hint")}
                </span>
              </div>
              <input
                type="text"
                inputMode="decimal"
                value={userAnswer}
                onChange={(e) => setUserAnswer(e.target.value)}
                placeholder={t("training.enter_answer")}
                className="mt-2 w-full rounded-2xl border border-slate-300 bg-slate-50 px-5 py-4 text-2xl font-mono text-slate-900 outline-none transition focus:border-sky-400 focus:bg-white focus:ring-4 focus:ring-sky-100"
                disabled={isSubmitting}
                autoFocus
              />
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-100">
                <p className="text-xs uppercase tracking-wide text-slate-500">
                  {t("training.mental_math_tip_title")}
                </p>
                <p className="mt-2 text-sm text-slate-700">
                  {t("training.mental_math_tip_body")}
                </p>
              </div>
              <div className="rounded-2xl bg-sky-50 p-4 ring-1 ring-sky-100">
                <p className="text-xs uppercase tracking-wide text-sky-700">
                  {t("training.mental_math_goal_title")}
                </p>
                <p className="mt-2 text-sm text-sky-900">
                  {t("training.mental_math_goal_body")}
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex-1 rounded-2xl bg-sky-600 px-5 py-3 font-bold text-white transition hover:bg-sky-700 disabled:bg-sky-300"
              >
                {isSubmitting ? t("common.submitting") : t("common.submit")}
              </button>
              <button
                type="button"
                onClick={handleEndSession}
                className="rounded-2xl bg-slate-300 px-5 py-3 font-bold text-slate-800 transition hover:bg-slate-400"
              >
                {t("training.end_session")}
              </button>
            </div>
          </form>
        </section>

        <aside className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-lg font-bold text-slate-900">
              {t("training.mental_math_recent_attempts")}
            </h3>
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              {attempts.length}/6
            </span>
          </div>

          {attempts.length === 0 ? (
            <p className="mt-4 rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">
              {t("training.mental_math_empty_attempts")}
            </p>
          ) : (
            <div className="mt-4 space-y-3">
              {attempts.map((attempt) => (
                <article
                  key={attempt.id}
                  className="rounded-2xl border border-slate-100 bg-slate-50 p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <p className="font-mono text-sm text-slate-800">
                      {attempt.question}
                    </p>
                    <span
                      className={`rounded-full px-2 py-1 text-xs font-semibold ${
                        attempt.isCorrect
                          ? "bg-emerald-100 text-emerald-800"
                          : "bg-rose-100 text-rose-800"
                      }`}
                    >
                      {attempt.isCorrect
                        ? t("dashboard.status_correct")
                        : t("dashboard.status_incorrect")}
                    </span>
                  </div>

                  <div className="mt-3 flex items-center justify-between gap-3 text-sm">
                    <div>
                      <p className="text-slate-500">
                        {t("training.your_answer")}
                      </p>
                      <p className="font-semibold text-slate-900">
                        {attempt.userAnswer}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-slate-500">
                        {t("training.correct_answer")}
                      </p>
                      <p className="font-semibold text-slate-900">
                        {attempt.correctAnswer}
                      </p>
                    </div>
                  </div>

                  <p className="mt-3 text-xs text-slate-500">
                    {formatSeconds(attempt.timeTakenMs)}
                  </p>
                </article>
              ))}
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
