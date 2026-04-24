import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useTranslation } from "../i18n/useTranslation";
import { useAuthStore } from "../store/authStore";
import MentalMathTraining from "../components/MentalMathTraining";
import FractionsTraining from "../components/FractionsTraining";
import AlgebraTraining from "../components/AlgebraTraining";
import api from "../lib/api";

type Module = "mental-math" | "fractions" | "algebra";
const LEVEL_OPTIONS = [1, 2, 3, 4, 5] as const;

interface SessionData {
  sessionId: string;
  userId: string;
  module: Module;
  startedAt: string;
}

interface ModuleProgressData {
  module: Module;
  level: number;
  accuracy: number;
  totalAnswers: number;
}

export default function TrainingPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const token = useAuthStore((state) => state.token);
  const { module } = useParams<{ module: Module }>();

  const [session, setSession] = useState<SessionData | null>(null);
  const [level, setLevel] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLevelUpdating, setIsLevelUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [levelError, setLevelError] = useState<string | null>(null);

  useEffect(() => {
    let isCancelled = false;

    const initializeTraining = async () => {
      if (
        !token ||
        !module ||
        !["mental-math", "fractions", "algebra"].includes(module)
      ) {
        navigate("/dashboard");
        return;
      }

      try {
        setIsLoading(true);
        setError(null);
        setLevelError(null);
        setSession(null);

        const progressResponse = await api.get<ModuleProgressData>(
          `/modules/progress/${module}`,
        );
        const initialLevel = progressResponse.data.level ?? 1;

        const response = await api.post<SessionData>("/sessions/start", {
          module,
          level: initialLevel,
        });

        if (isCancelled) {
          return;
        }

        setLevel(initialLevel);
        setSession(response.data);
      } catch (err: any) {
        if (isCancelled) {
          return;
        }

        setError(
          err.response?.data?.error || t("errors.general.internal_error"),
        );
      } finally {
        if (!isCancelled) {
          setIsLoading(false);
        }
      }
    };

    void initializeTraining();

    return () => {
      isCancelled = true;
    };
  }, [token, module, navigate, t]);

  const handleLevelChange = async (nextLevel: number) => {
    if (!module || level === null || nextLevel === level || isLevelUpdating) {
      return;
    }

    try {
      setIsLoading(true);
      setIsLevelUpdating(true);
      setLevelError(null);

      await api.put(`/modules/progress/${module}/level`, {
        level: nextLevel,
      });

      const response = await api.post<SessionData>("/sessions/start", {
        module,
        level: nextLevel,
      });

      setLevel(nextLevel);
      setSession(response.data);
    } catch (err: any) {
      setLevelError(
        err.response?.data?.error || t("errors.general.internal_error"),
      );
    } finally {
      setIsLoading(false);
      setIsLevelUpdating(false);
    }
  };

  const handleSessionEnd = () => {
    navigate("/dashboard");
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-700">{t("messages.training.loading")}</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-md">
          <h2 className="text-red-800 font-bold mb-2">
            {t("errors.general.internal_error")}
          </h2>
          <p className="text-red-700 mb-4">{error}</p>
          <button
            onClick={() => navigate("/dashboard")}
            className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded"
          >
            {t("common.back")}
          </button>
        </div>
      </div>
    );
  }

  if (!session || level === null) {
    return null;
  }

  // Render appropriate training component based on module
  const renderTraining = () => {
    switch (session.module) {
      case "mental-math":
        return (
          <MentalMathTraining
            key={`${session.sessionId}-${level}`}
            session={session}
            level={level}
            onSessionEnd={handleSessionEnd}
          />
        );
      case "fractions":
        return (
          <FractionsTraining
            key={`${session.sessionId}-${level}`}
            session={session}
            level={level}
            onSessionEnd={handleSessionEnd}
          />
        );
      case "algebra":
        return (
          <AlgebraTraining
            key={`${session.sessionId}-${level}`}
            session={session}
            level={level}
            onSessionEnd={handleSessionEnd}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="max-w-4xl mx-auto py-8">
        <div className="bg-white rounded-lg shadow-lg p-6">
          <div className="flex flex-col gap-4 mb-6 lg:flex-row lg:items-start lg:justify-between">
            <h1 className="text-3xl font-bold text-gray-800">
              {t(`modules.${session.module}`)}
            </h1>
            <div className="flex flex-col items-start gap-3 lg:items-end">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-semibold uppercase tracking-[0.18em] text-gray-500">
                    {t("training.level")}
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {LEVEL_OPTIONS.map((option) => {
                      const isActive = option === level;

                      return (
                        <button
                          key={option}
                          type="button"
                          onClick={() => void handleLevelChange(option)}
                          disabled={isLevelUpdating}
                          className={[
                            "rounded-full border px-3 py-1.5 text-sm font-semibold transition",
                            isActive
                              ? "border-blue-600 bg-blue-600 text-white"
                              : "border-gray-300 bg-white text-gray-700 hover:border-blue-300 hover:text-blue-700",
                            isLevelUpdating ? "cursor-wait opacity-70" : "",
                          ].join(" ")}
                        >
                          L{option}
                        </button>
                      );
                    })}
                  </div>
                </div>
                {isLevelUpdating ? (
                  <span className="text-sm text-gray-500">
                    {t("messages.training.loading")}
                  </span>
                ) : null}
              </div>
              <button
                onClick={() => navigate("/dashboard")}
                className="bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold py-2 px-4 rounded"
              >
                {t("common.exit")}
              </button>
              {levelError ? (
                <p className="text-sm text-red-600">{levelError}</p>
              ) : null}
            </div>
          </div>
          {renderTraining()}
        </div>
      </div>
    </div>
  );
}
