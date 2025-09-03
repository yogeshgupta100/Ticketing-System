import { config } from "../config";
import { tokenStorage, type TokenData } from "./tokenStorage";
import type { User } from "../types";

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  name: string;
  email: string;
  password: string;
  role?: "CUSTOMER" | "AGENT" | "ADMIN";
}

export interface AuthResponse {
  success: boolean;
  data: {
    user: User;
    accessToken: string;
    refreshToken?: string;
    expiresIn: number;
  };
  message?: string;
}

export interface RefreshTokenResponse {
  success: boolean;
  data: {
    accessToken: string;
    refreshToken?: string;
    expiresIn: number;
  };
  message?: string;
}

class AuthService {
  private refreshPromise: Promise<TokenData | null> | null = null;
  private tokenRefreshTimer: NodeJS.Timeout | null = null;

  constructor() {
    this.setupTokenRefreshTimer();
  }

  private setupTokenRefreshTimer() {
    const token = tokenStorage.getToken();
    if (token) {
      this.scheduleTokenRefresh(token.expiresAt);
    }
  }

  private scheduleTokenRefresh(expiresAt: number) {
    if (this.tokenRefreshTimer) {
      clearTimeout(this.tokenRefreshTimer);
    }

    const timeUntilRefresh = expiresAt - Date.now() - 5 * 60 * 1000;

    if (timeUntilRefresh > 0) {
      this.tokenRefreshTimer = setTimeout(() => {
        this.refreshAccessToken();
      }, timeUntilRefresh);
    }
  }

  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    try {
      const response = await fetch(`${config.apiBaseUrl}/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(credentials),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Login failed");
      }

      if (data.success && data.data) {
        const { user, accessToken, refreshToken, expiresIn } = data.data;

        const tokenData: TokenData = {
          accessToken,
          refreshToken,
          expiresAt: Date.now() + expiresIn * 1000,
        };

        tokenStorage.setToken(tokenData);
        this.scheduleTokenRefresh(tokenData.expiresAt);

        return {
          success: true,
          data: {
            user,
            accessToken,
            refreshToken,
            expiresIn,
          },
        };
      } else {
        throw new Error(data.message || "Invalid response format");
      }
    } catch (error) {
      console.error("Login error:", error);
      throw error;
    }
  }

  async register(userData: RegisterData): Promise<AuthResponse> {
    try {
      const response = await fetch(`${config.apiBaseUrl}/auth/register`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(userData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Registration failed");
      }

      if (data.success && data.data) {
        const { user, accessToken, refreshToken, expiresIn } = data.data;

        const tokenData: TokenData = {
          accessToken,
          refreshToken,
          expiresAt: Date.now() + expiresIn * 1000,
        };

        tokenStorage.setToken(tokenData);
        this.scheduleTokenRefresh(tokenData.expiresAt);

        return {
          success: true,
          data: {
            user,
            accessToken,
            refreshToken,
            expiresIn,
          },
        };
      } else {
        throw new Error(data.message || "Invalid response format");
      }
    } catch (error) {
      console.error("Registration error:", error);
      throw error;
    }
  }

  async getCurrentUser(): Promise<User | null> {
    try {
      const token = tokenStorage.getToken();
      if (!token) return null;

      const response = await fetch(`${config.apiBaseUrl}/auth/me`, {
        headers: {
          Authorization: `Bearer ${token.accessToken}`,
        },
      });

      if (!response.ok) {
        if (response.status === 401) {
          const refreshedToken = await this.refreshAccessToken();
          if (refreshedToken) {
            const retryResponse = await fetch(`${config.apiBaseUrl}/auth/me`, {
              headers: {
                Authorization: `Bearer ${refreshedToken.accessToken}`,
              },
            });

            if (retryResponse.ok) {
              const data = await retryResponse.json();
              return data.success ? data.data : null;
            }
          }
        }
        return null;
      }

      const data = await response.json();
      return data.success ? data.data : null;
    } catch (error) {
      console.error("Get current user error:", error);
      return null;
    }
  }

  async refreshAccessToken(): Promise<TokenData | null> {
    if (this.refreshPromise) {
      return this.refreshPromise;
    }

    this.refreshPromise = this.performTokenRefresh();
    const result = await this.refreshPromise;
    this.refreshPromise = null;
    return result;
  }

  private async performTokenRefresh(): Promise<TokenData | null> {
    try {
      const currentToken = tokenStorage.getToken();
      if (!currentToken?.refreshToken) {
        return null;
      }

      const response = await fetch(`${config.apiBaseUrl}/auth/refresh`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          refreshToken: currentToken.refreshToken,
        }),
      });

      if (!response.ok) {
        throw new Error("Token refresh failed");
      }

      const data: RefreshTokenResponse = await response.json();

      if (data.success && data.data) {
        const { accessToken, refreshToken, expiresIn } = data.data;

        const newTokenData: TokenData = {
          accessToken,
          refreshToken: refreshToken || currentToken.refreshToken,
          expiresAt: Date.now() + expiresIn * 1000,
        };

        tokenStorage.setToken(newTokenData);
        this.scheduleTokenRefresh(newTokenData.expiresAt);

        return newTokenData;
      }

      return null;
    } catch (error) {
      console.error("Token refresh error:", error);
      tokenStorage.clearToken();
      return null;
    }
  }

  async logout(): Promise<void> {
    try {
      const token = tokenStorage.getToken();
      if (token) {
        await fetch(`${config.apiBaseUrl}/auth/logout`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token.accessToken}`,
          },
        });
      }
    } catch (error) {
      console.error("Logout error:", error);
    } finally {
      tokenStorage.clearToken();

      if (this.tokenRefreshTimer) {
        clearTimeout(this.tokenRefreshTimer);
        this.tokenRefreshTimer = null;
      }
    }
  }

  getStoredToken(): TokenData | null {
    return tokenStorage.getToken();
  }

  isTokenValid(): boolean {
    const token = tokenStorage.getToken();
    return token !== null && !tokenStorage.isTokenExpired();
  }

  getTokenExpiryTime(): number | null {
    return tokenStorage.getTokenExpiryTime();
  }

  getAuthHeader(): string | null {
    const token = tokenStorage.getToken();
    return token ? `Bearer ${token.accessToken}` : null;
  }

  shouldRefreshToken(): boolean {
    const token = tokenStorage.getToken();
    if (!token) return false;

    const timeUntilExpiry = token.expiresAt - Date.now();
    const refreshThreshold = 5 * 60 * 1000;

    return timeUntilExpiry <= refreshThreshold;
  }
}

export const authService = new AuthService();
export default authService;
