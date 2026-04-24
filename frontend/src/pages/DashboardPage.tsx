import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "../store/authStore";
import { useTranslation } from "../i18n/useTranslation";
import { LanguageSelector } from "../components/LanguageSelector";
import api from "../lib/api";

type ModuleKey = "mental-math" | "fractions" | "algebra";

interface ModuleHistoryStep {
  id: string;
  createdAt: string;
  prompt: string;
  response: string;
  expectedAnswer: string;
  currentEquation: string;
  proposedStep: string;
  transformationType: string | null;
  isCorrect: boolean;
  timeTakenMs: number;
}

interface ModuleHistorySummary {
  module: ModuleKey;
  totalSubmissions: number;
  correctSubmissions: number;
  accuracy: number;
  avgTimeMs: number;
  recentSteps: ModuleHistoryStep[];
}

interface ModuleProgressSummary {
  module: ModuleKey;
  level: number;
  accuracy: number;
  totalAnswers: number;
}

const translatableRuleKeys = [
  "subtract_both_sides",
  "add_both_sides",
  "multiply_both_sides",
  "divide_both_sides",
  "combine_like_terms",
  "distributive_law",
  "simplification",
  "factoring",
  "equivalent_form",
  "cancellation",
];

function formatDuration(timeTakenMs: number): string {
  return `${(timeTakenMs / 1000).toFixed(1)}s`;
}

function formatTimestamp(value: string): string {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));
}

