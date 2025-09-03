import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { apiService } from "../services/api";
import { wsService } from "../services/websocket";
import type { User } from "../types";

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string) => Promise<void>;
  logout: () => void;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  useEffect(() => {
    const initAuth = async () => {
      const token = localStorage.getItem("auth_token");
      if (token) {
        try {
          const currentUser = await apiService.getCurrentUser();
          setUser(currentUser);

          try {
            await wsService.connect();
          } catch (wsError) {
            console.error("AuthContext: WebSocket connection error:", wsError);
          }
        } catch (error) {
          console.error("Failed to get current user:", error);
          apiService.clearToken();
          wsService.disconnect();
        }
      }
      setLoading(false);
    };

    initAuth();
  }, []);

  const login = async (email: string, password: string) => {
    if (isLoggingIn) {
      throw new Error("Login already in progress. Please wait.");
    }

    try {
      setIsLoggingIn(true);
      const { token, user: loggedInUser } = await apiService.login(
        email,
        password
      );
      apiService.setToken(token);
      setUser(loggedInUser);

      try {
        await wsService.connect();
      } catch (wsError) {
        console.error("AuthContext: WebSocket connection error:", wsError);
      }
    } catch (error) {
      console.error("AuthContext: Login error:", error);
      throw error;
    } finally {
      setIsLoggingIn(false);
    }
  };

  const register = async (email: string, password: string, name: string) => {
    try {
      const { token, user: registeredUser } = await apiService.register(
        email,
        password,
        name
      );
      apiService.setToken(token);
      setUser(registeredUser);

      try {
        await wsService.connect();
      } catch (wsError) {
        console.error("AuthContext: WebSocket connection error:", wsError);
      }
    } catch (error) {
      throw error;
    }
  };

  const logout = () => {
    apiService.clearToken();

    try {
      wsService.disconnect();
    } catch (wsError) {
      console.error("AuthContext: WebSocket connection error:", wsError);
    }

    setUser(null);
  };

  const value: AuthContextType = {
    user,
    login,
    register,
    logout,
    loading,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
