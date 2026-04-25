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
  const answerInputRef = useRef<HTMLInputElement | null>(null);
  const nextTaskTimeoutRef = useRef<number | null>(null);
  const notificationTimeoutRef = useRef<number | null>(null);
  const [showGuidance, setShowGuidance] = useState(true);
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
  const [notification, setNotification] = useState<{
    type: "success" | null;
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

  const focusAnswerInput = () => {
    window.requestAnimationFrame(() => {
      answerInputRef.current?.focus();
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
    setShowGuidance(
      localStorage.getItem("fractions-training-help-collapsed") !== "true",
    );
  }, []);

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
      focusAnswerInput();
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
      if (notificationTimeoutRef.current !== null) {
        window.clearTimeout(notificationTimeoutRef.current);
      }
    };
  }, [level, session.sessionId]);

  const handleToggleGuidance = () => {
    setShowGuidance((prev) => {
      const next = !prev;
      localStorage.setItem("fractions-training-help-collapsed", String(!next));
      return next;
    });
  };

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
        setFeedback({ type: null, message: "" });
        showSuccessNotification(t("training.correct"));
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

      if (isCorrect) {
        void loadTask();
      } else {
        nextTaskTimeoutRef.current = window.setTimeout(() => {
          void loadTask();
        }, 1200);
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
    <div className="space-y-5">
      {notification.type ? (
        <div className="pointer-events-none fixed inset-x-0 top-4 z-50 flex justify-center px-4">
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800 shadow-lg backdrop-blur">
            {notification.message}
          </div>
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1.62fr_0.38fr]">
        <section className="training-hero relative overflow-hidden rounded-3xl border border-amber-100 bg-[radial-gradient(circle_at_top_left,_rgba(253,230,138,0.38),_transparent_36%),linear-gradient(135deg,_#fff7ed_0%,_#ffffff_40%,_#ecfccb_100%)] p-5 shadow-sm">
          <div className="flex flex-wrap items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-amber-700">
            <span className="rounded-full bg-white/80 px-3 py-1 shadow-sm">
              {t("modules.fractions")}
            </span>
            <span className="rounded-full bg-slate-900 px-3 py-1 text-white shadow-sm">
              {getTaskTypeLabel(task.taskData, t)}
            </span>
          </div>

          <div className="mt-5 flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-slate-500">
                {t("training.current_goal")}
              </p>
              <h2 className="mt-2 font-mono text-3xl font-bold tracking-tight text-slate-900 md:text-4xl">
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

          <div className="mt-5">
            {showGuidance ? (
              <div className="rounded-2xl border border-amber-200 bg-white/75 p-4 shadow-sm backdrop-blur">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-700">
                      {t("training.how_to_solve")}
                    </p>
                    <p className="mt-2 text-sm text-slate-600">
                      {t("training.fractions_tip_body")}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleToggleGuidance}
                    className="whitespace-nowrap text-xs font-semibold text-amber-800 hover:text-amber-950"
                  >
                    {t("training.hide_help")}
                  </button>
                </div>
                <div className="mt-3 grid gap-3 md:grid-cols-3">
                  <div className="rounded-2xl bg-white/90 p-4 shadow-sm ring-1 ring-amber-100">
                    <p className="text-xs uppercase tracking-wide text-slate-500">
                      {t("training.level_focus")}
                    </p>
                    <p className="mt-2 text-sm font-semibold text-slate-900">
                      {levelConfig.focus}
                    </p>
                  </div>
                  <div className="rounded-2xl bg-white/90 p-4 shadow-sm ring-1 ring-lime-100">
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
                    <p className="mt-2 text-sm font-semibold">
                      {taskModeCard?.body}
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between gap-3 rounded-2xl border border-amber-200 bg-white/75 px-4 py-3 shadow-sm backdrop-blur">
                <div className="flex min-w-0 items-center gap-2">
                  <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-amber-100 text-sm font-bold text-amber-900">
                    ?
                  </span>
                  <p className="truncate text-sm text-amber-900">
                    {t("training.help_collapsed")}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleToggleGuidance}
                  className="whitespace-nowrap text-xs font-semibold text-amber-800 hover:text-amber-950"
                >
                  {t("training.show_help")}
                </button>
              </div>
            )}
          </div>
        </section>

        <section className="grid grid-cols-2 gap-2.5 lg:grid-cols-1">
          <div className="rounded-2xl border border-slate-200 bg-white p-2.5 shadow-sm">
            <p className="text-xs uppercase tracking-wide text-slate-500">
              {t("training.tasks_solved")}
            </p>
            <p className="mt-1 text-xl font-bold text-slate-900">{taskCount}</p>
          </div>
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-2.5 shadow-sm">
            <p className="text-xs uppercase tracking-wide text-emerald-700">
              {t("training.fractions_accuracy")}
            </p>
            <p className="mt-1 text-xl font-bold text-emerald-900">
              {taskCount > 0 ? Math.round((correctCount / taskCount) * 100) : 0}
              %
            </p>
          </div>
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-2.5 shadow-sm">
            <p className="text-xs uppercase tracking-wide text-amber-700">
              {t("training.avg_time")}
            </p>
            <p className="mt-1 text-xl font-bold text-amber-900">
              {averageTimeTaken > 0 ? formatSeconds(averageTimeTaken) : "0.0s"}
            </p>
          </div>
          <div className="rounded-2xl border border-sky-200 bg-sky-50 p-2.5 shadow-sm">
            <p className="text-xs uppercase tracking-wide text-sky-700">
              {t("training.fractions_last_answer")}
            </p>
            <p className="mt-1 text-xl font-bold text-sky-900">
              {lastTimeTaken > 0 ? formatSeconds(lastTimeTaken) : "-"}
            </p>
          </div>
        </section>
      </div>

      <div className="grid gap-5 xl:grid-cols-[1fr_0.72fr]">
        <form
          onSubmit={handleSubmit}
          className="space-y-5 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"
        >
          <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_15rem] lg:items-start">
            <div className="max-w-2xl">
              <div className="flex items-center justify-between gap-3">
                <label className="block text-sm font-semibold text-slate-800">
                  {t("training.your_answer")}
                </label>
                <span className="text-xs text-slate-500">
                  {taskInputCopy?.hint}
                </span>
              </div>
              <input
                ref={answerInputRef}
                type="text"
                value={userAnswer}
                onChange={(e) => setUserAnswer(e.target.value)}
                placeholder={taskInputCopy?.placeholder}
                className="mt-2 w-full rounded-2xl border border-slate-300 bg-slate-50 px-5 py-4 text-2xl font-mono text-slate-900 outline-none transition focus:border-amber-400 focus:bg-white focus:ring-4 focus:ring-amber-100"
                disabled={isSubmitting}
                autoFocus
              />
            </div>

            <div className="min-h-[5.5rem] lg:pt-7">
              {feedback.type === "error" ? (
                <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm font-medium text-rose-700 shadow-sm">
                  {feedback.message}
                </div>
              ) : (
                <div className="hidden lg:block" />
              )}
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-100">
              <p className="text-xs uppercase tracking-wide text-slate-500">
                {taskTipCopy?.title}
              </p>
              <p className="mt-2 text-sm text-slate-700">{taskTipCopy?.body}</p>
            </div>
            <div className="rounded-2xl bg-amber-50 p-4 ring-1 ring-amber-100">
              <p className="text-xs uppercase tracking-wide text-amber-700">
                {taskModeCard?.title}
              </p>
              <p className="mt-2 text-sm text-amber-900">
                {taskModeCard?.body}
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 rounded-2xl bg-amber-500 px-5 py-3 font-bold text-white transition hover:bg-amber-600 disabled:bg-amber-300"
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

        <aside className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-lg font-bold text-slate-900">
              {t("training.fractions_recent_attempts")}
            </h3>
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              {attempts.length}/6
            </span>
          </div>

          {attempts.length === 0 ? (
            <p className="mt-4 rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">
              {t("training.fractions_empty_attempts")}
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
                      className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
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