export function DashboardPage() {
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();
  const { t } = useTranslation();
  const [selectedHistoryModule, setSelectedHistoryModule] =
    useState<ModuleKey>("mental-math");
  const [moduleHistory, setModuleHistory] =
    useState<ModuleHistorySummary | null>(null);
  const [isHistoryLoading, setIsHistoryLoading] = useState(true);
  const [historyError, setHistoryError] = useState("");
  const [moduleProgress, setModuleProgress] = useState<
    Record<ModuleKey, ModuleProgressSummary>
  >({
    "mental-math": {
      module: "mental-math",
      level: 1,
      accuracy: 0,
      totalAnswers: 0,
    },
    fractions: {
      module: "fractions",
      level: 1,
      accuracy: 0,
      totalAnswers: 0,
    },
    algebra: {
      module: "algebra",
      level: 1,
      accuracy: 0,
      totalAnswers: 0,
    },
  });
  const [isProgressLoading, setIsProgressLoading] = useState(true);
  const [progressError, setProgressError] = useState("");

  useEffect(() => {
    if (!user) {
      return;
    }

    let isCancelled = false;

    const loadModuleProgress = async () => {
      try {
        setIsProgressLoading(true);
        setProgressError("");
        const [mentalMath, fractions, algebra] = await Promise.all([
          api.get<ModuleProgressSummary>("/modules/progress/mental-math"),
          api.get<ModuleProgressSummary>("/modules/progress/fractions"),
          api.get<ModuleProgressSummary>("/modules/progress/algebra"),
        ]);

        if (!isCancelled) {
          setModuleProgress({
            "mental-math": mentalMath.data,
            fractions: fractions.data,
            algebra: algebra.data,
          });
        }
      } catch (error: any) {
        if (!isCancelled) {
          setProgressError(
            error.response?.data?.error || t("errors.general.internal_error"),
          );
        }
      } finally {
        if (!isCancelled) {
          setIsProgressLoading(false);
        }
      }
    };

    loadModuleProgress();

    return () => {
      isCancelled = true;
    };
  }, [t, user]);

  useEffect(() => {
    if (!user) {
      return;
    }

    let isCancelled = false;

    const loadModuleHistory = async () => {
      try {
        setIsHistoryLoading(true);
        setHistoryError("");
        const response = await api.get<ModuleHistorySummary>(
          `/answers/history/${selectedHistoryModule}`,
          {
            params: { limit: 18 },
          },
        );

        if (!isCancelled) {
          setModuleHistory(response.data);
        }
      } catch (error: any) {
        if (!isCancelled) {
          setHistoryError(
            error.response?.data?.error || t("errors.general.internal_error"),
          );
        }
      } finally {
        if (!isCancelled) {
          setIsHistoryLoading(false);
        }
      }
    };

    loadModuleHistory();

    return () => {
      isCancelled = true;
    };
  }, [selectedHistoryModule, t, user]);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  if (!user) {
    return <div className="text-center mt-20">{t("dashboard.loading")}</div>;
  }

  const chartSteps = [...(moduleHistory?.recentSteps || [])].reverse();
  const maxTimeTaken = Math.max(
    ...chartSteps.map((step) => step.timeTakenMs),
    1,
  );
  const totalSolvedTasks = Object.values(moduleProgress).reduce(
    (sum, progress) => sum + progress.totalAnswers,
    0,
  );
  const averageAccuracy =
    Object.values(moduleProgress).reduce(
      (sum, progress) => sum + progress.accuracy,
      0,
    ) / Object.values(moduleProgress).length;

  const selectedModuleLabel = t(`modules.${selectedHistoryModule}`);
  const buildHistoryChartTooltip = (step: ModuleHistoryStep) => {
    const prompt = step.prompt || step.currentEquation;
    const response = step.response || step.proposedStep;
    const status = step.isCorrect
      ? t("dashboard.status_correct")
      : t("dashboard.status_incorrect");

    return [
      `${prompt} -> ${response}`,
      `${t("dashboard.history_date")}: ${formatTimestamp(step.createdAt)}`,
      `${t("dashboard.history_time_taken")}: ${formatDuration(step.timeTakenMs)}`,
      `${t("dashboard.history_status")}: ${status}`,
    ].join("\n");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <nav className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-blue-600">Mathe-Quiz</h1>
          <div className="space-x-4 flex items-center">
            <LanguageSelector />
            <span className="text-gray-700">
              {t("dashboard.welcome")}, {user.email}
            </span>
            <button
              onClick={handleLogout}
              className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
            >
              {t("dashboard.logout")}
            </button>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 py-12">
        <h2 className="text-3xl font-bold mb-8">{t("dashboard.title")}</h2>

        <section className="bg-white p-6 rounded shadow mb-8">
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
            <div>
              <h3 className="text-xl font-bold text-gray-900">
                {t("dashboard.learning_progress")}
              </h3>
              <p className="text-sm text-gray-600 mt-1">
                {t("dashboard.learning_progress_desc")}
              </p>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 min-w-full md:min-w-[420px]">
              <div className="bg-blue-50 rounded-lg p-3">
                <p className="text-xs uppercase tracking-wide text-blue-700">
                  {t("dashboard.total_solved_tasks")}
                </p>
                <p className="text-xl font-bold text-blue-900 mt-1">
                  {totalSolvedTasks}
                </p>
              </div>
              <div className="bg-emerald-50 rounded-lg p-3">
                <p className="text-xs uppercase tracking-wide text-emerald-700">
                  {t("dashboard.average_accuracy")}
                </p>
                <p className="text-xl font-bold text-emerald-900 mt-1">
                  {Math.round(averageAccuracy)}%
                </p>
              </div>
              <div className="bg-violet-50 rounded-lg p-3 col-span-2 md:col-span-1">
                <p className="text-xs uppercase tracking-wide text-violet-700">
                  {t("dashboard.history_entries")}
                </p>
                <p className="text-xl font-bold text-violet-900 mt-1">
                  {moduleHistory?.totalSubmissions ?? 0}
                </p>
              </div>
            </div>
          </div>

          {isProgressLoading ? (
            <p className="text-gray-500 mt-6">{t("dashboard.loading")}</p>
          ) : progressError ? (
            <p className="text-red-600 mt-6">{progressError}</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
              {(["mental-math", "fractions", "algebra"] as ModuleKey[]).map(
                (module) => {
                  const progress = moduleProgress[module];

                  return (
                    <article
                      key={module}
                      className="rounded-lg border border-slate-200 bg-slate-50 p-4"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <h4 className="font-semibold text-gray-900">
                            {t(`modules.${module}`)}
                          </h4>
                          <p className="text-sm text-gray-600 mt-1">
                            {t("dashboard.module_tasks_solved")}:{" "}
                            {progress.totalAnswers}
                          </p>
                        </div>
                        <span className="text-xs font-semibold px-2 py-1 rounded-full bg-blue-100 text-blue-800">
                          L{progress.level}
                        </span>
                      </div>
                      <div className="mt-4 flex items-end justify-between gap-3">
                        <div>
                          <p className="text-xs uppercase tracking-wide text-gray-500">
                            {t("dashboard.history_accuracy")}
                          </p>
                          <p className="text-lg font-bold text-gray-900 mt-1">
                            {Math.round(progress.accuracy)}%
                          </p>
                        </div>
                        <button
                          onClick={() => navigate(`/training/${module}`)}
                          className="bg-blue-600 text-white px-3 py-2 rounded hover:bg-blue-700 transition text-sm"
                        >
                          {t("common.startTraining")}
                        </button>
                      </div>
                    </article>
                  );
                },
              )}
            </div>
          )}
        </section>

        <div className="grid grid-cols-1 xl:grid-cols-[1.2fr_0.8fr] gap-6 mt-8">
          <section className="relative min-h-[24rem] bg-white p-6 rounded shadow">
            <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
              <div>
                <h3 className="text-xl font-bold text-gray-900">
                  {selectedModuleLabel} {t("dashboard.module_history_suffix")}
                </h3>
                <p className="text-sm text-gray-600 mt-1">
                  {t("dashboard.module_history_desc")}
                </p>
              </div>
              {moduleHistory && (
                <div className="grid grid-cols-3 gap-3 min-w-full md:min-w-[320px]">
                  <div className="bg-blue-50 rounded-lg p-3">
                    <p className="text-xs uppercase tracking-wide text-blue-700">
                      {t("dashboard.history_saved_steps")}
                    </p>
                    <p className="text-xl font-bold text-blue-900 mt-1">
                      {moduleHistory.totalSubmissions}
                    </p>
                  </div>
                  <div className="bg-emerald-50 rounded-lg p-3">
                    <p className="text-xs uppercase tracking-wide text-emerald-700">
                      {t("dashboard.history_accuracy")}
                    </p>
                    <p className="text-xl font-bold text-emerald-900 mt-1">
                      {Math.round(moduleHistory.accuracy)}%
                    </p>
                  </div>
                  <div className="bg-amber-50 rounded-lg p-3">
                    <p className="text-xs uppercase tracking-wide text-amber-700">
                      {t("dashboard.history_avg_time")}
                    </p>
                    <p className="text-xl font-bold text-amber-900 mt-1">
                      {formatDuration(moduleHistory.avgTimeMs)}
                    </p>
                  </div>
                </div>
              )}
            </div>

            <div className="flex flex-wrap gap-2 mt-5">
              {(["mental-math", "fractions", "algebra"] as ModuleKey[]).map(
                (module) => (
                  <button
                    key={module}
                    type="button"
                    onClick={() => setSelectedHistoryModule(module)}
                    className={`px-3 py-2 rounded-full text-sm font-semibold transition ${
                      selectedHistoryModule === module
                        ? "bg-blue-600 text-white"
                        : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                    }`}
                  >
                    {t(`modules.${module}`)}
                  </button>
                ),
              )}
            </div>

            {isHistoryLoading ? (
              <p className="text-gray-500 mt-6">{t("dashboard.loading")}</p>
            ) : historyError ? (
              <p className="text-red-600 mt-6">{historyError}</p>
            ) : !moduleHistory || moduleHistory.recentSteps.length === 0 ? (
              <p className="text-gray-500 mt-6">
                {t("dashboard.history_empty_generic")}
              </p>
            ) : (
              <div className="mt-6">
                <div className="flex items-center gap-5 text-xs text-gray-600 mb-3">
                  <span className="inline-flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                    {t("dashboard.history_correct_label")}
                  </span>
                  <span className="inline-flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-rose-400"></span>
                    {t("dashboard.history_incorrect_label")}
                  </span>
                </div>
                <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                  <div className="h-40 flex items-end gap-2">
                    {chartSteps.map((step, index) => {
                      const barHeight = Math.max(
                        24,
                        Math.round((step.timeTakenMs / maxTimeTaken) * 120),
                      );

                      return (
                        <div
                          key={step.id}
                          className="flex-1 flex flex-col items-center justify-end gap-2 min-w-0"
                          title={buildHistoryChartTooltip(step)}
                        >
                          <div
                            className={`w-full rounded-t-md ${
                              step.isCorrect ? "bg-emerald-500" : "bg-rose-400"
                            }`}
                            style={{ height: `${barHeight}px` }}
                          ></div>
                          <span className="text-[10px] text-gray-500">
                            {index + 1}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
                <p className="text-xs text-gray-500 mt-3">
                  {t("dashboard.history_chart_caption_generic")}
                </p>
              </div>
            )}
          </section>

          <section className="relative min-h-[24rem] bg-white p-6 rounded shadow">
            <h3 className="text-xl font-bold text-gray-900">
              {selectedModuleLabel} {t("dashboard.recent_history_suffix")}
            </h3>
            <p className="text-sm text-gray-600 mt-1">
              {t("dashboard.history_overview_generic")}
            </p>

            {isHistoryLoading ? (
              <p className="text-gray-500 mt-6">{t("dashboard.loading")}</p>
            ) : historyError ? (
              <p className="text-red-600 mt-6">{historyError}</p>
            ) : !moduleHistory || moduleHistory.recentSteps.length === 0 ? (
              <p className="text-gray-500 mt-6">
                {t("dashboard.history_empty_generic")}
              </p>
            ) : (
              <div className="mt-5 space-y-3">
                {moduleHistory.recentSteps.slice(0, 8).map((step) => {
                  const translatedRule =
                    selectedHistoryModule === "algebra" &&
                    step.transformationType &&
                    translatableRuleKeys.includes(step.transformationType)
                      ? t(`rules.${step.transformationType}`)
                      : "";

                  return (
                    <article
                      key={step.id}
                      className="rounded-lg border border-slate-200 p-3 bg-slate-50"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <p className="text-xs text-gray-500">
                          {formatTimestamp(step.createdAt)}
                        </p>
                        <span
                          className={`text-xs font-semibold px-2 py-1 rounded-full ${
                            step.isCorrect
                              ? "bg-emerald-100 text-emerald-800"
                              : "bg-rose-100 text-rose-800"
                          }`}
                        >
                          {step.isCorrect
                            ? t("dashboard.status_correct")
                            : t("dashboard.status_incorrect")}
                        </span>
                      </div>
                      <div className="mt-2 font-mono text-sm text-gray-800 space-y-1">
                        <p>{step.prompt || step.currentEquation}</p>
                        <p className="text-blue-700">
                          {step.response || step.proposedStep}
                        </p>
                        {!step.isCorrect && step.expectedAnswer ? (
                          <p className="text-xs text-gray-500 font-sans">
                            {t("dashboard.history_expected_answer")}:{" "}
                            {step.expectedAnswer}
                          </p>
                        ) : null}
                      </div>
                      <div className="mt-3 flex items-center justify-between gap-3 text-xs text-gray-600">
                        <span>{formatDuration(step.timeTakenMs)}</span>
                        {translatedRule ? (
                          <span className="font-semibold text-blue-700">
                            {translatedRule}
                          </span>
                        ) : null}
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
