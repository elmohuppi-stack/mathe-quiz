import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { useAuthStore } from "./store/authStore";
import { useLanguageStore } from "./i18n/useTranslation";
import { useThemeStore } from "./store/themeStore";
import { LegalFooter } from "./components/LegalFooter";
import { LoginPage } from "./pages/LoginPage";
import { RegisterPage } from "./pages/RegisterPage";
import { DashboardPage } from "./pages/DashboardPage";
import { ImprintPage } from "./pages/ImprintPage";
import { PrivacyPolicyPage } from "./pages/PrivacyPolicyPage";
import TrainingPage from "./pages/TrainingPage";
import "./index.css";

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" />;
}

function AppContent() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  return (
    <BrowserRouter
      future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
    >
      <div className="min-h-screen bg-gray-100 flex flex-col">
        <div className="flex-1">
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/impressum" element={<ImprintPage />} />
            <Route path="/datenschutz" element={<PrivacyPolicyPage />} />
            <Route
              path="/dashboard"
              element={
                <PrivateRoute>
                  <DashboardPage />
                </PrivateRoute>
              }
            />
            <Route
              path="/training/:module"
              element={
                <PrivateRoute>
                  <TrainingPage />
                </PrivateRoute>
              }
            />
            <Route
              path="/"
              element={
                <Navigate to={isAuthenticated ? "/dashboard" : "/login"} />
              }
            />
          </Routes>
        </div>
        <LegalFooter />
      </div>
    </BrowserRouter>
  );
}

function App() {
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const initializeApp = async () => {
      await useAuthStore.getState().loadFromStorage();
      useLanguageStore.getState().loadFromStorage();
      useThemeStore.getState().loadFromStorage();
      setIsLoaded(true);
    };
    initializeApp();
  }, []);

  if (!isLoaded) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return <AppContent />;
}

export default App;
