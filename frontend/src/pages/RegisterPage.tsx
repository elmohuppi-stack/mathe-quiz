import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { authApi } from "../lib/api";
import { useAuthStore } from "../store/authStore";
import { useTranslation } from "../i18n/useTranslation";
import { LanguageSelector } from "../components/LanguageSelector";

export function RegisterPage() {
  const navigate = useNavigate();
  const setAuth = useAuthStore((state) => state.setAuth);
  const { t } = useTranslation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (password !== confirmPassword) {
      setError(t("auth.passwordMismatch"));
      return;
    }

    setLoading(true);

    try {
      const response = await authApi.register({ email, password });
      setAuth(response.data.user, response.data.token);
      navigate("/dashboard");
    } catch (err) {
      setError(t("auth.registerFailed"));
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <div className="bg-white p-8 rounded shadow-md w-full max-w-md">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">Mathe-Quiz {t("auth.register")}</h1>
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
          <input
            type="password"
            placeholder={t("auth.confirmPassword")}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded"
            required
          />
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-green-600 text-white py-2 rounded hover:bg-green-700 disabled:bg-gray-400"
          >
            {loading ? t("auth.registering") : t("auth.registerButton")}
          </button>
        </form>
        <p className="text-center mt-4">
          {t("auth.haveAccount")}{" "}
          <a href="/login" className="text-blue-600 hover:underline">
            {t("auth.loginLink")}
          </a>
        </p>
      </div>
    </div>
  );
}
