import React, { useEffect } from "react";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { ThemeProvider, useTheme } from "./context/ThemeContext";
import { ToastProvider } from "./components/ui/ToastContainer";
import { ErrorBoundary } from "./components/ui/ErrorBoundary";
import { Loading } from "./components/ui/Loading";
import { ProtectedRoute } from "./components/auth/ProtectedRoute";
import { AuthPage } from "./components/auth/AuthPage";
import { Dashboard } from "./components/dashboard/Dashboard";
import { wsService } from "./services/websocket";

const AppContent: React.FC = () => {
  const { user, loading } = useAuth();
  const { isDark } = useTheme();

  useEffect(() => {
    const initWebSocket = async () => {
      try {
        if (user) {
          await wsService.connect();
        }
      } catch (error) {
        throw error;
      }
    };

    initWebSocket();
  }, [user]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <Loading size="xl" text="Initializing..." />
      </div>
    );
  }

  return user ? (
    <ProtectedRoute>
      <Dashboard />
    </ProtectedRoute>
  ) : (
    <AuthPage />
  );
};

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-200">
          <ToastProvider>
            <AuthProvider>
              <AppContent />
            </AuthProvider>
          </ToastProvider>
        </div>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
