import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { authApi } from "../lib/api";
import { useAuthStore } from "../store/authStore";
import { useTranslation } from "../i18n/useTranslation";
import { LanguageSelector } from "../components/LanguageSelector";

export function LoginPage() {
  const navigate = useNavigate();
  const setAuth = useAuthStore((state) => state.setAuth);
  const { t } = useTranslation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await authApi.login({ email, password });
      setAuth(response.data.user, response.data.token);
      navigate("/dashboard");
    } catch (err) {
      setError(t("auth.loginFailed"));
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <div className="bg-white p-8 rounded shadow-md w-full max-w-md">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">Mathe-Quiz {t("auth.login")}</h1>
          <LanguageSelector />
        </div>
        {error && <div className="text-red-600 mb-4">{error}</div>}
        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="email"
            placeholder={t("auth.email")}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded"
            required
          />
          <input
            type="password"
            placeholder={t("auth.password")}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded"
            required
          />
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 disabled:bg-gray-400"
          >
            {loading ? t("auth.loggingIn") : t("auth.loginButton")}
          </button>
        </form>
        <p className="text-center mt-4">
          {t("auth.noAccount")}{" "}
          <a href="/register" className="text-blue-600 hover:underline">
            {t("auth.registerLink")}
          </a>
        </p>
      </div>
    </div>
  );
}
