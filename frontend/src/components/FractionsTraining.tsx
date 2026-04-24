import { useEffect, useRef, useState } from "react";
import { useTranslation } from "../i18n/useTranslation";
import api from "../lib/api";

interface SessionData {
  sessionId: string;
  userId: string;
  module: string;
  startedAt: string;
}

type FractionsTaskKind =
  | "fraction-operation"
  | "fraction-to-percent"
  | "percent-of-quantity"
  | "percentage-ratio";

interface TaskData {
  kind: FractionsTaskKind;
  question: string;
  answerFormat: "fraction" | "number" | "percent";
  numerator1?: number;
  denominator1?: number;
  numerator2?: number;
  denominator2?: number;
  operation?: "+" | "-" | "*" | "/";
  percent?: number;
  baseValue?: number;
  partValue?: number;
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

interface FractionsTrainingProps {
  session: SessionData;
  level: number;
  onSessionEnd: () => void;
}

function formatSeconds(timeTakenMs: number): string {
  return `${(timeTakenMs / 1000).toFixed(1)}s`;
}

function getTaskTypeLabel(
  taskData: TaskData,
  t: (key: string) => string,
): string {
  if (taskData.kind === "fraction-operation" && taskData.operation) {
    return taskData.operation;
  }

  return t(`training.${taskData.kind}`);
}

function getTaskModeCard(taskData: TaskData, t: (key: string) => string) {
  if (taskData.answerFormat === "fraction") {
    return {
      title: t("training.fractions_equivalent_answers"),
      body: t("training.fractions_equivalent_answers_desc"),
    };
  }

  if (taskData.answerFormat === "percent") {
    return {
      title: t("training.fractions_percent_answers"),
      body: t("training.fractions_percent_answers_desc"),
    };
  }

  return {
    title: t("training.fractions_number_answers"),
    body: t("training.fractions_number_answers_desc"),
  };
}

function getTaskInputCopy(taskData: TaskData, t: (key: string) => string) {
  switch (taskData.answerFormat) {
    case "percent":
      return {
        formatLabel: t("training.format_percent"),
        hint: t("training.fractions_answer_hint_percent"),
        placeholder: t("training.example_percent"),
      };
    case "number":
      return {
        formatLabel: t("training.format_number"),
        hint: t("training.fractions_answer_hint_number"),
        placeholder: t("training.example_number"),
      };
    default:
      return {
        formatLabel: t("training.format_fraction"),
        hint: t("training.fractions_answer_hint_fraction"),
        placeholder: t("training.example_fraction"),
      };
  }
}

function getTaskTipCopy(taskData: TaskData, t: (key: string) => string) {
  if (taskData.kind === "fraction-operation") {
    return {
      title: t("training.fractions_tip_title"),
      body: t("training.fractions_tip_body"),
    };
  }

  return {
    title: t("training.percent_tip_title"),
    body: t("training.percent_tip_body"),
  };
}

export default function FractionsTraining({
  session,
  level,
  onSessionEnd,
}: FractionsTrainingProps) {
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

  const levelConfig = {
    focus: t(`training.fractions_focus_${level}`),
    skill: t(`training.fractions_skill_${level}`),
  };
  const taskModeCard = task ? getTaskModeCard(task.taskData, t) : null;
  const taskInputCopy = task ? getTaskInputCopy(task.taskData, t) : null;
  const taskTipCopy = task ? getTaskTipCopy(task.taskData, t) : null;

  const loadTask = async () => {
    try {
      setIsLoading(true);
      const response = await api.post<Task>("/tasks/next", {
        module: "fractions",
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
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-amber-500"></div>
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
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.25fr_0.75fr]">
        <section className="relative overflow-hidden rounded-3xl border border-amber-100 bg-[radial-gradient(circle_at_top_left,_rgba(253,230,138,0.38),_transparent_36%),linear-gradient(135deg,_#fff7ed_0%,_#ffffff_40%,_#ecfccb_100%)] p-6 shadow-sm">
          <div className="flex flex-wrap items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-amber-700">
            <span className="rounded-full bg-white/80 px-3 py-1 shadow-sm">
              {t("modules.fractions")}
            </span>
            <span className="rounded-full bg-slate-900 px-3 py-1 text-white shadow-sm">
              {getTaskTypeLabel(task.taskData, t)}
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
            <div className="rounded-2xl bg-white/85 p-4 shadow-sm ring-1 ring-amber-100">
              <p className="text-xs uppercase tracking-wide text-slate-500">
                {t("training.level_focus")}
              </p>
              <p className="mt-2 text-sm font-semibold text-slate-900">
                {levelConfig.focus}
              </p>
            </div>
            <div className="rounded-2xl bg-white/85 p-4 shadow-sm ring-1 ring-lime-100">
              <p className="text-xs uppercase tracking-wide text-slate-500">
                {t("training.fractions_target_skill")}
              </p>
              <p className="mt-2 text-sm font-semibold text-slate-900">
                {levelConfig.skill}
              </p>
            </div>
            <div className="rounded-2xl bg-slate-900 p-4 text-white shadow-sm">
              <p className="text-xs uppercase tracking-wide text-amber-100">
                {taskModeCard?.title}
              </p>
              <p className="mt-2 text-sm font-semibold">{taskModeCard?.body}</p>
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
              {t("training.fractions_accuracy")}
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
              {t("training.fractions_last_answer")}
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

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <form
          onSubmit={handleSubmit}
          className="space-y-4 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"
        >
          <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
            <p className="text-xs uppercase tracking-wide text-slate-500">
              {taskTipCopy?.title}
            </p>
            <p className="mt-2 text-sm text-slate-700">{taskTipCopy?.body}</p>
          </div>

          <div>
            <label className="block text-gray-700 font-semibold mb-2">
              {t("training.your_answer")} {taskInputCopy?.formatLabel}
            </label>
            <p className="mb-3 text-sm text-slate-500">{taskInputCopy?.hint}</p>
            <input
              type="text"
              value={userAnswer}
              onChange={(e) => setUserAnswer(e.target.value)}
              placeholder={taskInputCopy?.placeholder}
              className="w-full rounded-2xl border border-gray-300 px-4 py-3 text-lg font-mono focus:outline-none focus:ring-2 focus:ring-amber-500"
              disabled={isSubmitting}
              autoFocus
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <button
              type="submit"
              disabled={isSubmitting}
              className="rounded-2xl bg-amber-500 px-4 py-3 font-bold text-white transition hover:bg-amber-600 disabled:bg-amber-300"
            >
              {isSubmitting ? t("common.submitting") : t("common.submit")}
            </button>
            <button
              type="button"
              onClick={handleEndSession}
              className="rounded-2xl bg-slate-200 px-4 py-3 font-bold text-slate-800 transition hover:bg-slate-300"
            >
              {t("training.end_session")}
            </button>
          </div>
        </form>

        <section className="space-y-4 rounded-3xl border border-lime-100 bg-[linear-gradient(180deg,_#f7fee7_0%,_#ffffff_100%)] p-6 shadow-sm">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-lime-700">
              {t("training.fractions_recent_attempts")}
            </p>
            <h3 className="mt-2 text-xl font-bold text-slate-900">
              {t("training.fractions_recent_attempts_title")}
            </h3>
          </div>

          <div className="space-y-3">
            {attempts.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-lime-200 bg-white/80 p-4 text-sm text-slate-500">
                {t("training.fractions_empty_attempts")}
              </div>
            ) : (
              attempts.map((attempt) => (
                <div
                  key={attempt.id}
                  className="rounded-2xl border border-white bg-white/90 p-4 shadow-sm"
                >
                  <div className="flex items-start justify-between gap-3">
                    <p className="font-mono text-base font-semibold text-slate-900">
                      {attempt.question}
                    </p>
                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                        attempt.isCorrect
                          ? "bg-emerald-100 text-emerald-700"
                          : "bg-rose-100 text-rose-700"
                      }`}
                    >
                      {attempt.isCorrect
                        ? t("dashboard.status_correct")
                        : t("dashboard.status_incorrect")}
                    </span>
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-3 text-sm text-slate-600">
                    <div>
                      <p className="text-xs uppercase tracking-wide text-slate-400">
                        {t("training.your_answer")}
                      </p>
                      <p className="mt-1 font-mono text-slate-900">
                        {attempt.userAnswer}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-wide text-slate-400">
                        {t("training.correct_answer")}
                      </p>
                      <p className="mt-1 font-mono text-slate-900">
                        {attempt.correctAnswer}
                      </p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
