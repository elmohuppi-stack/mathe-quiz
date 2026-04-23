import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "../store/authStore";
import { useTranslation } from "../i18n/useTranslation";
import { LanguageSelector } from "../components/LanguageSelector";
import api from "../lib/api";

interface AlgebraHistoryStep {
  id: string;
  createdAt: string;
  currentEquation: string;
  proposedStep: string;
  transformationType: string | null;
  isCorrect: boolean;
  timeTakenMs: number;
}

interface AlgebraHistorySummary {
  totalSubmissions: number;
  correctSubmissions: number;
  accuracy: number;
  avgTimeMs: number;
  recentSteps: AlgebraHistoryStep[];
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
  const [algebraHistory, setAlgebraHistory] =
    useState<AlgebraHistorySummary | null>(null);
  const [isHistoryLoading, setIsHistoryLoading] = useState(true);
  const [historyError, setHistoryError] = useState("");

  useEffect(() => {
    if (!user) {
      return;
    }

    let isCancelled = false;

    const loadAlgebraHistory = async () => {
      try {
        setIsHistoryLoading(true);
        setHistoryError("");
        const response = await api.get<AlgebraHistorySummary>(
          "/answers/history/algebra",
          {
            params: { limit: 18 },
          },
        );

        if (!isCancelled) {
          setAlgebraHistory(response.data);
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

    loadAlgebraHistory();

    return () => {
      isCancelled = true;
    };
  }, [t, user]);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  if (!user) {
    return <div className="text-center mt-20">{t("dashboard.loading")}</div>;
  }

  const chartSteps = [...(algebraHistory?.recentSteps || [])].reverse();
  const maxTimeTaken = Math.max(
    ...chartSteps.map((step) => step.timeTakenMs),
    1,
  );

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
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded shadow hover:shadow-lg transition">
            <h3 className="text-xl font-bold mb-2">
              {t("modules.mental-math")}
            </h3>
            <p className="text-gray-600 mb-4">
              {t("modules.mental-math_desc")}
            </p>
            <button
              onClick={() => navigate("/training/mental-math")}
              className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition"
            >
              {t("common.startTraining")}
            </button>
          </div>
          <div className="bg-white p-6 rounded shadow hover:shadow-lg transition">
            <h3 className="text-xl font-bold mb-2">{t("modules.fractions")}</h3>
            <p className="text-gray-600 mb-4">{t("modules.fractions_desc")}</p>
            <button
              onClick={() => navigate("/training/fractions")}
              className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition"
            >
              {t("common.startTraining")}
            </button>
          </div>
          <div className="bg-white p-6 rounded shadow hover:shadow-lg transition">
            <h3 className="text-xl font-bold mb-2">{t("modules.algebra")}</h3>
            <p className="text-gray-600 mb-4">{t("modules.algebra_desc")}</p>
            <button
              onClick={() => navigate("/training/algebra")}
              className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition"
            >
              {t("common.startTraining")}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-[1.2fr_0.8fr] gap-6 mt-8">
          <section className="bg-white p-6 rounded shadow">
            <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
              <div>
                <h3 className="text-xl font-bold text-gray-900">
                  {t("dashboard.algebra_history")}
                </h3>
                <p className="text-sm text-gray-600 mt-1">
                  {t("dashboard.algebra_history_desc")}
                </p>
              </div>
              {algebraHistory && (
                <div className="grid grid-cols-3 gap-3 min-w-full md:min-w-[320px]">
                  <div className="bg-blue-50 rounded-lg p-3">
                    <p className="text-xs uppercase tracking-wide text-blue-700">
                      {t("dashboard.history_saved_steps")}
                    </p>
                    <p className="text-xl font-bold text-blue-900 mt-1">
                      {algebraHistory.totalSubmissions}
                    </p>
                  </div>
                  <div className="bg-emerald-50 rounded-lg p-3">
                    <p className="text-xs uppercase tracking-wide text-emerald-700">
                      {t("dashboard.history_accuracy")}
                    </p>
                    <p className="text-xl font-bold text-emerald-900 mt-1">
                      {Math.round(algebraHistory.accuracy)}%
                    </p>
                  </div>
                  <div className="bg-amber-50 rounded-lg p-3">
                    <p className="text-xs uppercase tracking-wide text-amber-700">
                      {t("dashboard.history_avg_time")}
                    </p>
                    <p className="text-xl font-bold text-amber-900 mt-1">
                      {formatDuration(algebraHistory.avgTimeMs)}
                    </p>
                  </div>
                </div>
              )}
            </div>

            {isHistoryLoading ? (
              <p className="text-gray-500 mt-6">{t("dashboard.loading")}</p>
            ) : historyError ? (
              <p className="text-red-600 mt-6">{historyError}</p>
            ) : !algebraHistory || algebraHistory.recentSteps.length === 0 ? (
              <p className="text-gray-500 mt-6">
                {t("dashboard.history_empty")}
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
                          title={`${step.currentEquation} -> ${step.proposedStep}`}
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
                  {t("dashboard.history_chart_caption")}
                </p>
              </div>
            )}
          </section>

          <section className="bg-white p-6 rounded shadow">
            <h3 className="text-xl font-bold text-gray-900">
              {t("dashboard.recent_steps")}
            </h3>
            <p className="text-sm text-gray-600 mt-1">
              {t("dashboard.step_overview")}
            </p>

            {isHistoryLoading ? (
              <p className="text-gray-500 mt-6">{t("dashboard.loading")}</p>
            ) : historyError ? (
              <p className="text-red-600 mt-6">{historyError}</p>
            ) : !algebraHistory || algebraHistory.recentSteps.length === 0 ? (
              <p className="text-gray-500 mt-6">
                {t("dashboard.history_empty")}
              </p>
            ) : (
              <div className="mt-5 space-y-3">
                {algebraHistory.recentSteps.slice(0, 8).map((step) => {
                  const translatedRule =
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
                        <p>{step.currentEquation}</p>
                        <p className="text-blue-700">{step.proposedStep}</p>
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
