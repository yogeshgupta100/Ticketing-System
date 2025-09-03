import React, { useState, useCallback, useRef } from "react";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../ui/ToastContainer";
import { Button } from "../ui/Button";
import { Input } from "../ui/Input";

interface LoginFormProps {
  onToggleMode?: () => void;
}

export const LoginForm: React.FC<LoginFormProps> = ({ onToggleMode }) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [rateLimited, setRateLimited] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const { login } = useAuth();
  const { showToast } = useToast();
  const submitTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const debouncedSubmit = useCallback(
    async (email: string, password: string) => {
      if (submitTimeoutRef.current) {
        clearTimeout(submitTimeoutRef.current);
      }

      submitTimeoutRef.current = setTimeout(async () => {
        try {
          setLoading(true);
          setRateLimited(false);
          await login(email, password);
          showToast("Login successful!", "success");
        } catch (error) {
          console.error("Login error:", error);

          if (error instanceof Error) {
            if (error.message.includes("Too many requests")) {
              setRateLimited(true);
              setCountdown(60);
              showToast(
                "Too many login attempts. Please wait a moment before trying again.",
                "error"
              );
            } else if (error.message.includes("Authentication failed")) {
              showToast(
                "Invalid email or password. Please check your credentials.",
                "error"
              );
            } else {
              showToast(error.message, "error");
            }
          } else {
            showToast("Login failed. Please try again.", "error");
          }
        } finally {
          setLoading(false);
        }
      }, 300);
    },
    [login, showToast]
  );

  React.useEffect(() => {
    if (rateLimited && countdown > 0) {
      const timer = setTimeout(() => {
        setCountdown(countdown - 1);
      }, 1000);
      return () => clearTimeout(timer);
    } else if (countdown === 0 && rateLimited) {
      setRateLimited(false);
    }
  }, [rateLimited, countdown]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email || !password) {
      showToast("Please fill in all fields", "error");
      return;
    }

    if (loading) {
      showToast("Please wait, login in progress...", "info");
      return;
    }

    await debouncedSubmit(email, password);
  };

  React.useEffect(() => {
    return () => {
      if (submitTimeoutRef.current) {
        clearTimeout(submitTimeoutRef.current);
      }
    };
  }, []);

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          Sign In
        </h2>
        <p className="text-gray-600 dark:text-gray-300">
          Access your support dashboard
        </p>
      </div>

      <div className="space-y-4">
        <Input
          label="Email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Enter your email"
          required
        />

        <Input
          label="Password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Enter your password"
          required
        />
      </div>

      <Button
        type="submit"
        loading={loading}
        disabled={loading || rateLimited}
        className="w-full"
      >
        {loading
          ? "Signing In..."
          : rateLimited
          ? `Wait ${countdown}s`
          : "Sign In"}
      </Button>

      {rateLimited && (
        <div className="text-center text-sm text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 p-3 rounded-md">
          <p>
            Too many login attempts. Please wait {countdown} seconds before
            trying again.
          </p>
        </div>
      )}

      <div className="text-center text-xs text-gray-500 dark:text-gray-400">
        <p>
          Having trouble? Wait a moment between attempts to avoid rate limiting.
        </p>
      </div>
    </form>
  );
};
