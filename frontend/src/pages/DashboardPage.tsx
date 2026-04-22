import { useNavigate } from "react-router-dom";
import { useAuthStore } from "../store/authStore";
import { useTranslation } from "../i18n/useTranslation";
import { LanguageSelector } from "../components/LanguageSelector";

export function DashboardPage() {
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();
  const { t } = useTranslation();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  if (!user) {
    return <div className="text-center mt-20">{t("dashboard.loading")}</div>;
  }

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
      </div>
    </div>
  );
}
