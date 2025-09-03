import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

export type Theme = "light" | "dark" | "system";

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  isDark: boolean;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
};

interface ThemeProviderProps {
  children: ReactNode;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  const [theme, setThemeState] = useState<Theme>(() => {
    try {
      const savedTheme = localStorage.getItem("theme") as Theme;

      if (savedTheme && ["light", "dark", "system"].includes(savedTheme)) {
        return savedTheme;
      }
      return "system";
    } catch (error) {
      console.error("Error reading theme from localStorage:", error);
      return "system";
    }
  });

  const [isDark, setIsDark] = useState(false);

  const applyTheme = (newTheme: Theme) => {
    try {
      const root = document.documentElement;
      const body = document.body;

      root.classList.remove("light", "dark");
      body.classList.remove("light", "dark");

      let actualTheme: "light" | "dark";

      if (newTheme === "system") {
        actualTheme = window.matchMedia("(prefers-color-scheme: dark)").matches
          ? "dark"
          : "light";
      } else {
        actualTheme = newTheme;
      }

      root.classList.add(actualTheme);
      body.classList.add(actualTheme);

      root.setAttribute("data-theme", actualTheme);
      body.setAttribute("data-theme", actualTheme);

      if (actualTheme === "dark") {
        root.style.setProperty("--bg-primary", "#111827");
        root.style.setProperty("--bg-secondary", "#1f2937");
        root.style.setProperty("--bg-tertiary", "#374151");
        root.style.setProperty("--text-primary", "#f9fafb");
        root.style.setProperty("--text-secondary", "#d1d5db");
        root.style.setProperty("--text-muted", "#9ca3af");
        root.style.setProperty("--border-color", "#374151");
        root.style.setProperty("--card-bg", "#1f2937");
        root.style.setProperty("--input-bg", "#374151");
        root.style.setProperty("--message-bg", "#374151");
      } else {
        root.style.setProperty("--bg-primary", "#ffffff");
        root.style.setProperty("--bg-secondary", "#f9fafb");
        root.style.setProperty("--bg-tertiary", "#f3f4f6");
        root.style.setProperty("--text-primary", "#111827");
        root.style.setProperty("--text-secondary", "#6b7280");
        root.style.setProperty("--text-muted", "#9ca3af");
        root.style.setProperty("--border-color", "#e5e7eb");
        root.style.setProperty("--card-bg", "#ffffff");
        root.style.setProperty("--input-bg", "#ffffff");
        root.style.setProperty("--message-bg", "#f9fafb");
      }

      setIsDark(actualTheme === "dark");

      const metaThemeColor = document.querySelector('meta[name="theme-color"]');
      if (metaThemeColor) {
        metaThemeColor.setAttribute(
          "content",
          actualTheme === "dark" ? "#1f2937" : "#ffffff"
        );
      }
    } catch (error) {
      console.error("Error applying theme:", error);

      const root = document.documentElement;
      const body = document.body;
      root.classList.remove("light", "dark");
      body.classList.remove("light", "dark");
      root.classList.add("light");
      body.classList.add("light");
      root.setAttribute("data-theme", "light");
      body.setAttribute("data-theme", "light");
      setIsDark(false);
    }
  };

  const setTheme = (newTheme: Theme) => {
    try {
      setThemeState(newTheme);
      localStorage.setItem("theme", newTheme);
      applyTheme(newTheme);
    } catch (error) {
      console.error("Error saving theme to localStorage:", error);

      applyTheme(newTheme);
    }
  };

  const resetTheme = () => {
    try {
      localStorage.removeItem("theme");
      setThemeState("system");
      applyTheme("system");
    } catch (error) {
      console.error("Error resetting theme:", error);
      setThemeState("system");
      applyTheme("system");
    }
  };

  const toggleTheme = () => {
    const newTheme = isDark ? "light" : "dark";
    setTheme(newTheme);
  };

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");

    const handleChange = () => {
      if (theme === "system") {
        applyTheme("system");
      }
    };

    mediaQuery.addEventListener("change", handleChange);

    return () => {
      mediaQuery.removeEventListener("change", handleChange);
    };
  }, [theme]);

  useEffect(() => {
    try {
      const savedTheme = localStorage.getItem("theme");

      if (savedTheme && !["light", "dark", "system"].includes(savedTheme)) {
        console.warn(
          "Corrupted theme data detected, resetting to system theme"
        );
        resetTheme();
        return;
      }
    } catch (error) {
      console.error("Error checking theme data:", error);
      resetTheme();
      return;
    }

    try {
      applyTheme(theme);
    } catch (error) {
      console.error("Error applying theme on mount:", error);

      resetTheme();
    }
  }, [theme]);

  const safeSetTheme = (newTheme: Theme) => {
    try {
      setTheme(newTheme);
    } catch (error) {
      console.error("Error setting theme:", error);

      resetTheme();
    }
  };

  const safeToggleTheme = () => {
    try {
      toggleTheme();
    } catch (error) {
      console.error("Error toggling theme:", error);

      resetTheme();
    }
  };

  const value: ThemeContextType = {
    theme,
    setTheme: safeSetTheme,
    isDark,
    toggleTheme: safeToggleTheme,
  };

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
};
