import { config } from "../config";

export interface TokenData {
  accessToken: string;
  refreshToken?: string;
  expiresAt: number;
}

export interface TokenStorage {
  getToken(): TokenData | null;
  setToken(tokenData: TokenData): void;
  clearToken(): void;
  refreshToken(): Promise<TokenData | null>;
  isTokenExpired(): boolean;
  getTokenExpiryTime(): number | null;
}

class MemoryTokenStorage implements TokenStorage {
  private tokenData: TokenData | null = null;

  getToken(): TokenData | null {
    if (!this.tokenData) return null;

    if (this.isTokenExpired()) {
      this.clearToken();
      return null;
    }

    return this.tokenData;
  }

  setToken(tokenData: TokenData): void {
    this.tokenData = tokenData;
  }

  clearToken(): void {
    this.tokenData = null;
  }

  async refreshToken(): Promise<TokenData | null> {
    return null;
  }

  isTokenExpired(): boolean {
    if (!this.tokenData) return true;
    return Date.now() >= this.tokenData.expiresAt;
  }

  getTokenExpiryTime(): number | null {
    return this.tokenData?.expiresAt || null;
  }
}

class CookieTokenStorage implements TokenStorage {
  private readonly ACCESS_TOKEN_KEY = "access_token";
  private readonly REFRESH_TOKEN_KEY = "refresh_token";
  private readonly EXPIRES_AT_KEY = "expires_at";

  private getCookie(name: string): string | null {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) {
      return decodeURIComponent(parts.pop()?.split(";").shift() || "");
    }
    return null;
  }

  private setCookie(
    name: string,
    value: string,
    options: {
      secure?: boolean;
      httpOnly?: boolean;
      sameSite?: string;
      maxAge?: number;
    } = {}
  ): void {
    const { secure, httpOnly, sameSite, maxAge } = options;

    let cookieString = `${name}=${encodeURIComponent(value)}`;

    if (secure) cookieString += "; Secure";
    if (httpOnly) cookieString += "; HttpOnly";
    if (sameSite) cookieString += `; SameSite=${sameSite}`;
    if (maxAge) cookieString += `; Max-Age=${maxAge}`;

    document.cookie = cookieString;
  }

  private deleteCookie(name: string): void {
    document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
  }

  getToken(): TokenData | null {
    const accessToken = this.getCookie(this.ACCESS_TOKEN_KEY);
    const refreshToken = this.getCookie(this.REFRESH_TOKEN_KEY);
    const expiresAt = this.getCookie(this.EXPIRES_AT_KEY);

    if (!accessToken || !expiresAt) return null;

    const tokenData: TokenData = {
      accessToken,
      refreshToken: refreshToken || undefined,
      expiresAt: parseInt(expiresAt, 10),
    };

    if (this.isTokenExpired()) {
      this.clearToken();
      return null;
    }

    return tokenData;
  }

  setToken(tokenData: TokenData): void {
    const secure = config.security.enableHttpsOnlyCookies;
    const sameSite = secure ? "Strict" : "Lax";

    this.setCookie(this.ACCESS_TOKEN_KEY, tokenData.accessToken, {
      secure,
      httpOnly: false,
      sameSite,
      maxAge: Math.floor((tokenData.expiresAt - Date.now()) / 1000),
    });

    if (tokenData.refreshToken) {
      this.setCookie(this.REFRESH_TOKEN_KEY, tokenData.refreshToken, {
        secure,
        httpOnly: false,
        sameSite,
        maxAge: 30 * 24 * 60 * 60,
      });
    }

    this.setCookie(this.EXPIRES_AT_KEY, tokenData.expiresAt.toString(), {
      secure,
      httpOnly: false,
      sameSite,
      maxAge: Math.floor((tokenData.expiresAt - Date.now()) / 1000),
    });
  }

  clearToken(): void {
    this.deleteCookie(this.ACCESS_TOKEN_KEY);
    this.deleteCookie(this.REFRESH_TOKEN_KEY);
    this.deleteCookie(this.EXPIRES_AT_KEY);
  }

  async refreshToken(): Promise<TokenData | null> {
    const currentToken = this.getToken();
    if (!currentToken?.refreshToken) return null;

    try {
      return null;
    } catch (error) {
      console.error("Failed to refresh token:", error);
      this.clearToken();
      return null;
    }
  }

  isTokenExpired(): boolean {
    const token = this.getToken();
    if (!token) return true;
    return Date.now() >= token.expiresAt;
  }

  getTokenExpiryTime(): number | null {
    const token = this.getToken();
    return token?.expiresAt || null;
  }
}

class SecureTokenStorage implements TokenStorage {
  private memoryStorage = new MemoryTokenStorage();
  private cookieStorage = new CookieTokenStorage();

  getToken(): TokenData | null {
    let token = this.memoryStorage.getToken();
    if (!token) {
      token = this.cookieStorage.getToken();
      if (token) {
        this.memoryStorage.setToken(token);
      }
    }
    return token;
  }

  setToken(tokenData: TokenData): void {
    this.memoryStorage.setToken(tokenData);
    this.cookieStorage.setToken(tokenData);
  }

  clearToken(): void {
    this.memoryStorage.clearToken();
    this.cookieStorage.clearToken();
  }

  async refreshToken(): Promise<TokenData | null> {
    const refreshedToken = await this.cookieStorage.refreshToken();
    if (refreshedToken) {
      this.setToken(refreshedToken);
    }
    return refreshedToken;
  }

  isTokenExpired(): boolean {
    const token = this.getToken();
    if (!token) return true;
    return Date.now() >= token.expiresAt;
  }

  getTokenExpiryTime(): number | null {
    const token = this.getToken();
    return token?.expiresAt || null;
  }
}

export function createTokenStorage(): TokenStorage {
  switch (config.security.jwtStorageType) {
    case "memory":
      return new MemoryTokenStorage();
    case "cookie":
      return new CookieTokenStorage();
    case "secure":
    default:
      return new SecureTokenStorage();
  }
}

export const tokenStorage = createTokenStorage();
export default tokenStorage;
