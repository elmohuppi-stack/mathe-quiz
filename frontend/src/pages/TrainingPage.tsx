import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useTranslation } from "../i18n/useTranslation";
import { useAuthStore } from "../store/authStore";
import MentalMathTraining from "../components/MentalMathTraining";
import FractionsTraining from "../components/FractionsTraining";
import AlgebraTraining from "../components/AlgebraTraining";
import api from "../lib/api";

type Module = "mental-math" | "fractions" | "algebra";

interface SessionData {
  sessionId: string;
  userId: string;
  module: Module;
  startedAt: string;
}

export default function TrainingPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const token = useAuthStore((state) => state.token);
  const { module } = useParams<{ module: Module }>();

  const [session, setSession] = useState<SessionData | null>(null);
  const [level] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const startTraining = async () => {
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
        // Start a new session
        const response = await api.post("/sessions/start", {
          module,
          level,
        });

        setSession(response.data);
      } catch (err: any) {
        setError(
          err.response?.data?.error || t("errors.general.internal_error"),
        );
      } finally {
        setIsLoading(false);
      }
    };

    startTraining();
  }, [token, module, navigate, level, t]);

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

  if (!session) {
    return null;
  }

  // Render appropriate training component based on module
  const renderTraining = () => {
    switch (session.module) {
      case "mental-math":
        return (
          <MentalMathTraining
            session={session}
            level={level}
            onSessionEnd={handleSessionEnd}
          />
        );
      case "fractions":
        return (
          <FractionsTraining
            session={session}
            level={level}
            onSessionEnd={handleSessionEnd}
          />
        );
      case "algebra":
        return (
          <AlgebraTraining
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
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-3xl font-bold text-gray-800">
              {t(`modules.${session.module}`)}
            </h1>
            <div className="flex items-center space-x-4">
              <span className="text-lg font-semibold text-blue-600">
                {t("training.level")}: {level}
              </span>
              <button
                onClick={() => navigate("/dashboard")}
                className="bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold py-2 px-4 rounded"
              >
                {t("common.exit")}
              </button>
            </div>
          </div>
          {renderTraining()}
        </div>
      </div>
    </div>
  );
}
